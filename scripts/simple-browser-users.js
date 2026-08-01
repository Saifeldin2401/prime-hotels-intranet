/**
 * Altus Connect Intranet - Bulk User Creation (Browser Console)
 *
 * Safe mode:
 * - Uses Edge Function `create-user` (no raw SQL / no auth.users direct insert)
 * - Uses invite provisioning by default
 * - Idempotent handling for existing users
 *
 * Instructions:
 * 1) Login to Altus Connect Intranet with a privileged account
 *    (corporate_admin / regional_admin / regional_hr).
 * 2) Open browser console (F12).
 * 3) Copy-paste this entire script and press Enter.
 */

const CONFIG = {
  provisioningMethod: 'invite', // 'invite' | 'temporary_password'
  createMissingDepartments: true,
  dryRun: false,
  delayMs: 250,
  requestTimeoutMs: 20000,
  maxRetries: 2,
  retryDelayMs: 800
};

// Users from Riyadh User Forum.xlsx and ALTUS user creation forum1.xlsx
const users = [
  // Riyadh Users
  { email: 'a.taha.mamoun1991@gmail.com', name: 'Ahmed Taha Mamoun', phone: '500418959', property: 'Altus Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'department_head' },
  { email: 'mahmoudelakabawey@gmail.com', name: 'Mahmoud Ahmed elakabawy', phone: '576234611', property: 'Altus Al Hamra Hotel Riyadh', dept: 'Housekeeping', role: 'property_hr' },
  { email: 'Alatawi1213@gmail.com', name: 'Faisal Mohamed Al Otaibi', phone: '551448914', property: 'Altus Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'staff' },
  { email: 'elegantlayla88@gmail.com', name: 'Layla Ali Shrahily', phone: '506388055', property: 'Altus Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'staff' },
  { email: 'hassanshalaby280@gmail.com', name: 'Hasan Abdel Raof Shalaby', phone: '569409945', property: 'Altus Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'department_head' },
  { email: 'eslam.mady.2020@gmail.com', name: 'Islam Mahmoud Madi', phone: '570958030', property: 'Altus Al Hamra Hotel Riyadh', dept: 'Front Office', role: 'staff' },
  { email: 'looa01230th@gmail.com', name: 'AIIam Ali lbrahim', phone: '570481399', property: 'Medhal Qurtuba by Altus Advisory', dept: 'Front Office', role: 'department_head' },
  { email: 'mohamedgalallld@gmail.com', name: 'MOHAMED Galal Anwer Ahmed', phone: '561005446', property: 'Medhal Qurtuba by Altus Advisory', dept: 'Front Office', role: 'staff' },
  { email: 'fhdalnzv209@gmail.com', name: 'FAHAD MESHAAL AIANzi', phone: '502792036', property: 'Medhal Qurtuba by Altus Advisory', dept: 'Front Office', role: 'staff' },
  { email: 'mohamedreao49@gmail.com', name: 'MOHAMED ABDELBADEAA ISMEAL', phone: '559697307', property: 'Medhal Qurtuba by Altus Advisory', dept: 'Housekeeping', role: 'department_head' },
  { email: 'aymanabdelhamid091@gmail.com', name: 'Ayman Abdul Hamid Saber', phone: '538627751', property: 'Altus Al Hamra Hotel Riyadh', dept: 'Maintenance', role: 'staff' },

  // Jeddah Users
  { email: 'Moustafamarzook7200416@gmail.com', name: 'Moustafa mahmoud marzook', phone: '567549721', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'department_head' },
  { email: 'abdullahahmed54574@gmail.com', name: 'Abdullah Ahmed Saleh Ali', phone: '545747498', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'department_head' },
  { email: 'mahmoudmo919@yahoo.com', name: 'Mahmoud Zain Al-Abidin Hamed', phone: '565542083', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Housekeeping', role: 'department_head' },
  { email: 'zooommm551@gmail.com', name: 'MOHAMED HANAFY ELSAYED ABDELMAKSOUD', phone: '595920662', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Housekeeping', role: 'department_head' },
  { email: 'Moh-oo@hotmail.com', name: 'Saud abdulmajed alshalabi', phone: '558221628', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'Badebaksh@gmail.com', name: 'Abdulelah Mohmmed Baksh', phone: '547039704', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'ibf672017@gmail.com', name: 'Osayd Ibrahim Alrasheed', phone: '566335467', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'neehaal1989@gmail.com', name: 'Nihal Abd Al Rahman Al Harbi', phone: '543119562', property: 'Altus Al Hamra Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'naserelsady2020@gmail.com', name: 'Naser elsady Ibrahim', phone: '540272932', property: 'Altus Al Corniche Hotel Jeddah', dept: 'Housekeeping', role: 'department_head' },
  { email: 'azoooz.bk1993@gmail.com', name: 'Abdulaziz Badr Bakili', phone: '531656567', property: 'Altus Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'property_manager' },
  { email: 'mahranahmed231@gmail.com', name: 'Ahmed Ahmed mahran', phone: '564617675', property: 'Altus Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'department_head' },
  { email: 'iimansoor6@gmail.com', name: 'Mansour Mohammed Al-Mahwari', phone: '544706217', property: 'Altus Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'hmada18emam@gmail.com', name: 'Mohammad Sami Emam', phone: '509402019', property: 'Altus Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'staff' },
  { email: 'Play.com99874@gmail.com', name: 'Nasser musa mahdey alzharani', phone: '569379893', property: 'Altus Al Corniche Hotel Jeddah', dept: 'Front Office', role: 'staff' }
];

const VALID_ROLES = new Set([
  'corporate_admin',
  'regional_admin',
  'regional_hr',
  'property_manager',
  'property_hr',
  'department_head',
  'manager',
  'staff'
]);

function normalizeText(value) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  return digits || undefined;
}

function validateUserRow(row) {
  const email = normalizeEmail(row?.email);
  if (!email) return 'Missing email';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return `Invalid email "${row?.email}"`;
  if (!String(row?.name || '').trim()) return 'Missing full name';
  if (!String(row?.property || '').trim()) return 'Missing property';
  if (!String(row?.dept || '').trim()) return 'Missing department';
  if (!String(row?.role || '').trim()) return 'Missing role';
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.floor(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function isRetryableErrorMessage(message) {
  const text = normalizeText(message);
  return (
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('network') ||
    text.includes('failed to fetch') ||
    text.includes('503') ||
    text.includes('502') ||
    text.includes('504') ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  );
}

async function withRetry(operationName, task) {
  let attempt = 0;
  while (attempt <= CONFIG.maxRetries) {
    try {
      return await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canRetry = attempt < CONFIG.maxRetries && isRetryableErrorMessage(message);
      if (!canRetry) throw error;
      const waitMs = CONFIG.retryDelayMs * (attempt + 1);
      console.warn(`  ! ${operationName} failed (attempt ${attempt + 1}), retrying in ${waitMs}ms`);
      await sleep(waitMs);
      attempt += 1;
    }
  }
  throw new Error(`${operationName} failed after retries`);
}

async function parseInvokeError(fnError) {
  const message = fnError?.message || 'Unknown function invocation error';
  const response =
    fnError?.context instanceof Response
      ? fnError.context
      : fnError?.context?.response;
  if (!response) return message;

  try {
    const text = await response.text();
    if (!text) return message;
    const parsed = JSON.parse(text);
    return parsed?.error || text || message;
  } catch {
    return message;
  }
}

async function assertPrerequisites(supabase) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session found. Please log in first.');
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unable to resolve current authenticated user.');
  }

  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (roleError) {
    throw new Error(`Unable to verify roles: ${roleError.message}`);
  }

  const roles = (roleRows || []).map((r) => r.role);
  const hasPermission = roles.some((r) =>
    ['corporate_admin', 'regional_admin', 'regional_hr'].includes(r)
  );

  if (!hasPermission) {
    throw new Error(
      `Insufficient privileges. Current roles: ${roles.join(', ') || 'none'}`
    );
  }

  return { user, roles };
}

async function loadMaps(supabase) {
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('id,name,is_active')
    .eq('is_active', true);

  if (propError) {
    throw new Error(`Failed to load properties: ${propError.message}`);
  }

  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('id,name,property_id,is_active')
    .eq('is_active', true);

  if (deptError) {
    throw new Error(`Failed to load departments: ${deptError.message}`);
  }

  const propertyByName = new Map();
  for (const p of properties || []) {
    propertyByName.set(normalizeText(p.name), p);
  }

  const departmentByPropertyAndName = new Map();
  for (const d of departments || []) {
    const key = `${d.property_id}::${normalizeText(d.name)}`;
    departmentByPropertyAndName.set(key, d);
  }

  return { propertyByName, departmentByPropertyAndName };
}

async function ensureDepartment(supabase, maps, propertyId, deptName) {
  const key = `${propertyId}::${normalizeText(deptName)}`;
  const existing = maps.departmentByPropertyAndName.get(key);
  if (existing) return existing.id;

  if (!CONFIG.createMissingDepartments) {
    throw new Error(`Department not found: "${deptName}" for property ${propertyId}`);
  }

  if (CONFIG.dryRun) {
    const simulatedId = `dryrun:${key}`;
    maps.departmentByPropertyAndName.set(key, { id: simulatedId, name: deptName, property_id: propertyId });
    console.log(`  ~ [dry-run] Would create department: ${deptName}`);
    return simulatedId;
  }

  const { data: created, error } = await withRetry(
    `create department ${deptName}`,
    () => withTimeout(
      supabase
        .from('departments')
        .insert({
          property_id: propertyId,
          name: deptName,
          is_active: true
        })
        .select('id,name,property_id,is_active')
        .single(),
      CONFIG.requestTimeoutMs,
      `Department create (${deptName})`
    )
  );

  if (error) {
    throw new Error(`Failed creating department "${deptName}": ${error.message}`);
  }

  maps.departmentByPropertyAndName.set(key, created);
  console.log(`  + Created department: ${deptName}`);
  return created.id;
}

async function createSingleUser(supabase, maps, row) {
  const normalizedRole = normalizeText(row.role).replace(/\s+/g, '_');
  if (!VALID_ROLES.has(normalizedRole)) {
    throw new Error(`Invalid role "${row.role}"`);
  }

  const property = maps.propertyByName.get(normalizeText(row.property));
  if (!property) {
    throw new Error(`Property not found: "${row.property}"`);
  }

  const departmentId = await ensureDepartment(
    supabase,
    maps,
    property.id,
    row.dept
  );

  const payload = {
    email: normalizeEmail(row.email),
    fullName: row.name,
    phone: normalizePhone(row.phone),
    role: normalizedRole,
    propertyIds: [property.id],
    departmentIds: [departmentId],
    provisioningMethod: CONFIG.provisioningMethod,
    appUrl: window.location.origin
  };

  if (CONFIG.dryRun) {
    console.log(`  ~ [dry-run] Would create/invite user: ${payload.email} (${normalizedRole})`);
    return { dryRun: true };
  }

  const { data, error } = await withRetry(
    `create-user for ${payload.email}`,
    () => withTimeout(
      supabase.functions.invoke('create-user', {
        body: payload
      }),
      CONFIG.requestTimeoutMs,
      `create-user (${payload.email})`
    )
  );

  if (error) {
    const detailed = await parseInvokeError(error);
    throw new Error(detailed);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data || {};
}

function isAlreadyExistsError(message) {
  const text = normalizeText(message);
  return (
    text.includes('already registered') ||
    text.includes('already exists') ||
    text.includes('duplicate') ||
    text.includes('email address has already')
  );
}

async function createBulkUsers() {
  const { supabase } = window;
  if (!supabase) {
    console.error('Supabase client not found. Open this on the intranet app.');
    return;
  }

  console.log('Altus Connect Intranet - Bulk User Creation');
  console.log(`Users to process: ${users.length}`);
  console.log(`Provisioning method: ${CONFIG.provisioningMethod}`);
  console.log(`Dry run: ${CONFIG.dryRun ? 'ON (no writes)' : 'OFF'}`);

  try {
    const authInfo = await assertPrerequisites(supabase);
    console.log(`Authenticated as: ${authInfo.user.email}`);
    console.log(`Roles: ${authInfo.roles.join(', ')}`);
  } catch (err) {
    console.error(`Pre-check failed: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  let maps;
  try {
    maps = await loadMaps(supabase);
  } catch (err) {
    console.error(`Failed loading reference data: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const report = {
    created: 0,
    skippedInputDuplicates: 0,
    skippedExisting: 0,
    failed: 0,
    errors: []
  };
  const seenInputEmails = new Set();

  for (let i = 0; i < users.length; i += 1) {
    const row = users[i];
    const normalizedEmail = normalizeEmail(row.email);
    console.log(`[${i + 1}/${users.length}] ${normalizedEmail || row.email}`);

    const rowValidationError = validateUserRow(row);
    if (rowValidationError) {
      report.failed += 1;
      report.errors.push({ email: row.email || '(missing-email)', error: rowValidationError });
      console.error(`  x Failed validation: ${rowValidationError}`);
      await sleep(CONFIG.delayMs);
      continue;
    }

    if (seenInputEmails.has(normalizedEmail)) {
      report.skippedInputDuplicates += 1;
      console.log(`  - Duplicate in input list, skipped`);
      await sleep(CONFIG.delayMs);
      continue;
    }
    seenInputEmails.add(normalizedEmail);

    try {
      const result = await createSingleUser(supabase, maps, row);
      report.created += 1;

      if (CONFIG.provisioningMethod === 'temporary_password' && result?.tempPassword) {
        console.log(`  + Created user (temporary password generated)`);
      } else if (CONFIG.dryRun) {
        console.log(`  ~ Dry-run check passed`);
      } else {
        console.log(`  + Invited user`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (isAlreadyExistsError(msg)) {
        report.skippedExisting += 1;
        console.log(`  - Already exists, skipped`);
      } else {
        report.failed += 1;
        report.errors.push({ email: row.email, error: msg });
        console.error(`  x Failed: ${msg}`);
      }
    }

    await sleep(CONFIG.delayMs);
  }

  console.log('\nSUMMARY');
  console.log(`Created: ${report.created}`);
  console.log(`Skipped (input duplicates): ${report.skippedInputDuplicates}`);
  console.log(`Skipped (already exists): ${report.skippedExisting}`);
  console.log(`Failed: ${report.failed}`);

  if (report.errors.length > 0) {
    console.log('\nFAILED ROWS');
    report.errors.forEach((e) => {
      console.log(`- ${e.email}: ${e.error}`);
    });
  }

  const completed = report.created + report.skippedExisting + report.failed;
  const successLike = report.created + report.skippedExisting;
  const rate = completed > 0 ? ((successLike / completed) * 100).toFixed(1) : '0.0';
  console.log(`Success-like rate: ${rate}%`);
}

void createBulkUsers();
