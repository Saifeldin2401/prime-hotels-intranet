// Script to generate a massive SQL file. Run with standard node.
const fs = require('fs');

const modules = [
  {"id":"282df130-9694-4acd-aa24-915aec1eb809","title":"Engineering & Maintenance: Preventive Care & Safety","category":"Engineering"},
  {"id":"c9652425-74a7-4908-b175-b612eb5ddc0d","title":"Finance & Purchasing: Controls and Compliance","category":"Finance"},
  {"id":"ef5dc4d9-4013-4402-94ae-3c06b2cb6769","title":"F&B Service: Service & Beverage Standards","category":"Food & Beverage"},
  {"id":"ffac6517-5e64-465f-9e4a-06139d85c853","title":"Front Office Essentials: Check-In, Check-Out & Guest Experience","category":"Front Office"},
  {"id":"0b989011-52da-4656-8237-db7fc708d30d","title":"Guest check in procedures","category":"Front Office"},
  {"id":"6c3658b3-6385-4d14-98d0-089b0d0fbf84","title":"Guest Check in Procedures","category":"Front Office"},
  {"id":"27a0bfdb-a61e-4d6c-8581-a73bd2b68bde","title":"Guest Check out procedures","category":"Front Office"},
  {"id":"073261ec-1ee4-4f9d-b731-ba3a5771e52e","title":"Guest Check out procedures","category":"Front Office"},
  {"id":"4660a5f1-10f3-4b00-8ac3-afbdef0b11a5","title":"Housekeeping Standards: Rooms & Public Areas","category":"Housekeeping"},
  {"id":"0e5d9944-2d10-4665-a5c8-b97e7708d6ff","title":"HR Onboarding: Policies, Conduct & Benefits","category":"Human Resources"},
  {"id":"c89f375e-b527-46b7-94fd-df7266f0c6f9","title":"IT Systems & PMS: Security & Support","category":"IT Systems"},
  {"id":"6c0c0ffd-a16b-4edf-b5b7-48c687ea7738","title":"Kitchen & Stewarding: Food Safety & Hygiene","category":"Kitchen"},
  {"id":"de3a971f-d8e5-4fb9-9a68-4e1ec4c32992","title":"Management & Leadership: Service Culture & Governance","category":"Management"},
  {"id":"9fe305b5-6c01-4878-8791-11be770a1111","title":"Guest check in","category":"onboarding"},
  {"id":"75646721-5f1a-44fc-aa80-f389633ec3fb","title":"Guest Check In procedures","category":"onboarding"},
  {"id":"e10cf5d6-d5b7-43b9-928c-aae478d0707b","title":"QA & Compliance: Brand Standards & SOP Governance","category":"Quality & Compliance"},
  {"id":"a7c169a7-f919-410e-ac31-015e4cdd6b4f","title":"Sales & Revenue: Accounts & Pricing","category":"Sales & Revenue"},
  {"id":"074499e1-a80a-45a9-849d-df0a7cdda0f5","title":"Security & Safety: Incident Response Basics","category":"Security"},
  {"id":"57f95a2e-2729-4f8a-8eda-3c96879255e8","title":"Front Office: Check-in & Checkout","category":"skill"},
  {"id":"6a241116-5e96-4262-ae03-27dfa86d8f6c","title":"Sustainability & ESG: Energy, Water, Waste","category":"Sustainability"}
];

const escapeSql = (str) => {
  return str.replace(/'/g, "''");
};

let sql = `
-- Wipe existing blocks for these modules to avoid duplicates
DELETE FROM public.training_content_blocks WHERE training_module_id IN (
  ${modules.map(m => `'${m.id}'`).join(', ')}
);

`;

for (const mod of modules) {
  const { id, title, category } = mod;

  const content1 = escapeSql(`
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>${title}</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of ${category} operations at ALTUS Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
  `);

  const content2 = escapeSql(`
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The ALTUS Standard</h3>
        <p class="text-slate-700 leading-relaxed">At ALTUS Hotels, we pride ourselves on exceptional service and rigorous operational standards. The ${category} department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
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
  `);

  const content3 = escapeSql(`
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in ${category}:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the ALTUS Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for ${category}.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
  `);

  const content4 = escapeSql(`Read and acknowledge the official SOPs related to ${title}.`);

  const quizData = JSON.stringify({
    questions: [
      {
        id: 1,
        question: `What is the most critical focus area in ${category} according to the ALTUS Standard?`,
        options: ["Speed of execution", "Safety First", "Cost reduction", "Minimal documentation"],
        correctOptionIndex: 1,
        explanation: "Safety is always the number one priority at ALTUS Hotels."
      },
      {
        id: 2,
        question: "When encountering an unexpected issue, what is the recommended second step after assessing the situation?",
        options: ["Ignore it if it's minor", "Fix it yourself immediately", "Communicate with your supervisor", "Start a new task"],
        correctOptionIndex: 2,
        explanation: "Clear communication with your supervisor and team is essential for maintaining operational standards."
      },
      {
        id: 3,
        question: "True or False: Excellence is found in the details of our daily execution.",
        options: ["True", "False"],
        correctOptionIndex: 0,
        explanation: "Attention to detail is a core focus area of the ALTUS standard."
      }
    ]
  });

  sql += `
INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory) VALUES
('${id}', 'text', 'Learning Objectives', '${content1}', 1, 120, 10, true),
('${id}', 'text', 'Core Concepts & Standards', '${content2}', 2, 300, 20, true),
('${id}', 'text', 'Scenario & Application', '${content3}', 3, 240, 15, false);

INSERT INTO public.training_content_blocks (training_module_id, type, title, content, "order", duration_seconds, points, is_mandatory, content_data) VALUES
('${id}', 'sop_reference', 'Standard Operating Procedures', '${content4}', 4, 180, 10, true, '{"note": "Always refer to the latest uploaded SOP in the Knowledge Base."}'::jsonb),
('${id}', 'quiz', 'Knowledge Check', 'Complete this short quiz to verify your understanding of ${escapeSql(category)} standards.', 5, 300, 50, true, '${escapeSql(quizData)}'::jsonb);
`;
}

fs.writeFileSync('scripts/seed_training_content.sql', sql);
console.log('SQL generated to scripts/seed_training_content.sql');
