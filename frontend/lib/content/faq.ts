/**
 * FAQ content. Every answer describes behaviour that exists in this codebase and
 * has been exercised in testing (see docs/TESTING.md). Claims that would require a
 * paid service or a legal certification are deliberately absent.
 */

export type FaqCategory =
  | 'Platform & features'
  | 'Player analytics'
  | 'Uploading & data'
  | 'Auction simulation'
  | 'AI & recommendations'
  | 'Accounts & security'
  | 'Privacy & deletion'
  | 'Limitations';

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  /** Short list rendered inside the open accordion for scannability. */
  points?: string[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  'Platform & features',
  'Player analytics',
  'Uploading & data',
  'Auction simulation',
  'AI & recommendations',
  'Accounts & security',
  'Privacy & deletion',
  'Limitations',
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-this',
    category: 'Platform & features',
    question: 'What exactly does the platform do?',
    answer:
      'It ingests cricket datasets, validates them, and then runs 30 analysis modules over the approved records: player profiles, talent discovery, comparison, rankings, squad and XI building, auction valuation and simulation, match prediction, venue intelligence, workload monitoring, reporting and an AI assistant that explains the computed results.',
    points: ['Works without any external API key', 'Same data feeds every module', 'Every metric keeps a provenance label'],
  },
  {
    id: 'exports',
    category: 'Platform & features',
    question: 'Which formats can I export reports in?',
    answer:
      'PDF, DOCX, XLSX, PPTX, Markdown and HTML. All six are produced locally by the application — no third-party converter is involved — and each export is generated from the same saved report, so the numbers match across formats.',
  },
  {
    id: 'demo-vs-real',
    category: 'Platform & features',
    question: 'How do I know whether I am looking at demo or real data?',
    answer:
      'Every record carries a provenance flag. Seeded demo records are marked DEMO (the player, match and auction data is synthetic), uploaded records are marked UPLOADED, and computed model outputs are marked MODEL. The interface labels the current mode near the top of every workspace page.',
  },
  {
    id: 'metrics',
    category: 'Player analytics',
    question: 'How are the player metrics calculated?',
    answer:
      'Directly from the approved ball-by-ball and aggregate records: strike rate and average from runs/balls/dismissals, economy from runs conceded per over, phase splits from the ball events, and composite scores from weighted, published formulas. Rates are never derived from partial or unapproved rows.',
  },
  {
    id: 'sample-size',
    category: 'Player analytics',
    question: 'What happens when a player has very little data?',
    answer:
      'Small samples are flagged rather than hidden. Confidence shrinks with the number of balls or matches, low-evidence metrics are marked accordingly, and the profile shows the sample size next to the number so a 40-run cameo is not mistaken for a season of form.',
  },
  {
    id: 'rankings',
    category: 'Player analytics',
    question: 'Are the rankings official or comparable to league awards?',
    answer:
      'No. Rankings are percentile-based scores computed inside your workspace from the data you have approved. They are useful for internal comparison and shortlisting, but they are not official league rankings and should not be quoted as such.',
  },
  {
    id: 'pdf-upload',
    category: 'Uploading & data',
    question: 'Can I upload PDF scorecards?',
    answer:
      'Yes, for PDFs that contain real text. The parser extracts the text layer and runs it through the same column-mapping and validation pipeline as a spreadsheet. Scanned or photographed PDFs (images with no text layer) cannot be read — you would need an OCR step first, which this build does not include.',
    points: ['Text-based PDF: supported', 'Scanned/image PDF: not supported', 'Password-protected PDF: not supported'],
  },
  {
    id: 'file-types',
    category: 'Uploading & data',
    question: 'Which file types and sizes are accepted?',
    answer:
      'CSV, XLSX, JSON, PDF and plain text up to the configured upload limit (25 MB by default, adjustable through an environment variable) and up to the configured row cap per dataset. Files are parsed on the server; nothing is uploaded to a third-party service.',
  },
  {
    id: 'mapping',
    category: 'Uploading & data',
    question: 'My column names do not match yours. Do I have to rename them?',
    answer:
      'No. Upload the file and map each source column to a platform field in the mapping step. The mapping is stored with the dataset and shown again on every re-import, so the same source can be loaded repeatedly without redoing the work.',
  },
  {
    id: 'approval',
    category: 'Uploading & data',
    question: 'Do uploaded rows get used immediately?',
    answer:
      'Not until they are approved. Row-level validation reports errors and warnings, and only approved rows feed the analytics engines. An analyst can upload and edit; approving requires the owner or an appropriately privileged role, and every approval is written to the audit trail.',
  },
  {
    id: 'auction-method',
    category: 'Auction simulation',
    question: 'How is the auction valuation calculated?',
    answer:
      'Valuation combines the player’s role-adjusted performance score, scarcity of that role in the current pool, age curve and availability assumptions into a value range and a bid ceiling. The output is a planning aide expressed in lakh, with the assumptions printed next to the number.',
  },
  {
    id: 'auction-sim',
    category: 'Auction simulation',
    question: 'Is the virtual auction room repeatable?',
    answer:
      'Yes. Simulations are seeded: the same seed, squad and bid rules produce the same sequence of sales, so a scenario can be replayed and defended in a meeting. Change the seed and you get a different but equally reproducible path.',
  },
  {
    id: 'ai-required',
    category: 'AI & recommendations',
    question: 'Do I need an AI provider key to use the platform?',
    answer:
      'No. All analytics are computed locally. An AI key only changes the narration: with a key configured, the assistant writes richer prose around computed facts; without one, it returns a deterministic templated answer. The numbers are identical either way.',
  },
  {
    id: 'ai-fabricate',
    category: 'AI & recommendations',
    question: 'Can the AI invent statistics or recommend a player who does not exist?',
    answer:
      'It is designed not to. The language model never computes — the deterministic engine produces the facts, and the narration step is restricted to those facts and cites them. Player recommendations always resolve to a record in your workspace, with its provenance shown.',
  },
  {
    id: 'prompt-injection',
    category: 'AI & recommendations',
    question: 'What if an uploaded document contains malicious instructions?',
    answer:
      'Knowledge-base and dataset text is treated as untrusted data, not as instructions. The assistant keeps a guard that flags instruction-like content in retrieved documents and refuses to execute write actions from it; writes always require explicit user confirmation.',
  },
  {
    id: 'auth',
    category: 'Accounts & security',
    question: 'How are accounts and sessions protected?',
    answer:
      'Passwords are hashed with scrypt and a per-user salt, sessions use an HttpOnly, SameSite cookie with a server-side expiry, five failed attempts lock an account for ten minutes, and optional TOTP two-factor authentication can be enabled per user. Four roles (owner, analyst, scout, viewer) gate every write action.',
  },
  {
    id: 'secrets',
    category: 'Accounts & security',
    question: 'Are API keys or secrets visible in the browser?',
    answer:
      'No. Provider keys live only in server-side environment variables and are never returned to the client; the settings page shows whether a key is configured (a boolean), never the key itself. Session tokens are HttpOnly and therefore unreadable from JavaScript.',
  },
  {
    id: 'cookies',
    category: 'Privacy & deletion',
    question: 'Which cookies and trackers does the site use?',
    answer:
      'One essential cookie holds your signed-in session. Optional Google Analytics 4 is loaded only if a measurement ID is configured and you accept the consent banner; declining, or sending Do Not Track, keeps it switched off and the platform fully functional. No advertising cookies are used.',
  },
  {
    id: 'deletion',
    category: 'Privacy & deletion',
    question: 'How do I delete my data?',
    answer:
      'Use the contact form and choose “Data deletion request”. Owners can also delete datasets from the Data Centre directly. Server-side deletion removes the records from the store; backups taken by your hosting provider are governed by that provider’s retention policy and must be handled there.',
  },
  {
    id: 'limits',
    category: 'Limitations',
    question: 'What are the honest limitations of this build?',
    answer:
      'There is no live scoring feed, no payment processing and no official league data bundled. Team names, opponents and player records in demo mode are synthetic. Workload figures are a training-load proxy and not medical advice. Rate limiting is per process, so a multi-instance deployment needs a shared limiter. Outputs are decision support, not guarantees.',
    points: ['No live feed', 'No bundled official data', 'Not medical advice', 'Decision support, not prediction certainty'],
  },
  {
    id: 'hosting',
    category: 'Limitations',
    question: 'What do I need to configure for a real deployment?',
    answer:
      'A canonical site URL for absolute links and the sitemap, an optional Google Analytics measurement ID, an optional Turnstile (or equivalent) CAPTCHA key pair, and — for AI narration — an OpenAI-compatible key. TLS, HSTS at the edge and backups are hosting-provider settings; the app includes the application-level pieces and documents the rest.',
  },
];

export const faqCategoriesWithCounts = () =>
  FAQ_CATEGORIES.map((category) => ({ category, count: FAQ_ITEMS.filter((i) => i.category === category).length }));
