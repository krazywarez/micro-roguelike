# 1MB Roguelike — size ledger

Raw bytes of everything in `1mb/`, against the 1,048,576-byte (1 MiB) budget.
Record a row after each phase of work; `tools/check-size.sh` prints the current numbers.

| Phase | Date | index.html | data.js | Total | % of budget |
|---|---|---:|---:|---:|---:|
| Phase 0 — guardrails (no game changes) | 2026-07-12 | 55,225 | 27,015 | 82,240 | 7.8% |
| Phase 1 — engine enablers (data-driven graph, procgen rooms, full-floor solver) | 2026-07-12 | 61,356 | 28,998 | 90,354 | 8.6% |
