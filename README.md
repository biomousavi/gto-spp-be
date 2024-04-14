# add new migration
- npx wrangler d1 migrations create poker-d1 new_migration

- (empty DB) npx prisma migrate diff --script --from-empty --to-schema-datamodel ./prisma/schema.prisma >> migrations/0001_init.sql

- (update DB) 
npx prisma migrate diff \
  --from-local-d1 \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script \
  --output migrations/0002_create_post_table.sql

- npx wrangler d1 migrations apply prod-prisma-d1-app --local
- npx wrangler d1 migrations apply prod-prisma-d1-app --remote
- npx prisma generate