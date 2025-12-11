import { useContext } from 'react'
import { useId } from 'react'
import { FormFieldContext, FormContext } from '@/components/ui/form'

export function useFormField() {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormContext)
  const { name } = fieldContext

  if (!name) {
    throw new Error('useFormField must be used within a FormField component')
  }

  const id = useId()
  const formItemId = `form-item-${id}`
  const formDescriptionId = `form-item-description-${id}`
  const formMessageId = `form-item-message-${id}`

  const error = itemContext.errors[name]
  const touched = itemContext.touched[name]

  return {
    id,
    name,
    formItemId,
    formDescriptionId,
    formMessageId,
    error,
    touched
  }
}
