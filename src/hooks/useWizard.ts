import { useContext } from 'react'
import { 
  WizardContext, 
  defaultWizardFallback, 
  type WizardContextType 
} from '@/contexts/wizardContextDef'

export function useWizard(): WizardContextType {
  const context = useContext(WizardContext)
  if (!context) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[useWizard] Called outside of WizardProvider; returning resilient fallback.')
    }
    return defaultWizardFallback
  }
  return context
}

