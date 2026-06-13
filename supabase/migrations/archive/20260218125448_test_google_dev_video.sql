UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/M7lc1UVf-VE',
  content = REPLACE(content, 'https://www.youtube.com/embed/dLoCG5ai7Fs', 'https://www.youtube.com/embed/M7lc1UVf-VE')
WHERE id = '039a4bc4-30ed-41e5-bd7e-e82872e32000';
