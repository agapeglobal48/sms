# School SMS — Pakistan Government Schools

Multi-tenant School Management System with an integrated Asset Management
System (AMS), built for Pakistani government schools.

## Roles

| Role          | Scope                                                              |
|---------------|---------------------------------------------------------------------|
| Superadmin    | All schools. Creates/deletes schools, provisions School Admins, views all data, manages funding to schools. |
| School Admin  | One school. Manages teachers, classes, students, fees, AMS assets, bills against funding. |
| Teacher       | Assigned classes. Attendance, marks, homework, result card export. |
| Parent        | Their linked children only. Read-only: attendance, marks, homework, fee status. |

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security + Storage)

## Project structure

```
src/
  app/
    (auth)/login/          # public login page
    (superadmin)/superadmin/
      schools/              # create/delete schools, provision school admins
      funding/              # allocate funding to schools
    (school-admin)/admin/
      classes/
      teachers/
      students/
      fees/
    (teacher)/teacher/
      attendance/
      marks/
      homework/
    (parent)/parent/        # read-only dashboard
    ams/
      assets/                # asset registry (serial keys, categories, assignment)
      funding-bills/         # bills uploaded against superadmin funding
  lib/
    supabase/
      client.ts              # browser Supabase client
      server.ts               # server Supabase client (Server Components/Actions)
    types/
      database.ts             # placeholder — replace with generated DB types in Phase 1
  middleware.ts               # session refresh + coarse route protection
```

Route groups (parentheses) keep each role's pages organized without affecting
the URL — e.g. `(school-admin)/admin/classes` still serves at `/admin/classes`.
`ams/` is a standalone section reachable from a top-nav button for Superadmin
and School Admin, per the spec.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project at https://supabase.com
3. Copy `.env.example` to `.env.local` and fill in your project's URL and keys:
   ```bash
   cp .env.example .env.local
   ```
4. Run the dev server:
   ```bash
   npm run dev
   ```

No database schema exists yet — that's Phase 1.

## Roadmap

- [x] **Phase 0** — Project scaffolding (this)
- [ ] **Phase 1** — Auth & multi-tenancy (schools, profiles/roles, RLS policies)
- [ ] **Phase 2** — School Admin core: classes, teachers, students, fees, Excel import/export
- [ ] **Phase 3** — Teacher module: attendance, marks, homework, result card export
- [ ] **Phase 4** — Parent portal (read-only)
- [ ] **Phase 5** — AMS: asset registry with serial keys, categories, classroom/user assignment
- [ ] **Phase 6** — Funding & bills: superadmin funding allocation, school admin bill uploads
- [ ] **Phase 7** — Superadmin analytics, reporting, polish
