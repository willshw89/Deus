# Art approval ledger format (v1)

WG.41.01 (Lane U), 2026-09-26. This page describes the section of `art/APPROVALS.md` that the placement tools read. **Only the Owner writes `art/APPROVALS.md`.** No agent adds, edits or removes rows there.

Tools that read the ledger: `tools/art/validate_art.js` and `tools/art/place_art.js`. A file is placed only if its SHA-256 is approved here for the catalogue entry or slot it is placed into.

## The section

Append this heading to `art/APPROVALS.md`, exactly as written, on its own line:

```text
## SHA-256 approval ledger (v1)
```

Under it, one table with exactly this header and six columns:

```text
| Date | Decision (YEA/NAY) | Entry or slot ids | File (repo path) | SHA-256 (64 lowercase hex) | Approved derived variants (ids or none) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-09-26 | YEA | `SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED` | `art/approved/SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED.png` | `<sha256 of that file>` | `SURFACE_B1_PROP_TEST_CHEST_V1_CLOSED_FLIPH` |
| 2026-09-26 | NAY | `ATLAS_TEST_SURFACE_B1:0006` | `art/approved/TEST_lantern_try1.png` | `<sha256 of that file>` | none |
```

The ids above are `TEST_` placeholders. `<sha256 of that file>` stands for the real 64-character hash; a row that still holds the placeholder is malformed and is refused.

## Columns

| Column | Rule |
| :--- | :--- |
| Date | A real calendar date, `YYYY-MM-DD`. |
| Decision (YEA/NAY) | `YEA` or `NAY`, upper case. |
| Entry or slot ids | One or more catalogue entry ids (`BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE`) or slot ids (`<sheetId>:<4-digit index>`), separated by commas. A slot id approves the file for whichever entry owns that slot. Prefer entry ids: if the catalogue is rebuilt and slots are renumbered, a slot id can move to another entry of the same size. The tools print a warning when a file is approved by slot id only. |
| File (repo path) | Where the approved file lives in the repo, ending `.png`, no spaces. It is a record for people; the tools match the hash, not the path. |
| SHA-256 (64 lowercase hex) | SHA-256 of the file's bytes: exactly 64 characters, `0-9` and `a-f`. Upper-case hex is refused. |
| Approved derived variants (ids or none) | `none`, or the ids of derived variant rows (catalogue `variants.derivedFrom` = this entry) that the Owner approves deriving from this file. `place_art.js` reports them as `ledgerApprovedVariant`; it derives nothing (rows with `derivedFrom` stay `DERIVED_PENDING`). |

Backticks around values are optional.

## How the tools read it

- They read **only** this section: from the heading line to the next `#` or `##` heading. The older approvals table and every other part of the file are ignored. Legacy rows have no hash, so they never approve anything: legacy art stays unplaceable until the Owner adds ledger rows for it.
- A heading or table inside a code fence (```` ``` ```` or `~~~`) does not count.
- A file is approved for entry E when all of these hold:
  1. the SHA-256 of the file's bytes appears in a `YEA` row that lists E's id or E's slot id;
  2. no `NAY` row has that hash;
  3. `YEA` rows with that hash that name the same id agree on the derived-variants column.
- A `NAY` row refuses its hash everywhere. A `YEA` row and a `NAY` row with the same hash are a conflict, and the file is refused.
- If **any** part of the section is malformed, the whole ledger is refused: no file is approved until it is fixed. Malformed means:
  - the heading appears twice, or a heading that is almost the ledger heading (different case, level or spacing);
  - the table header text differs, or the `| --- |` separator row is missing;
  - a row does not have six cells, or has a bad date, decision, id list, file path, hash or variants value;
  - table rows appear after the table has ended (after a blank line);
  - a line directly under the table that does not start with `|`. Markdown shows it as one more table row, so every row must start with `|`, and other text needs a blank line above it;
  - a second table, including one whose rows do not start with `|` (detected by its `--- | ---` separator row);
  - an HTML comment (`<!--`) in the section, or a comment that hides the heading, or a row indented four or more spaces. A reader cannot see these rows, so the tools do not guess.
- `place_art.js` checks the ledger again on every run for files placed earlier. If an earlier file is no longer approved (a `NAY` was added), the run is refused with `APPROVAL_REVOKED`; place everything again into a new `--out`.

## Getting a file's hash

- Git Bash: `sha256sum art/approved/<file>.png` (prints lower case).
- PowerShell: `(Get-FileHash art\approved\<file>.png -Algorithm SHA256).Hash.ToLower()`. `Get-FileHash` prints upper case, so keep the `.ToLower()`.
- Or run `node tools/art/validate_art.js <file>.png --entry <id> --catalogue art/catalogue/catalogue.json --approvals art/APPROVALS.md`. Its last line shows `sha256=<hash>` whether it accepts or refuses.

## Changing a decision

The tools cannot tell an edited row from an original one, so an append-only ledger keeps the history readable:

- To withdraw a `YEA`, append a `NAY` row with the same hash.
- To approve a new version of the art, append a `YEA` row with the new file's hash. The old hash stays approved unless it also gets a `NAY`.

## Refusal codes that come from the ledger

| Code | Meaning |
| :--- | :--- |
| `APPROVAL_MISSING` | No `YEA` row has this file's hash for this entry or its slot (or the section is missing). The message names the entries the hash is approved for, if any. |
| `APPROVAL_NAY` | A `NAY` row has this file's hash. |
| `APPROVAL_CONFLICT` | `YEA` and `NAY` rows for this hash, or `YEA` rows that list different derived variants for one id. |
| `LEDGER_MALFORMED` | Something in the section is malformed (see above); the message gives line numbers. |
| `APPROVAL_REVOKED` | (`place_art.js`) A file placed in an earlier run is no longer approved. |
