-- Update Standard Guest Check-in Procedure
UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/S_7b4wzX_hU',
  content = REPLACE(content, 'https://www.youtube.com/embed/ZMnGHqmXjlE', 'https://www.youtube.com/embed/S_7b4wzX_hU')
WHERE id = 'ce6e19ae-6b5b-4002-8fe7-13066b0fdb01';

-- Update HACCP Food Safety
UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/Fv2G7e3d1p4',
  content = REPLACE(content, 'https://www.youtube.com/embed/xHivBJGBx8Y', 'https://www.youtube.com/embed/Fv2G7e3d1p4')
WHERE id = 'c00547cd-edd2-46cf-86be-4afd7953c0d7';

-- Update Fire Emergency Evacuation
UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/01G3e3r5vM4',
  content = REPLACE(content, 'https://www.youtube.com/embed/Gy8yfxKQpXc', 'https://www.youtube.com/embed/01G3e3r5vM4')
WHERE id = 'a0cb283c-30ab-4829-a49d-f34ed57adb90';

-- Update Employee Onboarding (was sharing Check-in ID ZMnGHqmXjlE)
UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/hpi0ifl2YDU',
  content = REPLACE(content, 'https://www.youtube.com/embed/ZMnGHqmXjlE', 'https://www.youtube.com/embed/hpi0ifl2YDU')
WHERE id = '174f70b3-631e-4baf-ab12-6e342cb07146';

-- Update Restaurant Service 12 Steps (was sharing Fire ID Gy8yfxKQpXc)
UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/8w1o_k3rCjg',
  content = REPLACE(content, 'https://www.youtube.com/embed/Gy8yfxKQpXc', 'https://www.youtube.com/embed/8w1o_k3rCjg')
WHERE id = 'ef680aa8-29eb-431f-a30b-c71726e34849';

-- Update Sustainability ESG (was sharing Fire ID Gy8yfxKQpXc)
UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/uGjFf4k4zYw',
  content = REPLACE(content, 'https://www.youtube.com/embed/Gy8yfxKQpXc', 'https://www.youtube.com/embed/uGjFf4k4zYw')
WHERE id = '3f5a23a2-f66e-4e36-afd0-14a17c76523b';

-- Update Housekeeping Room Cleaning
UPDATE documents
SET 
  video_url = 'https://www.youtube.com/embed/kM5O2KJf3SU',
  content = REPLACE(content, 'https://www.youtube.com/embed/2-OIFjkzOhE', 'https://www.youtube.com/embed/kM5O2KJf3SU')
WHERE id = '039a4bc4-30ed-41e5-bd7e-e82872e32000';;
