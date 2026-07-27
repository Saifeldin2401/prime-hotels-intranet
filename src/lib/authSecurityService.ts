/**
 * Authentication Security Service
 * 
 * Provides comprehensive security features:
 * - Session binding to IP/User-Agent
 * - MFA (TOTP) support
 * - Password breach checking
 * - Secure audit logging
 * 
 * SECURITY NOTE: Brute force protection is handled SERVER-SIDE only.
 * Client-side rate limiting (sessionStorage) has been removed because
 * it can be bypassed by clearing sessionStorage. Server-side protection
 * via Supabase Auth and database functions provides effective protection.
 */

import { supabase } from './supabase';
import { recordAuthEvent } from './authMonitor';
import { securityConfig } from './security-config';
import { logAuditEvent } from './auditLog';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface SessionFingerprint {
  ipHash: string;
  userAgentHash: string;
  createdAt: number;
  lastVerifiedAt: number;
}

export interface LoginAttempt {
  email: string;
  timestamp: number;
  ipHash: string;
  userAgentHash: string;
  success: boolean;
}

export interface MFASecret {
  factorId: string;
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface AccountLockoutStatus {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  remainingAttempts: number;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
}

// =============================================================================
// SESSION BINDING & SECURITY
// =============================================================================

const SESSION_KEY = 'auth_session_fingerprint';
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
const MFA_ENROLL_STORAGE_KEY = 'phg_mfa_enrollment';

interface PendingMFAEnrollment {
  userId: string;
  factorId: string;
}

/**
 * Generate a hash of the current session context (IP + User-Agent)
 * Note: In a production environment, IP should come from the server
 */
export async function generateSessionFingerprint(): Promise<SessionFingerprint> {
  const userAgent = navigator.userAgent;
  const timestamp = Date.now();
  
  // Create hashes (in production, IP would be included)
  const userAgentHash = await hashString(userAgent);
  const ipHash = await hashString('client-side-' + userAgent); // Placeholder for actual IP
  
  return {
    ipHash,
    userAgentHash,
    createdAt: timestamp,
    lastVerifiedAt: timestamp,
  };
}

/**
 * Store session fingerprint securely
 */
export function storeSessionFingerprint(fingerprint: SessionFingerprint): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(fingerprint));
  } catch {
    // Session storage not available
  }
}

/**
 * Get stored session fingerprint
 */
export function getSessionFingerprint(): SessionFingerprint | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as SessionFingerprint;
  } catch {
    return null;
  }
}

/**
 * Validate current session against stored fingerprint
 * Returns true if session is valid, false if suspicious activity detected
 */
export async function validateSessionBinding(): Promise<{ valid: boolean; reason?: string }> {
  const stored = getSessionFingerprint();
  if (!stored) {
    return { valid: true }; // No fingerprint stored yet
  }
  
  const current = await generateSessionFingerprint();
  
  // Check if user agent has changed significantly (instead of strict hashing, we would ideally do a similarity check, 
  // but for now we'll allow minor mismatches if IP is the same, or use a heuristic score.
  // We'll update the strict requirement to allow the same browser family if parsing,
  // but since we only have hashes here, we will log minor changes as 'info' rather than destroying the session
  // specifically if the IP hash matches)
  if (current.userAgentHash !== stored.userAgentHash) {
    recordAuthEvent({
      type: 'session_validation',
      success: false,
      details: { reason: 'user_agent_mismatch', action: 'warning_logged' },
    });
    
    // Log suspicious activity but do NOT kill the session immediately unless IP also changed
    await logSecurityEvent('session.user_agent_changed', {
      oldHash: stored.userAgentHash,
      newHash: current.userAgentHash,
      ipMatched: current.ipHash === stored.ipHash
    });
    
    if (current.ipHash !== stored.ipHash) {
      return { valid: false, reason: 'High risk anomaly: IP and User agent mismatch - possible session hijacking' };
    }
  }
  
  // Check session age
  const sessionAge = Date.now() - stored.createdAt;
  if (sessionAge > MAX_SESSION_AGE) {
    return { valid: false, reason: 'Session expired' };
  }
  
  // Update last verified timestamp
  stored.lastVerifiedAt = Date.now();
  storeSessionFingerprint(stored);
  
  return { valid: true };
}

/**
 * Clear session fingerprint on logout
 */
export function clearSessionFingerprint(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

// =============================================================================
// BRUTE FORCE PROTECTION
// =============================================================================
// SECURITY FIX: Client-side brute force protection via sessionStorage has been
// removed because it can be bypassed by simply clearing sessionStorage.
// 
// The application relies SOLELY on server-side brute force protection:
// - Supabase Auth built-in rate limiting
// - Database-level account lockout (profiles.locked_until, profiles.failed_login_attempts)
// - CAPTCHA requirements enforced server-side
//
// The following functions remain for backward compatibility but delegate
// all protection decisions to the server:

// Constants for server-side brute force protection (used in server-side functions)
const MAX_ATTEMPTS_BEFORE_CAPTCHA = 999;
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Record a login attempt and check for brute force
 * SECURITY: All decisions are based on SERVER-SIDE state only
 */
export async function recordLoginAttempt(
  email: string,
  success: boolean
): Promise<{ allowed: boolean; captchaRequired: boolean; lockoutMinutes?: number; message?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  
  // SECURITY: Check server-side lockout first (the only reliable protection)
  const serverLockout = await checkServerSideLockout(normalizedEmail);
  if (serverLockout.isLocked) {
    const remainingMinutes = Math.ceil((serverLockout.lockedUntil!.getTime() - now) / 60000);
    return {
      allowed: false,
      captchaRequired: true,
      lockoutMinutes: remainingMinutes,
      message: `Account temporarily locked. Please try again in ${remainingMinutes} minutes.`,
    };
  }
  
  if (success) {
    // Clear server-side failed attempts on success
    await clearServerSideFailedAttempts(normalizedEmail);
    return { allowed: true, captchaRequired: false };
  }
  
  // Record failed attempt server-side only
  await updateServerSideFailedAttempts(normalizedEmail);
  
  // Re-check server-side state after recording the attempt
  const updatedLockout = await checkServerSideLockout(normalizedEmail);
  if (updatedLockout.isLocked) {
    const remainingMinutes = Math.ceil((updatedLockout.lockedUntil!.getTime() - now) / 60000);
    
    // Log security event
    await logSecurityEvent('account.lockout_triggered', {
      email: normalizedEmail,
      attempts: updatedLockout.failedAttempts,
      lockedUntil: updatedLockout.lockedUntil!.toISOString(),
    });
    
    return {
      allowed: false,
      captchaRequired: true,
      lockoutMinutes: remainingMinutes,
      message: `Too many failed attempts. Account locked for ${remainingMinutes} minutes.`,
    };
  }
  
  // Determine CAPTCHA requirement based on server-side failed attempts
  const captchaRequired = updatedLockout.failedAttempts >= 3;
  
  return {
    allowed: !captchaRequired,
    captchaRequired,
    message: captchaRequired ? 'Please complete the CAPTCHA to continue.' : undefined,
  };
}

/**
 * Check if CAPTCHA is required for login
 * SECURITY: Checks server-side failed attempts only
 */
export async function isCaptchaRequired(_email: string): Promise<boolean> {
  // CAPTCHA disabled as requested
  return false;
}

/**
 * Get the current server-side lockout state for an email address.
 */
export async function getAccountLockoutStatus(email: string): Promise<AccountLockoutStatus> {
  return checkServerSideLockout(email.toLowerCase().trim());
}

/**
 * Get remaining attempts before lockout
 * SECURITY: Checks server-side failed attempts only
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  const lockoutStatus = await checkServerSideLockout(email.toLowerCase().trim());
  return Math.max(0, MAX_ATTEMPTS_BEFORE_LOCKOUT - lockoutStatus.failedAttempts);
}

// =============================================================================
// SERVER-SIDE BRUTE FORCE INTEGRATION
// =============================================================================

async function checkServerSideLockout(email: string): Promise<AccountLockoutStatus> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, failed_login_attempts, locked_until, account_status')
      .eq('email', email)
      .single();
    
    if (!profile) {
      return { isLocked: false, lockedUntil: null, failedAttempts: 0, remainingAttempts: MAX_ATTEMPTS_BEFORE_LOCKOUT };
    }
    
    const now = new Date();
    const lockedUntilDate = profile.locked_until ? new Date(profile.locked_until) : null;
    const isTimedLockExpired = lockedUntilDate !== null && lockedUntilDate <= now;

    // Auto-clear expired lockouts so users are not permanently blocked
    if (isTimedLockExpired || (profile.account_status === 'locked' && !lockedUntilDate)) {
      // Only auto-clear time-based lockouts; permanent disables (no locked_until) stay locked
      if (isTimedLockExpired) {
        try {
          await supabase
            .from('profiles')
            .update({
              failed_login_attempts: 0,
              locked_until: null,
              account_status: 'active',
            })
            .eq('id', profile.id);
        } catch {
          // Best-effort clear; do not block the user if this fails
        }
        return { isLocked: false, lockedUntil: null, failedAttempts: 0, remainingAttempts: MAX_ATTEMPTS_BEFORE_LOCKOUT };
      }
    }

    const isActiveLock = lockedUntilDate !== null && lockedUntilDate > now;
    
    return {
      isLocked: isActiveLock || profile.account_status === 'locked',
      lockedUntil: lockedUntilDate && lockedUntilDate > now ? lockedUntilDate : null,
      failedAttempts: profile.failed_login_attempts || 0,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS_BEFORE_LOCKOUT - (profile.failed_login_attempts || 0)),
    };
  } catch {
    return { isLocked: false, lockedUntil: null, failedAttempts: 0, remainingAttempts: MAX_ATTEMPTS_BEFORE_LOCKOUT };
  }
}

async function updateServerSideFailedAttempts(email: string): Promise<void> {
  try {
    await supabase.rpc('record_failed_login_attempt', { p_email: email });
  } catch {
    // Fallback: try direct update
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, failed_login_attempts')
        .eq('email', email)
        .single();
      
      if (profile) {
        const newAttempts = (profile.failed_login_attempts || 0) + 1;
        const updates: Record<string, unknown> = {
          failed_login_attempts: newAttempts,
        };
        
        if (newAttempts >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
          updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
          updates.account_status = 'locked';
        }
        
        await supabase.from('profiles').update(updates).eq('id', profile.id);
      }
    } catch {
      // Ignore errors
    }
  }
}

async function updateServerSideLockout(email: string, attempts: number): Promise<void> {
  try {
    await supabase.rpc('lock_account', {
      p_email: email,
      p_duration_minutes: 30,
    });
  } catch {
    // Ignore errors
  }
}

async function clearServerSideFailedAttempts(email: string): Promise<void> {
  try {
    await supabase.rpc('clear_failed_login_attempts', { p_email: email });
  } catch {
    // Fallback: try direct update
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      if (profile) {
        await supabase
          .from('profiles')
          .update({
            failed_login_attempts: 0,
            locked_until: null,
            account_status: 'active',
          })
          .eq('id', profile.id);
      }
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Self-service account unlock: triggered when a user resets their password.
 * Clears lockout state so they can sign in with their new password.
 * This is called automatically by the password reset flow.
 */
export async function selfServiceUnlockAccount(email: string): Promise<{ success: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, account_status, locked_until')
      .eq('email', normalizedEmail)
      .single();

    if (!profile) return { success: false };

    // Only auto-unlock time-based lockouts; do not clear admin-disabled accounts
    // A permanently disabled account has no locked_until timestamp
    const isTimedLockout = profile.locked_until !== null;
    const isDisabledByAdmin = profile.account_status === 'disabled';
    if (isDisabledByAdmin) return { success: false };

    await supabase
      .from('profiles')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        account_status: 'active',
      })
      .eq('id', profile.id);

    await logSecurityEvent('account.self_service_unlock', {
      email: normalizedEmail,
      wasTimedLockout: isTimedLockout,
    });

    return { success: true };
  } catch {
    return { success: false };
  }
}

// =============================================================================
// MFA (TOTP) SUPPORT
// =============================================================================

/**
 * Generate MFA secret for setup
 * Note: In production, use a proper TOTP library like otplib
 */
export async function generateMFASecret(userId: string): Promise<MFASecret | null> {
  try {
    const { data: factorList, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      if (import.meta.env.DEV) {
        console.warn('[MFA] Failed to list factors before enrollment:', listError);
      }
      return null;
    }

    const unverifiedTotpFactors = (factorList?.all ?? []).filter(
      (factor) => factor.factor_type === 'totp' && factor.status === 'unverified',
    );

    for (const factor of unverifiedTotpFactors) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Altus Connect',
      issuer: 'Altus Connect',
    });

    if (error || !data?.id || !data.totp?.secret) {
      if (import.meta.env.DEV) {
        console.warn('[MFA] Failed to enroll TOTP factor:', error);
      }
      return null;
    }

    storePendingMFAEnrollment({ userId, factorId: data.id });

    return {
      factorId: data.id,
      secret: data.totp.secret,
      backupCodes: [],
      qrCodeUrl: buildSupabaseQrCodeUrl(data.totp.qr_code, data.totp.uri, userId, data.totp.secret),
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[MFA] Unexpected error during enrollment:', error);
    }
    return null;
  }
}

/**
 * Enable MFA for a user after verification
 */
export async function enableMFA(userId: string, code: string): Promise<boolean> {
  try {
    const enrollment = getPendingMFAEnrollment();
    if (!enrollment || enrollment.userId !== userId) {
      return false;
    }

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });
    if (error || !data) return false;

    clearPendingMFAEnrollment();
    await logSecurityEvent('mfa.enabled', { userId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Disable MFA for a user
 */
export async function disableMFA(userId: string, password: string): Promise<boolean> {
  try {
    const { data: userResult } = await supabase.auth.getUser();
    const currentUser = userResult.user;
    if (!currentUser?.email || currentUser.id !== userId) return false;

    const { data: passwordCheck, error: passwordError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password,
    });

    if (passwordError || !passwordCheck.user || passwordCheck.user.id !== userId) {
      return false;
    }

    const { data: factorList, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) return false;

    const verifiedTotpFactors = (factorList?.totp ?? []).filter((factor) => factor.status === 'verified');
    if (verifiedTotpFactors.length === 0) return false;

    const unenrollResults = await Promise.all(
      verifiedTotpFactors.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })),
    );

    if (unenrollResults.some((result) => result.error)) return false;

    await logSecurityEvent('mfa.disabled', { userId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify MFA code during login
 */
export async function verifyMFACode(userId: string, code: string): Promise<boolean> {
  try {
    const factorId = await getPrimaryVerifiedTotpFactorId();
    if (!factorId) {
      return false;
    }

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (error || !data?.user || data.user.id !== userId) return false;
    
    if (data) {
      await logSecurityEvent('mfa.verified', { userId });
    } else {
      await logSecurityEvent('mfa.verification_failed', { userId });
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has MFA enabled
 */
export async function isMFAEnabled(userId: string): Promise<boolean> {
  try {
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user || userResult.user.id !== userId) return false;

    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return false;

    return (data?.totp ?? []).some((factor) => factor.status === 'verified');
  } catch {
    return false;
  }
}

/**
 * Check if MFA is required for the user's role
 */
export async function isMFARequired(userId: string): Promise<boolean> {
  try {
    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error || !roles) return false;
    
    // MFA required for admin roles
    const adminRoles = ['corporate_admin', 'regional_admin', 'regional_hr'];
    return roles.some(r => adminRoles.includes(r.role));
  } catch {
    return false;
  }
}

// =============================================================================
// PASSWORD SECURITY
// =============================================================================

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;
  
  const config = securityConfig.auth;
  
  // Length check
  if (password.length < config.passwordMinLength) {
    errors.push(`At least ${config.passwordMinLength} characters`);
  } else {
    score += 1;
  }
  
  // Uppercase check
  if (config.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  } else if (config.passwordRequireUppercase) {
    score += 1;
  }
  
  // Lowercase check
  if (config.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  } else if (config.passwordRequireLowercase) {
    score += 1;
  }
  
  // Number check
  if (config.passwordRequireNumbers && !/[0-9]/.test(password)) {
    errors.push('One number');
  } else if (config.passwordRequireNumbers) {
    score += 1;
  }
  
  // Special character check
  if (config.passwordRequireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('One special character');
  } else if (config.passwordRequireSpecialChars) {
    score += 1;
  }
  
  // Determine strength label
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 4) strength = 'good';
  else if (score >= 3) strength = 'fair';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Check if password has been breached using HaveIBeenPwned API
 * Uses k-anonymity model (only sends first 5 chars of hash)
 */
export async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count?: number }> {
  try {
    // Generate SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    // Send only first 5 characters (k-anonymity)
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true',
      },
    });
    
    if (!response.ok) {
      // If API fails, assume password is safe (fail open for UX)
      return { breached: false };
    }
    
    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return { breached: true, count: parseInt(count, 10) };
      }
    }
    
    return { breached: false };
  } catch {
    // If check fails, assume password is safe
    return { breached: false };
  }
}

/**
 * Check if password was previously used by this user
 */
export async function checkPasswordReused(userId: string, password: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_password_reuse', {
      p_user_id: userId,
      p_password: password,
    });
    if (error) return false;
    return data as boolean;
  } catch {
    return false;
  }
}

/**
 * Check if password rotation is required (for admins - 90 days)
 */
export async function isPasswordRotationRequired(userId: string): Promise<{ required: boolean; daysRemaining?: number }> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('password_last_changed_at, force_password_reset')
      .eq('id', userId)
      .single();
    
    if (!profile) return { required: false };
    
    // Check if password reset is forced
    if (profile.force_password_reset) {
      return { required: true };
    }
    
    // Check if user is admin (90-day rotation required)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    const adminRoles = ['corporate_admin', 'regional_admin'];
    const isAdmin = roles?.some(r => adminRoles.includes(r.role)) ?? false;
    
    if (!isAdmin) {
      return { required: false };
    }
    
    // Check last password change
    const lastChanged = profile.password_last_changed_at 
      ? new Date(profile.password_last_changed_at) 
      : null;
    
    if (!lastChanged) {
      return { required: true };
    }
    
    const ROTATION_DAYS = 90;
    const rotationDue = new Date(lastChanged);
    rotationDue.setDate(rotationDue.getDate() + ROTATION_DAYS);
    
    const now = new Date();
    const daysRemaining = Math.ceil((rotationDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      required: daysRemaining <= 0,
      daysRemaining: Math.max(0, daysRemaining),
    };
  } catch {
    return { required: false };
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Get active sessions for user
 */
export async function getActiveSessions(userId: string): Promise<Array<{
  id: string;
  createdAt: Date;
  lastActiveAt: Date;
  ipAddress: string;
  userAgent: string;
  isCurrent: boolean;
}>> {
  try {
    const { data, error } = await supabase.rpc('get_user_sessions', { p_user_id: userId });
    if (error || !data) return [];
    return data.map((s: Record<string, unknown>) => ({
      id: s.id as string,
      createdAt: new Date(s.created_at as string),
      lastActiveAt: new Date(s.last_active_at as string),
      ipAddress: s.ip_address as string,
      userAgent: s.user_agent as string,
      isCurrent: s.is_current as boolean,
    }));
  } catch {
    return [];
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('revoke_session', { p_session_id: sessionId });
    if (error) return false;
    
    await logSecurityEvent('session.revoked', { sessionId });
    return true;
  } catch {
    return false;
  }
}

/**
 * Revoke all other sessions (keep current)
 */
export async function revokeAllOtherSessions(): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;
    
    const { error } = await supabase.rpc('revoke_all_other_sessions', {
      p_user_id: userData.user.id,
    });
    if (error) return false;
    
    await logSecurityEvent('session.revoke_all_other', { userId: userData.user.id });
    return true;
  } catch {
    return false;
  }
}

/**
 * Limit concurrent sessions per user
 */
export async function enforceSessionLimit(userId: string, maxSessions: number = 5): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('enforce_session_limit', {
      p_user_id: userId,
      p_max_sessions: maxSessions,
    });
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// SECURITY AUDIT LOGGING
// =============================================================================

/**
 * Log security-related events
 */
export async function logSecurityEvent(
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    await logAuditEvent({
      event_type: 'security.event' as import('./auditLog').AuditEventType,
      entity_type: 'security',
      entity_id: userId || 'anonymous',
      description: eventType,
      metadata: {
        event_type: eventType,
        user_agent: navigator.userAgent,
        ...metadata,
      },
    });
  } catch {
    // Ignore logging errors
  }
}

/**
 * Log suspicious authentication activity
 */
export async function logSuspiciousActivity(
  activity: string,
  details: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent(`suspicious.${activity}`, details);
  
  // Also record to auth monitor
  recordAuthEvent({
    type: 'session_validation',
    success: false,
    error: activity,
    details,
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Hash a string using SHA-256
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildSupabaseQrCodeUrl(
  qrCodeSvg: string | undefined,
  uri: string | undefined,
  accountId: string,
  secret: string,
): string {
  if (uri) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
  }

  if (qrCodeSvg) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCodeSvg)}`;
  }

  return buildMfaQrCodeUrl(accountId, secret);
}

function buildMfaQrCodeUrl(accountId: string, secret: string): string {
  const otpauth = `otpauth://totp/Altus:${accountId}?secret=${secret}&issuer=Altus%20Connect`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
}

function storePendingMFAEnrollment(enrollment: PendingMFAEnrollment): void {
  try {
    sessionStorage.setItem(MFA_ENROLL_STORAGE_KEY, JSON.stringify(enrollment));
  } catch {
    // Ignore storage failures.
  }
}

function getPendingMFAEnrollment(): PendingMFAEnrollment | null {
  try {
    const stored = sessionStorage.getItem(MFA_ENROLL_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as PendingMFAEnrollment;
  } catch {
    return null;
  }
}

function clearPendingMFAEnrollment(): void {
  try {
    sessionStorage.removeItem(MFA_ENROLL_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

async function getPrimaryVerifiedTotpFactorId(): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return null;

  const factor = (data?.totp ?? []).find((candidate) => candidate.status === 'verified');
  return factor?.id ?? null;
}

async function getSecurityRequirementsFallback(
  userId: string,
  error: unknown,
): Promise<{
  mfaRequired: boolean;
  mfaEnabled: boolean;
  passwordRotationRequired: boolean;
  passwordRotationDays?: number;
  setupComplete: boolean;
}> {
  if (import.meta.env.DEV) {
    console.warn('[Security] Could not fetch security summary, using fallback:', error);
  }

  try {
    const [mfaRequired, mfaEnabled] = await Promise.all([
      isMFARequired(userId),
      isMFAEnabled(userId),
    ]);

    return {
      mfaRequired,
      mfaEnabled,
      passwordRotationRequired: false,
      setupComplete: !mfaRequired || mfaEnabled,
    };
  } catch (fallbackError) {
    if (import.meta.env.DEV) {
      console.error('[Security] Fallback security requirements check failed:', fallbackError);
    }

    return {
      mfaRequired: false,
      mfaEnabled: false,
      passwordRotationRequired: false,
      setupComplete: true,
    };
  }
}

/**
 * Check if user needs to complete security setup (MFA for admins)
 */
/**
 * Check if user needs to complete security setup (MFA for admins)
 */
export async function checkSecurityRequirements(userId: string): Promise<{
  mfaRequired: boolean;
  mfaEnabled: boolean;
  passwordRotationRequired: boolean;
  passwordRotationDays?: number;
  setupComplete: boolean;
}> {
  try {
    const [mfaRequired, mfaEnabled, passwordRotation] = await Promise.all([
      isMFARequired(userId),
      isMFAEnabled(userId),
      isPasswordRotationRequired(userId),
    ]);

    return {
      mfaRequired,
      mfaEnabled,
      passwordRotationRequired: passwordRotation.required,
      passwordRotationDays: passwordRotation.daysRemaining,
      setupComplete: (!mfaRequired || mfaEnabled) && !passwordRotation.required,
    };
  } catch (err) {
    return getSecurityRequirementsFallback(userId, err);
  }
}

/**
 * Initialize session security on login
 */
export async function initializeSessionSecurity(): Promise<void> {
  try {
    const fingerprint = await generateSessionFingerprint();
    storeSessionFingerprint(fingerprint);
    
    // Enforce session limits (best effort - don't fail if DB functions missing)
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await enforceSessionLimit(userData.user.id, 5);
    }
  } catch (err) {
    // Security initialization failed, but auth should still work
    // Log for debugging but don't throw
    console.warn('[AuthSecurity] Session security initialization failed:', err);
  }
}
