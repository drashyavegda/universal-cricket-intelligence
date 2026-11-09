# backend/storage/ — Object storage (planned)

Nothing is stored by this service; it writes no files and keeps no state.

Phase 3 will add a thin storage client (S3-compatible: AWS S3, Cloudflare R2, Supabase Storage, MinIO)
for generated artefacts only — never for source data. Requirements: server-side credentials, server-side
encryption, pre-signed URLs with short expiry, and a lifecycle rule to expire exports after 30 days.
