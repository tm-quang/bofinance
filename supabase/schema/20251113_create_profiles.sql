-- Tạo bảng profiles để lưu thông tin cá nhân người dùng
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    full_name text,
    avatar_url text,
    phone text,
    date_of_birth date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Tạo trigger để tự động cập nhật updated_at
drop trigger if exists handle_updated_at_profiles on public.profiles;
create trigger handle_updated_at_profiles
before update on public.profiles
for each row
execute procedure public.handle_updated_at();

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: Người dùng chỉ có thể xem và chỉnh sửa profile của chính mình
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
    on public.profiles
    for select
    using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
    on public.profiles
    for insert
    with check (auth.uid() = id);

-- Function để tự động tạo profile khi user đăng ký
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name');
    return new;
end;
$$ language plpgsql security definer;

-- Trigger để tự động tạo profile khi có user mới
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();

