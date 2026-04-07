/**
 * SVG Security Sanitizer
 * Removes all JavaScript from SVG files
 */

const DANGEROUS_SVG_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick, onload, etc.
  /data:text\/html/gi,
  /<iframe\b/gi,
  /<object\b/gi,
  /<embed\b/gi,
];

const ALLOWED_SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 
  'polyline', 'polygon', 'text', 'tspan', 'defs', 'use', 
  'symbol', 'linearGradient', 'radialGradient', 'stop',
  'pattern', 'clipPath', 'mask', 'filter', 'image'
]);

const ALLOWED_SVG_ATTRIBUTES = new Set([
  'width', 'height', 'viewBox', 'xmlns', 'x', 'y', 'cx', 'cy',
  'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'd', 'fill', 'stroke',
  'stroke-width', 'opacity', 'transform', 'class', 'id', 'href',
  'gradientUnits', 'gradientTransform', 'offset', 'stop-color',
  'stop-opacity', 'clip-path', 'mask', 'filter', 'version', 'xmlns:xlink'
]);

/**
 * Sanitize SVG content
 * Returns null if SVG contains dangerous content
 */
export function sanitizeSvg(svgContent: string): string | null {
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_SVG_PATTERNS) {
    if (pattern.test(svgContent)) {
      console.warn('SVG sanitization: Dangerous pattern detected');
      return null;
    }
  }

  // Parse and whitelist elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  
  const svgElement = doc.documentElement;
  if (svgElement.tagName.toLowerCase() !== 'svg') {
    return null;
  }

  // Recursive function to clean elements
  function cleanElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    
    // Check if element is allowed
    if (!ALLOWED_SVG_ELEMENTS.has(tagName)) {
      console.warn(`SVG sanitization: Removing disallowed element <${tagName}>`);
      element.remove();
      return false;
    }

    // Check attributes
    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase();
      if (!ALLOWED_SVG_ATTRIBUTES.has(attrName) && !attrName.startsWith('data-')) {
        element.removeAttribute(attr.name);
      }
    }

    // Recursively clean children
    for (const child of Array.from(element.children)) {
      cleanElement(child);
    }

    return true;
  }

  cleanElement(svgElement);

  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

/**
 * Validate SVG file before upload
 */
export async function validateSvgFile(file: File): Promise<{ valid: boolean; reason?: string; file?: File }> {
  try {
    const content = await file.text();
    
    // Check file size
    if (file.size > 5 * 1024 * 1024) {
      return { valid: false, reason: 'SVG file too large' };
    }

    // Check for binary content (SVG should be text)
    const hasBinary = /[\x00-\x08\x0E-\x1F]/.test(content);
    if (hasBinary) {
      return { valid: false, reason: 'Binary content detected in SVG' };
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_SVG_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      if (pattern.test(content)) {
        return { valid: false, reason: 'Dangerous content detected in SVG' };
      }
    }

    // Parse and validate structure
    const sanitized = sanitizeSvg(content);
    if (!sanitized) {
      return { valid: false, reason: 'SVG sanitization failed' };
    }

    const sanitizedFile = new File([sanitized], file.name, { type: 'image/svg+xml' });
    return { valid: true, file: sanitizedFile };
  } catch (error) {
    return { valid: false, reason: 'SVG validation error' };
  }
}
