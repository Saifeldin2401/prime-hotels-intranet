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

/**
 * Promise-based toast that shows loading state and resolves to success/error
 * Usage: await asyncToast(promise, { loading: 'Saving...', success: 'Saved!', error: 'Failed' })
 */
export async function asyncToast<T>(
    promise: Promise<T>,
    messages: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: unknown) => string)
    }
): Promise<T> {
    const toastId = toast.loading(messages.loading)

    try {
        const result = await promise
        const successMessage = typeof messages.success === 'function'
            ? messages.success(result)
            : messages.success
        toast.success(successMessage, { id: toastId })
        return result
    } catch (error) {
        const errorMessage = typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error
        toast.error(errorMessage, { id: toastId })
        throw error
    }
}

/**
 * Helper for common async operations with standard messages
 */
export const asyncCrudToasts = {
    create: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Creating ${item}...`,
            success: `${item} created successfully`,
            error: `Failed to create ${item}`
        }),
    update: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Updating ${item}...`,
            success: `${item} updated successfully`,
            error: `Failed to update ${item}`
        }),
    delete: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Deleting ${item}...`,
            success: `${item} deleted successfully`,
            error: `Failed to delete ${item}`
        }),
    submit: <T>(promise: Promise<T>, item: string) =>
        asyncToast(promise, {
            loading: `Submitting ${item}...`,
            success: `${item} submitted successfully`,
            error: `Failed to submit ${item}`
        })
}
