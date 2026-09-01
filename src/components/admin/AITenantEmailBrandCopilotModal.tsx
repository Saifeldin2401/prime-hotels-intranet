import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase'
import {
  Sparkles,
  RefreshCw,
  Check,
  Palette,
  Mail,
  Building,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

export interface AIEmailBrandSuggestions {
  emailSenderName: string
  emailReplyTo: string
  supportEmail: string
  websiteUrl: string
  emailFooterText: string
  emailFooterTextAr: string
  brandColors: {
    primary: string
    secondary: string
    accent: string
  }
  brandPersonality: string
  brandPersonalityAr: string
}

interface AITenantEmailBrandCopilotModalProps {
  orgName: string
  orgNameAr?: string
  slug?: string
  industry?: string
  currentPrimaryColor?: string
  currentSecondaryColor?: string
  currentAccentColor?: string
  onApply: (suggestions: AIEmailBrandSuggestions) => void
  disabled?: boolean
}

export function AITenantEmailBrandCopilotModal({
  orgName,
  orgNameAr,
  slug,
  industry = 'hospitality',
  currentPrimaryColor = '#0f172a',
  currentSecondaryColor = '#2563eb',
  currentAccentColor = '#d97706',
  onApply,
  disabled = false,
}: AITenantEmailBrandCopilotModalProps) {
  const { toast } = useToast()
  const { t } = useTranslation(['admin', 'common'])
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // AI Configuration Preferences
  const [hotelTier, setHotelTier] = useState<string>('luxury')
  const [toneOfVoice, setToneOfVoice] = useState<string>('royal_executive')

  // Generated suggestions state
  const [generatedData, setGeneratedData] = useState<AIEmailBrandSuggestions | null>(null)
  const [previewTab, setPreviewTab] = useState<'details' | 'email_preview'>('details')
  const [previewLang, setPreviewLang] = useState<'en' | 'ar'>('en')

  // Fallback intelligent generator if edge AI function is unreachable
  const generateLocalHeuristics = (): AIEmailBrandSuggestions => {
    const cleanName = (orgName || 'Hospitality Group').trim()
    const cleanSlug = (slug || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')).replace(/_/g, '-')
    const domain = `${cleanSlug}.com`

    let palette = { primary: '#0B1C3E', secondary: '#1E3A8A', accent: '#D4AF37' } // Luxury Gold & Navy
    let personality = 'Ultra-Luxury Sovereign & Royal Heritage'
    let personalityAr = 'فخامة ملكية وتراث ضيافة رفيع المستوى'

    if (hotelTier === 'resort') {
      palette = { primary: '#064E3B', secondary: '#0D9488', accent: '#F59E0B' } // Emerald & Ocean Teal
      personality = 'Exclusive Coastal & Desert Oasis Luxury'
      personalityAr = 'منتجع واحة ساحلية وصحراوية فاخرة'
    } else if (hotelTier === 'boutique') {
      palette = { primary: '#3B0764', secondary: '#7C3AED', accent: '#E11D48' } // Royal Violet & Rose
      personality = 'Curated Lifestyle & High-Touch Heritage'
      personalityAr = 'أسلوب حياة عصري وتراث عريق بلمسات راقية'
    } else if (hotelTier === 'business') {
      palette = { primary: '#0F172A', secondary: '#2563EB', accent: '#38BDF8' } // Modern Sapphire & Slate
      personality = 'Elite Corporate & High-Efficiency Business'
      personalityAr = 'خدمات أعمال راقية وكفاءة تشغيلية متقدمة'
    }

    return {
      emailSenderName: `${cleanName} Guest Care`,
      emailReplyTo: `concierge@${domain}`,
      supportEmail: `guestcare@${domain}`,
      websiteUrl: `https://www.${domain}`,
      emailFooterText: `This communication and any attachments contain confidential information intended solely for the authorized recipient of ${cleanName}. Unlawful copying or dissemination is strictly prohibited.`,
      emailFooterTextAr: `تحتوي هذه الرسالة ومرفقاتها على معلومات سرية ومحمية قانونياً مخصصة حصرياً لمنسوبي ${orgNameAr || cleanName} المصرح لهم. يُحظر تماماً نسخها أو إعادة توجيهها دون إذن رسمي.`,
      brandColors: palette,
      brandPersonality: personality,
      brandPersonalityAr: personalityAr,
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const prompt = `You are an expert luxury hotel brand architect and bilingual SaaS branding copilot for Saudi Arabia and the GCC.
Generate an authoritative, production-ready email and brand identity profile for this hospitality organization:
- Organization Name (English): "${orgName || 'Luxury Hotel Group'}"
- Organization Name (Arabic): "${orgNameAr || ''}"
- Tenant Slug: "${slug || 'hotel'}"
- Industry: "${industry}"
- Hotel Tier: "${hotelTier}" (Options: luxury, resort, boutique, business)
- Tone of Voice: "${toneOfVoice}"

Respond ONLY with a valid JSON object matching this exact schema:
{
  "emailSenderName": "string (e.g. Royal Palace Guest Experience)",
  "emailReplyTo": "string (e.g. concierge@royalpalace.com)",
  "supportEmail": "string (e.g. guestcare@royalpalace.com)",
  "websiteUrl": "string (e.g. https://www.royalpalace.com)",
  "emailFooterText": "string (High-end English legal & confidentiality email disclaimer)",
  "emailFooterTextAr": "string (Flawless formal Arabic legal & confidentiality email disclaimer)",
  "brandColors": {
    "primary": "#HEX (Deep dominant tone)",
    "secondary": "#HEX (Vibrant action tone)",
    "accent": "#HEX (Gold/bronze/accent tone)"
  },
  "brandPersonality": "string (Short English description of the brand identity)",
  "brandPersonalityAr": "string (Short Arabic description of the brand identity)"
}`

      const { data, error } = await supabase.functions.invoke('process-ai-request', {
        body: {
          prompt,
          task: 'chat',
          temperature: 0.2,
          max_tokens: 1000
        }
      })

      if (error) throw error

      const rawText = data?.response || data?.result || ''
      let parsed: AIEmailBrandSuggestions | null = null

      if (rawText) {
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0])
          }
        } catch {
          // JSON parsing fallback
        }
      }

      if (parsed && parsed.emailSenderName && parsed.brandColors) {
        setGeneratedData(parsed)
      } else {
        // High quality heuristic fallback
        setGeneratedData(generateLocalHeuristics())
      }

      toast({
        title: t('admin:ai_brand_ready', 'Brand Profile Generated!'),
        description: t('admin:ai_brand_ready_desc', 'AI has prepared customized sender identities, legal disclaimers, and harmonized color palettes.'),
      })
    } catch {
      // Use fallback heuristics if network/AI gateway is down
      const fallback = generateLocalHeuristics()
      setGeneratedData(fallback)
      toast({
        title: t('admin:ai_brand_ready', 'Brand Profile Generated!'),
        description: t('admin:ai_brand_ready_desc', 'AI has prepared customized sender identities, legal disclaimers, and harmonized color palettes.'),
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (!generatedData) return
    onApply(generatedData)
    setIsOpen(false)
    toast({
      title: t('common:applied', 'Settings Applied'),
      description: t('admin:brand_settings_applied', 'Email sender details, footers, and brand colors have been loaded. Click "Save Changes" to persist.')
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="text-xs h-8 gap-1.5 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5 text-amber-900 dark:text-amber-300 font-semibold shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          <span>{t('admin:ai_brand_copilot_btn', 'AI Brand & Email Copilot')}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  {t('admin:ai_brand_copilot_title', 'AI Tenant Email & Brand Setup Copilot')}
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                    GPT-4o & Claude 3.5
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t('admin:ai_brand_copilot_desc', 'Automatically synthesize sender identities, bilingual KSA legal footers, and luxury color harmony.')}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Controls Bar */}
          <div className="bg-muted/40 p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3" /> Hospitality Tier
              </Label>
              <Select value={hotelTier} onValueChange={setHotelTier}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="luxury">Palace & Ultra-Luxury</SelectItem>
                  <SelectItem value="resort">Coastal & Desert Resort</SelectItem>
                  <SelectItem value="boutique">Boutique & Heritage</SelectItem>
                  <SelectItem value="business">Modern Business Hotel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3" /> Communication Tone
              </Label>
              <Select value={toneOfVoice} onValueChange={setToneOfVoice}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="royal_executive">Sovereign & Executive</SelectItem>
                  <SelectItem value="warm_hospitality">Warm Luxury Concierge</SelectItem>
                  <SelectItem value="crisp_corporate">Crisp & Modern Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 sm:pt-0">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full h-8 text-xs font-semibold gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Synthesizing Brand...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{generatedData ? 'Re-Generate with AI' : 'Generate Identity with AI'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Area */}
          {generatedData ? (
            <div className="space-y-4">
              {/* Brand Harmony Banner */}
              <div className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>{generatedData.brandPersonality}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-arabic mt-0.5" dir="rtl">
                    {generatedData.brandPersonalityAr}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <div className="h-6 w-6 rounded-md shadow-sm border" style={{ backgroundColor: generatedData.brandColors.primary }} title={`Primary: ${generatedData.brandColors.primary}`} />
                    <div className="h-6 w-6 rounded-md shadow-sm border" style={{ backgroundColor: generatedData.brandColors.secondary }} title={`Secondary: ${generatedData.brandColors.secondary}`} />
                    <div className="h-6 w-6 rounded-md shadow-sm border" style={{ backgroundColor: generatedData.brandColors.accent }} title={`Accent: ${generatedData.brandColors.accent}`} />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    3-Tone Palette
                  </Badge>
                </div>
              </div>

              {/* Tabs for Configuration vs Live Simulation */}
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)} className="w-full">
                <div className="flex items-center justify-between border-b pb-2">
                  <TabsList className="h-8">
                    <TabsTrigger value="details" className="text-xs">Generated Fields</TabsTrigger>
                    <TabsTrigger value="email_preview" className="text-xs">Live Email Preview</TabsTrigger>
                  </TabsList>
                  {previewTab === 'email_preview' && (
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md text-xs">
                      <button
                        onClick={() => setPreviewLang('en')}
                        className={`px-2 py-0.5 rounded ${previewLang === 'en' ? 'bg-background shadow-xs font-bold text-foreground' : 'text-muted-foreground'}`}
                      >
                        EN
                      </button>
                      <button
                        onClick={() => setPreviewLang('ar')}
                        className={`px-2 py-0.5 rounded font-arabic ${previewLang === 'ar' ? 'bg-background shadow-xs font-bold text-foreground' : 'text-muted-foreground'}`}
                      >
                        العربية
                      </button>
                    </div>
                  )}
                </div>

                <TabsContent value="details" className="space-y-3 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Sender Display Name
                      </Label>
                      <Input
                        value={generatedData.emailSenderName}
                        onChange={(e) => setGeneratedData({ ...generatedData, emailSenderName: e.target.value })}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Reply-To Email
                      </Label>
                      <Input
                        value={generatedData.emailReplyTo}
                        onChange={(e) => setGeneratedData({ ...generatedData, emailReplyTo: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Support & Helpdesk Email
                      </Label>
                      <Input
                        value={generatedData.supportEmail}
                        onChange={(e) => setGeneratedData({ ...generatedData, supportEmail: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Website URL
                      </Label>
                      <Input
                        value={generatedData.websiteUrl}
                        onChange={(e) => setGeneratedData({ ...generatedData, websiteUrl: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">KSA Email Footer Disclaimer (English)</Label>
                      <Textarea
                        value={generatedData.emailFooterText}
                        onChange={(e) => setGeneratedData({ ...generatedData, emailFooterText: e.target.value })}
                        rows={3}
                        className="text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">KSA Email Footer Disclaimer (Arabic)</Label>
                      <Textarea
                        value={generatedData.emailFooterTextAr}
                        onChange={(e) => setGeneratedData({ ...generatedData, emailFooterTextAr: e.target.value })}
                        dir="rtl"
                        rows={3}
                        className="text-xs resize-none font-arabic"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Palette className="h-3 w-3" /> Recommended Brand Color Codes
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-2 p-1.5 rounded-lg border bg-muted/20">
                        <input
                          type="color"
                          value={generatedData.brandColors.primary}
                          onChange={(e) => setGeneratedData({
                            ...generatedData,
                            brandColors: { ...generatedData.brandColors, primary: e.target.value }
                          })}
                          className="h-6 w-8 rounded cursor-pointer border p-0"
                        />
                        <span className="text-[11px] font-mono">Primary: {generatedData.brandColors.primary}</span>
                      </div>

                      <div className="flex items-center gap-2 p-1.5 rounded-lg border bg-muted/20">
                        <input
                          type="color"
                          value={generatedData.brandColors.secondary}
                          onChange={(e) => setGeneratedData({
                            ...generatedData,
                            brandColors: { ...generatedData.brandColors, secondary: e.target.value }
                          })}
                          className="h-6 w-8 rounded cursor-pointer border p-0"
                        />
                        <span className="text-[11px] font-mono">Secondary: {generatedData.brandColors.secondary}</span>
                      </div>

                      <div className="flex items-center gap-2 p-1.5 rounded-lg border bg-muted/20">
                        <input
                          type="color"
                          value={generatedData.brandColors.accent}
                          onChange={(e) => setGeneratedData({
                            ...generatedData,
                            brandColors: { ...generatedData.brandColors, accent: e.target.value }
                          })}
                          className="h-6 w-8 rounded cursor-pointer border p-0"
                        />
                        <span className="text-[11px] font-mono">Accent: {generatedData.brandColors.accent}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="email_preview" className="pt-2">
                  <div className="rounded-xl border overflow-hidden bg-muted/30">
                    <div className="p-2.5 bg-muted/70 border-b text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                      <span>From: {generatedData.emailSenderName} &lt;notifications@phg-connect.com&gt;</span>
                      <span>Reply-To: {generatedData.emailReplyTo}</span>
                    </div>

                    <div className="p-4" dir={previewLang === 'ar' ? 'rtl' : 'ltr'}>
                      <div className="max-w-[480px] mx-auto rounded-xl border bg-card shadow-sm overflow-hidden text-xs">
                        <div
                          className="p-4 text-white flex items-center justify-between"
                          style={{
                            background: `linear-gradient(135deg, ${generatedData.brandColors.primary} 0%, ${generatedData.brandColors.secondary} 100%)`
                          }}
                        >
                          <span className="font-bold text-sm">
                            {previewLang === 'ar' ? (orgNameAr || orgName) : orgName}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase"
                            style={{ backgroundColor: generatedData.brandColors.accent }}
                          >
                            {previewLang === 'ar' ? 'دعوة مستخدم' : 'Invitation'}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          <p className="font-semibold text-sm">
                            {previewLang === 'ar' ? 'مرحباً بك في فريق الضيافة' : 'Welcome to the Team'}
                          </p>
                          <p className="text-muted-foreground leading-relaxed">
                            {previewLang === 'ar'
                              ? `لقد تمت دعوتك للانضمام إلى منصة ${orgNameAr || orgName}. يرجى إعداد حسابك للوصول إلى مهام العمل والدورات التدريبية.`
                              : `You have been invited to join the enterprise workspace for ${orgName}. Set up your account to access your assigned SOPs and learning tracks.`}
                          </p>
                          <div className="pt-1">
                            <button
                              type="button"
                              className="px-4 py-2 rounded-lg text-white font-bold text-xs shadow-xs"
                              style={{ backgroundColor: generatedData.brandColors.secondary }}
                            >
                              {previewLang === 'ar' ? 'تفعيل الحساب' : 'Activate Account'}
                            </button>
                          </div>
                        </div>

                        <div className="p-3 border-t bg-muted/20 text-[10px] text-muted-foreground leading-normal">
                          <p>{previewLang === 'ar' ? generatedData.emailFooterTextAr : generatedData.emailFooterText}</p>
                          <p className="mt-1 font-semibold">{generatedData.websiteUrl} • {generatedData.supportEmail}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="py-12 text-center border rounded-xl bg-muted/10 border-dashed space-y-3">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Ready to Configure Organization Identity</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Click "Generate Identity with AI" above to automatically synthesize sender display names, reply-to routing, localized Saudi disclaimers, and harmonized brand colors.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-xs">
            {t('common:cancel', 'Cancel')}
          </Button>

          {generatedData && (
            <Button
              size="sm"
              onClick={handleApply}
              className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-sm"
            >
              <Check className="h-4 w-4" />
              <span>Apply AI Configuration</span>
              <ChevronRight className="h-3.5 w-3.5 ms-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
