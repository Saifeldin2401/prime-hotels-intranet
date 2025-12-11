import { useState, useCallback, useRef } from 'react'
import { z } from 'zod'
import { validateForm as validateFormUtil, sanitizeFormData, prepareFormData, getFieldError, hasFieldError } from '@/lib/validation'

export interface UseFormOptions<T> {
  initialValues: T
  schema?: z.ZodSchema<T>
  onSubmit?: (values: T) => Promise<void> | void
  validateOnChange?: boolean
  validateOnBlur?: boolean
  sanitizeOnSubmit?: boolean
  resetOnSubmit?: boolean
}

export interface FormState<T> {
  data: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
  isSubmitted: boolean
}

// Utility functions
const createFormState = <T>(initialData: T): FormState<T> => ({
  data: initialData,
  errors: {},
  touched: {},
  isSubmitting: false,
  isValid: true,
  isDirty: false,
  isSubmitted: false
})

const updateFormState = <T>(state: FormState<T>, updates: Partial<FormState<T>>): FormState<T> => ({
  ...state,
  ...updates
})

const markFieldTouched = <T>(state: FormState<T>, fieldName: string): FormState<T> => {
  return updateFormState(state, {
    touched: { ...state.touched, [fieldName]: true },
    isDirty: true
  })
}

const setFieldValue = <T>(state: FormState<T>, fieldName: string, value: any): FormState<T> => {
  return updateFormState(state, {
    data: { ...state.data, [fieldName]: value },
    isDirty: true
  })
}

const setFieldErrorUtil = <T>(state: FormState<T>, fieldName: string, error: string | undefined): FormState<T> => {
  const newErrors = { ...state.errors }
  if (error) {
    newErrors[fieldName] = error
  } else {
    delete newErrors[fieldName]
  }
  
  return updateFormState(state, {
    errors: newErrors,
    isValid: Object.keys(newErrors).length === 0
  })
}

export function useForm<T extends Record<string, any>>(options: UseFormOptions<T>) {
  const {
    initialValues,
    schema,
    onSubmit,
    validateOnChange = true,
    validateOnBlur = true,
    sanitizeOnSubmit = true,
    resetOnSubmit = false
  } = options

  const [state, setState] = useState<FormState<T>>(() => createFormState(initialValues))
  const submitCount = useRef(0)
  const isSubmittingRef = useRef(false)

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: any): string | undefined => {
    if (!schema) return undefined

    try {
      // Create a partial schema for just this field
      const fieldSchema = z.object({ [fieldName]: schema })
      const result = fieldSchema.safeParse({ [fieldName]: value })
      
      if (!result.success) {
        return result.error.issues[0]?.message
      }
      return undefined
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.issues[0]?.message
      }
      return 'Invalid input'
    }
  }, [schema])

  // Validate all fields
  const validateForm = useCallback((data: T): Record<string, string> => {
    if (!schema) return {}

    const result = validateFormUtil(schema, data)
    if (result.success) {
      return {}
    }
    return result.errors
  }, [schema])

  // Update field value
  const setField = useCallback((fieldName: string, value: any) => {
    setState(prevState => {
      let newState = setFieldValue(prevState, fieldName, value)
      
      // Validate on change if enabled
      if (validateOnChange && schema) {
        const error = validateField(fieldName, value)
        newState = setFieldErrorUtil(newState, fieldName, error)
      }
      
      return newState
    })
  }, [validateOnChange, schema, validateField])

  // Update multiple fields
  const setFields = useCallback((updates: Partial<T>) => {
    setState(prevState => {
      let newState = prevState
      
      Object.entries(updates).forEach(([fieldName, value]) => {
        newState = setFieldValue(newState, fieldName, value)
        
        // Validate on change if enabled
        if (validateOnChange && schema) {
          const error = validateField(fieldName, value)
          newState = setFieldErrorUtil(newState, fieldName, error)
        }
      })
      
      return newState
    })
  }, [validateOnChange, schema, validateField])

  // Handle field blur
  const handleBlur = useCallback((fieldName: string) => {
    setState(prevState => {
      let newState = markFieldTouched(prevState, fieldName)
      
      // Validate on blur if enabled
      if (validateOnBlur && schema) {
        const error = validateField(fieldName, prevState.data[fieldName])
        newState = setFieldErrorUtil(newState, fieldName, error)
      }
      
      return newState
    })
  }, [validateOnBlur, schema, validateField])

  // Handle field change
  const handleChange = useCallback((fieldName: string, value: any) => {
    setField(fieldName, value)
  }, [setField])

  // Set field error manually
  const setFieldError = useCallback((fieldName: string, error: string | undefined) => {
    setState(prevState => setFieldErrorUtil(prevState, fieldName, error))
  }, [])

  // Clear field error
  const clearFieldError = useCallback((fieldName: string) => {
    setState(prevState => setFieldErrorUtil(prevState, fieldName, undefined))
  }, [])

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState(prevState => updateFormState(prevState, { errors: {}, isValid: true }))
  }, [])

  // Validate entire form
  const validate = useCallback(() => {
    const errors = validateForm(state.data)
    setState(prevState => updateFormState(prevState, { errors, isValid: Object.keys(errors).length === 0 }))
    return errors
  }, [state.data, validateForm])

  // Reset form
  const reset = useCallback((newValues?: Partial<T>) => {
    const resetValues = { ...initialValues, ...newValues }
    setState(createFormState(resetValues))
    submitCount.current = 0
    isSubmittingRef.current = false
  }, [initialValues])

  // Submit form
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (isSubmittingRef.current) return

    // Validate form
    const errors = validate()
    
    if (Object.keys(errors).length > 0) {
      setState(prevState => updateFormState(prevState, { 
        isSubmitted: true,
        touched: Object.keys(prevState.data).reduce((acc, key) => ({ ...acc, [key]: true }), {})
      }))
      return
    }

    // Start submission
    isSubmittingRef.current = true
    setState(prevState => updateFormState(prevState, { isSubmitting: true }))
    submitCount.current += 1

    try {
      let submitData = state.data
      
      // Sanitize data if enabled
      if (sanitizeOnSubmit) {
        submitData = sanitizeFormData(submitData)
      }

      // Prepare data (remove empty fields)
      submitData = prepareFormData(submitData) as T

      await onSubmit?.(submitData)

      // Reset form if successful and resetOnSubmit is enabled
      if (resetOnSubmit) {
        reset()
      } else {
        setState(prevState => updateFormState(prevState, { 
          isSubmitting: false,
          isSubmitted: true
        }))
      }
    } catch (error) {
      setState(prevState => updateFormState(prevState, { isSubmitting: false }))
      throw error
    } finally {
      isSubmittingRef.current = false
    }
  }, [state.data, validate, onSubmit, sanitizeOnSubmit, resetOnSubmit, reset])

  // Get field props for form inputs
  const getFieldProps = useCallback((fieldName: string) => {
    return {
      name: fieldName,
      value: state.data[fieldName],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
        handleChange(fieldName, value)
      },
      onBlur: () => handleBlur(fieldName),
      error: state.errors[fieldName],
      touched: state.touched[fieldName],
      disabled: state.isSubmitting
    }
  }, [state, handleChange, handleBlur])

  // Get field helper text
  const getFieldHelperText = useCallback((fieldName: string): string | undefined => {
    const error = getFieldError(state.errors, fieldName)
    if (error && state.touched[fieldName]) {
      return error
    }
    return undefined
  }, [state.errors, state.touched])

  // Check if field has error
  const hasError = useCallback((fieldName: string): boolean => {
    return hasFieldError(state.errors, fieldName) && state.touched[fieldName]
  }, [state.errors, state.touched])

  // Get form summary
  const getFormSummary = useCallback((): string | undefined => {
    if (state.isSubmitted && Object.keys(state.errors).length > 0) {
      const errorCount = Object.keys(state.errors).length
      return `${errorCount} ${errorCount === 1 ? 'error' : 'errors'} found. Please correct the highlighted fields.`
    }
    return undefined
  }, [state.errors, state.isSubmitted])

  // Check if form can be submitted
  const canSubmit = useCallback((): boolean => {
    return !state.isSubmitting && state.isValid && state.isDirty
  }, [state.isSubmitting, state.isValid, state.isDirty])

  // Set loading state
  const setLoading = useCallback((loading: boolean) => {
    setState(prevState => updateFormState(prevState, { isSubmitting: loading }))
  }, [])

  // Update form state directly
  const updateState = useCallback((updates: Partial<FormState<T>>) => {
    setState(prevState => updateFormState(prevState, updates))
  }, [])

  return {
    // State
    values: state.data,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValid: state.isValid,
    isDirty: state.isDirty,
    isSubmitted: state.isSubmitted,
    submitCount: submitCount.current,

    // Actions
    setField,
    setFields,
    setFieldError,
    clearFieldError,
    clearErrors,
    validate,
    validateField,
    reset,
    handleSubmit,
    setLoading,
    updateState,

    // Helpers
    getFieldProps,
    getFieldHelperText,
    hasError,
    getFormSummary,
    canSubmit,

    // Raw state access
    state
  }
}

// Hook for async form validation
export function useAsyncForm<T extends Record<string, any>>(options: UseFormOptions<T> & {
  validateOnSubmit?: boolean
}) {
  const { validateOnSubmit = true, ...formOptions } = options
  const form = useForm(formOptions)
  const [asyncErrors, setAsyncErrors] = useState<Record<string, string>>({})

  // Validate field asynchronously
  const validateFieldAsync = useCallback(async (fieldName: string, value: any): Promise<string | undefined> => {
    // This would typically make an API call for async validation
    // For now, return undefined (no async error)
    // Parameters are unused but kept for API consistency
    void fieldName
    void value
    return undefined
  }, [])

  // Validate all fields asynchronously
  const validateFormAsync = useCallback(async (data: T): Promise<Record<string, string>> => {
    const errors: Record<string, string> = {}
    
    // Validate each field asynchronously
    for (const [fieldName, value] of Object.entries(data)) {
      const error = await validateFieldAsync(fieldName, value)
      if (error) {
        errors[fieldName] = error
      }
    }
    
    return errors
  }, [validateFieldAsync])

  // Override handleSubmit to include async validation
  const handleSubmitAsync = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // First do sync validation
    const syncErrors = form.validate()
    
    if (Object.keys(syncErrors).length > 0) {
      return
    }

    // Then do async validation
    if (validateOnSubmit) {
      const asyncValidationErrors = await validateFormAsync(form.values)
      setAsyncErrors(asyncValidationErrors)
      
      if (Object.keys(asyncValidationErrors).length > 0) {
        return
      }
    }

    // Submit form
    await form.handleSubmit(e)
  }, [form, validateOnSubmit, validateFormAsync])

  return {
    ...form,
    validateFieldAsync,
    validateFormAsync,
    handleSubmitAsync,
    asyncErrors
  }
}

// Hook for multi-step forms
export function useMultiStepForm<T extends Record<string, any>>(options: UseFormOptions<T> & {
  steps: string[]
  validateCurrentStep?: boolean
}) {
  const { steps, validateCurrentStep = true, ...formOptions } = options
  const [currentStep, setCurrentStep] = useState(0)
  const form = useForm(formOptions)

  // Get fields for current step
  const getStepFields = useCallback((stepIndex: number): string[] => {
    // This would typically be configured based on your form structure
    // For now, return all fields
    // Parameter is unused but kept for API consistency
    void stepIndex
    return Object.keys(form.values)
  }, [form.values])

  // Validate current step
  const validateCurrentStepFields = useCallback((): Record<string, string> => {
    if (!validateCurrentStep || !formOptions.schema) return {}

    const stepFields = getStepFields(currentStep)
    const stepData: Partial<T> = {}
    const errors: Record<string, string> = {}

    stepFields.forEach(fieldName => {
      stepData[fieldName as keyof T] = form.values[fieldName]
      const error = form.validateField(fieldName, form.values[fieldName])
      if (error) {
        errors[fieldName] = error
      }
    })

    return errors
  }, [currentStep, validateCurrentStep, formOptions.schema, form, getStepFields])

  // Go to next step
  const nextStep = useCallback(async () => {
    const errors = validateCurrentStepFields()
    
    if (Object.keys(errors).length > 0) {
      // Set errors for current step fields
      Object.entries(errors).forEach(([fieldName, error]) => {
        form.setFieldError(fieldName, error)
      })
      return
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep, steps.length, validateCurrentStepFields, form])

  // Go to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Go to specific step
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex)
    }
  }, [steps.length])

  // Check if can go to next step
  const canGoNext = useCallback((): boolean => {
    return currentStep < steps.length - 1
  }, [currentStep, steps.length])

  // Check if can go to previous step
  const canGoPrev = useCallback((): boolean => {
    return currentStep > 0
  }, [currentStep])

  // Get step progress
  const getProgress = useCallback((): number => {
    return ((currentStep + 1) / steps.length) * 100
  }, [currentStep, steps.length])

  return {
    ...form,
    currentStep,
    steps,
    nextStep,
    prevStep,
    goToStep,
    canGoNext,
    canGoPrev,
    getProgress,
    validateCurrentStepFields
  }
}
