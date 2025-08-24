# create db if not exists
npx wrangler d1 create poker-d1

# run migrations
npx wrangler d1 migrations apply poker-d1 --local
npx wrangler d1 migrations apply poker-d1 --remote



# add new migration
1) - npx wrangler d1 migrations create poker-d1 new_migration

2) - (empty DB) npx prisma migrate diff --script --from-empty --to-schema-datamodel ./prisma/schema.prisma >> migrations/0001_init.sql

2) - (update DB) 
npx prisma migrate diff \
  --from-local-d1 \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script \
  --output migrations/0002_create_post_table.sql

3) - npx wrangler d1 migrations apply poker-d1 --local
4) - npx wrangler d1 migrations apply poker-d1 --remote
5) - npx prisma generate