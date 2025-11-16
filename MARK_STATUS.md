# MARK — Backend Status Snapshot

Date: 2025-10-21
Repo: `d:\Work\DrBushraMirzah\DrbushramirzhaBlog\backend`
Base URL: `http://localhost:8080`

## Implemented APIs
- Auth: `POST /api/auth/login`, `POST /api/auth/logout` (sets `admin_token` cookie)
- Posts: `GET /api/posts`, `GET /api/posts/:slug`, `POST /api/posts`, `PUT /api/posts/:id`, `DELETE /api/posts/:id`
- Uploads: `POST /api/upload` (Supabase storage)
- Affiliate: `GET /a/:postSlug/:provider` (redirect + click log)

## Data & Services
- Database: Supabase (Postgres) via service role
- Cache: Redis with helpers (`cacheGet`, `cacheSet`)
- SEO & Slug: `suggestSeo`, `slugify`
- Seed: `src/seed/seedAdmin.ts` (admin + sample post)

## Security
- Admin protection via `requireAdmin` middleware (verifies `admin_token` cookie using JWT)
- Cookie config: HTTP-only, `sameSite: 'strict'`, `secure: false` in dev

## Integration Note (Admin UI)
- Current frontend admin client sends `Authorization: Bearer <token>` and does not include cookies.
- Backend requires `admin_token` cookie for protected routes. This will cause 401 unless cookies are sent.
- Recommended options:
  - Frontend: set `credentials: 'include'` in admin API fetch and rely on cookie; stop using Bearer.
  - Or Backend: extend `requireAdmin` to accept `Authorization: Bearer <jwt>` as alternative.

## Verification
- Architecture documentation created: `ARCHITECTURE_ANALYSIS.md`
- Server entry: `src/server.ts` mounts routes, CORS, helmet, cookie-parser

---
This MARK captures the backend state and key integration considerations with the admin frontend.