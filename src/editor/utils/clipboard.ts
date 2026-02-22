export async function copyToClipboard(content: string): Promise<boolean> {
  if (!content) return false

  try {
    await navigator.clipboard.writeText(content)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = content
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    try {
      const success = document.execCommand('copy')
      document.body.removeChild(textarea)
      return success
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }
}
