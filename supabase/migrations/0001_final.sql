/* ============================================================
   FINAL_SUPABASE_SETUP.sql
   MAXIMUS / MAXIMUS (PWA Asisten Finansial Driver Maxim)
   - Schema: profiles, orders, expenses, strategic_spots
   - Triggers: updated_at + auto-create profile on signup
   - RLS: strict per-user for profiles/orders/expenses; public read for strategic_spots
   - Seed: contoh spot awal (Bandung) agar peta langsung tampil
   ============================================================ */

-- 0) Safety: pastikan schema public dipakai
set search_path = public;

-- 1) Helper: updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) TABLE: profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  vehicle_type text default 'motor',
  daily_target numeric(12,2) not null default 0,
  default_commission numeric(6,4) not null default 0.10,
  fuel_efficiency numeric(10,2) not null default 0,          -- interpretasi sesuai app: angka biaya per km (Rp/KM) atau lainnya
  maintenance_fee numeric(12,2) not null default 0,
  dark_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_daily_target_nonneg check (daily_target >= 0),
  constraint profiles_default_commission_range check (default_commission >= 0 and default_commission <= 1),
  constraint profiles_fuel_efficiency_nonneg check (fuel_efficiency >= 0),
  constraint profiles_maintenance_fee_nonneg check (maintenance_fee >= 0)
);

create unique index if not exists profiles_username_unique
on public.profiles (username)
where username is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 3) TABLE: orders
create table if not exists public.orders (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  gross_price numeric(12,2) not null default 0,              -- harga order
  commission_rate numeric(6,4) not null default 0,           -- 0.10 / 0.15
  app_fee numeric(12,2) not null default 0,                  -- gross_price * commission_rate
  net_profit numeric(12,2) not null default 0,               -- gross_price - app_fee - fuel_cost - maintenance_fee

  distance numeric(10,2) not null default 0,
  fuel_efficiency_at_time numeric(10,2) not null default 0,  -- snapshot dari profile
  fuel_cost numeric(12,2) not null default 0,
  maintenance_fee numeric(12,2) not null default 0,          -- snapshot per order

  -- Optional legacy/compat: jika app masih pakai kolom ini, biarkan ada (tidak wajib dipakai)
  price numeric(12,2),

  constraint orders_gross_nonneg check (gross_price >= 0),
  constraint orders_commission_range check (commission_rate >= 0 and commission_rate <= 1),
  constraint orders_app_fee_nonneg check (app_fee >= 0),
  constraint orders_distance_nonneg check (distance >= 0),
  constraint orders_fuel_eff_nonneg check (fuel_efficiency_at_time >= 0),
  constraint orders_fuel_cost_nonneg check (fuel_cost >= 0),
  constraint orders_maint_fee_nonneg check (maintenance_fee >= 0)
);

create index if not exists orders_user_created_at_idx
on public.orders (user_id, created_at desc);

-- 4) TABLE: expenses
create table if not exists public.expenses (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  amount numeric(12,2) not null,
  category text not null,
  note text,

  constraint expenses_amount_positive check (amount > 0)
);

create index if not exists expenses_user_created_at_idx
on public.expenses (user_id, created_at desc);

-- 5) TABLE: strategic_spots
create table if not exists public.strategic_spots (
  id bigserial primary key,
  name text not null,
  category text,
  notes text,

  start_hour int not null,
  end_hour int not null,
  is_weekend_only boolean not null default false,

  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint strategic_spots_hour_check
    check (start_hour between 0 and 23 and end_hour between 1 and 24 and start_hour < end_hour)
);

-- Hindari duplikasi spot untuk window yang sama
create unique index if not exists strategic_spots_unique_window
on public.strategic_spots (name, start_hour, end_hour, is_weekend_only);

create index if not exists strategic_spots_hours_idx
on public.strategic_spots (start_hour, end_hour, is_weekend_only);

drop trigger if exists strategic_spots_set_updated_at on public.strategic_spots;
create trigger strategic_spots_set_updated_at
before update on public.strategic_spots
for each row execute function public.set_updated_at();

-- 6) Trigger: auto-create profile ketika user baru signup (Auth)
-- SECURITY DEFINER agar bisa insert ke public.profiles saat trigger berjalan.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, vehicle_type, daily_target, default_commission, fuel_efficiency, maintenance_fee, dark_mode
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    'motor',
    0,
    0.10,
    0,
    0,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 7) GRANTS (agar anon/authenticated bisa akses via API; RLS tetap jadi gatekeeper)
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.orders to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;

-- strategic_spots: select boleh untuk anon + authenticated; write biasanya dibatasi (tidak dibuka dari frontend)
grant select on table public.strategic_spots to anon, authenticated;

-- sequences untuk bigserial
grant usage, select on sequence public.orders_id_seq to authenticated;
grant usage, select on sequence public.expenses_id_seq to authenticated;
grant usage, select on sequence public.strategic_spots_id_seq to authenticated;

-- 8) RLS: enable
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.expenses enable row level security;
alter table public.strategic_spots enable row level security;

-- 9) RLS POLICIES: profiles (private)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- 10) RLS POLICIES: orders (CRUD own)
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own"
on public.orders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "orders_delete_own" on public.orders;
create policy "orders_delete_own"
on public.orders
for delete
to authenticated
using (auth.uid() = user_id);

-- 11) RLS POLICIES: expenses (CRUD own)
drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
on public.expenses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
on public.expenses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
on public.expenses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
on public.expenses
for delete
to authenticated
using (auth.uid() = user_id);

-- 12) RLS POLICIES: strategic_spots (public read)
drop policy if exists "spots_select_public" on public.strategic_spots;
create policy "spots_select_public"
on public.strategic_spots
for select
to anon, authenticated
using (true);

-- (Opsional) jika nanti butuh write spot via dashboard saja, tidak perlu policy insert/update/delete.
-- Kalau mau write via API untuk role tertentu, buat policy khusus dan jangan dari frontend.

-- 13) SEED DATA: strategic_spots (contoh awal)
-- Catatan: ini contoh seed agar fitur peta langsung hidup. Silakan tim tambah/ubah sesuai riset lapangan.
insert into public.strategic_spots
(name, category, notes, start_hour, end_hour, is_weekend_only, latitude, longitude)
values
('Gedung Sate', 'tourism/government', 'Pagi & sore ramai.',            6,  9, false, -6.902459, 107.618730),
('Gedung Sate', 'tourism/government', 'Pulang kerja & hangout.',      16, 20, false, -6.902459, 107.618730),

('Stasiun Bandung', 'transport', 'Rush pagi & penjemputan.',          6,  9, false, -6.914170, 107.602500),
('Stasiun Bandung', 'transport', 'Sore-malam kedatangan.',            17, 22, false, -6.914170, 107.602500),

('Alun-alun Bandung', 'public-space', 'Weekend siang ramai.',         10, 13, true,  -6.921560, 107.607105),
('Alun-alun Bandung', 'public-space', 'Weekend sore-malam ramai.',    16, 22, true,  -6.921560, 107.607105),

('Trans Studio Bandung', 'mall/tourism', 'Weekend siang ramai.',      11, 14, true,  -6.926722, 107.635790),
('Trans Studio Bandung', 'mall/tourism', 'Sore-malam ramai.',         16, 22, false, -6.926722, 107.635790),

('ITB (Ganesha)', 'campus', 'Aktivitas kampus pagi.',                 6,  9, false, -6.889853, 107.609967),
('ITB (Ganesha)', 'campus', 'Aktivitas kampus sore.',                 16, 19, false, -6.889853, 107.609967),

('Jalan Dipatiukur', 'campus/food', 'Kuliner malam ramai.',           18, 23, false, -6.890877, 107.617020),

('Gerbang Tol Pasteur', 'gateway', 'Arus masuk kota pagi.',           6,  9, false, -6.891172, 107.578500),
('Gerbang Tol Pasteur', 'gateway', 'Arus sore.',                      16, 20, false, -6.891172, 107.578500),

('Bandara Husein Sastranegara', 'transport', 'Pagi penjemputan.',     6,  9, false, -6.900331, 107.572497),
('Bandara Husein Sastranegara', 'transport', 'Sore-malam kedatangan', 17, 22, false, -6.900331, 107.572497)
on conflict (name, start_hour, end_hour, is_weekend_only) do update
set category  = excluded.category,
    notes     = excluded.notes,
    latitude  = excluded.latitude,
    longitude = excluded.longitude;

-- 14) Quick sanity query (opsional, untuk memastikan tabel ada)
-- select 'profiles' as table, count(*) from public.profiles
-- union all select 'orders', count(*) from public.orders
-- union all select 'expenses', count(*) from public.expenses
-- union all select 'strategic_spots', count(*) from public.strategic_spots;
