-- Migration 016: Employee profile avatar support
-- Run in Supabase SQL Editor

-- 1. Add avatar_url column to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- 2. Create public avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Storage policy: authenticated users can upload/update their own avatar
CREATE POLICY "Employee can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Employee can update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

-- 4. Public read for avatars bucket
CREATE POLICY "Public can read avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');
