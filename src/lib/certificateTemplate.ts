/**
 * Enterprise Luxury Certificate Template (Altus Advisory)
 * High-fidelity HTML + CSS template rendered for PDF generation via html2canvas / jsPDF.
 * 
 * Features:
 * - Guilloche vector spirograph security border patterns
 * - Authentic calligraphy cursive signatures ('Alex Brush')
 * - Dual Signatory support (VP of Learning & Executive Director)
 * - Grade Honor Badges (Honors with Distinction ≥ 95%, Excellence in Mastery ≥ 85%)
 * - Altus Advisory branding (Palm emblem + Altus Advisory typography)
 * - Golden Laurel Wreath + Greek Column Shield crest emblem
 * - 3D Metallic Gold Embossed Seal Medallion
 * - Structured Secure Verification box with QR code and verify.altusadvisory.com domain
 */

import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/cormorant-garamond/600-italic.css'
import '@fontsource-variable/dm-sans'

export const CERTIFICATE_WIDTH_PX = 1200
export const CERTIFICATE_HEIGHT_PX = 849

export interface CertificateTemplateData {
    recipientName: string
    title: string
    completionDateLabel: string
    certificateNumber: string
    verificationCode: string
    verifyUrl: string
    score?: number
    passingScore?: number
    issuedByName?: string
    issuedByTitle?: string
    secondarySignatoryName?: string
    secondarySignatoryTitle?: string
    orgName?: string
    brandLine?: string
    logoDataUrl?: string
    qrDataUrl?: string
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function scaledFontSize(text: string, base: number, min: number, softLimit: number): number {
    if (text.length <= softLimit) return base
    const over = text.length - softLimit
    return Math.max(min, base - over * 0.8)
}

export const CERTIFICATE_TEMPLATE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');

  .certificate-root {
    --navy: #0B1C3E;
    --navy-soft: #16264A;
    --gold: #C5A059;
    --gold-light: #E8D29B;
    --gold-deep: #75531B;
    --ivory: #FAF6F0;
    --white: #FFFFFF;
    --ink: #1A202C;
    --muted: #4A5568;
    --font-display: 'Cormorant Garamond', 'Times New Roman', serif;
    --font-sans: 'DM Sans Variable', 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
    --font-script: 'Alex Brush', 'Cormorant Garamond', cursive;

    position: relative;
    width: ${CERTIFICATE_WIDTH_PX}px;
    height: ${CERTIFICATE_HEIGHT_PX}px;
    background: radial-gradient(ellipse at center, #FFFFFF 0%, #FDFBF7 60%, #FAF4EC 100%);
    color: var(--ink);
    font-family: var(--font-sans);
    overflow: hidden;
    box-sizing: border-box;
  }
  .certificate-root * { box-sizing: border-box; }

  /* Background Watermark */
  .certificate-watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 650px;
    height: 650px;
    opacity: 0.045;
    pointer-events: none;
    background-image: url('/altus-logo-web.png');
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }

  /* Multi-layered Ornate Frame */
  .certificate-border-outer { position: absolute; inset: 16px; border: 3.5px solid var(--navy); }
  .certificate-border-gold-mid { position: absolute; inset: 23px; border: 2px solid var(--gold); }
  .certificate-border-inner { position: absolute; inset: 31px; border: 1px solid var(--navy); }
  .certificate-border-hairline { position: absolute; inset: 37px; border: 0.75px solid var(--gold-light); }

  /* Guilloche Security Pattern Borders */
  .certificate-guilloche-top, .certificate-guilloche-bottom {
    position: absolute; left: 60px; right: 60px; height: 16px; pointer-events: none; opacity: 0.35;
  }
  .certificate-guilloche-top { top: 38px; }
  .certificate-guilloche-bottom { bottom: 38px; }

  /* Ornate Corner Flourishes with Diamond Dots */
  .certificate-corner { position: absolute; width: 54px; height: 54px; pointer-events: none; }
  .certificate-corner span { position: absolute; }
  .cc-outer-h { width: 54px; height: 3px; background: var(--navy); }
  .cc-outer-v { width: 3px; height: 54px; background: var(--navy); }
  .cc-inner-h { width: 36px; height: 1.5px; background: var(--gold); }
  .cc-inner-v { width: 1.5px; height: 36px; background: var(--gold); }
  .cc-diamond { width: 7px; height: 7px; background: var(--gold); transform: rotate(45deg); }

  .corner-tl { top: 42px; left: 42px; }
  .corner-tl .cc-outer-h { top: 0; left: 0; } .corner-tl .cc-outer-v { top: 0; left: 0; }
  .corner-tl .cc-inner-h { top: 8px; left: 8px; } .corner-tl .cc-inner-v { top: 8px; left: 8px; }
  .corner-tl .cc-diamond { top: 4px; left: 4px; }

  .corner-tr { top: 42px; right: 42px; }
  .corner-tr .cc-outer-h { top: 0; right: 0; } .corner-tr .cc-outer-v { top: 0; right: 0; }
  .corner-tr .cc-inner-h { top: 8px; right: 8px; } .corner-tr .cc-inner-v { top: 8px; right: 8px; }
  .corner-tr .cc-diamond { top: 4px; right: 4px; }

  .corner-bl { bottom: 42px; left: 42px; }
  .corner-bl .cc-outer-h { bottom: 0; left: 0; } .corner-bl .cc-outer-v { bottom: 0; left: 0; }
  .corner-bl .cc-inner-h { bottom: 8px; left: 8px; } .corner-bl .cc-inner-v { bottom: 8px; left: 8px; }
  .corner-bl .cc-diamond { bottom: 4px; left: 4px; }

  .corner-br { bottom: 42px; right: 42px; }
  .corner-br .cc-outer-h { bottom: 0; right: 0; } .corner-br .cc-outer-v { bottom: 0; right: 0; }
  .corner-br .cc-inner-h { bottom: 8px; right: 8px; } .corner-br .cc-inner-v { bottom: 8px; right: 8px; }
  .corner-br .cc-diamond { bottom: 4px; right: 4px; }

  /* Content Layout Container */
  .certificate-content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 40px 76px 65px;
    text-align: center;
  }

  /* Decorative Diamond Lines */
  .diamond { display: inline-block; width: 8px; height: 8px; background: var(--gold); transform: rotate(45deg); vertical-align: middle; }
  .diamond-sm { width: 5px; height: 5px; }
  .diamond-cluster { display: inline-flex; align-items: center; gap: 5px; }
  .divider-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 4px 0; }
  .divider-line { height: 1.5px; width: 140px; background: var(--gold); }
  .divider-line-sm { width: 80px; height: 1.25px; background: var(--gold); }

  /* Header Section */
  .certificate-header { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .certificate-logo-img { height: 48px; object-fit: contain; margin-bottom: 2px; }
  
  .certificate-brand-fallback { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .certificate-palm-mark { width: 34px; height: 34px; fill: var(--gold); margin-bottom: 2px; }
  .certificate-org-name { font-family: var(--font-sans); font-weight: 800; font-size: 22px; letter-spacing: 3px; color: var(--navy); text-transform: uppercase; }
  .certificate-brand-line { font-family: var(--font-sans); font-weight: 700; font-size: 10px; letter-spacing: 2.5px; color: var(--gold-deep); text-transform: uppercase; }
  
  .certificate-eyebrow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    font-family: var(--font-sans);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 3px;
    color: var(--gold-deep);
    text-transform: uppercase;
    margin-top: 4px;
  }

  /* Main Title Section */
  .certificate-title-zone { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 4px; }
  .certificate-title {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 40px;
    color: var(--navy);
    letter-spacing: 2px;
    text-transform: uppercase;
    margin: 0;
    line-height: 1.1;
  }

  /* Recipient Section */
  .certificate-recipient-zone { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 6px; }
  .certificate-lead-text { font-family: var(--font-display); font-style: italic; font-size: 16px; color: var(--muted); }
  .certificate-recipient-name {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--navy);
    letter-spacing: 1px;
    text-transform: uppercase;
    line-height: 1.1;
    margin: 3px 0;
    max-width: 900px;
  }

  /* Achievement & Course Section */
  .certificate-achievement-zone { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 4px; }
  .certificate-emblem-layout { display: flex; align-items: center; justify-content: center; gap: 24px; }
  
  /* Golden Laurel Wreath + Shield Emblem */
  .certificate-laurel-emblem {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .certificate-laurel-emblem svg { width: 100%; height: 100%; }

  .certificate-emblem-vdivider { width: 1px; height: 68px; background: var(--gold-light); flex-shrink: 0; }

  .certificate-course-title {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--navy);
    text-transform: uppercase;
    letter-spacing: 1px;
    line-height: 1.25;
    max-width: 720px;
  }
  
  /* Grade Honor Ribbon Badge */
  .certificate-honors-ribbon {
    font-family: var(--font-sans);
    font-weight: 800;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 3px 16px;
    border-radius: 999px;
    margin-top: 3px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .gold-honors { background: linear-gradient(135deg, #FFF0C2, #E2B653); color: #573C11; border: 1px solid #75531B; }
  .silver-honors { background: linear-gradient(135deg, #F1F5F9, #CBD5E1); color: #1E293B; border: 1px solid #64748B; }
  .standard-honors { background: var(--gold-light); color: var(--gold-deep); border: 1px solid var(--gold); }

  .certificate-date-line { font-family: var(--font-display); font-style: italic; font-size: 13.5px; color: var(--muted); margin-top: 2px; }

  /* Bottom Footer Area (Dual Signatures + Center Verification + Gold Seal) */
  .certificate-footer-divider { height: 1px; background: var(--gold); margin-bottom: 10px; opacity: 0.7; }
  .certificate-footer-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    align-items: end;
    gap: 16px;
    text-align: left;
  }

  /* Dual Signature Blocks */
  .certificate-signature-block { display: flex; flex-direction: column; gap: 2px; }
  .certificate-signature-script {
    font-family: var(--font-script);
    font-size: 34px;
    color: var(--navy);
    line-height: 1.2;
    padding-left: 4px;
    margin-bottom: 4px;
  }
  .certificate-signature-line-wrap { display: flex; align-items: center; gap: 4px; width: 130px; margin: 4px 0 5px; }
  .certificate-signature-line { height: 1.25px; flex: 1; background: var(--gold); }
  .certificate-signature-name { font-family: var(--font-sans); font-weight: 800; font-size: 9.5px; letter-spacing: 0.5px; color: var(--navy); text-transform: uppercase; }
  .certificate-signature-title { font-family: var(--font-sans); font-weight: 700; font-size: 8.5px; letter-spacing: 1px; color: var(--gold-deep); text-transform: uppercase; }
  .certificate-signature-org { font-family: var(--font-sans); font-size: 8px; color: var(--muted); }
  .certificate-signature-id { font-family: var(--font-sans); font-size: 8px; font-weight: 600; color: var(--muted); margin-top: 1px; }

  /* Secure Verification Card (Center) */
  .certificate-verify-card {
    background: var(--white);
    border: 1.5px solid var(--gold);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    box-shadow: 0 2px 8px rgba(11, 28, 62, 0.06);
  }
  .certificate-verify-qr { width: 64px; height: 64px; border: 0.75px solid var(--gold); border-radius: 4px; flex-shrink: 0; }
  .certificate-verify-text-heading {
    font-family: var(--font-sans); font-weight: 800; font-size: 9px; letter-spacing: 1px;
    color: var(--navy); text-transform: uppercase; border-bottom: 0.75px solid #E2E8F0; padding-bottom: 2px; margin-bottom: 3px;
  }
  .certificate-verify-line {
    display: flex; align-items: center; gap: 4px;
    font-family: var(--font-sans); font-size: 8px; color: var(--muted); line-height: 1.4;
  }
  .certificate-verify-line svg { flex-shrink: 0; stroke: var(--gold-deep); }
  .certificate-verify-code { font-family: var(--font-sans); font-weight: 700; font-size: 8.5px; color: var(--navy); letter-spacing: 0.5px; }

  /* Right Signature & 3D Metallic Gold Seal Stamp Medallion */
  .certificate-seal-wrap { display: flex; align-items: flex-end; justify-content: flex-end; gap: 12px; }
  .certificate-seal-outer {
    position: relative;
    width: 98px;
    height: 98px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 25%, #FFF0C2 0%, #E2B653 45%, #C5A059 75%, #75531B 100%);
    border: 2px solid #75531B;
    box-shadow: 0 4px 12px rgba(117, 83, 27, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .certificate-seal-ring-dashed {
    position: absolute; inset: 5px; border-radius: 50%; border: 1.25px dashed var(--navy);
  }
  .certificate-seal-inner {
    position: absolute; inset: 10px; border-radius: 50%;
    background: radial-gradient(circle at 35% 25%, #FAF4E6 0%, #EAD096 60%, #C5A059 100%);
    border: 1px solid var(--gold-deep);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 3px;
  }
  .certificate-seal-title { font-family: var(--font-sans); font-weight: 800; font-size: 7px; letter-spacing: 1px; color: var(--navy); text-transform: uppercase; line-height: 1; }
  .certificate-seal-brand { font-family: var(--font-sans); font-weight: 800; font-size: 6px; letter-spacing: 0.5px; color: var(--gold-deep); text-transform: uppercase; margin-top: 2px; }
  .certificate-seal-subtitle { font-family: var(--font-sans); font-weight: 700; font-size: 5px; letter-spacing: 0.5px; color: var(--navy); text-transform: uppercase; margin-top: 1px; }
  .certificate-seal-stars { font-size: 5.5px; color: var(--gold-deep); letter-spacing: 2px; margin-top: 1.5px; }
  .certificate-seal-footer { font-family: var(--font-sans); font-weight: 800; font-size: 5.5px; letter-spacing: 1px; color: var(--gold-deep); text-transform: uppercase; margin-top: 1px; }
`

export function buildCertificateHtml(data: CertificateTemplateData): string {
    const recipientName = escapeHtml(data.recipientName.toUpperCase())
    const courseTitle = escapeHtml(data.title.toUpperCase())
    const orgName = escapeHtml(data.orgName || 'ALTUS ADVISORY')
    const brandLine = escapeHtml(data.brandLine || 'ENTERPRISE HOSPITALITY & EXECUTIVE EDUCATION')
    const issuedByName = escapeHtml(data.issuedByName || 'Saifeldin M.')
    const issuedByTitle = escapeHtml(data.issuedByTitle || 'VP of Learning & Quality')
    const secondarySignatoryName = escapeHtml(data.secondarySignatoryName || 'Dr. Khalid Al-Mansoor')
    const secondarySignatoryTitle = escapeHtml(data.secondarySignatoryTitle || 'Executive Managing Director')
    const completionDateLabel = escapeHtml(data.completionDateLabel)
    const certificateNumber = escapeHtml(data.certificateNumber)
    const verificationCode = escapeHtml(data.verificationCode)
    const verifyUrl = escapeHtml(data.verifyUrl || 'verify.altusadvisory.com')

    const nameFontSize = scaledFontSize(recipientName, 44, 26, 22)
    const titleFontSize = scaledFontSize(courseTitle, 25, 16, 38)

    // Dynamic Grade Honor Badge
    const scoreVal = typeof data.score === 'number' ? data.score : 100
    let honorsBadgeHtml = `<div class="certificate-honors-ribbon standard-honors">★ EXECUTIVE CERTIFIED ★</div>`
    if (scoreVal >= 95) {
        honorsBadgeHtml = `<div class="certificate-honors-ribbon gold-honors">★ HONORS WITH DISTINCTION &middot; ${Math.round(scoreVal)}% ★</div>`
    } else if (scoreVal >= 85) {
        honorsBadgeHtml = `<div class="certificate-honors-ribbon silver-honors">★ EXCELLENCE IN MASTERY &middot; ${Math.round(scoreVal)}% ★</div>`
    }

    // Altus Advisory logo markup
    const header = data.logoDataUrl
        ? `<img class="certificate-logo-img" src="${data.logoDataUrl}" alt="${orgName}" />`
        : `
          <div class="certificate-brand-fallback">
            <svg class="certificate-palm-mark" viewBox="0 0 100 100">
              <path d="M50 10 C35 30 20 40 10 50 C25 50 35 45 50 30 C65 45 75 50 90 50 C80 40 65 30 50 10 Z" />
              <path d="M50 30 C40 50 25 65 15 75 C30 70 40 65 50 50 C60 65 70 70 85 75 C75 65 60 50 50 30 Z" />
              <rect x="47" y="50" width="6" height="40" rx="3" />
            </svg>
            <div class="certificate-org-name">${orgName}</div>
            <div class="certificate-brand-line">${brandLine}</div>
          </div>
        `

    const qrBlock = data.qrDataUrl
        ? `<img class="certificate-verify-qr" src="${data.qrDataUrl}" alt="Verification QR code" />`
        : `<div class="certificate-verify-qr"></div>`

    const iconShield = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z"/></svg>`
    const iconCalendar = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`
    const iconGlobe = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/></svg>`
    const iconLock = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>`

    // Guilloche Spirograph Pattern SVG
    const guillocheSvg = `
      <svg viewBox="0 0 1080 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 8 Q 45 0, 90 8 T 180 8 T 270 8 T 360 8 T 450 8 T 540 8 T 630 8 T 720 8 T 810 8 T 900 8 T 990 8 T 1080 8" stroke="#C5A059" stroke-width="0.75" />
        <path d="M0 8 Q 45 16, 90 8 T 180 8 T 270 8 T 360 8 T 450 8 T 540 8 T 630 8 T 720 8 T 810 8 T 900 8 T 990 8 T 1080 8" stroke="#0B1C3E" stroke-width="0.5" opacity="0.6" />
      </svg>
    `

    // Golden Laurel Wreath + Column Crest SVG
    const laurelEmblemSvg = `
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 75 C 22 65 20 45 32 30 C 26 38 27 52 35 62 Z" fill="#C5A059" />
        <path d="M25 60 C 18 50 18 36 28 22 C 22 30 22 42 30 52 Z" fill="#C5A059" />
        <path d="M32 40 C 28 30 30 18 42 10 C 34 16 33 28 38 36 Z" fill="#C5A059" />
        <path d="M70 75 C 78 65 80 45 68 30 C 74 38 73 52 65 62 Z" fill="#C5A059" />
        <path d="M75 60 C 82 50 82 36 72 22 C 78 30 78 42 70 52 Z" fill="#C5A059" />
        <path d="M68 40 C 72 30 70 18 58 10 C 66 16 67 28 62 36 Z" fill="#C5A059" />
        <path d="M50 22 L66 28 V46 C66 60 58 70 50 75 C42 70 34 60 34 46 V28 L50 22 Z" fill="#FAF6F0" stroke="#C5A059" stroke-width="2" />
        <rect x="42" y="32" width="16" height="3" fill="#C5A059" />
        <rect x="44" y="37" width="2.5" height="22" fill="#0B1C3E" />
        <rect x="48.75" y="37" width="2.5" height="22" fill="#0B1C3E" />
        <rect x="53.5" y="37" width="2.5" height="22" fill="#0B1C3E" />
        <rect x="42" y="61" width="16" height="3" fill="#C5A059" />
        <polygon points="50,25 44,30 56,30" fill="#C5A059" />
      </svg>
    `

    return `
    <div class="certificate-root">
      <div class="certificate-watermark"></div>
      
      <div class="certificate-border-outer"></div>
      <div class="certificate-border-gold-mid"></div>
      <div class="certificate-border-inner"></div>
      <div class="certificate-border-hairline"></div>

      <!-- Guilloche Patterns -->
      <div class="certificate-guilloche-top">${guillocheSvg}</div>
      <div class="certificate-guilloche-bottom">${guillocheSvg}</div>

      <!-- Ornate Corner Flourishes -->
      <div class="certificate-corner corner-tl">
        <span class="cc-outer-h"></span><span class="cc-outer-v"></span>
        <span class="cc-inner-h"></span><span class="cc-inner-v"></span>
        <span class="cc-diamond"></span>
      </div>
      <div class="certificate-corner corner-tr">
        <span class="cc-outer-h"></span><span class="cc-outer-v"></span>
        <span class="cc-inner-h"></span><span class="cc-inner-v"></span>
        <span class="cc-diamond"></span>
      </div>
      <div class="certificate-corner corner-bl">
        <span class="cc-outer-h"></span><span class="cc-outer-v"></span>
        <span class="cc-inner-h"></span><span class="cc-inner-v"></span>
        <span class="cc-diamond"></span>
      </div>
      <div class="certificate-corner corner-br">
        <span class="cc-outer-h"></span><span class="cc-outer-v"></span>
        <span class="cc-inner-h"></span><span class="cc-inner-v"></span>
        <span class="cc-diamond"></span>
      </div>

      <div class="certificate-content">
        <!-- Header -->
        <div class="certificate-header">
          ${header}
          <div class="certificate-eyebrow">
            <span class="divider-line divider-line-sm"></span>
            <span class="diamond diamond-sm"></span>
            <span>Professional Standard Certification</span>
            <span class="diamond diamond-sm"></span>
            <span class="divider-line divider-line-sm"></span>
          </div>
        </div>

        <!-- Title -->
        <div class="certificate-title-zone">
          <h1 class="certificate-title">Certificate of Completion</h1>
        </div>

        <!-- Recipient -->
        <div class="certificate-recipient-zone">
          <div class="certificate-lead-text">This official certificate is proudly presented to</div>
          <div class="certificate-recipient-name" style="font-size:${nameFontSize}px">${recipientName}</div>
          <div class="divider-row">
            <span class="divider-line divider-line-sm"></span>
            <span class="diamond"></span>
            <span class="divider-line divider-line-sm"></span>
          </div>
        </div>

        <!-- Achievement & Course -->
        <div class="certificate-achievement-zone">
          <div class="certificate-emblem-layout">
            <div class="certificate-laurel-emblem">
              ${laurelEmblemSvg}
            </div>
            <div class="certificate-emblem-vdivider"></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
              <div class="certificate-lead-text">has successfully completed and demonstrated mastery in</div>
              <div class="certificate-course-title" style="font-size:${titleFontSize}px">${courseTitle}</div>
              ${honorsBadgeHtml}
              <div class="certificate-date-line">Completed on ${completionDateLabel}</div>
            </div>
          </div>
        </div>

        <!-- Footer Area (Dual Signatories & Secure Verification) -->
        <div>
          <div class="certificate-footer-divider"></div>
          <div class="certificate-footer-grid">
            <!-- Left Signatory: Saifeldin M. -->
            <div class="certificate-signature-block">
              <div class="certificate-signature-script">${issuedByName}</div>
              <div class="certificate-signature-line-wrap">
                <span class="certificate-signature-line"></span>
                <span class="diamond diamond-sm"></span>
                <span class="certificate-signature-line"></span>
              </div>
              <div class="certificate-signature-name">${issuedByName.toUpperCase()}</div>
              <div class="certificate-signature-title">${issuedByTitle}</div>
              <div class="certificate-signature-org">Altus Advisory</div>
              <div class="certificate-signature-id">Cert ID: ${certificateNumber}</div>
            </div>

            <!-- Center: Verification Box -->
            <div class="certificate-verify-card">
              ${qrBlock}
              <div style="min-width: 0;">
                <div class="certificate-verify-text-heading">Secure Verification</div>
                <div class="certificate-verify-line">${iconShield}<span>Certificate ID: ${certificateNumber}</span></div>
                <div class="certificate-verify-line">${iconCalendar}<span>Issued On: ${completionDateLabel}</span></div>
                <div class="certificate-verify-line">${iconGlobe}<span>Verify at: ${verifyUrl}</span></div>
                <div class="certificate-verify-line">${iconLock}<span class="certificate-verify-code">Code: ${verificationCode}</span></div>
              </div>
            </div>

            <!-- Right Signatory & 3D Metallic Gold Seal Medallion -->
            <div class="certificate-seal-wrap">
              <div class="certificate-signature-block" style="text-align: right; align-items: flex-end;">
                <div class="certificate-signature-script">${secondarySignatoryName}</div>
                <div class="certificate-signature-line-wrap">
                  <span class="certificate-signature-line"></span>
                  <span class="diamond diamond-sm"></span>
                  <span class="certificate-signature-line"></span>
                </div>
                <div class="certificate-signature-name">${secondarySignatoryName.toUpperCase()}</div>
                <div class="certificate-signature-title">${secondarySignatoryTitle}</div>
                <div class="certificate-signature-org">Altus Advisory</div>
              </div>

              <div class="certificate-seal-outer">
                <div class="certificate-seal-ring-dashed"></div>
                <div class="certificate-seal-inner">
                  <div class="certificate-seal-title">OFFICIAL SEAL</div>
                  <div class="certificate-seal-brand">ALTUS VERIFIED</div>
                  <div class="certificate-seal-subtitle">EXCELLENCE IN EDUCATION</div>
                  <div class="certificate-seal-stars">★ ★ ★</div>
                  <div class="certificate-seal-footer">ALTUS ADVISORY</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
}
