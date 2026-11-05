-- Add preview_links column to log_products for admin-uploaded sample screenshots/URLs
ALTER TABLE public.log_products
  ADD COLUMN IF NOT EXISTS preview_links text[] NOT NULL DEFAULT '{}';
