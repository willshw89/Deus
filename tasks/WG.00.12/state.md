# Task State: WG.00.12 — Non-Moving Consolidation & Subsystem Tooling

- **Task ID:** `WG.00.12`
- **WBS ID:** `WG.00.12`
- **Role:** Writer: Claude (subagent, failover from exhausted Codex) | Reviewer: Gemini (Coordinator)
- **Branch / Worktree:** `main` (`c:\Users\snewt\OneDrive\Desktop\UF`)
- **Last Commit:** `8d1c7c3`
- **Failover Status:** Active on Claude subagent per Failover Matrix (`Codex EXHAUSTED`).

## Owned File Set
- `docs/telemetry/*`
- `tools/performance/*`
- `tools/governance/*`
- `docs/adr/*`
- `docs/issues/*`
- `tasks/WG.00.12/*`

## What is Done
1. Created directories: `docs/telemetry/`, `tools/performance/`, `tools/governance/`, `docs/adr/`, `docs/issues/`.
2. Authored `tools/performance/census_boot_load.js` (plugin payload size & cold evaluation benchmarks).
3. Authored `docs/CANONICAL_ROLES.md` (unifying role definitions across all agents).
4. Recorded hardware rule change (cap lifted, auto-tripwire) in `docs/AGENT_UTILIZATION_POLICY.md` and `docs/STATUS.md`.
5. Logged failover event in `docs/telemetry/failover_log.jsonl`.

## Exact Next Step
1. Execute `node tools/performance/census_boot_load.js` and capture census metrics.
2. Author read-only audit of RMMZ battle engine in `docs/adr/ADR-001-RMMZ-Battle-Stack-Audit.md`.
3. Deliver `tools/governance/check_wbs_integrity.js` for automated WBS revision and leaf immutability checks.

## Open Defects / Questions
- None.

## Relevant Commands
```bash
node tools/performance/census_boot_load.js
```

---

## 2026-09-25 16:50 -05:00 — Claude (Lane C1): external backup script `tools/backup_project.ps1`
Worktree `C:\Users\snewt\.deus_worktrees\lane-c1`, branch `task/lane-c1`, base `d1fbeab`. Brief: `BRIEF.md` (revised at 16:42:30 while this work was running; revision adds worktree containment and DEC-005 off-disk wording, both applied below).

### What changed
- `tools/backup_project.ps1` (new): robocopy backup of the project with safety guards, post-copy verification and a marker manifest. Never uses `git clone`.

### How the script works
- Copy: `robocopy <src> <dst> /E` (or `/MIR` with `-Mirror`) `/COPY:DAT /DCOPY:DAT /XJ /R:2 /W:2 /MT:16 /BYTES /NP /NDL /NFL /XD node_modules save test_output /XF *.log`. The marker and log names are also in `/XF`, so `/MIR` never purges them (observed, see F-2 below).
- `-Source` defaults to the repo holding the script; `-Destination` defaults to `%USERPROFILE%\.deus_backups\backup_<yyyyMMdd_HHmmss>` and accepts any drive letter or UNC path.
- Off-disk check (DEC-005): the script resolves source and destination to a physical disk (`Get-Partition`), a UNC share, or a drive letter, then prints `off-disk backup` or `local copy, NOT an external backup` and records `offDisk` in the marker.
- Exit codes: robocopy 0-7 = success, >= 8 = failure. Script: 0 ok, 1 refused/bad arguments, 2 robocopy >= 8, 3 verification failed.
- Safety guards (all exit 1): destination equal to, inside, or containing the source; destination is a file; destination non-empty without a `.deus_backup.json` marker; marker belongs to a different source; `-VerifyOnly` on an unmarked folder.
- Verification after every copy: a second robocopy pass `/E /L` fails if any source file is missing or has a different size/timestamp (exit bits 1/4, or >= 8). Extra backup-only files are a WARN. `-VerifyHash` adds SHA-256 of every file.
- Modes: `-ListOnly` (robocopy `/L`, writes nothing) and `-VerifyOnly` (re-check an existing backup; writes nothing).
- Output: files, bytes (human-readable plus raw), copy time and total elapsed. The destination root gets `.deus_backup.json` (status, git head/branch, disk ids, counts, verify results) and `.deus_backup_robocopy.log`.

### Execution log (commands actually run, 2026-09-25)
| Time (-05:00) | Command | Result |
|---|---|---|
| 16:41:22 | `powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1` (first version, from worktree root) | exit 0 → `C:\Users\snewt\.deus_backups\backup_20260925_164122`; 9,795 files, 939,614,704 bytes, copy 3.5 s; re-scan PASS |
| ~16:42 | `... -Destination <that> -VerifyOnly -VerifyHash` | exit 0; SHA-256 PASS 9,795 files |
| ~16:42 | `diff -rq` worktree vs backup | reported `BRIEF.md` differs. Cause: the coordinator rewrote `BRIEF.md` at 16:42:30, after the copy (mtime 16:42:30 vs 16:36:05 in backup). This was a real source change, not a bad copy. |
| ~16:44 | `... -Destination backup_20260925_164122 -Mirror` (final script) | exit 0; copied exactly 2 files (`BRIEF.md`, the script), 23,068 bytes; re-scan PASS |
| 16:44:36 | `powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1` (final script) | exit 0 → `C:\Users\snewt\.deus_backups\backup_20260925_164436`; see evidence |
| ~16:45 | `... -Destination backup_20260925_164436 -VerifyOnly -VerifyHash` | exit 0; SHA-256 PASS 9,795 files, 86.0 s |
| ~16:46 | `... -Source C:\Users\snewt\OneDrive\Desktop\UF -Destination C:\Users\snewt\.deus_backups\listonly_canonical_probe -ListOnly` | exit 0; read-only sizing of the canonical project (below); probe folder not created |

### Verification evidence (final backup `backup_20260925_164436`)
Script output (trimmed):
```
  Target disk : disk:0, same as the source: local copy, NOT an external backup
                 Total    Copied   Skipped  Mismatch    FAILED    Extras
      Dirs :       134       134         1         0         0         0
     Files :      9797      9795         2         0         0         1
     Bytes : 939623912 939616961      6951         0         0       839
  Off-disk    : no, same disk as source (disk:0)
  Robocopy    : exit 3 (extra files or folders in the destination (the backup marker counts as one), files copied)
  This run    : 9,795 files copied (896.1 MB (939,616,961 bytes)), 2 skipped (unchanged or excluded), 0 failed
  Copy time   : 00:00:03.4 (3.5 s)
  In backup   : 9,795 files, 896.1 MB (939,616,961 bytes)
  Re-scan     : PASS (0 missing/different, 0 extra)
OK: backup verified.
```
`-VerifyOnly -VerifyHash`: `SHA-256 : PASS (9,795 files compared, 0 bad)`, exit 0.
Independent checks (Git Bash, not using the script):
- `diff -rq -x node_modules -x save -x test_output -x '*.log' -x .deus_backup.json <worktree> <backup>`: no output, exit 0 (byte-for-byte identical).
- File list: backup files (minus marker/log) vs `git ls-files --cached --others` + `.git` pointer, minus exclusions: 9,795 vs 9,795, `comm` empty in both directions.
- No `node_modules`, `save`, `test_output` folders and no `*.log` files in the backup (`find` returned nothing).
- The 2 skipped source files are the tracked logs `tools/srd_browser/evidence/nw_stdio.log` and `nw_verify.log` (excluded by `/XF *.log`).
- Marker `.deus_backup.json`: `status: ok`, `offDisk: false`, `git.head: d1fbeab8…`, `branch: task/lane-c1`, `files: 9795`, `bytes: 939616961`.

Canonical project sizing (`-ListOnly`, read-only): 11,465 source files, 2,002,048,152 bytes; would copy 11,460 files, 1,906,894,218 bytes (1.8 GB) after exclusions.

### Rule 4: failure paths seen failing
Fixture: small tree in `%TEMP%\deus_backup_selftest` holding a `save/`, `test_output/`, `node_modules/`, a `*.log`, a `.git/` and normal files. Ran 16:39–16:41, before the containment rule reached `BRIEF.md`; deleted at 16:41.
| Case | Setup | Observed |
|---|---|---|
| A | destination inside source | exit 1 `Destination is inside the source` |
| B | `-Mirror` into non-empty folder with no marker | exit 1; the user file in it was untouched |
| C | marked backup of another source | exit 1 `holds a backup of a different folder` |
| D | `-VerifyOnly` without `-Destination` | exit 1 |
| E | untouched backup, `-VerifyOnly -VerifyHash` | exit 0, SHA-256 PASS |
| F | appended bytes to a backup file | exit 3, re-scan lists `Older ... docs\readme.md` |
| G | deleted a backup file | exit 3, re-scan lists `New File ... tools\a.js` |
| H2 | extra file only in backup | exit 0 with `WARN: 1 files in the backup no longer exist in the source` |
| I | `-Mirror` on tampered backup | exit 0; stray purged, marker kept (`status: ok`) |
| J | same size + timestamp restored, re-scan only | exit 0 (limitation: re-scan is size/timestamp only) |
| K | same as J with `-VerifyHash` | exit 3 `content differs: docs\readme.md` |
| L | source file held open with `FileShare.None` | robocopy `ERROR 32` x3, exit 11 → script exit 2; marker `status: copy-failed` |
| M | `-ListOnly` | exit 0; destination not created |
| F-2 | raw robocopy `/MIR` with/without `/MT` + `/XF .deus_backup.json .deus_backup_robocopy.log` | marker and log kept; stray purged |
| Disk ids | `Get-DiskId` pulled out of the script's AST | `C:\…` → `disk:0`; `\\nas\backups\deus` → `network:\\nas\backups`; `Z:\…` (no such drive) → `drive:Z` |

### Not done / known problems
- **WG.00.12 external backup milestone is NOT done.** Both test backups are on the source's own disk. This machine has one physical disk (`Get-Disk`: disk 0, NVMe, volume `C:` only) and no external drive attached. DEC-005 is `OPEN` in the canonical `docs/OWNER_DECISIONS.md` (not present in this worktree's copy).
- DEC-005 option 1 (private git remote push) is not implemented: the brief's containment section forbids push, and the owner has not decided DEC-005.
- `/XF *.log` (as briefed) leaves the 2 tracked `tools/srd_browser/evidence/*.log` files out of the backup. A backup of the canonical project still has them inside the copied `.git`. A worktree backup does not, because a worktree's `.git` is only a pointer file (`gitdir: C:/Users/snewt/OneDrive/Desktop/UF/.git/worktrees/lane-c1`), so it carries no history.
- The re-scan compares size and timestamp only. A same-size, same-timestamp corruption is caught only by `-VerifyHash` (case K), and `-Mirror` will not repair it; the script says so.
- The robocopy summary parsing (Files/Bytes rows) assumes English robocopy labels. The "In backup" count does not; it enumerates the destination.
- Limits of the off-disk check: a `subst` drive shows as off-disk; a volume mounted into a folder on `C:` shows as same-disk.
- A fresh backup reports robocopy exit 3, not 1: with `/MT`, robocopy counts the excluded marker file in the destination as an "extra".
- Not checked: OneDrive online-only placeholders. robocopy reading them will trigger downloads. The canonical project was only probed with `/L`.
- Source files that change during a backup make the re-scan fail. This is intended; re-run into the same destination with `-Mirror`.
- Two test backups (~896 MB each) remain in `C:\Users\snewt\.deus_backups`: `backup_20260925_164122` (first run, later `-Mirror`-refreshed) and `backup_20260925_164436` (final). The first can be deleted.
- Definition of Done items for F5 playtest and screenshot do not apply: no game code or data touched.

### Exact next step
1. Gemini: review `tools/backup_project.ps1` and this entry.
2. Owner: decide DEC-005. For option 2 or 3, attach the external drive and, at a writer freeze point, run from the canonical project:
   `powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1 -Destination E:\deus_backup_<yyyyMMdd> -VerifyHash`
   Expect `Off-disk : yes`, `Re-scan : PASS` and `SHA-256 : PASS`.
3. Earlier Lane C1 next steps above are unchanged by this entry.

### Relevant commands
```powershell
powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1                                   # local test backup
powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1 -Destination E:\deus_backup -VerifyHash
powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1 -Destination <backup> -VerifyOnly -VerifyHash
powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1 -Source <project> -ListOnly       # size a backup, writes nothing
```
