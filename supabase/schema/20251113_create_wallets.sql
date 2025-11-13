-- Tạo bảng wallets để lưu các loại ví
create table if not exists public.wallets (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    type text not null check (type in ('Tiền mặt', 'Ngân hàng', 'Tiết kiệm', 'Tín dụng', 'Đầu tư', 'Khác')),
    balance numeric(15, 2) not null default 0,
    currency text not null default 'VND',
    icon text,
    color text,
    is_active boolean not null default true,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Tạo trigger để tự động cập nhật updated_at
drop trigger if exists handle_updated_at_wallets on public.wallets;
create trigger handle_updated_at_wallets
before update on public.wallets
for each row
execute procedure public.handle_updated_at();

-- Tạo index để tối ưu truy vấn
create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_wallets_type on public.wallets(type);
create index if not exists idx_wallets_is_active on public.wallets(is_active);

-- Enable RLS
alter table public.wallets enable row level security;

-- Policy: Người dùng chỉ có thể xem và quản lý ví của chính mình
drop policy if exists "Users can view own wallets" on public.wallets;
create policy "Users can view own wallets"
    on public.wallets
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own wallets" on public.wallets;
create policy "Users can insert own wallets"
    on public.wallets
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own wallets" on public.wallets;
create policy "Users can update own wallets"
    on public.wallets
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own wallets" on public.wallets;
create policy "Users can delete own wallets"
    on public.wallets
    for delete
    using (auth.uid() = user_id);

