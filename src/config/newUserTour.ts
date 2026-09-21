// Storage key prefixes (user ID will be appended)
const WIZARD_PENDING_KEY = 'altus_wizard_pending'  // Pending is always for current session

/**
 * Mark wizard as pending (for current session, before redirect)
 */
export function markWizardPending(): void {
    localStorage.setItem(WIZARD_PENDING_KEY, 'true')
}
