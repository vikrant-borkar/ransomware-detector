"""Train the ensemble and score call sequences.

Gradient boosting screens the window. Random forest, a calibrated linear SVM,
and a small multilayer perceptron then vote. Sliding windows are what make
the alert early: a slow-start trace can be stopped before its later writes.
"""

from __future__ import annotations

import threading
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

from app.dataset import UNSEEN_FAMILY, demo_catalog, generate_corpus
from app.features import FEATURE_COPY, FEATURE_NAMES, matrix, vectorize

VERSION = "g5-detector-5"
WINDOW = 36
STEP = 12
ALERT_THRESHOLD = 0.55
SCREEN_FLOOR = 0.30
CACHE_PATH = Path(__file__).resolve().parent.parent / ".cache" / "detector.joblib"

_LOCK = threading.Lock()
_ENGINE: "Engine | None" = None


def _metrics_for(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, average="binary", zero_division=0
    )
    accuracy = float(np.mean(y_true == y_pred)) if len(y_true) else 0.0
    return {
        "accuracy": round(accuracy, 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
    }


def _combine(screen: np.ndarray, forest: np.ndarray, svm: np.ndarray, mlp: np.ndarray) -> np.ndarray:
    others = (forest + svm + mlp) / 3.0
    damped = 0.20 * screen + 0.35 * others
    confirmed = 0.34 * screen + 0.66 * others
    return np.where(screen < SCREEN_FLOOR, np.minimum(damped, confirmed), confirmed)


class Engine:
    def __init__(self, bundle: dict) -> None:
        self.gb = bundle["gb"]
        self.rf = bundle["rf"]
        self.svm = bundle["svm"]
        self.mlp = bundle["mlp"]
        self.mean = bundle["mean"]
        self.std = bundle["std"]
        self.importance = bundle["importance"]
        self.metrics = bundle["metrics"]
        self.version = bundle["version"]

    def _votes(self, vectors: np.ndarray) -> dict[str, np.ndarray]:
        return {
            "gradient_boosting": self.gb.predict_proba(vectors)[:, 1],
            "random_forest": self.rf.predict_proba(vectors)[:, 1],
            "svm": self.svm.predict_proba(vectors)[:, 1],
            "mlp": self.mlp.predict_proba(vectors)[:, 1],
        }

    def _scores(self, sequences: list[list[str]]) -> tuple[np.ndarray, dict[str, np.ndarray]]:
        vectors = matrix(sequences)
        votes = self._votes(vectors)
        scores = _combine(
            votes["gradient_boosting"],
            votes["random_forest"],
            votes["svm"],
            votes["mlp"],
        )
        return scores, votes

    def score(self, sequence: list[str]) -> dict:
        if len(sequence) < 8:
            return {
                "ok": False,
                "error": (
                    f"Found {len(sequence)} file operation{'s' if len(sequence) != 1 else ''}. "
                    "At least 8 are needed to judge the behavior."
                ),
                "length": len(sequence),
            }

        spans = _windows(sequence)
        window_seqs = [sequence[start:end] for start, end in spans]
        scores, votes = self._scores(window_seqs)
        full_score, full_votes = self._scores([sequence])
        trace_score = float(full_score[0])
        early_index = None
        for index, window_score in enumerate(scores):
            if float(window_score) >= ALERT_THRESHOLD:
                early_index = index
                break
        # A window can cross the line while the whole prefix is still mixed.
        # The decision follows that window, and the votes shown match it.
        window_hit = None if early_index is None else float(scores[early_index])
        alert = trace_score >= ALERT_THRESHOLD or early_index is not None
        use_window = window_hit is not None and window_hit >= trace_score
        score = window_hit if use_window and window_hit is not None else trace_score
        vote_index_votes = votes if use_window else full_votes
        vote_row = early_index if use_window and early_index is not None else 0
        if not use_window:
            vote_row = 0
        explain_seq = sequence
        if use_window and early_index is not None:
            start, end = spans[early_index]
            explain_seq = sequence[start:end]

        label = "ransomware" if alert else "benign"
        confidence = score if label == "ransomware" else 1.0 - trace_score
        reasons = self._reasons(explain_seq) if score >= 0.4 or alert else []
        if label == "ransomware":
            if early_index is not None:
                early_call = spans[early_index][1]
                response = (
                    f"Alert the user and stop the process. The write–rename–delete pattern "
                    f"crossed the line at call {early_call} of {len(sequence)}, before the "
                    f"rest of the sequence was allowed to continue."
                )
            else:
                response = (
                    "Alert the user and stop the process. The full sequence matches "
                    "ransomware file behavior: repeated writes, renames, and deletes."
                )
        else:
            response = (
                "No alert. The sequence stays in the range of ordinary file activity. "
                "Monitoring continues."
            )

        return {
            "ok": True,
            "label": label,
            "alert": alert,
            "confidence": round(float(confidence), 4),
            "score": round(float(score), 4),
            "trace_score": round(trace_score, 4),
            "threshold": ALERT_THRESHOLD,
            "length": len(sequence),
            "votes": {
                name: round(float(vote_index_votes[name][vote_row]), 4) for name in vote_index_votes
            },
            "windows": [
                {
                    "index": index,
                    "start": spans[index][0],
                    "end": spans[index][1],
                    "score": round(float(scores[index]), 4),
                    "label": "ransomware" if float(scores[index]) >= ALERT_THRESHOLD else "benign",
                }
                for index in range(len(spans))
            ],
            "early_index": early_index,
            "early_call": None if early_index is None else spans[early_index][1],
            "reasons": reasons,
            "response": response,
        }

    def _reasons(self, sequence: list[str]) -> list[dict]:
        values = vectorize(sequence)
        lifts = (values - self.mean) / self.std
        ranked = []
        for name, value, lift, weight in zip(FEATURE_NAMES, values, lifts, self.importance):
            if name not in FEATURE_COPY:
                continue
            if lift < 1.25 or weight < 0.01:
                continue
            ranked.append((float(weight) * float(lift), name, float(value), float(lift)))
        ranked.sort(reverse=True)
        reasons = []
        for _, name, value, lift in ranked[:3]:
            reasons.append(
                {
                    "name": FEATURE_COPY[name],
                    "detail": f"{FEATURE_COPY[name]} is {lift:.1f} standard deviations above ordinary traces in the training set.",
                    "value": round(value, 4),
                    "lift": round(lift, 2),
                }
            )
        if not reasons:
            reasons.append(
                {
                    "name": "Ensemble agreement",
                    "detail": "The models agree on the score, without a single feature dominating the explanation.",
                    "value": 0.0,
                    "lift": 0.0,
                }
            )
        return reasons


def _windows(sequence: list[str]) -> list[tuple[int, int]]:
    if len(sequence) <= WINDOW:
        return [(0, len(sequence))]
    spans: list[tuple[int, int]] = []
    start = 0
    while True:
        end = min(len(sequence), start + WINDOW)
        spans.append((start, end))
        if end == len(sequence):
            break
        nxt = start + STEP
        if nxt >= len(sequence):
            break
        start = nxt
    return spans


def _fit(X: np.ndarray, y: np.ndarray) -> dict:
    gb = GradientBoostingClassifier(
        n_estimators=120,
        learning_rate=0.08,
        max_depth=3,
        random_state=5,
    )
    rf = RandomForestClassifier(
        n_estimators=180,
        max_depth=14,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=5,
        n_jobs=1,
    )
    svm = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                CalibratedClassifierCV(
                    LinearSVC(class_weight="balanced", dual="auto", random_state=5),
                    method="sigmoid",
                    cv=3,
                ),
            ),
        ]
    )
    mlp = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                MLPClassifier(
                    hidden_layer_sizes=(64, 32),
                    activation="relu",
                    max_iter=280,
                    early_stopping=True,
                    random_state=5,
                ),
            ),
        ]
    )
    gb.fit(X, y)
    rf.fit(X, y)
    svm.fit(X, y)
    mlp.fit(X, y)
    return {"gb": gb, "rf": rf, "svm": svm, "mlp": mlp}


def train_bundle() -> dict:
    known, unseen = generate_corpus()
    sequences = [sample["sequence"] for sample in known]
    labels = np.array([sample["label"] for sample in known], dtype=np.int64)
    families = np.array([sample["family"] for sample in known])
    X = matrix(sequences)

    indices = np.arange(len(known))
    train_idx, test_idx = train_test_split(
        indices, test_size=0.28, random_state=5, stratify=labels
    )
    models = _fit(X[train_idx], labels[train_idx])
    mean = X[train_idx].mean(axis=0)
    std = np.maximum(X[train_idx].std(axis=0), 1e-6)

    def predict_scores(vectors: np.ndarray) -> tuple[np.ndarray, dict[str, np.ndarray]]:
        votes = {
            "gradient_boosting": models["gb"].predict_proba(vectors)[:, 1],
            "random_forest": models["rf"].predict_proba(vectors)[:, 1],
            "svm": models["svm"].predict_proba(vectors)[:, 1],
            "mlp": models["mlp"].predict_proba(vectors)[:, 1],
        }
        scores = _combine(
            votes["gradient_boosting"],
            votes["random_forest"],
            votes["svm"],
            votes["mlp"],
        )
        return scores, votes

    test_scores, test_votes = predict_scores(X[test_idx])
    y_test = labels[test_idx]
    ensemble_pred = (test_scores >= ALERT_THRESHOLD).astype(np.int64)
    tn, fp, fn, tp = confusion_matrix(y_test, ensemble_pred, labels=[0, 1]).ravel()

    model_rows = []
    roles = {
        "gradient_boosting": "Initial screen. A low score dampens the rest of the vote.",
        "random_forest": "Bag of behavioral features, including n-grams and file-cycle rates.",
        "svm": "Calibrated linear SVM on the same feature vector.",
        "mlp": "Two-layer network. This is the deep model on the sequence features.",
    }
    display = {
        "gradient_boosting": "Gradient boosting",
        "random_forest": "Random forest",
        "svm": "Linear SVM",
        "mlp": "Sequence MLP",
    }
    for key in ("gradient_boosting", "random_forest", "svm", "mlp"):
        pred = (test_votes[key] >= 0.5).astype(np.int64)
        model_rows.append(
            {
                "id": key,
                "name": display[key],
                "role": roles[key],
                **_metrics_for(y_test, pred),
            }
        )
    model_rows.append(
        {
            "id": "ensemble",
            "name": "Ensemble",
            "role": "Screening plus the mean of the confirming models. This is the alert score.",
            **_metrics_for(y_test, ensemble_pred),
        }
    )

    unseen_X = matrix([sample["sequence"] for sample in unseen])
    unseen_scores, _ = predict_scores(unseen_X)
    unseen_pred = unseen_scores >= ALERT_THRESHOLD
    benign_mask = y_test == 0
    false_positive_rate = float(np.mean(ensemble_pred[benign_mask] == 1)) if np.any(benign_mask) else 0.0

    order = np.argsort(models["rf"].feature_importances_)[::-1]
    importance_rows = []
    for index in order[:8]:
        name = FEATURE_NAMES[index]
        importance_rows.append(
            {
                "id": name,
                "name": FEATURE_COPY.get(name, name),
                "weight": round(float(models["rf"].feature_importances_[index]), 4),
            }
        )

    family_rows = []
    test_families = families[test_idx]
    for family in sorted(set(test_families.tolist())):
        mask = test_families == family
        pred = ensemble_pred[mask]
        truth = y_test[mask]
        family_rows.append(
            {
                "family": family,
                "samples": int(mask.sum()),
                "accuracy": round(float(np.mean(pred == truth)), 4),
                "kind": "benign" if int(truth[0]) == 0 else "ransomware",
            }
        )
    family_rows.append(
        {
            "family": UNSEEN_FAMILY,
            "samples": len(unseen),
            "accuracy": round(float(np.mean(unseen_pred)), 4),
            "kind": "ransomware",
            "held_out": True,
        }
    )

    counts: dict[str, int] = {}
    for sample in known:
        counts[sample["family"]] = counts.get(sample["family"], 0) + 1

    metrics = {
        "version": VERSION,
        "threshold": ALERT_THRESHOLD,
        "window": WINDOW,
        "step": STEP,
        "models": model_rows,
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "false_positive_rate": round(false_positive_rate, 4),
        "unseen": {
            "family": UNSEEN_FAMILY,
            "samples": len(unseen),
            "recall": round(float(np.mean(unseen_pred)), 4),
            "note": "Trained without this family, then scored on it.",
        },
        "importance": importance_rows,
        "families": family_rows,
        "dataset": {
            "known": len(known),
            "benign": int(np.sum(labels == 0)),
            "ransomware": int(np.sum(labels == 1)),
            "test": int(len(test_idx)),
            "counts": counts,
        },
    }

    return {
        "version": VERSION,
        "gb": models["gb"],
        "rf": models["rf"],
        "svm": models["svm"],
        "mlp": models["mlp"],
        "mean": mean,
        "std": std,
        "importance": models["rf"].feature_importances_,
        "metrics": metrics,
    }


def get_engine() -> Engine:
    global _ENGINE
    if _ENGINE is not None:
        return _ENGINE
    with _LOCK:
        if _ENGINE is not None:
            return _ENGINE
        bundle = None
        if CACHE_PATH.exists():
            loaded = joblib.load(CACHE_PATH)
            if loaded.get("version") == VERSION:
                bundle = loaded
        if bundle is None:
            bundle = train_bundle()
            CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump(bundle, CACHE_PATH)
        _ENGINE = Engine(bundle)
        return _ENGINE


def samples_payload() -> list[dict]:
    rows = []
    for demo in demo_catalog():
        rows.append(
            {
                "id": demo["id"],
                "title": demo["title"],
                "kind": demo["kind"],
                "family": demo["family"],
                "summary": demo["summary"],
                "length": len(demo["sequence"]),
                "sequence": demo["sequence"],
            }
        )
    return rows
