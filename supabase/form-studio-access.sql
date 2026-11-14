-- A separate Studio-only authentication and project API in the shared project.
begin;
create schema if not exists studio_private;
revoke all on schema studio_private from public;
create table if not exists studio_private.owner_access (
 owner_id uuid primary key, email text unique not null, password_hash text,
 setup_hash bytea, setup_until timestamptz, recovery_hash bytea,
 failures int not null default 0, last_failure timestamptz
);
create table if not exists studio_private.sessions (
 token_hash bytea primary key, owner_id uuid not null references studio_private.owner_access,
 expires_at timestamptz not null
);
revoke all on all tables in schema studio_private from public, anon, authenticated;
insert into studio_private.owner_access(owner_id,email)
 select id,lower(email) from auth.users where lower(email)='cabbigatsantos07@gmail.com' and email_confirmed_at is not null
 on conflict do nothing;

create or replace function studio_private.access(op text, args jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 account studio_private.owner_access%rowtype;
 sess studio_private.sessions%rowtype;
 token text; recovery text; supplied text; pwd text; valid boolean:=false;
 pid uuid; revision_id uuid; expected uuid; output jsonb;
begin
 if op in ('setup','login','recover') then
   select * into account from studio_private.owner_access where email=lower(trim(args->>'email')) for update;
   if not found then return jsonb_build_object('error','Check your owner email and credentials.'); end if;
   if account.failures>=8 and account.last_failure>clock_timestamp()-interval '10 minutes' then
     return jsonb_build_object('error','Too many attempts. Try again in ten minutes.'); end if;
   if op='setup' and account.password_hash is not null then return jsonb_build_object('error','Setup is complete. Sign in or use your recovery code.'); end if;
   if op='login' and account.password_hash is null then return jsonb_build_object('error','Choose Set up Studio password first.'); end if;
   if op='login' then
     pwd:=args->>'password';
     valid:=octet_length(pwd) between 1 and 72 and extensions.crypt(pwd,account.password_hash)=account.password_hash;
   else
     supplied:=lower(trim(args->>'code'));
     valid:=case when op='setup' then account.setup_until>clock_timestamp() and extensions.digest(supplied,'sha256')=account.setup_hash
                 else extensions.digest(supplied,'sha256')=account.recovery_hash end;
   end if;
   if valid is not true then
     update studio_private.owner_access set failures=case when last_failure>clock_timestamp()-interval '10 minutes' then failures+1 else 1 end,last_failure=clock_timestamp() where owner_id=account.owner_id;
     return jsonb_build_object('error','Check your credentials. Setup codes also expire.'); end if;
   if op in ('setup','recover') then
     pwd:=args->>'password';
     if pwd is null or length(pwd)<8 or octet_length(pwd)>72 then return jsonb_build_object('error','Use 8 or more characters, up to 72 UTF-8 bytes.'); end if;
     recovery:=encode(extensions.gen_random_bytes(20),'hex');
     update studio_private.owner_access set password_hash=extensions.crypt(pwd,extensions.gen_salt('bf',12)), setup_hash=null,setup_until=null,
       recovery_hash=extensions.digest(recovery,'sha256') where owner_id=account.owner_id;
     delete from studio_private.sessions where owner_id=account.owner_id;
   end if;
   update studio_private.owner_access set failures=0,last_failure=null where owner_id=account.owner_id;
   delete from studio_private.sessions where expires_at<=clock_timestamp();
   token:=encode(extensions.gen_random_bytes(32),'hex');
   insert into studio_private.sessions values(extensions.digest(token,'sha256'),account.owner_id,clock_timestamp()+interval '12 hours');
   return jsonb_strip_nulls(jsonb_build_object('access_token',token,'expires_at',extract(epoch from clock_timestamp()+interval '12 hours')::bigint,
     'user',jsonb_build_object('id',account.owner_id,'email',account.email),'recovery_code',recovery));
 end if;
 select * into sess from studio_private.sessions where token_hash=extensions.digest(args->>'token','sha256') and expires_at>clock_timestamp() for share;
 if not found then return jsonb_build_object('error','Your Studio session ended. Sign in again.','status',401); end if;
 if op='logout' then delete from studio_private.sessions where token_hash=sess.token_hash; return '{}'::jsonb; end if;
 if op='verify' then select jsonb_build_object('id',owner_id,'email',email) into output from studio_private.owner_access where owner_id=sess.owner_id; return output; end if;
 if op='projects' then
   select coalesce(jsonb_agg(to_jsonb(r) order by r.title,r.project_id),'[]'::jsonb) into output from
   (select project_id,title from public.form_studio_projects where owner_id=sess.owner_id order by title,project_id
    limit 100 offset greatest(0,coalesce((args->>'offset')::int,0))) r; return output; end if;
 pid:=(args->>'id')::uuid;
 if op in ('project','revision') then
   select case when op='revision' then jsonb_build_object('revision',p.revision) else jsonb_build_object('revision',p.revision,'document',p.document) end into output
   from public.form_studio_projects p where p.owner_id=sess.owner_id and p.project_id=pid;
   return case when output is null then '[]'::jsonb else jsonb_build_array(output) end; end if;
 if op='save' then
   revision_id:=(args->>'revision')::uuid; expected:=(args->>'expected')::uuid;
   if pid is null or revision_id is null or jsonb_typeof(args->'document') is distinct from 'object' or args->'document'->>'format' is distinct from 'form-studio' then return jsonb_build_object('error','Invalid Studio project.'); end if;
   if expected is null then insert into public.form_studio_projects(owner_id,project_id,revision,document)
      values(sess.owner_id,pid,revision_id,args->'document') on conflict do nothing;
   else update public.form_studio_projects set document=args->'document',revision=revision_id
      where owner_id=sess.owner_id and project_id=pid and revision=expected; end if;
   if not found then return jsonb_build_object('error','A newer project version exists.','status',409); end if;
   return jsonb_build_array(jsonb_build_object('revision',revision_id));
 end if;
 return jsonb_build_object('error','Unknown Studio operation.');
end $$;
revoke all on function studio_private.access(text,jsonb) from public;
grant usage on schema studio_private to anon,authenticated;
grant execute on function studio_private.access(text,jsonb) to anon,authenticated;
create or replace function public.form_studio_access(op text,args jsonb) returns jsonb
language sql volatile security invoker set search_path='' as $$ select studio_private.access(op,args) $$;
revoke all on function public.form_studio_access(text,jsonb) from public;
grant execute on function public.form_studio_access(text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
