-- Add unique constraint on (name, category) for essentials_catalogue upsert support
ALTER TABLE essentials_catalogue
  ADD CONSTRAINT essentials_catalogue_name_category_key UNIQUE (name, category);
