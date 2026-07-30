# Master Router staging

This file triggers and documents the Git-backed staging Preview for the master router.

- Vercel target: Preview custom environment `staging`
- Git branch: `staging`
- `MASTER_ORIGIN`: ZenTube custom environment `staging`
- `UPSTREAM_PROTECTION_BYPASS`: configured in Vercel custom environment env vars
- Data boundary: ZenTube uses the isolated persistent Supabase `staging` branch
- Production branch remains `main`
- Last staging env refresh: 2026-07-30

Do not put secrets in this file.
