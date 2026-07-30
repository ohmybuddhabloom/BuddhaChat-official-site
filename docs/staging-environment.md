# Unified staging environment

This branch is the release-candidate baseline for the official site, Legal site, and Master Router.

- Vercel target: custom environment `staging`
- Git branch: `staging`
- Database-backed routes use the isolated persistent Supabase `staging` branch
- Production branch remains `main`

Do not put secrets in this file.
