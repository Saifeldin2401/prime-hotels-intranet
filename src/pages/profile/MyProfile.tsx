/**
 * My profile - how colleagues see and reach you.
 *
 * One column: who you are, the details you can change, the record your
 * organization keeps (read-only, clearly marked), sign-in, then skills.
 * Nothing here is gamified; completeness is a short note, not a meter.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { differenceInMonths, format } from 'date-fns'
import { ar, enGB } from 'date-fns/locale'
import { Camera, Key, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { UserSkillsDisplay } from '@/components/profile/UserSkillsDisplay'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { setOwnAvatarUrl, updateOwnProfile, uploadOwnAvatar } from '@/features/account/profileApi'
import { useAuth } from '@/hooks/useAuth'
import { getReportingLineDisplay } from '@/lib/displayHelpers'
import { cn } from '@/lib/utils'
import { WorkspaceHeader, headerActionClass } from '@/ui'

const PRESETS = ['/assets/altus/learner-female.jpg', '/assets/altus/learner-male.jpg']

const fieldClass =
  'min-h-[44px] w-full rounded-md border border-ds-border bg-ds-surface px-3 text-sm text-ds-ink placeholder:text-ds-muted focus:border-ds-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent'

export default function MyProfile() {
  const { user, profile, refreshSession } = useAuth()
  const { t, i18n } = useTranslation('profile')
  const dfLocale = i18n.language?.startsWith('ar') ? ar : enGB
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneExtension, setPhoneExtension] = useState('')
  const [nationality, setNationality] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || '')
    setPhone(profile.phone || '')
    setPhoneExtension(profile.phone_extension || '')
    setNationality(profile.nationality || '')
    setBio(profile.bio || '')
    setAvatarUrl(profile.avatar_url)
  }, [profile])

  const dirty = !!profile && (
    fullName !== (profile.full_name || '') || phone !== (profile.phone || '') ||
    phoneExtension !== (profile.phone_extension || '') || nationality !== (profile.nationality || '') ||
    bio !== (profile.bio || ''))

  const missing = [
    !avatarUrl && t('me.missing.photo', 'a photo'),
    !phone && t('me.missing.phone', 'a phone number'),
    !bio && t('me.missing.bio', 'a short introduction'),
  ].filter(Boolean) as string[]

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      await updateOwnProfile(user.id, {
        full_name: fullName.trim(), phone, nationality,
        bio: bio.trim() || null, phone_extension: phoneExtension.trim() || null,
      })
      await refreshSession()
      toast.success(t('me.saved', 'Profile saved'))
    } catch (err) {
      console.error('Error updating profile:', err)
      toast.error(t('me.saveFailed', 'Your changes were not saved. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  const changePhoto = async (file: File | undefined, preset?: string) => {
    if (!user?.id || (!file && !preset)) return
    setUploading(true)
    try {
      const url = preset ?? await uploadOwnAvatar(user.id, file as File)
      if (preset) await setOwnAvatarUrl(user.id, preset)
      setAvatarUrl(url)
      await refreshSession()
      toast.success(t('me.photoSaved', 'Photo updated'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('me.saveFailed', 'Your changes were not saved. Try again.'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tenure = (() => {
    if (!profile?.hire_date) return null
    const months = differenceInMonths(new Date(), new Date(profile.hire_date))
    return months >= 12
      ? t('me.tenureYears', '{{years}} yr {{months}} mo', { years: Math.floor(months / 12), months: months % 12 })
      : t('me.tenureMonths', '{{count}} mo', { count: months })
  })()

  const notSet = t('me.notSet', 'Not set')
  const record: { label: string; value: string | null | undefined }[] = [
    { label: t('job_title', 'Job title'), value: profile?.job_title },
    { label: t('reports_to', 'Reports to'), value: getReportingLineDisplay(profile) },
    { label: t('staff_id', 'Staff ID'), value: profile?.staff_id },
    {
      label: t('hire_date', 'Joined'),
      value: profile?.hire_date
        ? `${format(new Date(profile.hire_date), 'd MMMM yyyy', { locale: dfLocale })}${tenure ? ` · ${tenure}` : ''}`
        : null,
    },
    { label: t('email', 'Email'), value: user?.email },
  ]

  const displayName = profile?.full_name || user?.email || ''

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <WorkspaceHeader
        eyebrow={t('me.eyebrow', 'Account')}
        title={t('me.title', 'My profile')}
        context={t('me.context', 'What colleagues see when they look you up.')}
      />

      {/* Identity */}
      <section aria-label={t('me.identity', 'Photo and name')} className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <Avatar className="h-24 w-24 text-3xl">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" alt="" />
            <AvatarFallback className="bg-ds-ink text-2xl text-ds-on-ink">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={t('me.uploadPhoto', 'Upload a photo')}
            className="absolute -bottom-1 -end-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-ds-border bg-ds-surface text-ds-ink shadow-sm hover:border-ds-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent"
          >
            {uploading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Camera aria-hidden="true" className="h-4 w-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => changePhoto(e.target.files?.[0])} disabled={uploading} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-ds-ink">{displayName}</p>
          <p className="text-sm text-ds-muted">
            {[profile?.job_title, profile?.departments?.[0]?.name].filter(Boolean).join(' · ') || notSet}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-ds-muted">
            <span>{t('me.orPortrait', 'Or use an Altus portrait:')}</span>
            {PRESETS.map((src) => (
              <button
                key={src}
                type="button"
                disabled={uploading}
                onClick={() => changePhoto(undefined, src)}
                aria-pressed={avatarUrl === src}
                aria-label={t('me.usePortrait', 'Use this portrait')}
                className={cn('h-8 w-8 overflow-hidden rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-accent',
                  avatarUrl === src ? 'border-ds-accent' : 'border-transparent opacity-70 hover:opacity-100')}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {missing.length > 0 && (
        <p className="border-s-2 border-ds-accent ps-3 text-sm text-ds-ink-secondary">
          {t('me.missingNote', 'Colleagues find you faster with {{items}}.', { items: missing.join(', ') })}
        </p>
      )}

      {/* Editable details */}
      <section aria-labelledby="me-about" className="space-y-4">
        <div>
          <h2 id="me-about" className="text-lg font-semibold text-ds-ink">{t('me.about', 'About you')}</h2>
          <p className="text-sm text-ds-muted">{t('me.aboutHint', 'You can change these yourself.')}</p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-ds-ink">{t('full_name', 'Full name')}</span>
              <input className={fieldClass} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ds-ink">{t('phone_number', 'Phone')}</span>
              <input className={fieldClass} dir="ltr" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-ds-ink">{t('me.extension', 'Desk extension')}</span>
              <input className={fieldClass} dir="ltr" inputMode="numeric" value={phoneExtension} onChange={(e) => setPhoneExtension(e.target.value)} />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-ds-ink">{t('nationality', 'Nationality')}</span>
              <input className={fieldClass} autoComplete="country-name" value={nationality} onChange={(e) => setNationality(e.target.value)} />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="flex items-baseline justify-between text-sm font-medium text-ds-ink">
                {t('me.bio', 'Introduction')}
                <span className="font-mono text-xs font-normal tabular-nums text-ds-muted">{bio.length}/500</span>
              </span>
              <textarea
                className={cn(fieldClass, 'min-h-[96px] py-2')}
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('me.bioPlaceholder', 'Your role, your team and what colleagues can ask you about.')}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={saving || !dirty} className={cn(headerActionClass.primary, 'disabled:opacity-50')}>
              {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {t('save_changes', 'Save changes')}
            </button>
          </div>
        </form>
      </section>

      {/* Organization record */}
      <section aria-labelledby="me-record" className="space-y-3">
        <div>
          <h2 id="me-record" className="text-lg font-semibold text-ds-ink">{t('me.record', 'Your record')}</h2>
          <p className="text-sm text-ds-muted">{t('me.recordHint', 'Kept by your organization. Ask your administrator to change these.')}</p>
        </div>
        <dl className="divide-y divide-ds-border rounded-[6px] border border-ds-border bg-ds-surface">
          {record.map((r) => (
            <div key={r.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <dt className="text-sm text-ds-muted sm:w-40 sm:shrink-0">{r.label}</dt>
              <dd className={cn('min-w-0 break-words text-sm', r.value ? 'text-ds-ink' : 'text-ds-muted')}>{r.value || notSet}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Sign-in */}
      <section aria-labelledby="me-signin" className="flex flex-col gap-3 border-t border-ds-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="me-signin" className="text-lg font-semibold text-ds-ink">{t('me.signin', 'Sign-in')}</h2>
          <p className="text-sm text-ds-muted">{t('password_desc', 'Change the password you use to sign in.')}</p>
        </div>
        <Link to="/change-password" className={headerActionClass.secondary}>
          <Key aria-hidden="true" className="h-4 w-4" />{t('change_password', 'Change password')}
        </Link>
      </section>

      {/* Skills */}
      <section aria-labelledby="me-skills" className="space-y-3 border-t border-ds-border pt-8">
        <h2 id="me-skills" className="text-lg font-semibold text-ds-ink">{t('skills', 'Skills')}</h2>
        <UserSkillsDisplay />
      </section>
    </div>
  )
}
