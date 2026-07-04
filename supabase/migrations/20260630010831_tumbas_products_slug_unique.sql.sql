-- Add unique constraint on products.slug
ALTER TABLE products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
