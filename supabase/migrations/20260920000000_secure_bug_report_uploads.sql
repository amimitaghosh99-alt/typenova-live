-- ============================================================================
-- TypeNova - Secure Bug Report Screenshot Bucket
-- Enforces 5MB file size limit and restricts allowed MIME types to safe images.
-- ============================================================================

-- Update bug-reports bucket configuration with size limits and allowed image types
update storage.buckets
set 
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif'
  ]
where id = 'bug-reports';
