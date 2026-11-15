# Running by itself (Windows Task Scheduler)

Ask first. Say what each job does and when, and add only the ones he agrees to.

| Job | When | What it does |
|---|---|---|
| Jarvis - Desk | each time he signs in to Windows | starts Jarvis and opens its window |
| Jarvis - Morning paper | every day at `build_time` (default 05:45) | Claude writes today's edition, the PDF is made, and it prints if `print_paper` is true |
| Jarvis - Lock with Windows | whenever Windows locks | locks Jarvis at once |

- Add: `powershell -ExecutionPolicy Bypass -File scripts\install-jobs.ps1 -Desk -Paper -LockSync` (any of the three).
- Remove all: `scripts\install-jobs.ps1 -Remove`.
- The paper job needs the PC on (or asleep with "wake to run" set in Task Scheduler › the job › Conditions). It runs
  when he's signed in. If the PC was off, it runs as soon as it's back on ("start when available").
- It uses his Claude plan: one short Claude run a day for the paper.
- Check: `me\logs\paper.log` the next morning, or Task Scheduler › Task Scheduler Library › the job's "Last Run Result"
  (0x0 = fine).
