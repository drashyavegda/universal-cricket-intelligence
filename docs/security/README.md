# Security documentation

| Document | Contents |
| --- | --- |
| [SECURITY_PRACTICES.md](SECURITY_PRACTICES.md) | Control-by-control: authn, authz, session, headers, forms, data protection, logging |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Assets, actors, STRIDE-style walkthrough, mitigations and residual risk |
| [KNOWN_GAPS.md](KNOWN_GAPS.md) | Every gap, stated plainly, with a mitigation and a phase |

Policy artefacts that back these documents live in [`../../security/`](../../security/):
rate-limit policies, spam rules, input-validation notes, audit event catalogue, privacy notes.

**Absolute rule:** this project never claims a certification (ISO 27001, SOC 2, PCI DSS, "GDPR
certified"). It describes what the code does. See `KNOWN_GAPS.md` before quoting anything to a
customer.
