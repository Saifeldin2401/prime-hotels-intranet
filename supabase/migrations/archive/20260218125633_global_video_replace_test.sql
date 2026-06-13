UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/M7lc1UVf-VE',
  content = REGEXP_REPLACE(content, 'https?://www\.youtube(-nocookie)?\.com/embed/[a-zA-Z0-9_-]+', 'https://www.youtube.com/embed/M7lc1UVf-VE', 'g')
WHERE content LIKE '%youtube%' OR video_url LIKE '%youtube%';
