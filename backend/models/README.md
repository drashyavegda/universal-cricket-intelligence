# backend/models/ — Domain models (planned)

This service is **stateless**: it receives numeric arrays and returns statistics. It owns no player,
match or user entities, so there are no ORM models here today.

Why that is deliberate:
* the domain model already exists once, in `lib/core/types.ts`; a second copy in Pydantic would drift
  within a sprint;
* every entity this service would need (players, fixtures) is reachable through the BFF once phase 4
  adds a read-only contract;
* a stateless service can be redeployed, scaled or deleted without a migration.

When phase 4 adds persistence, models land here with:
1. `__tablename__` matching `database/schemas/public_schema.sql` exactly (no ORM-only naming);
2. explicit `created_at`/`updated_at` server defaults;
3. no business rules in the model layer — validation belongs in `schemas/`.
