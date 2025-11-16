# drbushramirzah-backend

Backend for DrBushraMirzah blog — Express + Supabase + Redis + cookie-auth.

## Setup

1. Copy `.env.example` to `.env` and fill values (SUPABASE_* keys, COOKIE_SECRET, etc).
2. Run `npm install`.
3. Run SQL (provided) in Supabase SQL editor to create tables (posts, affiliates, admins).
4. Create a storage bucket `posts-images` in Supabase.
5. Seed admin and sample post:
   ```bash
   npm run seed
