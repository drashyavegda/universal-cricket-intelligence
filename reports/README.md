# reports/

Holds **report definitions and templates**, never generated reports. A generated report contains user
data and a snapshot of the analysis; committing one leaks data and rots immediately.

```
reports/
├── monthly/    recurring operational report definitions
├── annual/     annual review definition (season retrospective)
└── archive/    where an operator may keep exports outside git (git-ignored)
```

## In-app reports (implemented)

Generated at `/reports` by `lib/core/reporting/build.ts` for four kinds (`talent`, `player`, `team`,
`venue`), each with 12 sections and a quality score. Export formats: `md`, `html`, `pdf`, `docx`,
`xlsx`, `pptx`.

| Kind | Use |
| --- | --- |
| `talent` | selection brief: ranked pool, gaps, risks, recommendations |
| `player` | single-player due diligence |
| `team` | squad review and auction priorities |
| `venue` | conditions brief for a fixture |

Every generated report stores its sources and quality score so a later reader can see what it was
based on — and can tell whether it has since been superseded.
