import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { ensureReadableOnWhiteText } from '@/lib/colorContrast'
import { useToast } from '@/components/ui/use-toast'
import { Building, Palette, Mail, Check, RefreshCw, Globe, Image as ImageIcon, Upload, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TenantEmailPreviewModal } from '@/components/admin/TenantEmailPreviewModal'
import { AITenantEmailBrandCopilotModal } from '@/components/admin/AITenantEmailBrandCopilotModal'
import type { AIEmailBrandSuggestions } from '@/components/admin/AITenantEmailBrandCopilotModal'

export function OrganizationProfileSettings() {
  const { currentOrganization, isOrgAdmin, refreshTenantData } = useTenant()
  const { toast } = useToast()
  const { t } = useTranslation(['admin', 'common'])

  // Identity & Branding
  const [name, setName] = useState(currentOrganization?.name || '')
  const [nameAr, setNameAr] = useState(currentOrganization?.name_ar || '')
  const [logoUrl, setLogoUrl] = useState(currentOrganization?.logo_url || '')
  const [faviconUrl, setFaviconUrl] = useState(currentOrganization?.favicon_url || '')
  const [primaryColor, setPrimaryColor] = useState(currentOrganization?.brand_colors?.primary || '#0f172a')
  const [secondaryColor, setSecondaryColor] = useState(currentOrganization?.brand_colors?.secondary || '#2563eb')
  const [accentColor, setAccentColor] = useState(currentOrganization?.brand_colors?.accent || '#d97706')

  // Email & Communication Branding
  const [emailSenderName, setEmailSenderName] = useState(currentOrganization?.email_sender_name || '')
  const [emailReplyTo, setEmailReplyTo] = useState(currentOrganization?.email_reply_to || '')
  const [supportEmail, setSupportEmail] = useState(currentOrganization?.support_email || '')
  const [websiteUrl, setWebsiteUrl] = useState(currentOrganization?.website_url || '')
  const [emailFooterText, setEmailFooterText] = useState(currentOrganization?.email_footer_text || '')
  const [emailFooterTextAr, setEmailFooterTextAr] = useState(currentOrganization?.email_footer_text_ar || '')

  const [isSaving, setIsSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const faviconFileInputRef = useRef<HTMLInputElement>(null)

  const uploadOrgImage = async (file: File, kind: 'logo' | 'favicon') => {
    if (!currentOrganization?.id) return
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingFavicon
    const setUrl = kind === 'logo' ? setLogoUrl : setFaviconUrl
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop() || (kind === 'favicon' ? 'ico' : 'png')
      // Org UUID must be the first path segment to satisfy the "media" bucket's
      // org-scoped storage RLS (see storage.foldername(name))[1] check).
      const filePath = `${currentOrganization.id}/org-branding/${kind}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath)
      setUrl(urlData.publicUrl)
      toast({ title: kind === 'logo' ? 'Logo uploaded' : 'Favicon uploaded' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleApplyAISuggestions = (sug: AIEmailBrandSuggestions) => {
    setEmailSenderName(sug.emailSenderName)
    setEmailReplyTo(sug.emailReplyTo)
    setSupportEmail(sug.supportEmail)
    setWebsiteUrl(sug.websiteUrl)
    setEmailFooterText(sug.emailFooterText)
    setEmailFooterTextAr(sug.emailFooterTextAr)
    setPrimaryColor(sug.brandColors.primary)
    setSecondaryColor(sug.brandColors.secondary)
    setAccentColor(sug.brandColors.accent)
  }

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name)
      setNameAr(currentOrganization.name_ar || '')
      setLogoUrl(currentOrganization.logo_url || '')
      setFaviconUrl(currentOrganization.favicon_url || '')
      setPrimaryColor(currentOrganization.brand_colors?.primary || '#0f172a')
      setSecondaryColor(currentOrganization.brand_colors?.secondary || '#2563eb')
      setAccentColor(currentOrganization.brand_colors?.accent || '#d97706')
      setEmailSenderName(currentOrganization.email_sender_name || '')
      setEmailReplyTo(currentOrganization.email_reply_to || '')
      setSupportEmail(currentOrganization.support_email || '')
      setWebsiteUrl(currentOrganization.website_url || '')
      setEmailFooterText(currentOrganization.email_footer_text || '')
      setEmailFooterTextAr(currentOrganization.email_footer_text_ar || '')
    }
  }, [currentOrganization])

  const handleSave = async () => {
    if (!currentOrganization?.id) return
    setIsSaving(true)

    try {
      const updatedColors = { primary: primaryColor, secondary: secondaryColor, accent: accentColor }
      const { error } = await supabase
        .from('organizations')
        .update({
          name,
          name_ar: nameAr || null,
          logo_url: logoUrl || null,
          favicon_url: faviconUrl || null,
          brand_colors: updatedColors,
          email_sender_name: emailSenderName || null,
          email_reply_to: emailReplyTo || null,
          support_email: supportEmail || null,
          website_url: websiteUrl || null,
          email_footer_text: emailFooterText || null,
          email_footer_text_ar: emailFooterTextAr || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id)

      if (error) throw error

      await refreshTenantData()
      toast({
        title: t('common:success', 'Success'),
        description: t('admin:org_settings_saved', 'Organization branding and email identity updated successfully.')
      })
    } catch (err: unknown) {
      const error = err as { message?: string }
      toast({
        title: t('common:error', 'Error'),
        description: error?.message || 'Failed to save organization settings',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Same guard the live header applies (Header.tsx / lib/colorContrast.ts) — the header
  // only ever uses primaryColor as its background with fixed white text, so this preview
  // should show admins the same darkened result they'll actually get, not the raw pick.
  const readablePrimaryColor = ensureReadableOnWhiteText(primaryColor)

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-4 rounded-xl border">
        <div>
          <h2 className="text-lg font-bold">{t('admin:tenant_branding_hub', 'Organization Identity & Email Branding')}</h2>
          <p className="text-xs text-muted-foreground">
            {t('admin:tenant_branding_hub_desc', 'Configure authoritative company name, logo, colors, sender profile, and preview live emails.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <AITenantEmailBrandCopilotModal
            orgName={name}
            orgNameAr={nameAr}
            slug={currentOrganization?.slug}
            industry={currentOrganization?.industry}
            currentPrimaryColor={primaryColor}
            currentSecondaryColor={secondaryColor}
            currentAccentColor={accentColor}
            onApply={handleApplyAISuggestions}
            disabled={!isOrgAdmin}
          />
          <TenantEmailPreviewModal
            orgName={name}
            orgNameAr={nameAr}
            logoUrl={logoUrl}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            accentColor={accentColor}
            senderName={emailSenderName}
            replyTo={emailReplyTo}
            supportEmail={supportEmail}
            websiteUrl={websiteUrl}
            footerText={emailFooterText}
            footerTextAr={emailFooterTextAr}
          />
          {isOrgAdmin && (
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('common:save', 'Save Changes')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Identity */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                <CardTitle>{t('admin:org_identity', 'Organization Profile')}</CardTitle>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary font-mono">
                {currentOrganization?.slug || 'tenant'}
              </Badge>
            </div>
            <CardDescription>
              {t('admin:org_identity_desc', 'Manage your organization name, Arabic title, and enterprise identifiers.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">{t('admin:org_name', 'Organization Name (English)')}</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOrgAdmin}
                placeholder="e.g. Royal Palace Hospitality Group"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-name-ar">{t('admin:org_name_ar', 'Organization Name (Arabic)')}</Label>
              <Input
                id="org-name-ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                disabled={!isOrgAdmin}
                dir="rtl"
                placeholder="مثال: مجموعة فنادق القصر الملكي"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {t('admin:logo_url', 'Logo (PNG/SVG)')}
                </Label>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 shrink-0 rounded border bg-muted/40 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo preview" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadOrgImage(file, 'logo')
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!isOrgAdmin || uploadingLogo}
                    onClick={() => logoFileInputRef.current?.click()}
                    className="h-9 text-xs flex-1"
                  >
                    {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                    {logoUrl ? t('admin:replace', 'Replace') : t('admin:upload', 'Upload')}
                  </Button>
                  {logoUrl && isOrgAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLogoUrl('')}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Globe className="h-3.5 w-3.5" />
                  {t('admin:favicon_url', 'Favicon')}
                </Label>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 shrink-0 rounded border bg-muted/40 flex items-center justify-center overflow-hidden">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon preview" className="h-full w-full object-contain" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={faviconFileInputRef}
                    type="file"
                    accept="image/*,.ico"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadOrgImage(file, 'favicon')
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!isOrgAdmin || uploadingFavicon}
                    onClick={() => faviconFileInputRef.current?.click()}
                    className="h-9 text-xs flex-1"
                  >
                    {uploadingFavicon ? <Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                    {faviconUrl ? t('admin:replace', 'Replace') : t('admin:upload', 'Upload')}
                  </Button>
                  {faviconUrl && isOrgAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFaviconUrl('')}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('admin:tenant_id', 'Tenant Identifier')}</Label>
              <Input value={currentOrganization?.id || ''} disabled className="font-mono text-xs bg-muted" />
            </div>
          </CardContent>
        </Card>

        {/* Brand & Theme Colors */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>{t('admin:brand_styling', 'Brand & Dynamic Theme')}</CardTitle>
            </div>
            <CardDescription>
              {t('admin:brand_styling_desc', 'Customize the visual theme and colors displayed across your organization portal.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">{t('admin:color_primary', 'Primary Color')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={!isOrgAdmin}
                    className="h-9 w-12 rounded cursor-pointer border p-0.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{primaryColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('admin:color_secondary', 'Secondary')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    disabled={!isOrgAdmin}
                    className="h-9 w-12 rounded cursor-pointer border p-0.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{secondaryColor}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('admin:color_accent', 'Accent Gold')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    disabled={!isOrgAdmin}
                    className="h-9 w-12 rounded cursor-pointer border p-0.5"
                  />
                  <span className="font-mono text-xs text-muted-foreground">{accentColor}</span>
                </div>
              </div>
            </div>

            {/* Theme Preview */}
            <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">{t('admin:preview', 'Live Theme Palette')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="px-4 py-2 rounded-lg text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: readablePrimaryColor }}
                >
                  {name || 'Primary Header'}
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-white text-xs font-medium shadow-sm"
                  style={{ backgroundColor: secondaryColor }}
                >
                  Action Button
                </div>
                <div
                  className="px-4 py-2 rounded-lg text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  Accent Badge
                </div>
              </div>
              {readablePrimaryColor !== primaryColor && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  {t('admin:primary_color_darkened_notice', {
                    adjusted: readablePrimaryColor,
                    defaultValue: `Your header background will show as ${readablePrimaryColor} — ${primaryColor} is too light for the header's white text to stay readable.`,
                  })}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outbound Email Branding Card */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>{t('admin:email_branding_title', 'Outbound Email Sender & Footers')}</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs">
              {t('admin:dynamic_injection', 'Auto-Injected on Invites & Resets')}
            </Badge>
          </div>
          <CardDescription>
            {t('admin:email_branding_desc', 'Configure sender display names, reply-to routing, support links, and legal footers for all automated tenant notifications.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email-sender-name">{t('admin:sender_name', 'Email Sender Display Name')}</Label>
              <Input
                id="email-sender-name"
                value={emailSenderName}
                onChange={(e) => setEmailSenderName(e.target.value)}
                disabled={!isOrgAdmin}
                placeholder="e.g. Royal Palace Hospitality"
              />
              <p className="text-[11px] text-muted-foreground">
                {t('admin:sender_name_hint', 'Appears as From: "Sender Name <notifications@altus-lms.com>"')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-reply-to">{t('admin:reply_to_email', 'Reply-To Email Address')}</Label>
              <Input
                id="email-reply-to"
                value={emailReplyTo}
                onChange={(e) => setEmailReplyTo(e.target.value)}
                disabled={!isOrgAdmin}
                type="email"
                placeholder="e.g. guestcare@royalpalace.com"
              />
              <p className="text-[11px] text-muted-foreground">
                {t('admin:reply_to_hint', 'Where recipients replies are routed.')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support-email">{t('admin:support_email', 'Support & Helpdesk Email')}</Label>
              <Input
                id="support-email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={!isOrgAdmin}
                type="email"
                placeholder="e.g. support@royalpalace.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website-url">{t('admin:website_url', 'Tenant Website URL')}</Label>
              <Input
                id="website-url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={!isOrgAdmin}
                placeholder="https://www.royalpalace.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 pt-2">
            <div className="space-y-2">
              <Label htmlFor="footer-text-en">{t('admin:footer_text_en', 'Email Footer & Legal Disclaimer (English)')}</Label>
              <Textarea
                id="footer-text-en"
                value={emailFooterText}
                onChange={(e) => setEmailFooterText(e.target.value)}
                disabled={!isOrgAdmin}
                rows={2}
                placeholder="e.g. This email is intended solely for authorized personnel of Royal Palace Hotels."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer-text-ar">{t('admin:footer_text_ar', 'Email Footer & Legal Disclaimer (Arabic)')}</Label>
              <Textarea
                id="footer-text-ar"
                value={emailFooterTextAr}
                onChange={(e) => setEmailFooterTextAr(e.target.value)}
                disabled={!isOrgAdmin}
                dir="rtl"
                rows={2}
                placeholder="مثال: هذه الرسالة مخصصة فقط لمنسوبي فنادق القصر الملكي المصرح لهم."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
