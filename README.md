# Web Eval

A VS Code-style evaluation platform for HTML / CSS / JavaScript assignments.
Admins create projects (problem statement + asset library + starter files),
assign them to students by email with a time window, and view submissions.
Students write code in a Monaco (VS Code) editor and see a live rendered
preview before submitting. Backend is Supabase (Auth + Postgres + Storage).

## 1. Supabase setup

1. Create a free project at <https://supabase.com>.
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → **Run**.
   This creates tables, Row Level Security policies, the `project-assets`
   Storage bucket, and a trigger that auto-creates a profile row on sign-up.
3. In **Authentication → Providers**, keep **Email** enabled. For local
   development disable *Confirm email* so you can sign in instantly.
4. Copy your **Project URL** and **anon key** from Project Settings → API.

## 2. Local run

```bash
cp .env.example .env     # paste your URL + anon key
npm install
npm run dev              # http://localhost:5173
npm test                 # run the test suite
```

## 3. Promote yourself to admin

1. Sign up at `/login` with any email + password.
2. In Supabase SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

3. Reload. You'll see an **Admin** link in the header.

## 4. Workflow

**Admin** (`/admin`):

- **Projects** — create a project with a title and problem statement.
- **Project edit** — tweak starter files (`index.html`, `styles.css`,
  `script.js`, or any extra file you add) in an embedded Monaco editor, and
  upload asset library files (images, fonts, JSON). Students reference them
  by filename, e.g. `<img src="logo.png">`.
- **Assignments** — pick a project, paste a list of student emails, set a
  start and end datetime. Students only see the project in that window.
- **Submissions** — view every submission as a read-only VS Code pane +
  live rendered preview.

**Student** (`/`):

- See a list of your assignments with their open/close times.
- Click **Open** during the window → VS Code-style editor with Monaco, file
  tabs, asset library in the sidebar, live iframe preview, countdown, and a
  **Submit** button. Work is auto-saved to `localStorage` as you type.
- A student can only submit while `now BETWEEN starts_at AND ends_at`,
  enforced in Postgres by RLS (not just the UI).

## 5. Free-tier capacity (150 concurrent submits)

A submission is a few KB of JSON. The Supabase free tier gives:

- Postgres 500 MB — a submission at ~20 KB means ~25,000 submissions fit.
- API: unlimited req/s to the hosted REST API (behind PgBouncer).
  150 inserts arriving at once is well within normal headroom.
- Storage: 1 GB files + 5 GB bandwidth/month — plenty for an asset library
  of logos / product shots unless you upload large videos.
- Auth: 50,000 MAU — far beyond a classroom-size cohort.

The only free-tier limit worth watching if you grow: **200 concurrent
realtime connections**. This app does not use realtime, so it does not
apply.

## 6. Security notes

- RLS enforces: students can only read projects/assets they're assigned to;
  they can only insert a submission for *their own* assignment, during the
  valid time window; only admins can read all submissions.
- The preview iframe is sandboxed with `allow-scripts allow-forms
  allow-same-origin`. Student JS runs in that iframe, isolated from the
  admin app shell. Do not relax the sandbox.

## 7. Deploy

- Any static host (Vercel, Netlify, Cloudflare Pages). `npm run build`
  outputs `dist/`. Set the same two env vars in the host.
