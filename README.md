# Behavioral ransomware detection

Group 5 prototype for **behavioral ransomware detection using system call sequence analysis**, from the Department of Data Science, IoT and Cyber Security at GHRCE Nagpur.

The console follows the project flowchart:

1. Monitor a running process
2. Capture system calls
3. Generate the system-call sequence
4. Decide whether the behavior is suspicious
5. If it is, alert the operator and stop the process. If it is not, keep monitoring.

Signature matching is not used. The score comes from the order of file calls: open, read, write, rename, delete, and the neighbors around them.

This repository does not contain ransomware, encryption routines, or exploit code. Ransomware-shaped examples are recorded lists of system-call names. Live capture follows only ordinary editor and backup workloads that the console itself starts, inside `/tmp/brd-sandbox`.

## Architecture

| Layer | Code | Role |
| --- | --- | --- |
| Collection | `backend/app/monitor.py` | `strace` on a console workload, or replay of a recorded sequence |
| Sequence builder | `backend/app/parser.py`, `backend/app/vocab.py` | Normalize `openat` to `open`, drop interpreter startup noise |
| Behavior analysis | `backend/app/features.py` | Unigram and bigram rates, write/read ratio, write–rename–delete cycle |
| Decision | `backend/app/engine.py` | Gradient boosting screens the window. Random forest, a calibrated linear SVM, and a two-layer network confirm it |
| Response | monitor + `/alerts` | Alert log. A ransomware-shaped replay stops when the score crosses the line |

Sliding windows (36 calls, step 12) are what make the alert early. The slow-start trace begins like a text editor and is cut off at the first window that looks like a locker, before the later calls are consumed.

Training traces are synthetic and seeded. One family (`writev-swap`) is held out of training. Ambiguous sync-client and low-and-slow traces overlap on purpose, so the evaluation is not a perfect score on identical templates.

## Run it

Use two terminals from the `seq_monitor` directory.

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 43124
```

The first launch trains the ensemble and caches it in `backend/.cache`. Later launches reuse that file.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The Next.js app proxies `/api` to the detector on port 43124.

Live capture needs `strace` (`sudo apt install strace` on Debian or Ubuntu).

## Tests

```bash
cd backend && .venv/bin/pytest
```

## Pages

- **Overview** — flowchart, methodology, and the five software layers
- **Monitor** — live strace workloads, recorded traces, and a paste box for call lists or strace text
- **Evaluation** — accuracy, confusion matrix, family breakdown, feature importance
- **Alerts** — each detection, including whether the rest of the trace was stopped
