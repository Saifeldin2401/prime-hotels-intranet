UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/dLoCG5ai7Fs',
  content = REPLACE(content, 'https://www.youtube.com/embed/A8vE-tN8ZPs', 'https://www.youtube.com/embed/dLoCG5ai7Fs')
WHERE id = '039a4bc4-30ed-41e5-bd7e-e82872e32000';;
