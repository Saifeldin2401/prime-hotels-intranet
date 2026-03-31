/**
 * Feature flags for gradual rollout of new features
 * 
 * Usage:
 * - Check if feature is enabled: isEnabled('tabSwitchingFixes')
 * - Force enable for testing: localStorage.setItem('ff_tabSwitchingFixes', 'true')
 * - Force disable: localStorage.setItem('ff_tabSwitchingFixes', 'false')
 */

export type FeatureFlag = 
  | 'tabSwitchingFixes'
  | 'smartSessionValidation'
  | 'networkAwareLogout'
  | 'debouncedFocusManager'

interface FeatureConfig {
  enabled: boolean
  rolloutPercent: number // 0-100
  allowedHosts?: string[] // Specific hosts to enable on
}

// Default configuration for each feature
const DEFAULT_FEATURES: Record<FeatureFlag, FeatureConfig> = {
  tabSwitchingFixes: {
    enabled: true,
    rolloutPercent: 100, // 100% rollout after testing
  },
  smartSessionValidation: {
    enabled: true,
    rolloutPercent: 100,
  },
  networkAwareLogout: {
    enabled: true,
    rolloutPercent: 100,
  },
  debouncedFocusManager: {
    enabled: true,
    rolloutPercent: 100,
  },
}

/**
 * Check if a feature is enabled for the current user/session
 */
export function isEnabled(flag: FeatureFlag): boolean {
  // Check localStorage override first (for testing)
  const localOverride = getLocalOverride(flag)
  if (localOverride !== null) return localOverride

  const config = DEFAULT_FEATURES[flag]
  
  // Check if globally disabled
  if (!config.enabled) return false

  // Check if specific hosts are required
  if (config.allowedHosts && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (!config.allowedHosts.some(allowed => host.includes(allowed))) {
      return false
    }
  }

  // Check rollout percentage (sticky per session)
  if (config.rolloutPercent < 100) {
    const sessionKey = `ff_rollout_${flag}`
    let inRollout = sessionStorage.getItem(sessionKey)
    
    if (inRollout === null) {
      // Determine once per session
      const random = Math.random() * 100
      inRollout = random < config.rolloutPercent ? '1' : '0'
      sessionStorage.setItem(sessionKey, inRollout)
    }
    
    return inRollout === '1'
  }

  return true
}

/**
 * Get localStorage override for a feature flag
 * Returns null if no override is set
 */
function getLocalOverride(flag: FeatureFlag): boolean | null {
  if (typeof window === 'undefined') return null
  
  try {
    const key = `ff_${flag}`
    const value = localStorage.getItem(key)
    if (value === 'true') return true
    if (value === 'false') return false
    return null
  } catch {
    // localStorage might be disabled
    return null
  }
}

/**
 * Set a local override for testing
 */
export function setLocalOverride(flag: FeatureFlag, enabled: boolean | null): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = `ff_${flag}`
    if (enabled === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, String(enabled))
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get all feature flag statuses (for debugging)
 */
export function getAllFlags(): Record<FeatureFlag, { enabled: boolean; override: boolean | null }> {
  return {
    tabSwitchingFixes: { 
      enabled: isEnabled('tabSwitchingFixes'), 
      override: getLocalOverride('tabSwitchingFixes') 
    },
    smartSessionValidation: { 
      enabled: isEnabled('smartSessionValidation'), 
      override: getLocalOverride('smartSessionValidation') 
    },
    networkAwareLogout: { 
      enabled: isEnabled('networkAwareLogout'), 
      override: getLocalOverride('networkAwareLogout') 
    },
    debouncedFocusManager: { 
      enabled: isEnabled('debouncedFocusManager'), 
      override: getLocalOverride('debouncedFocusManager') 
    },
  }
}

/**
 * Log all feature flags to console (for debugging)
 */
export function logFeatureFlags(): void {
  if (import.meta.env.DEV) {
    console.log('[FeatureFlags]', getAllFlags())
  }
}
