UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/A8vE-tN8ZPs',
  content = REPLACE(content, 'https://www.youtube-nocookie.com/embed/dLoCG5ai7Fs', 'https://www.youtube.com/embed/A8vE-tN8ZPs')
WHERE id = '039a4bc4-30ed-41e5-bd7e-e82872e32000';;
