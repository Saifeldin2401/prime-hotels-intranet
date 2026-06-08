#!/usr/bin/env node
/**
 * Environment Variable Validation Script
 * 
 * This script validates environment variables before deployment.
 * Run it before building: node scripts/validate-env.js
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const productionOnlyVars = [
  'VITE_APP_URL',
  'VITE_ALLOWED_ORIGINS',
];

const forbiddenInProduction = [
  'VITE_DEV_MODE',
];

const placeholderPatterns = [
  /your-project-id/i,
  /your[_-]?key[_-]?here/i,
  /examplePublicKey/i,
  /placeholder/i,
  /xxx+/i,
  /TODO/i,
];

function validateEnv() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`🔍 Validating environment variables for ${isProduction ? 'PRODUCTION' : 'development'}...\n`);

  // Check required variables
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      errors.push(`❌ Missing required variable: ${varName}`);
    } else if (placeholderPatterns.some(pattern => pattern.test(value))) {
      errors.push(`❌ ${varName} contains placeholder value: ${value.substring(0, 30)}...`);
    } else {
      console.log(`✅ ${varName} is set`);
    }
  }

  // Check production-only variables
  if (isProduction) {
    for (const varName of productionOnlyVars) {
      const value = process.env[varName];
      if (!value) {
        warnings.push(`⚠️  Missing production variable: ${varName}`);
      } else {
        console.log(`✅ ${varName} is set`);
      }
    }

    // Check for forbidden variables in production
    for (const varName of forbiddenInProduction) {
      const value = process.env[varName];
      if (value === 'true' || value === '1') {
        errors.push(`❌ ${varName} should not be enabled in production`);
      }
    }

    // Validate HTTPS for production URLs
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      errors.push(`❌ VITE_SUPABASE_URL must use HTTPS in production: ${supabaseUrl}`);
    }

    const appUrl = process.env.VITE_APP_URL;
    if (appUrl && !appUrl.startsWith('https://')) {
      errors.push(`❌ VITE_APP_URL must use HTTPS in production: ${appUrl}`);
    }
  }

  // Check for potential secrets in client-side env vars
  const clientEnvVars = Object.keys(process.env).filter(key => key.startsWith('VITE_'));
  const suspiciousPatterns = [/key/i, /secret/i, /password/i, /token/i, /private/i];
  
  for (const varName of clientEnvVars) {
    if (suspiciousPatterns.some(pattern => pattern.test(varName))) {
      const lowerName = varName.toLowerCase();
      // Allow VITE_SUPABASE_ANON_KEY as it's a public key
      if (!lowerName.includes('anon') && !lowerName.includes('public')) {
        warnings.push(`⚠️  ${varName} might contain sensitive data and is exposed to client`);
      }
    }
  }

  // Report results
  console.log('\n' + '='.repeat(50));
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`   ${w}`));
  }

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(e => console.log(`   ${e}`));
    console.log('\n❌ Validation failed. Please fix the errors above.');
    process.exit(1);
  }

  console.log('\n✅ All environment variables are valid!');
  process.exit(0);
}

validateEnv();
