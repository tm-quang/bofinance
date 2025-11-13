create extension if not exists "uuid-ossp";

create table if not exists public.categories (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    type text not null check (type in ('Chi tiêu', 'Thu nhập')),
    icon_id text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists handle_updated_at on public.categories;

create trigger handle_updated_at
before update on public.categories
for each row
execute procedure public.handle_updated_at();

alter table public.categories enable row level security;

drop policy if exists "Allow read categories" on public.categories;
create policy "Allow read categories"
    on public.categories
    for select
    using (true);

drop policy if exists "Allow write categories" on public.categories;
create policy "Allow write categories"
    on public.categories
    for all
    using (true)
    with check (true);


