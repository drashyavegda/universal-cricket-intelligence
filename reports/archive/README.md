# reports/archive/

Empty and **git-ignored** apart from this file. Store generated exports here only on a machine that is
not syncing to a repository, or point `S3_*`/Supabase Storage at a private bucket instead.

A generated report contains player data, internal recommendations and user names. Treat the folder as
personal data: encrypt at rest, expire after 12 months, and never attach an archive to a support ticket.
