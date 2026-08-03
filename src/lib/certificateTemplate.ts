/**
 * Premium certificate template: HTML + CSS (rendered to PDF via html2canvas + jsPDF in
 * certificateService.ts), replacing the previous jsPDF vector-drawn version.
 *
 * Every decorative element is built with plain CSS (gradients, box-shadows, clip-path,
 * rotated character spans for curved text) rather than inline SVG. html2canvas has
 * inconsistent support for SVG <pattern>/<filter>/<textPath> across versions, but paints the
 * CSS box model, gradients, box-shadows and clip-paths reliably -- so CSS is the more
 * dependable choice for a pipeline that has to rasterize cleanly into a PDF every time.
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

// Longer names/titles need a smaller display size so they never overflow or collide with
// neighboring elements (spec: must gracefully support very long names / course titles).
function scaledFontSize(text: string, base: number, min: number, softLimit: number): number {
    if (text.length <= softLimit) return base
    const over = text.length - softLimit
    return Math.max(min, base - over * 0.9)
}

export const CERTIFICATE_TEMPLATE_STYLES = `
  .certificate-root {
    --navy: #0B1C3E;
    --navy-soft: #16264A;
    --gold: #C5A059;
    --gold-light: #E8D29B;
    --gold-deep: #75531B;
    --ivory: #FDFBF6;
    --ink: #1A202C;
    --muted: #5A6978;
    --font-display: 'Cormorant Garamond', 'Times New Roman', serif;
    --font-sans: 'DM Sans Variable', 'DM Sans', 'Helvetica Neue', Arial, sans-serif;

    position: relative;
    width: ${CERTIFICATE_WIDTH_PX}px;
    height: ${CERTIFICATE_HEIGHT_PX}px;
    background: var(--ivory);
    color: var(--ink);
    font-family: var(--font-sans);
    overflow: hidden;
    box-sizing: border-box;
  }
  .certificate-root * { box-sizing: border-box; }

  /* Layered border frame: outer gold line -> thin navy frame -> fine gold hairline */
  .certificate-border-outer { position: absolute; inset: 16px; border: 3px solid var(--gold); }
  .certificate-border-inner { position: absolute; inset: 27px; border: 1.5px solid var(--navy); }
  .certificate-border-hairline { position: absolute; inset: 35px; border: 0.75px solid var(--gold-light); }

  /* Ornate stepped corner brackets (nested double lines + gold dot) */
  .certificate-corner { position: absolute; width: 46px; height: 46px; pointer-events: none; }
  .certificate-corner span { position: absolute; border-color: var(--gold); }
  .cc-line-1 { width: 46px; height: 2px; }
  .cc-line-2 { width: 2px; height: 46px; }
  .cc-line-3 { width: 30px; height: 1px; background: var(--gold-light); }
  .cc-line-4 { width: 1px; height: 30px; background: var(--gold-light); }
  .cc-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--gold); }
  .certificate-corner span.filled { background: var(--gold); }

  .corner-tl { top: 40px; left: 40px; }
  .corner-tl .cc-line-1 { top: 0; left: 0; } .corner-tl .cc-line-2 { top: 0; left: 0; }
  .corner-tl .cc-line-3 { top: 10px; left: 10px; } .corner-tl .cc-line-4 { top: 10px; left: 10px; }
  .corner-tl .cc-dot { top: 5px; left: 5px; }

  .corner-tr { top: 40px; right: 40px; }
  .corner-tr .cc-line-1 { top: 0; right: 0; } .corner-tr .cc-line-2 { top: 0; right: 0; }
  .corner-tr .cc-line-3 { top: 10px; right: 10px; } .corner-tr .cc-line-4 { top: 10px; right: 10px; }
  .corner-tr .cc-dot { top: 5px; right: 5px; }

  .corner-bl { bottom: 40px; left: 40px; }
  .corner-bl .cc-line-1 { bottom: 0; left: 0; } .corner-bl .cc-line-2 { bottom: 0; left: 0; }
  .corner-bl .cc-line-3 { bottom: 10px; left: 10px; } .corner-bl .cc-line-4 { bottom: 10px; left: 10px; }
  .corner-bl .cc-dot { bottom: 5px; left: 5px; }

  .corner-br { bottom: 40px; right: 40px; }
  .corner-br .cc-line-1 { bottom: 0; right: 0; } .corner-br .cc-line-2 { bottom: 0; right: 0; }
  .corner-br .cc-line-3 { bottom: 10px; right: 10px; } .corner-br .cc-line-4 { bottom: 10px; right: 10px; }
  .corner-br .cc-dot { bottom: 5px; right: 5px; }

  .certificate-content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: grid;
    grid-template-rows: auto auto auto 1fr auto;
    padding: 46px 90px 36px;
    text-align: center;
  }

  /* Diamond divider ornament */
  .diamond { display: inline-block; width: 9px; height: 9px; background: var(--gold); transform: rotate(45deg); vertical-align: middle; }
  .diamond-sm { width: 6px; height: 6px; }
  .diamond-cluster { display: inline-flex; align-items: center; gap: 5px; }
  .divider-row { display: flex; align-items: center; justify-content: center; gap: 14px; }
  .divider-line { height: 1.5px; width: 120px; background: var(--gold); }
  .divider-line-sm { width: 65px; }

  /* Header zone */
  .certificate-header { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .certificate-logo { height: 52px; object-fit: contain; margin-bottom: 4px; }
  .certificate-crest {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--navy); border: 2px solid var(--gold-light);
    display: flex; align-items: center; justify-content: center;
    color: var(--gold-light); font-family: var(--font-sans); font-weight: 700; font-size: 12px;
    letter-spacing: 1px; margin-bottom: 6px;
  }
  .certificate-org-name { font-family: var(--font-sans); font-weight: 700; font-size: 20px; letter-spacing: 1.5px; color: var(--navy); text-transform: uppercase; }
  .certificate-brand-line { font-family: var(--font-sans); font-weight: 700; font-size: 10.5px; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; }
  .certificate-eyebrow { font-family: var(--font-sans); font-weight: 700; font-size: 11.5px; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-top: 6px; }

  /* Title zone */
  .certificate-title-zone { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 10px; }
  .certificate-title { font-family: var(--font-display); font-weight: 700; color: var(--navy); letter-spacing: 1px; margin: 0; }
  .certificate-title .cap { font-size: 1.28em; }

  /* Recipient zone */
  .certificate-recipient-zone { display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 16px; }
  .certificate-lead-text { font-family: var(--font-display); font-style: italic; font-weight: 500; font-size: 17px; color: var(--muted); }
  .certificate-recipient-name { font-family: var(--font-display); font-weight: 700; color: var(--navy); letter-spacing: 0.5px; line-height: 1.05; max-width: 900px; }

  /* Achievement zone */
  .certificate-achievement-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; margin-top: 4px; }
  .certificate-course-title { font-family: var(--font-display); font-weight: 700; color: var(--navy); line-height: 1.15; max-width: 780px; }
  .certificate-score-badge {
    font-family: var(--font-sans); font-weight: 700; font-size: 12px; letter-spacing: 1px;
    color: var(--gold-deep); background: var(--gold-light); border-radius: 999px; padding: 4px 16px; margin-top: 2px;
  }
  .certificate-date-line { font-family: var(--font-display); font-style: italic; font-size: 14px; color: var(--muted); margin-top: 2px; }

  /* Emblem: laurel-wreath shield badge (mirrors the brand's original mark) */
  .certificate-emblem-row { display: flex; align-items: center; justify-content: center; gap: 26px; margin-top: 4px; }
  .certificate-emblem {
    position: relative; width: 78px; height: 78px; border-radius: 50%;
    border: 1.5px solid var(--gold); display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .certificate-emblem::before {
    content: ''; position: absolute; inset: 4px; border-radius: 50%; border: 0.75px solid var(--gold-light);
  }
  .certificate-emblem-shield {
    width: 30px; height: 34px; background: var(--ivory); border: 1px solid var(--gold);
    clip-path: polygon(0 0, 100% 0, 100% 55%, 50% 100%, 0 55%);
    display: flex; align-items: flex-start; justify-content: center; gap: 3px; padding-top: 8px;
  }
  .certificate-emblem-shield span { width: 1.5px; height: 15px; background: var(--navy); }
  .certificate-emblem-label {
    position: absolute; bottom: -3px; left: 50%; transform: translateX(-50%);
    font-family: var(--font-sans); font-weight: 700; font-size: 6px; letter-spacing: 1px; color: var(--gold-deep);
    background: var(--ivory); padding: 0 3px; white-space: nowrap;
  }
  .certificate-emblem-divider { width: 1px; height: 62px; background: var(--gold-light); }

  /* Footer zone: 3-column authentication grid */
  .certificate-footer-divider { height: 1px; background: var(--gold-light); margin: 0 12px 24px; }
  .certificate-footer-grid { display: grid; grid-template-columns: 1fr 1.15fr 1fr; align-items: end; gap: 24px; text-align: left; }

  .certificate-signature-block { display: flex; flex-direction: column; gap: 3px; }
  .certificate-signature-script { font-family: var(--font-display); font-style: italic; font-weight: 600; font-size: 25px; color: var(--navy); }
  .certificate-signature-line { width: 128px; height: 1.5px; background: var(--gold); margin: 4px 0 5px; }
  .certificate-signature-name { font-family: var(--font-sans); font-weight: 700; font-size: 10.5px; letter-spacing: 0.5px; color: var(--navy); }
  .certificate-signature-title { font-family: var(--font-sans); font-weight: 700; font-size: 9px; letter-spacing: 1px; color: var(--gold-deep); text-transform: uppercase; }
  .certificate-signature-org, .certificate-signature-id { font-family: var(--font-sans); font-size: 9px; color: var(--muted); }

  .certificate-verify-card {
    background: #fff; border: 1.5px solid var(--gold); border-radius: 6px;
    padding: 13px 15px; display: flex; gap: 12px; align-items: flex-start;
    box-shadow: 0 2px 10px rgba(11, 28, 62, 0.06);
  }
  .certificate-verify-qr { width: 74px; height: 74px; border: 0.75px solid var(--gold); flex-shrink: 0; }
  .certificate-verify-text-heading {
    font-family: var(--font-sans); font-weight: 700; font-size: 10px; letter-spacing: 1px;
    color: var(--navy); text-transform: uppercase; border-bottom: 0.75px solid #e2e2e2; padding-bottom: 4px; margin-bottom: 5px;
  }
  .certificate-verify-line {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--font-sans); font-size: 9px; color: var(--muted); line-height: 1.7;
  }
  .certificate-verify-line svg { flex-shrink: 0; }
  .certificate-verify-code { font-family: var(--font-sans); font-weight: 700; font-size: 9.5px; color: var(--navy); letter-spacing: 0.5px; }

  /* Seal medallion */
  .certificate-seal-wrap { display: flex; flex-direction: column; align-items: flex-end; }
  .certificate-seal {
    position: relative; width: 112px; height: 112px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--gold-light), var(--gold) 70%);
    border: 1.5px solid var(--gold-deep);
    box-shadow: 0 3px 10px rgba(117, 83, 27, 0.35), inset 0 1px 3px rgba(255,255,255,0.6);
    display: flex; align-items: center; justify-content: center;
  }
  .certificate-seal-ring { position: absolute; inset: 9px; border-radius: 50%; border: 1px solid var(--navy); }
  .certificate-seal-ring-inner { position: absolute; inset: 15px; border-radius: 50%; border: 0.5px solid var(--gold-deep); }
  .certificate-seal-center { position: relative; z-index: 1; text-align: center; line-height: 1.35; }
  .certificate-seal-center .l1 { font-family: var(--font-sans); font-weight: 700; font-size: 8.5px; color: var(--navy); }
  .certificate-seal-center .l2 { font-family: var(--font-sans); font-weight: 700; font-size: 7px; color: var(--gold-deep); }
  .certificate-seal-center .l3 { font-family: var(--font-sans); font-weight: 700; font-size: 6.5px; color: var(--navy); letter-spacing: 1px; }
`

export function buildCertificateHtml(data: CertificateTemplateData): string {
    const recipientName = escapeHtml(data.recipientName.toUpperCase())
    const courseTitle = escapeHtml(data.title.toUpperCase())
    const orgName = escapeHtml(data.orgName || 'PRIME HOTELS & RESORTS')
    const brandLine = escapeHtml(data.brandLine || 'ALTUS ADVISORY • ENTERPRISE HOSPITALITY EXCELLENCE')
    const issuedByName = escapeHtml(data.issuedByName || 'Saifeldin M.')
    const issuedByTitle = escapeHtml(data.issuedByTitle || 'VP of Learning & Quality')
    const completionDateLabel = escapeHtml(data.completionDateLabel)
    const certificateNumber = escapeHtml(data.certificateNumber)
    const verificationCode = escapeHtml(data.verificationCode)
    const verifyUrl = escapeHtml(data.verifyUrl)

    const nameFontSize = scaledFontSize(recipientName, 48, 28, 22)
    const titleFontSize = scaledFontSize(courseTitle, 27, 17, 38)

    // When a real logo image is available, it already carries the brand name -- showing
    // the org name/brand-line as text underneath it as well just duplicates the wordmark.
    const header = data.logoDataUrl
        ? `<img class="certificate-logo" src="${data.logoDataUrl}" alt="${orgName}" />`
        : `<div class="certificate-crest">PHG</div><div class="certificate-org-name">${orgName}</div><div class="certificate-brand-line">${brandLine}</div>`

    const scoreBadge = typeof data.score === 'number'
        ? `<div class="certificate-score-badge">SCORE ${Math.round(data.score)}%${typeof data.passingScore === 'number' ? ` &middot; PASSING ${Math.round(data.passingScore)}%` : ''}</div>`
        : ''

    const qrBlock = data.qrDataUrl
        ? `<img class="certificate-verify-qr" src="${data.qrDataUrl}" alt="Verification QR code" />`
        : `<div class="certificate-verify-qr"></div>`

    const titleWords = 'Certificate of Completion'.split(' ')
        .map(word => `<span class="cap">${word[0]}</span>${word.slice(1)}`)
        .join(' ')

    const iconShield = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z"/></svg>`
    const iconCalendar = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`
    const iconGlobe = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18 15 15 0 010-18z"/></svg>`
    const iconLock = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>`

    return `
    <div class="certificate-root">
      <div class="certificate-border-outer"></div>
      <div class="certificate-border-inner"></div>
      <div class="certificate-border-hairline"></div>

      <div class="certificate-corner corner-tl">
        <span class="cc-line-1 filled"></span><span class="cc-line-2 filled"></span>
        <span class="cc-line-3"></span><span class="cc-line-4"></span><span class="cc-dot"></span>
      </div>
      <div class="certificate-corner corner-tr">
        <span class="cc-line-1 filled"></span><span class="cc-line-2 filled"></span>
        <span class="cc-line-3"></span><span class="cc-line-4"></span><span class="cc-dot"></span>
      </div>
      <div class="certificate-corner corner-bl">
        <span class="cc-line-1 filled"></span><span class="cc-line-2 filled"></span>
        <span class="cc-line-3"></span><span class="cc-line-4"></span><span class="cc-dot"></span>
      </div>
      <div class="certificate-corner corner-br">
        <span class="cc-line-1 filled"></span><span class="cc-line-2 filled"></span>
        <span class="cc-line-3"></span><span class="cc-line-4"></span><span class="cc-dot"></span>
      </div>

      <div class="certificate-content">
        <div class="certificate-header">
          ${header}
          <div class="certificate-eyebrow">Professional Standard Certification</div>
        </div>

        <div class="certificate-title-zone">
          <div class="divider-row">
            <span class="divider-line"></span>
            <span class="diamond-cluster"><span class="diamond diamond-sm"></span><span class="diamond"></span><span class="diamond diamond-sm"></span></span>
            <span class="divider-line"></span>
          </div>
          <h1 class="certificate-title" style="font-size:44px">${titleWords}</h1>
        </div>

        <div class="certificate-recipient-zone">
          <div class="certificate-lead-text">This official certificate is proudly presented to</div>
          <div class="certificate-recipient-name" style="font-size:${nameFontSize}px">${recipientName}</div>
          <div class="divider-row">
            <span class="divider-line divider-line-sm"></span>
            <span class="diamond diamond-sm"></span>
            <span class="divider-line divider-line-sm"></span>
          </div>
        </div>

        <div class="certificate-achievement-zone">
          <div class="certificate-emblem-row">
            <div class="certificate-emblem">
              <div class="certificate-emblem-shield"><span></span><span></span><span></span></div>
              <div class="certificate-emblem-label">QUALITY</div>
            </div>
            <div class="certificate-emblem-divider"></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:9px;">
              <div class="certificate-lead-text">has successfully completed and demonstrated mastery in</div>
              <div class="certificate-course-title" style="font-size:${titleFontSize}px">${courseTitle}</div>
              ${scoreBadge}
              <div class="certificate-date-line">Completed on ${completionDateLabel}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="certificate-footer-divider"></div>
          <div class="certificate-footer-grid">
            <div class="certificate-signature-block">
              <div class="certificate-signature-script">${issuedByName}</div>
              <div class="certificate-signature-line"></div>
              <div class="certificate-signature-name">${issuedByName.toUpperCase()}</div>
              <div class="certificate-signature-title">${issuedByTitle}</div>
              <div class="certificate-signature-org">${orgName} / Altus Advisory</div>
              <div class="certificate-signature-id">Cert ID: ${certificateNumber}</div>
            </div>

            <div class="certificate-verify-card">
              ${qrBlock}
              <div>
                <div class="certificate-verify-text-heading">Secure Verification</div>
                <div class="certificate-verify-line">${iconShield}<span>Certificate ID: ${certificateNumber}</span></div>
                <div class="certificate-verify-line">${iconCalendar}<span>Issued On: ${completionDateLabel}</span></div>
                <div class="certificate-verify-line">${iconGlobe}<span>Verify at: ${verifyUrl}</span></div>
                <div class="certificate-verify-line">${iconLock}<span class="certificate-verify-code">Code: ${verificationCode}</span></div>
              </div>
            </div>

            <div class="certificate-seal-wrap">
              <div class="certificate-seal">
                <div class="certificate-seal-ring"></div>
                <div class="certificate-seal-ring-inner"></div>
                <div class="certificate-seal-center">
                  <div class="l1">OFFICIAL SEAL</div>
                  <div class="l2">ALTUS VERIFIED</div>
                  <div class="l3">★ EXCELLENCE ★</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
