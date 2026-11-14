begin;
create table if not exists public.form_studio_projects (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null,
  revision uuid not null,
  document jsonb not null check (
    jsonb_typeof(document) = 'object' and
    (document->>'format' = 'form-studio' and jsonb_typeof(document->'name') = 'string') is true
  ),
  title text generated always as (document->>'name') stored,
  primary key (owner_id, project_id)
);
alter table public.form_studio_projects enable row level security;
revoke all on public.form_studio_projects from public, anon, authenticated;
grant select, insert, update on public.form_studio_projects to authenticated;
drop policy if exists form_studio_project_owner on public.form_studio_projects;
create policy form_studio_project_owner on public.form_studio_projects for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
insert into public.form_studio_projects (owner_id, project_id, revision, document)
select owner_id, '00000000-0000-4000-8000-000000000001'::uuid, revision, document
from public.form_studio_workspaces on conflict do nothing;
commit;
select c.relrowsecurity as owner_checks_enabled, p.policyname,
       has_table_privilege('anon', c.oid, 'SELECT') as anonymous_read
from pg_class c join pg_policies p on p.schemaname='public' and p.tablename=c.relname
where c.oid='public.form_studio_projects'::regclass;
