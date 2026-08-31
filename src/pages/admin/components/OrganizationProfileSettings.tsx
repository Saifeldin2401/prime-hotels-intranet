import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Building, Palette, Shield, Sparkles, Check, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function OrganizationProfileSettings() {
  const { currentOrganization, isOrgAdmin, refreshTenantData } = useTenant()
  const { toast } = useToast()
  const { t } = useTranslation(['admin', 'common'])

  const [name, setName] = useState(currentOrganization?.name || '')
  const [nameAr, setNameAr] = useState(currentOrganization?.name_ar || '')
  const [primaryColor, setPrimaryColor] = useState(currentOrganization?.brand_colors?.primary || '#0f172a')
  const [secondaryColor, setSecondaryColor] = useState(currentOrganization?.brand_colors?.secondary || '#2563eb')
  const [accentColor, setAccentColor] = useState(currentOrganization?.brand_colors?.accent || '#d97706')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name)
      setNameAr(currentOrganization.name_ar || '')
      setPrimaryColor(currentOrganization.brand_colors?.primary || '#0f172a')
      setSecondaryColor(currentOrganization.brand_colors?.secondary || '#2563eb')
      setAccentColor(currentOrganization.brand_colors?.accent || '#d97706')
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
          brand_colors: updatedColors,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrganization.id)

      if (error) throw error

      await refreshTenantData()
      toast({
        title: t('common:success', 'Success'),
        description: t('admin:org_settings_saved', 'Organization branding and settings updated successfully.')
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

  return (
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
              placeholder="e.g. PRIME Hospitality Group"
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
              placeholder="مثال: مجموعة فنادق برايم"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('admin:tenant_id', 'Tenant ID')}</Label>
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
              <Label className="text-xs">{t('admin:color_primary', 'Primary')}</Label>
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
              <Label className="text-xs">{t('admin:color_accent', 'Accent')}</Label>
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
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">{t('admin:preview', 'Theme Preview')}</p>
            <div className="flex items-center gap-2">
              <div 
                className="px-3 py-1.5 rounded-md text-white text-xs font-medium shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {name || 'Header'}
              </div>
              <div 
                className="px-3 py-1.5 rounded-md text-white text-xs font-medium shadow-sm"
                style={{ backgroundColor: secondaryColor }}
              >
                Button
              </div>
              <div 
                className="px-3 py-1.5 rounded-md text-white text-xs font-medium shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                Badge
              </div>
            </div>
          </div>

          {isOrgAdmin && (
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin me-2" /> : <Check className="h-4 w-4 me-2" />}
                {t('common:save', 'Save Changes')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
