export type Score = {
  ok: boolean;
  label: "ransomware" | "benign";
  alert: boolean;
  confidence: number;
  score: number;
  trace_score: number;
  threshold: number;
  length: number;
  votes: {
    gradient_boosting: number;
    random_forest: number;
    svm: number;
    mlp: number;
  };
  windows: Array<{
    index: number;
    start: number;
    end: number;
    score: number;
    label: string;
  }>;
  early_index: number | null;
  early_call: number | null;
  reasons: Array<{ name: string; detail: string; value: number; lift: number }>;
  response: string;
};

export type Scenario = {
  id: string;
  title: string;
  kind: "benign" | "ransomware";
  mode: "live" | "replay";
  summary: string;
  length?: number;
};

export type SessionView = {
  id?: string;
  title: string;
  kind: string;
  mode: string;
  summary?: string;
  status: string;
  stage: string;
  lit: string[];
  sequence: string[];
  shown: number;
  cursor: number;
  total: number;
  result: Score | null;
  contained: boolean;
  message: string;
  pid: number | null;
  error: string | null;
};

export type ModelRow = {
  id: string;
  name: string;
  role: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
};

export type Metrics = {
  version: string;
  threshold: number;
  window: number;
  step: number;
  models: ModelRow[];
  confusion: { tn: number; fp: number; fn: number; tp: number };
  false_positive_rate: number;
  unseen: { family: string; samples: number; recall: number; note: string };
  importance: Array<{ id: string; name: string; weight: number }>;
  families: Array<{
    family: string;
    samples: number;
    accuracy: number;
    kind: string;
    held_out?: boolean;
  }>;
  dataset: {
    known: number;
    benign: number;
    ransomware: number;
    test: number;
    counts: Record<string, number>;
  };
};

export type AlertRow = {
  id: string;
  time: string;
  source: string;
  mode: string;
  label: string;
  score: number;
  confidence: number;
  early_call: number | null;
  length: number;
  contained: boolean;
  summary: string;
  reasons: Score["reasons"];
};
