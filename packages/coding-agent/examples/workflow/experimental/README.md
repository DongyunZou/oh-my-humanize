# Experimental Workflows

These workflows are generic enough to run through `OMHFLOW_DIR` and have some
real Project x Flow x Task evidence, but they are not formally promoted
built-ins. Promotion to `packages/coding-agent/examples/workflow/<flow>/`
requires at least 100 cumulative successful hours, transcript audit, meaningful
multi-node work, and no unresolved OMH infra defect.

Current promoted built-ins: none.

| Flow | Why it is experimental | Missing before promotion |
| --- | --- | --- |
| `agent-build-review-loop` | Real build/review loop evidence on HTTPX plus recent Vite semantic canaries. | 100h cumulative clean evidence across diverse contexts. |
| `humanize-rlcr` | Real RLCR-style implementation/review evidence and recent Axum semantic canaries. | Longer clean current-commit evidence and broader contexts. |
| `kda-humanize` | Nested subflow composition and KDA-style candidate validation evidence. | Fresh clean long-running runs after recent KDA flow-control repairs. |
| `parallel-implementation-review` | Real parallel implementation/review evidence and repaired durable final archive contract. | Fresh clean long-running runs after finalizer repair. |
| `bug-triage-repro-fix` | One real bug-triage/fix context with task-contract and regression evidence. | More contexts and audit before promotion. |
| `documentation-audit` | One documentation-audit context plus bounded fan-in repair. | Fresh runs proving the repaired fan-in contract. |
| `refactor-migration-plan` | One migration/refactor context with real validation evidence. | More contexts and archive-completeness proof. |
| `release-hardening` | Release-readiness evidence with validation/security checks. | Code/project-impact diversity and more clean long runs. |
| `test-generation-hardening` | One test-generation context with validation evidence. | More real projects and transcript audits. |
| `performance-optimization-search` | One performance-search context with measured benchmark evidence. | Fresh runs after archive/terminal-selection repairs. |
| `research-reproduction` | One research-reproduction context with real command evidence. | Additional tasks and audit, especially code-changing or decision-impacting cases. |

Do not treat this directory as a stability guarantee. If a flow shows a
flow-library defect during Phase 3, repair and recanary it before using it in a
larger fanout.
