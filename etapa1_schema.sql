-- ============================================================
-- NEXOCHECKSTUDIO — ETAPA 1
-- Esquema base: organizaciones, perfiles, proyectos, auditoría
-- Pegar completo en Supabase → SQL Editor → New query → Run
-- ============================================================

-- Extensión necesaria (por si no está activada)
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- ROLES disponibles en el sistema (se usan como texto validado)
-- ------------------------------------------------------------
create type user_role as enum (
  'SUPERADMIN',
  'ORGANIZATION_ADMIN',
  'PROJECT_MANAGER',
  'ARCHITECT',
  'ENGINEER',
  'CONTRACTOR',
  'REVIEWER',
  'CLIENT'
);

-- ------------------------------------------------------------
-- PROFILES: un perfil por usuario de Supabase Auth
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crear perfil automáticamente cuando se registra un usuario
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- ORGANIZATIONS
-- ------------------------------------------------------------
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ORGANIZATION_MEMBERS: qué usuarios pertenecen a qué organización y con qué rol
-- ------------------------------------------------------------
create table organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role user_role not null default 'PROJECT_MANAGER',
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

-- ------------------------------------------------------------
-- PROJECTS (obras)
-- ------------------------------------------------------------
create table projects (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  client_name text,
  location text,
  status text not null default 'ACTIVO',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PROJECT_MEMBERS: acceso puntual de usuarios a proyectos específicos
-- ------------------------------------------------------------
create table project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role user_role not null default 'REVIEWER',
  created_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

-- ------------------------------------------------------------
-- AUDIT_LOGS
-- ------------------------------------------------------------
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  profile_id uuid references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- FUNCIÓN AUXILIAR: ¿el usuario actual pertenece a esta organización?
-- (se usa dentro de las políticas RLS de abajo)
-- ============================================================
create function public.is_org_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and profile_id = auth.uid()
  );
$$ language sql security definer stable;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table audit_logs enable row level security;

-- PROFILES: cada usuario ve y edita su propio perfil
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- ORGANIZATIONS: solo miembros de la organización pueden verla
create policy "organizations_select_members" on organizations
  for select using (public.is_org_member(id));

-- Cualquier usuario autenticado puede crear una organización nueva
create policy "organizations_insert_authenticated" on organizations
  for insert with check (auth.uid() is not null);

-- Solo ORGANIZATION_ADMIN puede editar la organización
create policy "organizations_update_admin" on organizations
  for update using (
    exists (
      select 1 from organization_members
      where organization_id = organizations.id
        and profile_id = auth.uid()
        and role = 'ORGANIZATION_ADMIN'
    )
  );

-- ORGANIZATION_MEMBERS: visibles solo para miembros de esa organización
create policy "org_members_select" on organization_members
  for select using (public.is_org_member(organization_id));

create policy "org_members_insert_self" on organization_members
  for insert with check (profile_id = auth.uid());

-- PROJECTS: visibles solo para miembros de la organización dueña
create policy "projects_select_org_members" on projects
  for select using (public.is_org_member(organization_id));

create policy "projects_insert_org_members" on projects
  for insert with check (public.is_org_member(organization_id));

create policy "projects_update_org_members" on projects
  for update using (public.is_org_member(organization_id));

-- PROJECT_MEMBERS: visibles solo para miembros de la organización dueña del proyecto
create policy "project_members_select" on project_members
  for select using (
    exists (
      select 1 from projects
      where projects.id = project_members.project_id
        and public.is_org_member(projects.organization_id)
    )
  );

create policy "project_members_insert" on project_members
  for insert with check (
    exists (
      select 1 from projects
      where projects.id = project_members.project_id
        and public.is_org_member(projects.organization_id)
    )
  );

-- AUDIT_LOGS: visibles solo para miembros de la organización
create policy "audit_logs_select" on audit_logs
  for select using (organization_id is null or public.is_org_member(organization_id));

create policy "audit_logs_insert" on audit_logs
  for insert with check (auth.uid() is not null);

-- ============================================================
-- FIN ETAPA 1
-- ============================================================
