# src/types/

Live file: `lib/core/types.ts` — the single domain model (Player, Team, Match, Dataset,
DatasetRecord, SavedReport, User, Session, AuditEntry, Testimonial, FeedbackSubmission, …), plus
`types/pdf-parse.d.ts` for the untyped parser package.

Do not create parallel interfaces here for API responses: derive them
(`Pick<Player, 'id' | 'name'>`) or declare a narrow local interface in the page that uses it. The
application already keeps response shapes close to the component that renders them, which avoids the
classic "three versions of Player" problem.
