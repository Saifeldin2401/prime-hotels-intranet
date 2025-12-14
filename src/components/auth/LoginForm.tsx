import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

export function LoginForm() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError(error.message || t('errors.invalid_credentials'))
        setLoading(false)
      } else {
        // Sign in successful - loading state is managed by AuthContext
      }
    } catch (err) {
      setError(t('errors.network_error'))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email_label')}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t('email_placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t('password_label')}</Label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
            {t('forgot_password')}
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder={t('password_placeholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="h-11"
        />
      </div>
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive"></span>
          {error}
        </div>
      )}
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading ? t('logging_in') : t('sign_in_button')}
      </Button>
    </form>
  )
}

