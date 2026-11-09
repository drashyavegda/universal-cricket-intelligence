# Documentation index

Everything an engineer, operator or reviewer needs, organised by the question they are asking. If a
document is missing here, it does not exist — this index is kept complete on purpose.

## The 13 required documents

| Required | Where it lives | What it answers |
| --- | --- | --- |
| README | [`../README.md`](../README.md) | what this is, how to run it in 5 minutes |
| PRD | [`../PRD.md`](../PRD.md) (expanded per-feature detail in [`requirements/FEATURE_REQUIREMENTS_30.md`](requirements/FEATURE_REQUIREMENTS_30.md)) | 30 features, audiences, non-goals, acceptance criteria |
| Project blueprint | [`../PROJECT_BLUEPRINT.md`](../PROJECT_BLUEPRINT.md) | how the package maps onto the existing codebase |
| Architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | layers, module map, request lifecycle, seams |
| Roadmap | [`../ROADMAP.md`](../ROADMAP.md) | phases 1–6, what exists, what is planned |
| API documentation | [`api/API_REFERENCE.md`](api/API_REFERENCE.md) | all 44 routes, payloads, errors, auth |
| Database schema | [`database/SCHEMA_REFERENCE.md`](database/SCHEMA_REFERENCE.md) | entities, relationships, indexes, JSON-store mapping |
| Deployment | [`deployment/README.md`](deployment/README.md) | local, Docker, Vercel, Render, Supabase |
| Environment variables | [`deployment/ENVIRONMENT_VARIABLES.md`](deployment/ENVIRONMENT_VARIABLES.md) | every variable, default, whether it is client-exposed |
| Security | [`security/SECURITY_PRACTICES.md`](security/SECURITY_PRACTICES.md) | controls, threat model, known gaps |
| Testing | [`testing/TEST_STRATEGY.md`](testing/TEST_STRATEGY.md) | 151 + 18 + 58 checks, what is not covered |
| Contributing | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | conventions, review gates, definition of done |
| Changelog | [`../CHANGELOG.md`](../CHANGELOG.md) | what changed, in order, with reasons |

## By audience

**Evaluating the product** → [`requirements/USER_PERSONAS_AND_JOBS.md`](requirements/USER_PERSONAS_AND_JOBS.md) ·
[`requirements/WEBSITE_REQUIREMENTS_14.md`](requirements/WEBSITE_REQUIREMENTS_14.md) ·
[`user-guides/RR_SCOUTING_WORKSPACE.md`](user-guides/RR_SCOUTING_WORKSPACE.md)

**Using it** → [`user-guides/ANALYST_GUIDE.md`](user-guides/ANALYST_GUIDE.md) ·
[`user-guides/SCOUT_GUIDE.md`](user-guides/SCOUT_GUIDE.md) ·
[`user-guides/ADMIN_GUIDE.md`](user-guides/ADMIN_GUIDE.md)

**Changing the code** → [`../ARCHITECTURE.md`](../ARCHITECTURE.md) ·
[`architecture/ARCHITECTURE_OVERVIEW.md`](architecture/ARCHITECTURE_OVERVIEW.md) ·
[`architecture/FEATURE_MODULE_MAP.md`](architecture/FEATURE_MODULE_MAP.md) ·
[`architecture/DATA_FLOW_AND_PROVENANCE.md`](architecture/DATA_FLOW_AND_PROVENANCE.md)

**Reviewing decisions** → [`decisions/README.md`](decisions/README.md) (ADR-0001 … 0009)

**Operating it** → [`deployment/LOCAL_DEVELOPMENT.md`](deployment/LOCAL_DEVELOPMENT.md) ·
[`deployment/TROUBLESHOOTING.md`](deployment/TROUBLESHOOTING.md) ·
[`../security/BACKUP_AND_RECOVERY.md`](../security/BACKUP_AND_RECOVERY.md)

**Assessing risk** → [`security/THREAT_MODEL.md`](security/THREAT_MODEL.md) ·
[`security/KNOWN_GAPS.md`](security/KNOWN_GAPS.md) ·
[`database/DATA_RETENTION.md`](database/DATA_RETENTION.md)

## Status vocabulary

| Label | Meaning |
| --- | --- |
| **EXISTS** | implemented in the running application, tested |
| **NEW** | created by this package, not yet wired into the running app |
| **PLANNED** | scoped in a document, no code |

Nothing in this package is described as complete unless it is running and tested. If a document
disagrees with the code, the code wins and the document is a bug.

## Maintaining docs

* Change a formula ⇒ update the PRD acceptance criterion and the ADR if the decision changed.
* Change a route ⇒ `api/API_REFERENCE.md` + `lib/site.ts` + tests, in one pull request.
* Add a dependency ⇒ `../legal/licenses/THIRD_PARTY_LICENSES.md`.
* Add an env var ⇒ `.env.example` + `ENVIRONMENT_VARIABLES.md` + the deployment table.
