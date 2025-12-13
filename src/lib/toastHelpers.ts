import { toast } from 'sonner'

// Success toast with optional details
export function showSuccessToast(message: string, description?: string) {
    toast.success(message, { description })
}

// Error toast with optional details
export function showErrorToast(message: string, description?: string) {
    toast.error(message, { description })
}

// Warning toast
export function showWarningToast(message: string, description?: string) {
    toast.warning(message, { description })
}

// Info toast
export function showInfoToast(message: string, description?: string) {
    toast.info(message, { description })
}

// Loading toast that returns a dismiss function
export function showLoadingToast(message: string) {
    return toast.loading(message)
}

// Dismiss a toast by id
export function dismissToast(toastId: string | number) {
    toast.dismiss(toastId)
}

// CRUD operation toasts - simple and consistent
export const crudToasts = {
    create: {
        success: (item: string) => showSuccessToast(`${item} created`, 'The item has been created successfully.'),
        error: (item: string) => showErrorToast(`Failed to create ${item}`, 'Please check your input and try again.')
    },
    update: {
        success: (item: string) => showSuccessToast(`${item} updated`, 'Your changes have been saved.'),
        error: (item: string) => showErrorToast(`Failed to update ${item}`, 'Please try again.')
    },
    delete: {
        success: (item: string) => showSuccessToast(`${item} deleted`, 'The item has been removed.'),
        error: (item: string) => showErrorToast(`Failed to delete ${item}`, 'Please try again.')
    },
    submit: {
        success: (item: string) => showSuccessToast(`${item} submitted`, 'Your submission has been received.'),
        error: (item: string) => showErrorToast(`Failed to submit ${item}`, 'Please check your input and try again.')
    },
    approve: {
        success: (item: string) => showSuccessToast(`${item} approved`, 'The item has been approved.'),
        error: (item: string) => showErrorToast(`Failed to approve ${item}`, 'Please try again.')
    },
    reject: {
        success: (item: string) => showSuccessToast(`${item} rejected`, 'The item has been rejected.'),
        error: (item: string) => showErrorToast(`Failed to reject ${item}`, 'Please try again.')
    },
    cancel: {
        success: (item: string) => showSuccessToast(`${item} cancelled`, 'The item has been cancelled.'),
        error: (item: string) => showErrorToast(`Failed to cancel ${item}`, 'Please try again.')
    }
}
