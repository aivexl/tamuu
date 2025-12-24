---
description: D1 Database configuration and migration commands
---

# D1 Database Configuration

**Database Name:** `tamuu` (NOT tamuuid-db)

## Run Migration
// turbo
```bash
cd server/workers
npx wrangler d1 execute tamuu --remote --command "YOUR_SQL_HERE"
```

## Check Tables
```bash
npx wrangler d1 execute tamuu --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## Example: Add column
```bash
npx wrangler d1 execute tamuu --remote --command "ALTER TABLE guests ADD COLUMN shared_at TEXT;"
```
