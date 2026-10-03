# Source-control worktree inventory

Task: Owner source-control hygiene request, 2026-10-02 19:32 CT. Recorded by Codex PM at 2026-10-02 19:41:39 CT. Compared with canonical main `565dc5aead7e068230528d573c395ea21ed5cf5d`. This is a read-only inventory and removal proposal, not abandonment certification or removal approval. No branch/worktree removal, archive tag, stash, reset or file deletion was performed.

There are 83 registered worktrees beneath `C:/Users/snewt/.deus_worktrees`, plus two standalone/unregistered Git directories examined below. 22 registered tips are ancestors of current main and have zero uncommitted files. These are conditional removal candidates; a clean merged tip does not prove no live owner. Unmerged, dirty, backup, locked or uncertain trees stay on hold.

Commands: `git --no-optional-locks worktree list --porcelain`; each tree's `git log -1 --format=%H%x09%cI%x09%s` and `git status --porcelain=v1 --untracked-files=all -z`; `git merge-base --is-ancestor <tip> <canonical-main-SHA>`. Status includes tracked and every non-ignored untracked file, handles rename pairs as one status entry, and uses GIT_OPTIONAL_LOCKS=0. Dates below are committer dates converted to CT. Inspection ran with normal account access after the sandbox's Git ownership checks blocked other-user trees; global safe.directory/config was not changed.

## Registered worktrees in the requested directory

| Worktree | Branch | Head SHA | Last commit (CT) | Merged into current main | Uncommitted files | Proposal |
|---|---|---|---|---|---:|---|
| lane-a | task/lane-a | 16fec1077534c48480a5fac893cade74546a5ffd | 2026-09-25 22:49:10 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-arch3 | task/lane-arch3 | 62b88725b1893195bf14037fbfc8e11db8265215 | 2026-10-02 10:52:03 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-b | task/lane-b | ed75745694e174ad7836724c0ac206bd0d186a2c | 2026-09-25 22:59:49 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-bd | task/lane-bd | 3ea1ab6957e34c0728067b27424564b2fc421b71 | 2026-09-28 13:00:00 CT | NO | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-biomes | task/lane-biomes | 28af8432c17c24b8a090f362a506e877415c1cae | 2026-10-02 09:03:14 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-bj | task/lane-bj | d134315d276f9ad995ae0ff0916f8d67ebf99119 | 2026-09-27 17:38:17 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-bp | task/lane-bp | 79bf40be6a7b6a89b03688679b8e737ea13a7b3c | 2026-09-27 20:36:26 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-ca | task/lane-ca | 000341d85275b5982863e49271e6997e3c586d66 | 2026-09-28 15:26:10 CT | NO | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-ce | task/lane-ce | 7d7bba11f0ed661af6b11a4f09dfcf9a9657b2df | 2026-09-29 17:42:15 CT | NO | 4 | HOLD: uncommitted files; owner and preservation review required |
| lane-cf | task/lane-cf | 5e60e59b44569d95ed4481e4e9244979100cc7db | 2026-09-29 17:05:24 CT | NO | 9 | HOLD: uncommitted files; owner and preservation review required |
| lane-cl | task/lane-cl | b7d22aafa96728295add4141b7366e5480ef847b | 2026-09-29 17:11:05 CT | NO | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-cm | task/lane-cm | 69a471f70db8953cccbe930ef723799addc1e86f | 2026-09-30 10:48:51 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-co | task/lane-co | cc3f12d1a3fedb2044b87ea502cc4be845ddbba3 | 2026-09-30 17:40:50 CT | YES | 6 | HOLD: uncommitted files; owner and preservation review required |
| lane-cq | task/lane-cq | 7bd62f9468fd94986f4aab50ffa52caad1fed036 | 2026-09-30 16:40:42 CT | YES | 14 | HOLD: uncommitted files; owner and preservation review required |
| lane-cr | task/lane-cr | d96442fe36629339e8b2ee9e50a2de2dd3d555af | 2026-09-30 16:33:01 CT | YES | 11 | HOLD: uncommitted files; owner and preservation review required |
| lane-cs | task/lane-cs | caabae27a59ee08c6f367fafaf8053755490dbbe | 2026-09-30 13:57:12 CT | NO | 6 | HOLD: uncommitted files; owner and preservation review required |
| lane-cs2 | task/lane-cs2 | 52ed60a0965a2e2d2c3c3d2cbcc4781f51f57613 | 2026-09-30 15:14:19 CT | YES | 5 | HOLD: uncommitted files; owner and preservation review required |
| lane-ct | task/lane-ct | 2936c031fcaec29daf7da4c4b4ce261701aa6a4c | 2026-10-01 03:25:38 CT | YES | 13 | HOLD: uncommitted files; owner and preservation review required |
| lane-cu | task/lane-cu | c822aee98e5eef348e525287106f6bda594e340e | 2026-10-01 02:06:05 CT | YES | 9 | HOLD: uncommitted files; owner and preservation review required |
| lane-cv | task/lane-cv | 767b6c6fb22f98dd5438bc610912c74a1f742f2b | 2026-09-30 15:10:46 CT | NO | 7 | HOLD: uncommitted files; owner and preservation review required |
| lane-cw | task/lane-cw | 145d60b6e090482ddb9bf03f75642fabbde040de | 2026-09-30 14:33:44 CT | NO | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-cw2 | task/lane-cw2 | a2c63332c74548ba143a0173befc3d915ab1625f | 2026-09-30 15:22:44 CT | YES | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-cx | task/lane-cx | ae321a2a3302085dcd3cc08bef953d4f6ac43496 | 2026-09-30 15:29:57 CT | YES | 6 | HOLD: uncommitted files; owner and preservation review required |
| lane-cy | task/lane-cy | fb29a17b1518f5d8b725a6ea4ac3250cb18f05aa | 2026-09-30 23:01:25 CT | NO | 7 | HOLD: uncommitted files; owner and preservation review required |
| lane-cy2 | task/lane-cy2 | af1f5b4a16ca292f2358008c501af2a84e093533 | 2026-10-01 19:52:13 CT | NO | 8 | HOLD: uncommitted files; owner and preservation review required |
| lane-da | task/lane-da | 24e67adb7295ef1a3ed2dd52b35b83e71a3c6495 | 2026-10-01 05:26:03 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-db | task/lane-db | 695b5ff5efff4c7d27d4752ee9b33fc066bdabfe | 2026-10-01 13:37:37 CT | YES | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-dc | task/lane-dc | cba7e3eb70f8c3a71eef57fb1271f9b8cf3ae17f | 2026-10-01 14:50:36 CT | YES | 47 | HOLD: uncommitted files; owner and preservation review required |
| lane-dd | task/lane-dd | 0fb75bd0615cf4171087df7c6af07f2c1ea2b514 | 2026-10-01 23:21:59 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-dh | task/lane-dh | 7eeb1455e05f5a42af757431cae1fe68792ad8f3 | 2026-10-02 10:22:47 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-dirtyqueue | task/lane-dirtyqueue | 7155b44c12df5baaca6537071bd51881c0938ba3 | 2026-10-02 08:37:44 CT | NO | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-dm | task/lane-dm | 5c5ebe53fc81f7a94037b3f895eb152a37b88b6e | 2026-10-01 18:57:52 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-dn | task/lane-dn | ac8cfd4aa884d69173430d9fdad46ed079c47be2 | 2026-10-01 03:26:54 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-do | task/lane-do | 9ddcb6dc3a9f589e18050994f27417ee304735d5 | 2026-10-01 15:13:19 CT | YES | 14 | HOLD: uncommitted files; owner and preservation review required |
| lane-do2 | task/lane-do2 | fe772c50f15259205931136630e9c0d9e2f81d3b | 2026-10-01 17:26:51 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-dp | task/lane-dp | e59775e30258938f823731be0a3ad8ab0a5f5bfa | 2026-10-01 22:28:31 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-dr | task/lane-dr | b06ad27cbdf1019611523ee0c63b5e5ca0537706 | 2026-10-01 22:34:02 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-e | task/lane-e | 05948e9c614e7eeaa42c7afbf347c7fd9c311126 | 2026-09-26 00:03:27 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-ea | task/lane-ea | 32b04d5c3edacc7bfd7736a4927415244faf2fc3 | 2026-10-01 06:01:35 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-eb | task/lane-eb | 60a448f783fa3ceb6b45c76fc92d58921b527f72 | 2026-10-01 07:53:08 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-ecs | task/lane-ecs | 48087172be2985ed257f3d7df5188239fa9b9032 | 2026-10-02 09:28:06 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-ed | task/lane-ed | 2ece96dfc845204545e5aee642ff6322ee9bea92 | 2026-10-01 06:02:51 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-el | task/lane-el | 3ca5e6cf41066160a5804d2c76f387abdee763b0 | 2026-10-01 04:23:36 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-en | task/lane-en | 495902fadce9520c7cf47d74930b4736644ef6d6 | 2026-10-01 03:31:07 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-fauna | task/lane-fauna | 3602094ae9531faa4c22d11863e315b4ba5c939b | 2026-10-02 11:11:22 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-fd | task/lane-fd | 6c0616089410d7855f428fe9f9d27e139435214f | 2026-10-01 06:00:48 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-fi | task/lane-fi | c710c969a29c5404a71ac06a484d471c7ab8326d | 2026-10-01 21:57:13 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-fluids | task/lane-fluids | ffaee67a5771e295ce77dc79e044b025e1a68637 | 2026-10-02 11:03:53 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-ga | task/lane-ga | 90e88db3c3e61dd5a3c44c0d3059b8d3b3e6fcba | 2026-10-02 08:38:11 CT | NO | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-geo | task/lane-geo | 9be3eb5cc47dfb97fcec36113dc84646068a7b6f | 2026-10-02 11:55:15 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-gf | task/lane-gf | 16cef61c8ee1b023d73a474458639ac3a98512b4 | 2026-10-01 14:53:31 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-gg | task/lane-gg | af586eca2bab2e67f98486514b4f09f95be5014e | 2026-10-01 16:21:29 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-gh | task/lane-gh | 8f7752375c8914caade8955ecd49ef378745e231 | 2026-10-01 19:12:13 CT | YES | 5 | HOLD: uncommitted files; owner and preservation review required |
| lane-gi | task/lane-gi | d22290667b95d6025a0d319ac0bf73c7d22bb5de | 2026-10-02 00:11:35 CT | NO | 6 | HOLD: uncommitted files; owner and preservation review required |
| lane-gj | task/lane-gj | e8a9031b8f95b773d01e3033b3ccd5402ac41488 | 2026-10-01 18:23:41 CT | YES | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-gk | task/lane-gk | 56fc1e5b838efefee5acc9e22c484377678e7a88 | 2026-10-01 20:16:19 CT | YES | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-gl | task/lane-gl | 5ebf58bf4ca7c57749d66a659bd4964b84a9bd96 | 2026-10-01 19:55:53 CT | YES | 5 | HOLD: uncommitted files; owner and preservation review required |
| lane-gm | task/lane-gm | 1925485b7ca3272d481485dc752b3bdcbb7b5e2c | 2026-10-01 19:41:42 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-gn | task/lane-gn | 2e82612aa14d664b5adeb961d46817213607979d | 2026-10-01 22:59:26 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-gp | task/lane-gp | 9d8db81291086e5978ca078be0b4a202906f8982 | 2026-10-01 21:01:01 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-gq | task/lane-gq | d89525a3ee2a0f19078483a5d2c934bb0f8c1602 | 2026-10-02 01:07:11 CT | NO | 44 | HOLD: uncommitted files; owner and preservation review required |
| lane-gr | task/lane-gr | 847993346f090fda0584649535c9c7e3f449a39c | 2026-10-01 23:04:05 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-h | task/lane-h | e3af4cfa49132d332aef31def47b75cbb0fe9395 | 2026-09-26 00:04:53 CT | NO | 0 | HOLD: unmerged; abandonment is not established |
| lane-history | task/lane-history | baf60e180833a3e171e56f3a6e1c3d03aa1b0657 | 2026-10-02 09:03:19 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-hydro | task/lane-hydro | e11b46ae2466d251f9e4133eeaaaecb6d68efc64 | 2026-10-02 10:39:14 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-hydrology | task/lane-hydrology | 927ac7f05287ba09e05f61f871e805fa3542e9dc | 2026-10-02 09:03:16 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-kernel | task/lane-kernel | 82ac3481c6cc05b6618df2ac134c197b5d8c92cb | 2026-10-02 09:44:22 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-lazy | task/lane-lazy | 49913749ba3be45408ab38effc51e3777b6ac38a | 2026-10-02 10:04:03 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-natcon | task/lane-natcon | 0aeb0c98ef2378f13782e65d080fd8bbf52b3807 | 2026-10-02 10:40:21 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-nx2 | task/lane-nx2 | 89202d87d23ae67c4a5096edd5c5e63365701ca6 | 2026-10-01 23:02:26 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-nx3 | task/lane-nx3 | c4b60883d4e741c14263c06f43129ab068503cc3 | 2026-10-02 00:07:25 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-nx4 | task/lane-nx4 | 3b680db4a3be093c026c0b4db47a3452ebbbc4f0 | 2026-10-02 00:36:57 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-nx5 | task/lane-nx5 | 3971e5f70abacc70e1f381f1b0ba208c7103e2fd | 2026-10-02 01:25:27 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-pg | task/lane-pg | f8b78e848f635e907c966aa0cd71c00bfcd0821d | 2026-10-01 08:45:38 CT | YES | 1 | HOLD: uncommitted files; owner and preservation review required |
| lane-physics | task/lane-physics | 020c58870a27704d42e9ecf2a2d5c8f5a4fe7a65 | 2026-10-02 11:53:40 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-pm-streamline | task/lane-pm-streamline | 472de24711e352190d9305a67b807682f1abc83a | 2026-09-29 13:58:35 CT | NO | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-render1 | task/lane-render1 | 1382499dc5687c34d81675d40c8e3a4d0634305d | 2026-10-02 10:58:14 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-render2 | task/lane-render2 | a2e7c63416d1492346a6d35263ffae140b2cb23e | 2026-10-02 11:00:14 CT | YES | 0 | CANDIDATE: merged and clean; confirm no live owner before approval |
| lane-spawner | task/lane-spawner | 0307594509aac2ea0663a6951e72909b7f00cd77 | 2026-10-02 10:23:21 CT | YES | 3 | HOLD: uncommitted files; owner and preservation review required |
| lane-storyteller | task/lane-storyteller | fc9d99b0d5c9eeace26bd8572f256695b8cd6115 | 2026-10-02 08:35:46 CT | NO | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-threads | task/lane-threads | 7be3763acba45d4d93546f1862f430a9b54d7924 | 2026-10-02 09:46:40 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| lane-year0 | task/lane-year0 | 72be88d282b8164d40b8ecaa59a77c8d412c6c3e | 2026-10-02 10:53:10 CT | YES | 2 | HOLD: uncommitted files; owner and preservation review required |
| org-setup | org/setup-2026-10-02 | 2ffa0d3a5aa6649d0a8eed0ea7c52edc1c8e4442 | 2026-10-02 19:33:04 CT | NO | 0 | HOLD: unmerged; abandonment is not established |

## Conditional removal shortlist

- `task/lane-arch3` at `62b88725b1893195bf14037fbfc8e11db8265215` (`C:/Users/snewt/.deus_worktrees/lane-arch3`).
- `task/lane-biomes` at `28af8432c17c24b8a090f362a506e877415c1cae` (`C:/Users/snewt/.deus_worktrees/lane-biomes`).
- `task/lane-da` at `24e67adb7295ef1a3ed2dd52b35b83e71a3c6495` (`C:/Users/snewt/.deus_worktrees/lane-da`).
- `task/lane-dd` at `0fb75bd0615cf4171087df7c6af07f2c1ea2b514` (`C:/Users/snewt/.deus_worktrees/lane-dd`).
- `task/lane-dp` at `e59775e30258938f823731be0a3ad8ab0a5f5bfa` (`C:/Users/snewt/.deus_worktrees/lane-dp`).
- `task/lane-ea` at `32b04d5c3edacc7bfd7736a4927415244faf2fc3` (`C:/Users/snewt/.deus_worktrees/lane-ea`).
- `task/lane-ed` at `2ece96dfc845204545e5aee642ff6322ee9bea92` (`C:/Users/snewt/.deus_worktrees/lane-ed`).
- `task/lane-fd` at `6c0616089410d7855f428fe9f9d27e139435214f` (`C:/Users/snewt/.deus_worktrees/lane-fd`).
- `task/lane-fi` at `c710c969a29c5404a71ac06a484d471c7ab8326d` (`C:/Users/snewt/.deus_worktrees/lane-fi`).
- `task/lane-fluids` at `ffaee67a5771e295ce77dc79e044b025e1a68637` (`C:/Users/snewt/.deus_worktrees/lane-fluids`).
- `task/lane-geo` at `9be3eb5cc47dfb97fcec36113dc84646068a7b6f` (`C:/Users/snewt/.deus_worktrees/lane-geo`).
- `task/lane-gp` at `9d8db81291086e5978ca078be0b4a202906f8982` (`C:/Users/snewt/.deus_worktrees/lane-gp`).
- `task/lane-gr` at `847993346f090fda0584649535c9c7e3f449a39c` (`C:/Users/snewt/.deus_worktrees/lane-gr`).
- `task/lane-history` at `baf60e180833a3e171e56f3a6e1c3d03aa1b0657` (`C:/Users/snewt/.deus_worktrees/lane-history`).
- `task/lane-hydrology` at `927ac7f05287ba09e05f61f871e805fa3542e9dc` (`C:/Users/snewt/.deus_worktrees/lane-hydrology`).
- `task/lane-nx2` at `89202d87d23ae67c4a5096edd5c5e63365701ca6` (`C:/Users/snewt/.deus_worktrees/lane-nx2`).
- `task/lane-nx3` at `c4b60883d4e741c14263c06f43129ab068503cc3` (`C:/Users/snewt/.deus_worktrees/lane-nx3`).
- `task/lane-nx4` at `3b680db4a3be093c026c0b4db47a3452ebbbc4f0` (`C:/Users/snewt/.deus_worktrees/lane-nx4`).
- `task/lane-nx5` at `3971e5f70abacc70e1f381f1b0ba208c7103e2fd` (`C:/Users/snewt/.deus_worktrees/lane-nx5`).
- `task/lane-physics` at `020c58870a27704d42e9ecf2a2d5c8f5a4fe7a65` (`C:/Users/snewt/.deus_worktrees/lane-physics`).
- `task/lane-render1` at `1382499dc5687c34d81675d40c8e3a4d0634305d` (`C:/Users/snewt/.deus_worktrees/lane-render1`).
- `task/lane-render2` at `a2e7c63416d1492346a6d35263ffae140b2cb23e` (`C:/Users/snewt/.deus_worktrees/lane-render2`).

Do not remove any unmerged tree as abandoned based on age or name. No abandonment evidence was established in this inventory. Check process/owner status again immediately before acting; it was not independently established here.

## Two unregistered Git directories

These directories have .git but do not occur in the canonical repository's registered worktree list. Read-only inspection found both clean:

| Directory | Branch | SHA | Commit date CT | Uncommitted | Disposition |
|---|---|---|---|---:|---|
| lane-arch1 | task/lane-arch1 | 2bd47f84a60a27aa594164afbf7b4161682d18a2 | 2026-10-02 10:53:43 CT | 0 | HOLD: unregistered Git directory; do not treat as removable registered worktree |
| lane-gn-clone | task/lane-gn | 715f8e6efb62e3afc431a2978234b5669a4a75de | 2026-10-01 19:54:11 CT | 0 | HOLD: standalone/unregistered clone; ancestry/ownership unresolved |

## Other registered locations

The requested directory is not the whole repository's worktree set. Also registered at capture time:

- `C:/Users/snewt/OneDrive/Desktop/UF`: `refs/heads/main`, `565dc5aead7e068230528d573c395ea21ed5cf5d`.
- `C:/Users/snewt/AppData/Local/Temp/lane-cy2-86c51fd9`: `detached`, `86c51fd91a599b691b4d5197d37a1964ac7078d7`.
- `C:/Users/snewt/AppData/Local/Temp/lane-cy2-review-86c51fd9`: `detached`, `86c51fd91a599b691b4d5197d37a1964ac7078d7`.
- `C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-baseline`: `refs/heads/task/lane-baseline`, `249a5a272f7d74b4cfe587bdbd104549ebd8fef9`.
- `C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-split-plan`: `refs/heads/task/lane-split-plan`, `e7bae1b701fd39b58a05d543843892008d2fb981`.
- The subsequently prepared ORG-0.3 tree is `C:/Users/snewt/OneDrive/Desktop/UF/.deus_worktrees/lane-plugin-audit`, branch `task/lane-plugin-audit`, base `565dc5aead7e068230528d573c395ea21ed5cf5d`. It was created after this snapshot; its PM-only files are listed by that branch's commit.

Active assignments are ORG-0.2 repair and ORG-0.3 read-only audit, plus main. The earlier split-plan documentation tree is inactive and holds a pushed documentation checkpoint; do not reopen its parked implementation. Legacy trees are preserved pending decisions. At most two active lane worktrees plus main; after a reviewed PR merges, remove its lane tree only under the approved removal procedure.

## Main's current uncommitted files

Main remains at `565dc5aead7e068230528d573c395ea21ed5cf5d`. The short status displays 12 entries because `docs/baseline/` is collapsed into one directory. Expanding non-ignored untracked files gives 25 individual files: 19 PM documentation/evidence copies and six other source/local files. No claim of a clean main is made.

| Status | File | Ownership and recommended handling |
|---|---|---|
| ` M` | `docs/STATUS.md` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| ` M` | `docs/VISION.md` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| ` M` | `game/js/plugins/DEUS_WorldGen.js` | Other/unknown writer. Preserve. Prefer a dedicated preservation/fix lane with explicit paths, provenance and review; alternatively a named path-scoped stash only after confirming ownership/Owner disposition. Do not sweep into setup or baseline commits. |
| ` M` | `game/package.json` | Other/unknown writer. Preserve. Prefer a dedicated preservation/fix lane with explicit paths, provenance and review; alternatively a named path-scoped stash only after confirming ownership/Owner disposition. Do not sweep into setup or baseline commits. |
| `??` | `docs/WBS_INDEX.md` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/WBS_ORG.md` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/WBS_SPLIT.md` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/BASELINE_565dc5ae.md` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__check_deus_syntax.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__governance__test_check_claims.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__test_geology_strata.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__test_historical_carrying_capacity.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__test_history_materialization_and_world_age.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__test_new_game_year0.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__test_palette.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__test_strata_cuts_and_caves.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_gate_tools__test_strata_foundation.js.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_native_seed1920951434_year500.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/056323db_native_unmodified_partial.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/565dc5ae_native_seed1920951434_year500.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `docs/baseline/evidence/565dc5ae_native_unmodified_partial.txt` | Codex PM copy; preserved in origin/task/lane-baseline (249a5a27) or origin/task/lane-split-plan (e7bae1b7). Reconcile the three WBS drafts into Deus's tracked setup versions after its PR opens; retain baseline evidence in its lane. Then clear only proven duplicate main copies through the reviewed integration/preservation process. |
| `??` | `game/js/plugins/DEUS_Simulation_Core.js` | Other/unknown writer. Preserve. Prefer a dedicated preservation/fix lane with explicit paths, provenance and review; alternatively a named path-scoped stash only after confirming ownership/Owner disposition. Do not sweep into setup or baseline commits. |
| `??` | `tools/ops/patch_worldgen.js` | Other/unknown writer. Preserve. Prefer a dedicated preservation/fix lane with explicit paths, provenance and review; alternatively a named path-scoped stash only after confirming ownership/Owner disposition. Do not sweep into setup or baseline commits. |
| `??` | `tools/ops/patch_worldgen2.js` | Other/unknown writer. Preserve. Prefer a dedicated preservation/fix lane with explicit paths, provenance and review; alternatively a named path-scoped stash only after confirming ownership/Owner disposition. Do not sweep into setup or baseline commits. |
| `??` | `tools/ops/patch_worldgen3.js` | Other/unknown writer. Preserve. Prefer a dedicated preservation/fix lane with explicit paths, provenance and review; alternatively a named path-scoped stash only after confirming ownership/Owner disposition. Do not sweep into setup or baseline commits. |

For `DEUS_Simulation_Core.js`, static inspection found only self-references, no plugins.js entry and no Core companion-loader entry. Dynamic/runtime liveness remains an ORG-0.3 audit question; do not delete it or certify it dead. Keep all three patch_worldgen scripts as evidence until their owner/use is resolved.

## Approval and removal procedure

1. Owner approves exact worktree paths from the conditional shortlist; branches are retained. Recheck tip, merge ancestry, status and live ownership before acting.
2. Tag each approved tip `archive/<branch>` at the recorded full SHA. Check existing tag collisions and never overwrite tags. Preserve the backup branch `backup/pre-rollback-gemini-swarm-2026-10-02` and stash@{0}.
3. Inspect uncommitted files and copy anything worth keeping, with original paths and hashes, into `scratchpad/<lane>/` before removal. Preserve ignored/local files too; zero git-status entries does not prove they are disposable. No blind sweep or deletion.
4. Verify every resolved absolute removal target stays in the Owner-approved worktree directory. Use `git worktree remove <approved absolute path>` only. No --force, filesystem recursive deletion, worktree pruning or branch deletion. If Git refuses, stop and report why.
5. Keep main clean by putting work in lanes. The Owner never commits by hand; all merges to main go through reviewed PRs and the required independent checks.

No runtime tests were run for this read-only Git inventory. It does not assert game boot or test PASS. Raw local snapshot including all dirty-tree paths: `scratchpad/lane-baseline/worktrees_snapshot.json`; helper scripts are local throwaway investigation tools, not new CI.
