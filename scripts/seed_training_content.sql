
-- Wipe existing blocks for these modules to avoid duplicates
DELETE FROM public.training_content_blocks WHERE training_module_id IN (
  '282df130-9694-4acd-aa24-915aec1eb809', 'c9652425-74a7-4908-b175-b612eb5ddc0d', 'ef5dc4d9-4013-4402-94ae-3c06b2cb6769', 'ffac6517-5e64-465f-9e4a-06139d85c853', '0b989011-52da-4656-8237-db7fc708d30d', '6c3658b3-6385-4d14-98d0-089b0d0fbf84', '27a0bfdb-a61e-4d6c-8581-a73bd2b68bde', '073261ec-1ee4-4f9d-b731-ba3a5771e52e', '4660a5f1-10f3-4b00-8ac3-afbdef0b11a5', '0e5d9944-2d10-4665-a5c8-b97e7708d6ff', 'c89f375e-b527-46b7-94fd-df7266f0c6f9', '6c0c0ffd-a16b-4edf-b5b7-48c687ea7738', 'de3a971f-d8e5-4fb9-9a68-4e1ec4c32992', '9fe305b5-6c01-4878-8791-11be770a1111', '75646721-5f1a-44fc-aa80-f389633ec3fb', 'e10cf5d6-d5b7-43b9-928c-aae478d0707b', 'a7c169a7-f919-410e-ac31-015e4cdd6b4f', '074499e1-a80a-45a9-849d-df0a7cdda0f5', '57f95a2e-2729-4f8a-8eda-3c96879255e8', '6a241116-5e96-4262-ae03-27dfa86d8f6c'
);


INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('282df130-9694-4acd-aa24-915aec1eb809', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Engineering & Maintenance: Preventive Care & Safety</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Engineering operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('282df130-9694-4acd-aa24-915aec1eb809', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Engineering department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('282df130-9694-4acd-aa24-915aec1eb809', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Engineering:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Engineering.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('282df130-9694-4acd-aa24-915aec1eb809', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Engineering & Maintenance: Preventive Care & Safety.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('282df130-9694-4acd-aa24-915aec1eb809', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Engineering standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Engineering according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('c9652425-74a7-4908-b175-b612eb5ddc0d', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Finance & Purchasing: Controls and Compliance</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Finance operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('c9652425-74a7-4908-b175-b612eb5ddc0d', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Finance department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('c9652425-74a7-4908-b175-b612eb5ddc0d', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Finance:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Finance.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('c9652425-74a7-4908-b175-b612eb5ddc0d', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Finance & Purchasing: Controls and Compliance.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('c9652425-74a7-4908-b175-b612eb5ddc0d', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Finance standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Finance according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('ef5dc4d9-4013-4402-94ae-3c06b2cb6769', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>F&B Service: Service & Beverage Standards</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Food & Beverage operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('ef5dc4d9-4013-4402-94ae-3c06b2cb6769', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Food & Beverage department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('ef5dc4d9-4013-4402-94ae-3c06b2cb6769', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Food & Beverage:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Food & Beverage.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('ef5dc4d9-4013-4402-94ae-3c06b2cb6769', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to F&B Service: Service & Beverage Standards.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('ef5dc4d9-4013-4402-94ae-3c06b2cb6769', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Food & Beverage standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Food & Beverage according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('ffac6517-5e64-465f-9e4a-06139d85c853', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Front Office Essentials: Check-In, Check-Out & Guest Experience</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Front Office operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('ffac6517-5e64-465f-9e4a-06139d85c853', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Front Office department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('ffac6517-5e64-465f-9e4a-06139d85c853', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Front Office:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Front Office.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('ffac6517-5e64-465f-9e4a-06139d85c853', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Front Office Essentials: Check-In, Check-Out & Guest Experience.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('ffac6517-5e64-465f-9e4a-06139d85c853', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Front Office standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Front Office according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('0b989011-52da-4656-8237-db7fc708d30d', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Guest check in procedures</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Front Office operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('0b989011-52da-4656-8237-db7fc708d30d', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Front Office department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('0b989011-52da-4656-8237-db7fc708d30d', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Front Office:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Front Office.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('0b989011-52da-4656-8237-db7fc708d30d', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Guest check in procedures.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('0b989011-52da-4656-8237-db7fc708d30d', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Front Office standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Front Office according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('6c3658b3-6385-4d14-98d0-089b0d0fbf84', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Guest Check in Procedures</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Front Office operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('6c3658b3-6385-4d14-98d0-089b0d0fbf84', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Front Office department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('6c3658b3-6385-4d14-98d0-089b0d0fbf84', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Front Office:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Front Office.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('6c3658b3-6385-4d14-98d0-089b0d0fbf84', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Guest Check in Procedures.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('6c3658b3-6385-4d14-98d0-089b0d0fbf84', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Front Office standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Front Office according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('27a0bfdb-a61e-4d6c-8581-a73bd2b68bde', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Guest Check out procedures</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Front Office operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('27a0bfdb-a61e-4d6c-8581-a73bd2b68bde', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Front Office department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('27a0bfdb-a61e-4d6c-8581-a73bd2b68bde', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Front Office:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Front Office.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('27a0bfdb-a61e-4d6c-8581-a73bd2b68bde', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Guest Check out procedures.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('27a0bfdb-a61e-4d6c-8581-a73bd2b68bde', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Front Office standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Front Office according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('073261ec-1ee4-4f9d-b731-ba3a5771e52e', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Guest Check out procedures</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Front Office operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('073261ec-1ee4-4f9d-b731-ba3a5771e52e', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Front Office department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('073261ec-1ee4-4f9d-b731-ba3a5771e52e', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Front Office:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Front Office.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('073261ec-1ee4-4f9d-b731-ba3a5771e52e', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Guest Check out procedures.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('073261ec-1ee4-4f9d-b731-ba3a5771e52e', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Front Office standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Front Office according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('4660a5f1-10f3-4b00-8ac3-afbdef0b11a5', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Housekeeping Standards: Rooms & Public Areas</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Housekeeping operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('4660a5f1-10f3-4b00-8ac3-afbdef0b11a5', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Housekeeping department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('4660a5f1-10f3-4b00-8ac3-afbdef0b11a5', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Housekeeping:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Housekeeping.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('4660a5f1-10f3-4b00-8ac3-afbdef0b11a5', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Housekeeping Standards: Rooms & Public Areas.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('4660a5f1-10f3-4b00-8ac3-afbdef0b11a5', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Housekeeping standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Housekeeping according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('0e5d9944-2d10-4665-a5c8-b97e7708d6ff', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>HR Onboarding: Policies, Conduct & Benefits</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Human Resources operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('0e5d9944-2d10-4665-a5c8-b97e7708d6ff', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Human Resources department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('0e5d9944-2d10-4665-a5c8-b97e7708d6ff', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Human Resources:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Human Resources.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('0e5d9944-2d10-4665-a5c8-b97e7708d6ff', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to HR Onboarding: Policies, Conduct & Benefits.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('0e5d9944-2d10-4665-a5c8-b97e7708d6ff', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Human Resources standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Human Resources according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('c89f375e-b527-46b7-94fd-df7266f0c6f9', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>IT Systems & PMS: Security & Support</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of IT Systems operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('c89f375e-b527-46b7-94fd-df7266f0c6f9', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The IT Systems department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('c89f375e-b527-46b7-94fd-df7266f0c6f9', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in IT Systems:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for IT Systems.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('c89f375e-b527-46b7-94fd-df7266f0c6f9', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to IT Systems & PMS: Security & Support.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('c89f375e-b527-46b7-94fd-df7266f0c6f9', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of IT Systems standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in IT Systems according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('6c0c0ffd-a16b-4edf-b5b7-48c687ea7738', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Kitchen & Stewarding: Food Safety & Hygiene</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Kitchen operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('6c0c0ffd-a16b-4edf-b5b7-48c687ea7738', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Kitchen department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('6c0c0ffd-a16b-4edf-b5b7-48c687ea7738', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Kitchen:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Kitchen.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('6c0c0ffd-a16b-4edf-b5b7-48c687ea7738', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Kitchen & Stewarding: Food Safety & Hygiene.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('6c0c0ffd-a16b-4edf-b5b7-48c687ea7738', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Kitchen standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Kitchen according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('de3a971f-d8e5-4fb9-9a68-4e1ec4c32992', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Management & Leadership: Service Culture & Governance</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Management operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('de3a971f-d8e5-4fb9-9a68-4e1ec4c32992', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Management department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('de3a971f-d8e5-4fb9-9a68-4e1ec4c32992', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Management:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Management.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('de3a971f-d8e5-4fb9-9a68-4e1ec4c32992', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Management & Leadership: Service Culture & Governance.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('de3a971f-d8e5-4fb9-9a68-4e1ec4c32992', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Management standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Management according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('9fe305b5-6c01-4878-8791-11be770a1111', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Guest check in</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of onboarding operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('9fe305b5-6c01-4878-8791-11be770a1111', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The onboarding department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('9fe305b5-6c01-4878-8791-11be770a1111', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in onboarding:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for onboarding.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('9fe305b5-6c01-4878-8791-11be770a1111', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Guest check in.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('9fe305b5-6c01-4878-8791-11be770a1111', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of onboarding standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in onboarding according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('75646721-5f1a-44fc-aa80-f389633ec3fb', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Guest Check In procedures</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of onboarding operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('75646721-5f1a-44fc-aa80-f389633ec3fb', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The onboarding department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('75646721-5f1a-44fc-aa80-f389633ec3fb', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in onboarding:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for onboarding.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('75646721-5f1a-44fc-aa80-f389633ec3fb', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Guest Check In procedures.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('75646721-5f1a-44fc-aa80-f389633ec3fb', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of onboarding standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in onboarding according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('e10cf5d6-d5b7-43b9-928c-aae478d0707b', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>QA & Compliance: Brand Standards & SOP Governance</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Quality & Compliance operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('e10cf5d6-d5b7-43b9-928c-aae478d0707b', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Quality & Compliance department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('e10cf5d6-d5b7-43b9-928c-aae478d0707b', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Quality & Compliance:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Quality & Compliance.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('e10cf5d6-d5b7-43b9-928c-aae478d0707b', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to QA & Compliance: Brand Standards & SOP Governance.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('e10cf5d6-d5b7-43b9-928c-aae478d0707b', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Quality & Compliance standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Quality & Compliance according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('a7c169a7-f919-410e-ac31-015e4cdd6b4f', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Sales & Revenue: Accounts & Pricing</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Sales & Revenue operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('a7c169a7-f919-410e-ac31-015e4cdd6b4f', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Sales & Revenue department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('a7c169a7-f919-410e-ac31-015e4cdd6b4f', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Sales & Revenue:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Sales & Revenue.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('a7c169a7-f919-410e-ac31-015e4cdd6b4f', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Sales & Revenue: Accounts & Pricing.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('a7c169a7-f919-410e-ac31-015e4cdd6b4f', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Sales & Revenue standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Sales & Revenue according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('074499e1-a80a-45a9-849d-df0a7cdda0f5', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Security & Safety: Incident Response Basics</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Security operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('074499e1-a80a-45a9-849d-df0a7cdda0f5', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Security department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('074499e1-a80a-45a9-849d-df0a7cdda0f5', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Security:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Security.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('074499e1-a80a-45a9-849d-df0a7cdda0f5', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Security & Safety: Incident Response Basics.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('074499e1-a80a-45a9-849d-df0a7cdda0f5', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Security standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Security according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('57f95a2e-2729-4f8a-8eda-3c96879255e8', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Front Office: Check-in & Checkout</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of skill operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('57f95a2e-2729-4f8a-8eda-3c96879255e8', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The skill department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('57f95a2e-2729-4f8a-8eda-3c96879255e8', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in skill:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for skill.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('57f95a2e-2729-4f8a-8eda-3c96879255e8', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Front Office: Check-in & Checkout.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('57f95a2e-2729-4f8a-8eda-3c96879255e8', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of skill standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in skill according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('6a241116-5e96-4262-ae03-27dfa86d8f6c', 'text', 'Learning Objectives', '
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>Sustainability & ESG: Energy, Water, Waste</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of Sustainability operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  ', 1, 120, 10, true),
('6a241116-5e96-4262-ae03-27dfa86d8f6c', 'text', 'Core Concepts & Standards', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The Sustainability department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md my-6">
          <h4 class="font-bold text-blue-800 mb-2">Key Focus Areas</h4>
          <ol class="list-decimal pl-5 space-y-1 text-blue-900">
            <li><strong>Safety First:</strong> Always prioritize the safety of guests and colleagues.</li>
            <li><strong>Attention to Detail:</strong> Excellence is in the details of our daily execution.</li>
            <li><strong>Clear Communication:</strong> Ensure all handovers and reports are documented thoroughly.</li>
          </ol>
        </div>

        <h3 class="text-lg font-bold text-hotel-navy mt-6">Practical Application</h3>
        <p class="text-slate-700 leading-relaxed">When applying these concepts, remember to always consult your department supervisor if you encounter a scenario not covered in the standard manual. Documentation and transparency are your best tools for success in this area.</p>
      </div>
  ', 2, 300, 20, true),
('6a241116-5e96-4262-ae03-27dfa86d8f6c', 'text', 'Scenario & Application', '
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in Sustainability:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for Sustainability.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  ', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('6a241116-5e96-4262-ae03-27dfa86d8f6c', 'sop_reference', 'Standard Operating Procedures', 'Read and acknowledge the official SOPs related to Sustainability & ESG: Energy, Water, Waste.', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('6a241116-5e96-4262-ae03-27dfa86d8f6c', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of Sustainability standards.', 5, 300, 50, true, '{"questions":[{"id":1,"question":"What is the most critical focus area in Sustainability according to the ALTUS Standard?","options":["Speed of execution","Safety First","Cost reduction","Minimal documentation"],"correctOptionIndex":1,"explanation":"Safety is always the number one priority at ALTUS Hotels."},{"id":2,"question":"When encountering an unexpected issue, what is the recommended second step after assessing the situation?","options":["Ignore it if it''s minor","Fix it yourself immediately","Communicate with your supervisor","Start a new task"],"correctOptionIndex":2,"explanation":"Clear communication with your supervisor and team is essential for maintaining operational standards."},{"id":3,"question":"True or False: Excellence is found in the details of our daily execution.","options":["True","False"],"correctOptionIndex":0,"explanation":"Attention to detail is a core focus area of the ALTUS standard."}]}'::jsonb);
