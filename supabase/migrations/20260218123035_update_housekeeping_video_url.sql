UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/ggZ8QxMN8Uw',
  content = REPLACE(content, 'https://www.youtube.com/embed/kM5O2KJf3SU', 'https://www.youtube.com/embed/ggZ8QxMN8Uw')
WHERE id = '039a4bc4-30ed-41e5-bd7e-e82872e32000';;
