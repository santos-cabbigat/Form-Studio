begin;
create table if not exists public.form_studio_workspaces (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  revision uuid not null,
  document jsonb not null check (jsonb_typeof(document) = 'object' and document->>'format' = 'form-studio')
);
alter table public.form_studio_workspaces enable row level security;
revoke all on public.form_studio_workspaces from public, anon, authenticated;
grant select, insert, update on public.form_studio_workspaces to authenticated;
drop policy if exists form_studio_own on public.form_studio_workspaces;
create policy form_studio_own on public.form_studio_workspaces for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
commit;
select c.relrowsecurity as rls_enabled, p.policyname as owner_policy, has_table_privilege('anon', c.oid,'SELECT') as anonymous_read
from pg_class c join pg_policies p on p.schemaname='public' and p.tablename=c.relname
where c.oid='public.form_studio_workspaces'::regclass;
