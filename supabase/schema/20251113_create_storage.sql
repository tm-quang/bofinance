-- Tạo storage bucket cho avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: Mọi người có thể xem avatar
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible"
    on storage.objects
    for select
    using (bucket_id = 'avatars');

-- Policy: Chỉ user có thể upload avatar của chính mình
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
    on storage.objects
    for insert
    with check (
        bucket_id = 'avatars' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Chỉ user có thể update avatar của chính mình
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
    on storage.objects
    for update
    using (
        bucket_id = 'avatars' 
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'avatars' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Chỉ user có thể xóa avatar của chính mình
drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
    on storage.objects
    for delete
    using (
        bucket_id = 'avatars' 
        and (storage.foldername(name))[1] = auth.uid()::text
    );

