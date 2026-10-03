# Setup CI post-repair syntax failure probes

Source HEAD: 6b9ec844158c969a144ffae67f2061ebcb7b4f9a
Owner repair: da9e6906137e77dc9f2f1a899143541e166815c9

These are disposable synthetic roots. No native run was performed.

## valid
Command: "C:\Program Files\nodejs\node.exe" "C:\Users\snewt\.deus_worktrees\org-setup\tools\ci\syntax_check.js" --root "C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\valid"
Exit: 0 (expected 0)
```text
WARN allowlisted path not found (remove it from INTENTIONALLY_INVALID): tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js
syntax_check: 1 files checked (0 plugins incl. plugins.js, 0 sim, 1 tools), 0 failed; 0 allowlisted invalid fixture(s) skipped
```

## malformed_executable_fixture
Command: "C:\Program Files\nodejs\node.exe" "C:\Users\snewt\.deus_worktrees\org-setup\tools\ci\syntax_check.js" --root "C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\malformed_executable_fixture"
Exit: 1 (expected 1)
```text
FAIL tools/fixtures/real_runner.js
    C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\malformed_executable_fixture\tools\fixtures\real_runner.js:1
    const malformed = ;
                      ^
    
    SyntaxError: Unexpected token ';'
        at wrapSafe (node:internal/modules/cjs/loader:1804:18)
        at checkSyntax (node:internal/main/check_syntax:76:3)
    
    Node.js v24.19.0
WARN allowlisted path not found (remove it from INTENTIONALLY_INVALID): tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js
syntax_check: 2 files checked (0 plugins incl. plugins.js, 0 sim, 2 tools), 1 failed; 0 allowlisted invalid fixture(s) skipped
```

## malformed_sim
Command: "C:\Program Files\nodejs\node.exe" "C:\Users\snewt\.deus_worktrees\org-setup\tools\ci\syntax_check.js" --root "C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\malformed_sim"
Exit: 1 (expected 1)
```text
FAIL game/js/sim/test.js
    C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\malformed_sim\game\js\sim\test.js:1
    const malformed = ;
                      ^
    
    SyntaxError: Unexpected token ';'
        at wrapSafe (node:internal/modules/cjs/loader:1804:18)
        at checkSyntax (node:internal/main/check_syntax:76:3)
    
    Node.js v24.19.0
WARN allowlisted path not found (remove it from INTENTIONALLY_INVALID): tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js
syntax_check: 2 files checked (0 plugins incl. plugins.js, 1 sim, 1 tools), 1 failed; 0 allowlisted invalid fixture(s) skipped
```

## malformed_plugins_js
Command: "C:\Program Files\nodejs\node.exe" "C:\Users\snewt\.deus_worktrees\org-setup\tools\ci\syntax_check.js" --root "C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\malformed_plugins_js"
Exit: 1 (expected 1)
```text
FAIL game/js/plugins.js
    C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\malformed_plugins_js\game\js\plugins.js:1
    const malformed = ;
                      ^
    
    SyntaxError: Unexpected token ';'
        at wrapSafe (node:internal/modules/cjs/loader:1804:18)
        at checkSyntax (node:internal/main/check_syntax:76:3)
    
    Node.js v24.19.0
WARN allowlisted path not found (remove it from INTENTIONALLY_INVALID): tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js
syntax_check: 2 files checked (1 plugins incl. plugins.js, 0 sim, 1 tools), 1 failed; 0 allowlisted invalid fixture(s) skipped
```

## exact_allowlisted_only
Command: "C:\Program Files\nodejs\node.exe" "C:\Users\snewt\.deus_worktrees\org-setup\tools\ci\syntax_check.js" --root "C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\exact_allowlisted_only"
Exit: 0 (expected 0)
```text
SKIP tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js (INV-GOV-02 mutant fragment (read as text, not executed))
syntax_check: 1 files checked (0 plugins incl. plugins.js, 0 sim, 1 tools), 0 failed; 1 allowlisted invalid fixture(s) skipped
```

## allowlisted_plus_malformed_neighbor
Command: "C:\Program Files\nodejs\node.exe" "C:\Users\snewt\.deus_worktrees\org-setup\tools\ci\syntax_check.js" --root "C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\allowlisted_plus_malformed_neighbor"
Exit: 1 (expected 1)
```text
FAIL tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims_neighbor.js
    C:\Users\snewt\OneDrive\Desktop\UF\scratchpad\org-setup-review-overnight\probe_3340f71636074629a0198ec74c02f4cf\allowlisted_plus_malformed_neighbor\tools\governance\fixtures\invariants\INV-GOV-02\tools\governance\check_claims_neighbor.js:1
    const malformed = ;
                      ^
    
    SyntaxError: Unexpected token ';'
        at wrapSafe (node:internal/modules/cjs/loader:1804:18)
        at checkSyntax (node:internal/main/check_syntax:76:3)
    
    Node.js v24.19.0
SKIP tools/governance/fixtures/invariants/INV-GOV-02/tools/governance/check_claims.js (INV-GOV-02 mutant fragment (read as text, not executed))
syntax_check: 2 files checked (0 plugins incl. plugins.js, 0 sim, 2 tools), 1 failed; 1 allowlisted invalid fixture(s) skipped
```
