-- Strip ?v=... cache-buster query params from stored avatar URLs.
-- The filename already contains a unique timestamp so the URL remains unique without it.
-- Removing it allows browsers to cache avatars properly, reducing redundant storage requests.
UPDATE profiles
SET avatar_url = regexp_replace(avatar_url, '\?v=.*$', '')
WHERE avatar_url LIKE '%?v=%';
