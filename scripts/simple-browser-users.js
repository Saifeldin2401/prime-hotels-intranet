/**
 * Simple Browser Console Script for Bulk User Creation
 * Run this in browser console while logged in as admin
 * 
 * Instructions:
 * 1. Login to Prime Hotels Intranet as admin
 * 2. Open browser console (F12)
 * 3. Copy-paste this entire script
 * 4. Press Enter
 * 5. Wait for completion
 */

// Users from Riyadh User Forum.xlsx and PHG user creation forum1.xlsx
const users = [
  // Riyadh Users
  { email: 'a.taha.mamoun1991@gmail.com', name: 'Ahmed Taha Mamoun', phone: '500418959', property: 'Prime Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'department_head' },
  { email: 'mahmoudelakabawey@gmail.com', name: 'Mahmoud Ahmed elakabawy', phone: '576234611', property: 'Prime Al Hamra Hotel Riyadh', dept: 'Housekeeping', role: 'property_hr' },
  { email: 'Alatawi1213@gmail.com', name: 'Faisal Mohamed Al Otaibi', phone: '551448914', property: 'Prime Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'staff' },
  { email: 'elegantlayla88@gmail.com', name: 'Layla Ali Shrahily', phone: '506388055', property: 'Prime Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'staff' },
  { email: 'hassanshalaby280@gmail.com', name: 'Hasan Abdel Raof Shalaby', phone: '569409945', property: 'Prime Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'department_head' },
  { email: 'eslam.mady.2020@gmail.com', name: 'Islam Mahmoud Madi', phone: '570958030', property: 'Prime Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'staff' },
  { email: 'looa01230th@gmail.com', name: 'AIIam Ali lbrahim', phone: '570481399', property: 'Medhal Qurtuba by Prime Hotels', dept: 'Front Office', role: 'department_head' },
  { email: 'mohamedgalallld@gmail.com', name: 'MOHAMED Galal Anwer Ahmed', phone: '561005446', property: 'Medhal Qurtuba by Prime Hotels', dept: 'Front Office', role: 'staff' },
  { email: 'fhdalnzv209@gmail.com', name: 'FAHAD MESHAAL AIANzi', phone: '502792036', property: 'Medhal Qurtuba by Prime Hotels', dept: 'Front Office', role: 'staff' },
  { email: 'mohamedreao49@gmail.com', name: 'MOHAMED ABDELBADEAA ISMEAL', phone: '559697307', property: 'Medhal Qurtuba by Prime Hotels', dept: 'Housekeeping', role: 'department_head' },
  { email: 'aymanabdelhamid091@gmail.com', name: 'Ayman Abdul Hamid Saber', phone: '538627751', property: 'Prime Al Hamra Hotel Riyadh', dept: 'Maintenance', role: 'staff' },

  // Jeddah Users
  { email: 'Moustafamarzook7200416@gmail.com', name: 'Moustafa mahmoud marzook', phone: '567549721', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'department_head' },
  { email: 'abdullahahmed54574@gmail.com', name: 'Abdullah Ahmed Saleh Ali', phone: '545747498', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'department_head' },
  { email: 'mahmoudmo919@yahoo.com', name: 'Mahmoud Zain Al-Abidin Hamed', phone: '565542083', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Housekeeping', role: 'department_head' },
  { email: 'zooommm551@gmail.com', name: 'MOHAMED HANAFY ELSAYED ABDELMAKSOUD', phone: '595920662', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Housekeeping', role: 'department_head' },
  { email: 'Moh-oo@hotmail.com', name: 'Saud abdulmajed alshalabi', phone: '558221628', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'Badebaksh@gmail.com', name: 'Abdulelah Mohmmed Baksh', phone: '547039704', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'ibf672017@gmail.com', name: 'Osayd Ibrahim Alrasheed', phone: '566335467', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'neehaal1989@gmail.com', name: 'Nihal Abd Al Rahman Al Harbi', phone: '543119562', property: 'Prime Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'naserelsady2020@gmail.com', name: 'Naser elsady Ibrahim', phone: '540272932', property: 'Prime Al Corniche Hotel Jeddah', dept: 'Housekeeping', role: 'department_head' },
  { email: 'azoooz.bk1993@gmail.com', name: 'Abdulaziz Badr Bakili', phone: '531656567', property: 'Prime Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'property_manager' },
  { email: 'mahranahmed231@gmail.com', name: 'Ahmed Ahmed mahran', phone: '564617675', property: 'Prime Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'department_head' },
  { email: 'iimansoor6@gmail.com', name: 'Mansour Mohammed Al-Mahwari', phone: '544706217', property: 'Prime Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'hmada18emam@gmail.com', name: 'Mohammad Sami Emam', phone: '509402019', property: 'Prime Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'Play.com99874@gmail.com', name: 'Nasser musa mahdey alzharani', phone: '569379893', property: 'Prime Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'staff' }
];

// Main function
async function createBulkUsers() {
  console.log('🚀 Prime Hotels Intranet - Bulk User Creation');
  console.log(`📋 Processing ${users.length} users...\n`);
  
  const { supabase } = window;
  if (!supabase) {
    console.error('❌ Supabase client not found! Make sure you are on the intranet site.');
    return;
  }
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`📧 [${i + 1}/${users.length}] ${user.email}`);
    
    try {
      // Step 1: Get property
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('name', user.property)
        .eq('is_active', true)
        .single();
      
      if (propError) {
        console.error(`❌ Property not found: ${user.property}`);
        failureCount++;
        continue;
      }
      
      // Step 2: Get or create department
      let { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('property_id', propData.id)
        .eq('name', user.dept)
        .eq('is_active', true)
        .single();
      
      if (deptError && deptError.code !== 'PGRST116') {
        console.error(`❌ Department error: ${deptError.message}`);
        failureCount++;
        continue;
      }
      
      let deptId = deptData?.id;
      if (!deptId) {
        // Create department
        const { data: newDept, error: createError } = await supabase
          .from('departments')
          .insert({ property_id: propData.id, name: user.dept, is_active: true })
          .select('id')
          .single();
        
        if (createError) {
          console.error(`❌ Department creation failed: ${createError.message}`);
          failureCount++;
          continue;
        }
        deptId = newDept.id;
        console.log(`  ✅ Created department: ${user.dept}`);
      }
      
      // Step 3: Create user using SQL function
      const sql = `
        INSERT INTO auth.users (email, phone) 
        VALUES ('${user.email}', '${user.phone}')
        ON CONFLICT (email) DO NOTHING
        RETURNING id;
      `;
      
      const { data: authResult, error: authError } = await supabase
        .rpc('exec', { sql });
      
      if (authError) {
        if (authError.message.includes('duplicate') || authError.message.includes('conflict')) {
          console.log(`  ⚠️  User already exists`);
          successCount++;
        } else {
          console.error(`❌ Auth creation failed: ${authError.message}`);
          failureCount++;
        }
        continue;
      }
      
      const userId = authResult?.[0]?.id;
      if (!userId) {
        console.log(`  ⚠️  User already exists: ${user.email}`);
        successCount++;
        continue;
      }
      
      // Step 4: Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.email,
          full_name: user.name,
          phone: user.phone,
          hire_date: new Date().toISOString().split('T')[0],
          is_active: true
        });
      
      if (profileError) {
        console.error(`❌ Profile creation failed: ${profileError.message}`);
        failureCount++;
        continue;
      }
      
      // Step 5: Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: user.role });
      
      if (roleError) {
        console.error(`❌ Role assignment failed: ${roleError.message}`);
        failureCount++;
        continue;
      }
      
      // Step 6: Assign to property
      const { error: propAssignError } = await supabase
        .from('user_properties')
        .insert({ user_id: userId, property_id: propData.id });
      
      if (propAssignError) {
        console.error(`❌ Property assignment failed: ${propAssignError.message}`);
        failureCount++;
        continue;
      }
      
      // Step 7: Assign to department
      const { error: deptAssignError } = await supabase
        .from('user_departments')
        .insert({ user_id: userId, department_id: deptId });
      
      if (deptAssignError) {
        console.error(`❌ Department assignment failed: ${deptAssignError.message}`);
        failureCount++;
        continue;
      }
      
      console.log(`  ✅ Created: ${user.name}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Unexpected error: ${error.message}`);
      failureCount++;
    }
    
    // Delay between users
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed to create: ${failureCount} users`);
  console.log(`📈 Success rate: ${((successCount / users.length) * 100).toFixed(1)}%`);
  
  if (failureCount === 0) {
    console.log('\n🎉 ALL USERS CREATED SUCCESSFULLY!');
    console.log('💡 Users will need to set passwords via email invitations');
  } else {
    console.log('\n⚠️  Some users failed. Check errors above.');
  }
}

// Create exec function if it doesn't exist
async function ensureExecFunction() {
  const { supabase } = window;
  
  const createExecSQL = `
    CREATE OR REPLACE FUNCTION exec(sql text)
    RETURNS TABLE (id UUID, result TEXT)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY EXECUTE sql;
    END;
    $$;
  `;
  
  try {
    await supabase.rpc('exec', { sql: createExecSQL });
    console.log('✅ Exec function ready');
  } catch (error) {
    console.log('⚠️  Exec function may already exist');
  }
}

// Run the script
(async () => {
  await ensureExecFunction();
  await createBulkUsers();
})();
