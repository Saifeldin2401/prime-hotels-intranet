#!/usr/bin/env node

/**
 * Bulk User Creation Script for Prime Hotels Intranet
 * Run with: node scripts/bulk-create-users.js
 * 
 * Users from Riyadh User Forum.xlsx and PHG user creation forum1.xlsx
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321'; // Local development
const supabaseServiceKey = 'your-service-role-key'; // You'll need to get this from Supabase

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// User data from the Excel files
const users = [
  // Riyadh Users from Riyadh User Forum.xlsx
  {
    email: 'a.taha.mamoun1991@gmail.com',
    full_name: 'Ahmed Taha Mamoun',
    phone: '500418959',
    date_of_birth: '1991-08-01',
    employment_type: 'Full Time',
    job_title: 'Front Office Manager',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'mahmoudelakabawey@gmail.com',
    full_name: 'Mahmoud Ahmed elakabawy',
    phone: '576234611',
    date_of_birth: '1981-03-09',
    employment_type: 'Full Time',
    job_title: 'House Keeping Manager',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'Alatawi1213@gmail.com',
    full_name: 'Faisal Mohamed Al Otaibi',
    phone: '551448914',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Front Office Agent',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'elegantlayla88@gmail.com',
    full_name: 'Layla Ali Shrahily',
    phone: '506388055',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Front Office Agent',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'hassanshalaby280@gmail.com',
    full_name: 'Hasan Abdel Raof Shalaby',
    phone: '569409945',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Front Office Supervisor',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'eslam.mady.2020@gmail.com',
    full_name: 'Islam Mahmoud Madi',
    phone: '570958030',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Front Office Agent',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'looa01230th@gmail.com',
    full_name: 'AIIam Ali lbrahim',
    phone: '570481399',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Front Office Supervisor',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'mohamedgalallld@gmail.com',
    full_name: 'MOHAMED Galal Anwer Ahmed',
    phone: '561005446',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Front Office Agent',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'fhdalnzv209@gmail.com',
    full_name: 'FAHAD MESHAAL AIANzi',
    phone: '502792036',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Front Office Agent',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'mohamedreao49@gmail.com',
    full_name: 'MOHAMED ABDELBADEAA ISMEAL',
    phone: '559697307',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'House Keeping Supervisor',
    property_name: 'Medhal Qurtuba by Prime Hotels',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'aymanabdelhamid091@gmail.com',
    full_name: 'Ayman Abdul Hamid Saber',
    phone: '538627751',
    date_of_birth: null,
    employment_type: 'Full Time',
    job_title: 'Maintenance',
    property_name: 'Prime Al Hamra Hotel Riyadh',
    department_name: 'Engineering',
    role: 'staff'
  },

  // Jeddah Users from PHG user creation forum1.xlsx
  {
    email: 'Moustafamarzook7200416@gmail.com',
    full_name: 'Moustafa mahmoud marzook',
    phone: '567549721',
    date_of_birth: '1990-02-07',
    employment_type: 'Full Time',
    job_title: 'Fo Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'abdullahahmed54574@gmail.com',
    full_name: 'Abdullah Ahmed Saleh Ali',
    phone: '545747498',
    date_of_birth: '1993-04-03',
    employment_type: 'Full Time',
    job_title: 'Fo Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'mahmoudmo919@yahoo.com',
    full_name: 'Mahmoud Zain Al-Abidin Hamed',
    phone: '565542083',
    date_of_birth: '1986-06-11',
    employment_type: 'Full Time',
    job_title: 'HK Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'zooommm551@gmail.com',
    full_name: 'MOHAMED HANAFY ELSAYED ABDELMAKSOUD',
    phone: '595920662',
    date_of_birth: '1974-05-05',
    employment_type: 'Full Time',
    job_title: 'Laundry Supervioser',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'Moh-oo@hotmail.com',
    full_name: 'Saud abdulmajed alshalabi',
    phone: '558221628',
    date_of_birth: '1999-07-30',
    employment_type: 'Full Time',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'Badebaksh@gmail.com',
    full_name: 'Abdulelah Mohmmed Baksh',
    phone: '547039704',
    date_of_birth: '1995-03-20',
    employment_type: 'Full Time',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'ibf672017@gmail.com',
    full_name: 'Osayd Ibrahim Alrasheed',
    phone: '566335467',
    date_of_birth: '2002-01-13',
    employment_type: 'Full Time',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'neehaal1989@gmail.com',
    full_name: 'Nihal Abd Al Rahman Al Harbi',
    phone: '543119562',
    date_of_birth: '1989-11-03',
    employment_type: 'Full Time',
    job_title: 'Receptionist',
    property_name: 'Prime Al Hamra Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'naserelsady2020@gmail.com',
    full_name: 'Naser elsady Ibrahim',
    phone: '540272932',
    date_of_birth: '1967-07-01',
    employment_type: 'Full Time',
    job_title: 'HK Supervioser',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Housekeeping',
    role: 'department_head'
  },
  {
    email: 'azoooz.bk1993@gmail.com',
    full_name: 'Abdulaziz Badr Bakili',
    phone: '531656567',
    date_of_birth: '1993-01-01',
    employment_type: 'Full Time',
    job_title: 'FO Manager',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'property_manager'
  },
  {
    email: 'mahranahmed231@gmail.com',
    full_name: 'Ahmed Ahmed mahran',
    phone: '564617675',
    date_of_birth: '1982-03-06',
    employment_type: 'Full Time',
    job_title: 'Fo Supervioser',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'department_head'
  },
  {
    email: 'iimansoor6@gmail.com',
    full_name: 'Mansour Mohammed Al-Mahwari',
    phone: '544706217',
    date_of_birth: '2001-11-21',
    employment_type: 'Full Time',
    job_title: 'Receptionist',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'hmada18emam@gmail.com',
    full_name: 'Mohammad Sami Emam',
    phone: '509402019',
    date_of_birth: '2003-11-03',
    employment_type: 'Full Time',
    job_title: 'Receptionist',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  },
  {
    email: 'Play.com99874@gmail.com',
    full_name: 'Nasser musa mahdey alzharani',
    phone: '569379893',
    date_of_birth: '1993-08-18',
    employment_type: 'Full Time',
    job_title: 'Receptionist',
    property_name: 'Prime Al Corniche Hotel Jeddah',
    department_name: 'Front Office',
    role: 'staff'
  }
];

async function getPropertyId(property_name) {
  const { data, error } = await supabase
    .from('properties')
    .select('id')
    .eq('name', property_name)
    .eq('is_active', true)
    .single();
  
  if (error) {
    console.error(`Error getting property ${property_name}:`, error);
    return null;
  }
  
  return data?.id;
}

async function getOrCreateDepartment(property_id, department_name) {
  // Try to get existing department
  const { data, error } = await supabase
    .from('departments')
    .select('id')
    .eq('property_id', property_id)
    .eq('name', department_name)
    .eq('is_active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`Error getting department ${department_name}:`, error);
    return null;
  }
  
  if (data) {
    return data.id;
  }
  
  // Create new department
  const { data: newDept, error: createError } = await supabase
    .from('departments')
    .insert({
      property_id,
      name: department_name,
      is_active: true
    })
    .select('id')
    .single();
  
  if (createError) {
    console.error(`Error creating department ${department_name}:`, createError);
    return null;
  }
  
  console.log(`✓ Created department: ${department_name}`);
  return newDept.id;
}

async function createUser(user) {
  try {
    console.log(`\n📧 Creating user: ${user.email}`);
    
    // 1. Get property ID
    const property_id = await getPropertyId(user.property_name);
    if (!property_id) {
      console.error(`❌ Property not found: ${user.property_name}`);
      return false;
    }
    
    // 2. Get or create department
    const department_id = await getOrCreateDepartment(property_id, user.department_name);
    if (!department_id) {
      console.error(`❌ Failed to get/create department: ${user.department_name}`);
      return false;
    }
    
    // 3. Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      phone: user.phone,
      user_metadata: {
        full_name: user.full_name,
        job_title: user.job_title
      }
    });
    
    if (authError) {
      if (authError.message.includes('duplicate')) {
        console.log(`⚠️  User already exists: ${user.email}`);
        // Get existing user ID
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (existingUser) {
          authUser = { user: { id: existingUser.id } };
        } else {
          console.error(`❌ Could not find existing user profile for: ${user.email}`);
          return false;
        }
      } else {
        console.error(`❌ Auth error for ${user.email}:`, authError);
        return false;
      }
    }
    
    const userId = authUser.user.id;
    
    // 4. Create/update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        hire_date: new Date().toISOString().split('T')[0], // Today
        is_active: true
      });
    
    if (profileError) {
      console.error(`❌ Profile error for ${user.email}:`, profileError);
      return false;
    }
    
    // 5. Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: user.role
      });
    
    if (roleError) {
      console.error(`❌ Role error for ${user.email}:`, roleError);
      return false;
    }
    
    // 6. Assign to property
    const { error: propError } = await supabase
      .from('user_properties')
      .upsert({
        user_id: userId,
        property_id: property_id
      });
    
    if (propError) {
      console.error(`❌ Property assignment error for ${user.email}:`, propError);
      return false;
    }
    
    // 7. Assign to department
    const { error: deptError } = await supabase
      .from('user_departments')
      .upsert({
        user_id: userId,
        department_id: department_id
      });
    
    if (deptError) {
      console.error(`❌ Department assignment error for ${user.email}:`, deptError);
      return false;
    }
    
    console.log(`✅ Successfully created user: ${user.full_name} (${user.email})`);
    return true;
    
  } catch (error) {
    console.error(`❌ Unexpected error for ${user.email}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting bulk user creation for Prime Hotels Intranet');
  console.log(`📋 Total users to process: ${users.length}`);
  
  // Check if we have service key
  if (supabaseServiceKey === 'your-service-role-key') {
    console.error('\n❌ ERROR: You need to set your Supabase service role key!');
    console.log('\n📝 Instructions:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to Settings → API');
    console.log('3. Copy the "service_role" key');
    console.log('4. Update the supabaseServiceKey variable in this script');
    console.log('\n⚠️  Make sure your local Supabase instance is running!');
    process.exit(1);
  }
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const user of users) {
    const success = await createUser(user);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed to create: ${failureCount} users`);
  console.log(`📈 Success rate: ${((successCount / users.length) * 100).toFixed(1)}%`);
  
  if (failureCount === 0) {
    console.log('\n🎉 All users created successfully!');
  } else {
    console.log('\n⚠️  Some users failed. Check the errors above.');
  }
}

// Run the script
main().catch(console.error);
