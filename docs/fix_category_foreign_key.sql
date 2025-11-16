-- ============================================
-- FIX CATEGORY FOREIGN KEY CONSTRAINT
-- ============================================
-- File này sửa foreign key constraint giữa transactions và categories
-- Để cho phép xóa category và tự động set category_id = NULL trong transactions
-- ============================================

-- 1. Drop existing foreign key constraint
ALTER TABLE IF EXISTS public.transactions
DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- 2. Modify category_id column to allow NULL
ALTER TABLE IF EXISTS public.transactions
ALTER COLUMN category_id DROP NOT NULL;

-- 3. Recreate foreign key constraint with ON DELETE SET NULL
ALTER TABLE IF EXISTS public.transactions
ADD CONSTRAINT transactions_category_id_fkey
FOREIGN KEY (category_id)
REFERENCES public.categories(id)
ON DELETE SET NULL;

-- 4. Xóa duplicate categories trước khi tạo unique index
-- Giữ lại category đầu tiên (theo created_at), xóa các bản duplicate
-- QUAN TRỌNG: Update transactions để trỏ về category được giữ lại trước khi xóa

-- Bước 1: Tìm và update transactions trỏ về category được giữ lại
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    name,
    type,
    parent_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, name, type, COALESCE(parent_id::text, 'NULL')
      ORDER BY created_at ASC
    ) as row_num
  FROM public.categories
),
keep_categories AS (
  SELECT id, user_id, name, type, parent_id
  FROM duplicates
  WHERE row_num = 1
),
delete_categories AS (
  SELECT id, user_id, name, type, parent_id
  FROM duplicates
  WHERE row_num > 1
)
UPDATE public.transactions t
SET category_id = kc.id
FROM delete_categories dc
JOIN keep_categories kc ON 
  kc.user_id = dc.user_id 
  AND kc.name = dc.name 
  AND kc.type = dc.type 
  AND COALESCE(kc.parent_id::text, 'NULL') = COALESCE(dc.parent_id::text, 'NULL')
WHERE t.category_id = dc.id;

-- Bước 2: Xóa duplicate categories
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, name, type, COALESCE(parent_id::text, 'NULL')
      ORDER BY created_at ASC
    ) as row_num
  FROM public.categories
)
DELETE FROM public.categories
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- 5. Add unique constraint to prevent duplicate categories for same user
-- Đảm bảo mỗi user chỉ có 1 category với cùng name, type, parent_id
-- Sử dụng partial unique index để handle NULL parent_id
DROP INDEX IF EXISTS categories_user_name_type_parent_unique_idx;
DROP INDEX IF EXISTS categories_user_name_type_parent_null_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_parent_unique_idx
ON public.categories (user_id, name, type, parent_id)
WHERE parent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_type_parent_null_unique_idx
ON public.categories (user_id, name, type)
WHERE parent_id IS NULL;

-- 5. Verify the changes
-- SELECT 
--     tc.constraint_name, 
--     tc.table_name, 
--     kcu.column_name,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name,
--     rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON rc.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_name = 'transactions'
--   AND kcu.column_name = 'category_id';

