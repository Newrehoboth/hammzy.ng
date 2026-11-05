-- Add preview_links column to log_products table
ALTER TABLE public.log_products 
ADD COLUMN IF NOT EXISTS preview_links text[] DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN public.log_products.preview_links IS 'Array of preview URLs (max 10) that users can view before purchasing';
