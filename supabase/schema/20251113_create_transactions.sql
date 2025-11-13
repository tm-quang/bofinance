-- Tạo bảng transactions để lưu các giao dịch Thu và Chi
create table if not exists public.transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    wallet_id uuid not null references public.wallets(id) on delete restrict,
    category_id uuid not null references public.categories(id) on delete restrict,
    type text not null check (type in ('Thu', 'Chi')),
    amount numeric(15, 2) not null check (amount > 0),
    description text,
    transaction_date date not null default current_date,
    notes text,
    tags text[],
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Tạo trigger để tự động cập nhật updated_at
drop trigger if exists handle_updated_at_transactions on public.transactions;
create trigger handle_updated_at_transactions
before update on public.transactions
for each row
execute procedure public.handle_updated_at();

-- Tạo trigger để tự động cập nhật số dư ví khi có giao dịch mới
create or replace function public.update_wallet_balance()
returns trigger as $$
begin
    if TG_OP = 'INSERT' then
        if NEW.type = 'Thu' then
            update public.wallets
            set balance = balance + NEW.amount
            where id = NEW.wallet_id;
        elsif NEW.type = 'Chi' then
            update public.wallets
            set balance = balance - NEW.amount
            where id = NEW.wallet_id;
        end if;
        return NEW;
    elsif TG_OP = 'UPDATE' then
        -- Hoàn tác số dư cũ
        if OLD.type = 'Thu' then
            update public.wallets
            set balance = balance - OLD.amount
            where id = OLD.wallet_id;
        elsif OLD.type = 'Chi' then
            update public.wallets
            set balance = balance + OLD.amount
            where id = OLD.wallet_id;
        end if;
        -- Áp dụng số dư mới
        if NEW.type = 'Thu' then
            update public.wallets
            set balance = balance + NEW.amount
            where id = NEW.wallet_id;
        elsif NEW.type = 'Chi' then
            update public.wallets
            set balance = balance - NEW.amount
            where id = NEW.wallet_id;
        end if;
        return NEW;
    elsif TG_OP = 'DELETE' then
        -- Hoàn tác số dư khi xóa giao dịch
        if OLD.type = 'Thu' then
            update public.wallets
            set balance = balance - OLD.amount
            where id = OLD.wallet_id;
        elsif OLD.type = 'Chi' then
            update public.wallets
            set balance = balance + OLD.amount
            where id = OLD.wallet_id;
        end if;
        return OLD;
    end if;
    return null;
end;
$$ language plpgsql;

-- Tạo trigger để tự động cập nhật số dư ví
drop trigger if exists trigger_update_wallet_balance on public.transactions;
create trigger trigger_update_wallet_balance
    after insert or update or delete on public.transactions
    for each row
    execute procedure public.update_wallet_balance();

-- Tạo index để tối ưu truy vấn
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_wallet_id on public.transactions(wallet_id);
create index if not exists idx_transactions_category_id on public.transactions(category_id);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_date on public.transactions(transaction_date);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);

-- Enable RLS
alter table public.transactions enable row level security;

-- Policy: Người dùng chỉ có thể xem và quản lý giao dịch của chính mình
drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions"
    on public.transactions
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions"
    on public.transactions
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
    on public.transactions
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions"
    on public.transactions
    for delete
    using (auth.uid() = user_id);

