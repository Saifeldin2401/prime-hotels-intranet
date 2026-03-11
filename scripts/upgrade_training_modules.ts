import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY // Should ideally use service role, but anon might work if RLS allows or we bypass RLS for this script somehow. Actually, standard service_role key is safer for backend scripts. Let's try anon first if it has insert rights, or assume the user runs this in a trusted env. Wait, we are running this script locally.

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Generate rich content for a specific module category/title
const generateContentForModule = (title: string, category: string) => {
  const blocks = []

  // 1. Learning Objectives (Text)
  blocks.push({
    type: 'text',
    title: 'Learning Objectives',
    order: 1,
    content: `
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-hotel-navy">Module Objectives</h3>
        <p class="text-slate-700 leading-relaxed">By the end of this comprehensive training module focusing on <strong>${title}</strong>, you will be able to:</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Understand the core principles and standards of ${category} operations at PRIME Hotels.</li>
          <li>Execute standard operating procedures safely, efficiently, and with a guest-first mindset.</li>
          <li>Identify common issues and apply approved resolution techniques.</li>
          <li>Maintain compliance with all internal policies and local regulations.</li>
        </ul>
        <p class="text-sm text-slate-500 italic mt-4">Please read all sections carefully before attempting the final knowledge check.</p>
      </div>
    `,
    duration_seconds: 120,
    points: 10,
    is_mandatory: true
  })

  // 2. Core Concepts (Text)
  blocks.push({
    type: 'text',
    title: 'Core Concepts & Standards',
    order: 2,
    content: `
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">The PRIME Standard</h3>
        <p class="text-slate-700 leading-relaxed">At PRIME Hotels, we pride ourselves on exceptional service and rigorous operational standards. The ${category} department plays a critical role in the overall guest experience and operational success of our properties.</p>
        
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
    `,
    duration_seconds: 300,
    points: 20,
    is_mandatory: true
  })

  // 3. Scenario / Case Study (Text)
  blocks.push({
    type: 'text',
    title: 'Scenario & Application',
    order: 3,
    content: `
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-hotel-navy">Scenario Analysis</h3>
        <p class="text-slate-700 leading-relaxed">Consider the following scenario commonly encountered in ${category}:</p>
        
        <div class="bg-slate-50 border border-slate-200 p-5 rounded-lg my-4 shadow-sm">
          <p class="font-medium text-slate-800 italic">"During a busy shift, an unexpected issue arises that conflicts with the standard timeline. You must prioritize tasks while maintaining the PRIME Hotel quality standards."</p>
        </div>

        <h4 class="font-semibold text-slate-800">Recommended Action Steps:</h4>
        <ol class="list-decimal pl-5 space-y-2 text-slate-700 mt-2">
          <li><strong>Assess:</strong> Quickly evaluate the urgency and impact of the issue.</li>
          <li><strong>Communicate:</strong> Inform your supervisor and any affected team members immediately.</li>
          <li><strong>Execute:</strong> Follow the approved contingency procedures for ${category}.</li>
          <li><strong>Document:</strong> Log the incident and the steps taken to resolve it before the end of your shift.</li>
        </ol>
      </div>
    `,
    duration_seconds: 240,
    points: 15,
    is_mandatory: false
  })

  // 4. SOP Reference Block
  blocks.push({
    type: 'sop_reference',
    title: 'Standard Operating Procedures',
    order: 4,
    content: `Read and acknowledge the official SOPs related to ${title}.`,
    duration_seconds: 180,
    points: 10,
    is_mandatory: true,
    content_data: {
      sop_id: "00000000-0000-0000-0000-000000000000", // We will leave this generic, the UI handles null references gracefully or we can point to a general policy.
      note: "Always refer to the latest uploaded SOP in the Knowledge Base."
    }
  })

  // 5. Quiz Block
  blocks.push({
    type: 'quiz',
    title: 'Knowledge Check',
    order: 5,
    content: `Complete this short quiz to verify your understanding of ${category} standards.`,
    duration_seconds: 300,
    points: 50,
    is_mandatory: true,
    content_data: {
      questions: [
        {
          id: 1,
          question: `What is the most critical focus area in ${category} according to the PRIME Standard?`,
          options: ["Speed of execution", "Safety First", "Cost reduction", "Minimal documentation"],
          correctOptionIndex: 1,
          explanation: "Safety is always the number one priority at PRIME Hotels."
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
          explanation: "Attention to detail is a core focus area of the PRIME standard."
        }
      ]
    }
  })

  return blocks
}

async function run() {
  console.log('Starting training modules enhancement script...')

  // Get all active training modules
  const { data: modules, error: modulesError } = await supabase
    .from('training_modules')
    .select('id, title, category')
    .eq('is_active', true)

  if (modulesError || !modules) {
    console.error('Error fetching modules:', modulesError)
    return
  }

  console.log(\`Found \${modules.length} active modules to process.\`)

  for (const mod of modules) {
    // 1. Delete existing blocks for this module to start fresh
    const { error: deleteError } = await supabase
      .from('training_content_blocks')
      .delete()
      .eq('training_module_id', mod.id)

    if (deleteError) {
      console.error(\`Failed to delete existing blocks for module \${mod.title}:\`, deleteError)
      continue
    }

    // 2. Generate new blocks
    console.log(\`Generating blocks for -> \${mod.title}\`)
    const newBlocks = generateContentForModule(mod.title, mod.category).map(b => ({
      ...b,
      training_module_id: mod.id,
    }))

    // 3. Insert new blocks
    const { error: insertError } = await supabase
      .from('training_content_blocks')
      .insert(newBlocks)

    if (insertError) {
      console.error(\`Failed to insert blocks for module \${mod.title}:\`, insertError)
    } else {
      console.log(\`Successfully updated \${mod.title}\`)
    }
  }

  console.log('Training modules enhancement completed successfully.')
}

run()
