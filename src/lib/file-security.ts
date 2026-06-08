/**
 * File Security Utilities
 * 
 * Comprehensive file upload security including:
 * - File signature (magic number) validation
 * - MIME type verification
 * - File size enforcement
 * - Secure filename generation
 * - Image dimension validation
 * - SVG sanitization
 * - EXIF data detection
 */

import DOMPurify from 'dompurify';

// ============================================================================
// DANGEROUS URL SCHEMES - SECURITY CRITICAL
// ============================================================================

/**
 * Dangerous URL schemes that can execute code or access sensitive resources.
 * These are blocked in SVG sanitization and validation.
 */
const DANGEROUS_URL_SCHEMES = [
  'javascript:',      // JavaScript execution
  'vbscript:',        // VBScript execution (IE)
  'data:',            // Data URIs (can contain HTML/JS)
  'file:',            // Local file access
  'about:',           // Browser internal pages
  'chrome:',          // Chrome internal pages
  'chrome-extension:',// Chrome extension access
  'firefox:',         // Firefox internal pages
  'moz-extension:',   // Firefox extension access
  'safari-extension:',// Safari extension access
  'ms-appx:',         // Windows app access
  'ms-windows-store:',// Windows store
  'blob:',            // Blob URLs (potential XSS vector)
  'filesystem:',      // FileSystem API access
]

/**
 * Allowed safe data: URI MIME types for images only.
 * All other data: URIs are considered dangerous.
 */
const ALLOWED_DATA_URI_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]

/**
 * Regex to match data: URIs that are NOT in the allowed safe list.
 * This blocks data:text/html, data:application/javascript, etc.
 */
const DANGEROUS_DATA_URI_REGEX = new RegExp(
  'data:(?!(' + ALLOWED_DATA_URI_TYPES.join('|') + ')[;\\s])',
  'gi'
)

/**
 * Check if a URL string contains any dangerous scheme.
 * Uses a whitelist approach - only http:, https:, and safe data: URIs are allowed.
 */
function containsDangerousScheme(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  
  const trimmed = url.trim().toLowerCase()
  
  // Check for dangerous schemes
  for (const scheme of DANGEROUS_URL_SCHEMES) {
    if (trimmed.startsWith(scheme)) {
      // Special case: data: URIs need additional checking
      if (scheme === 'data:') {
        // Check if it's a safe image data URI
        for (const safeType of ALLOWED_DATA_URI_TYPES) {
          if (trimmed.startsWith(`data:${safeType}`)) {
            return false // Safe data URI
          }
        }
        return true // Dangerous data URI
      }
      return true // Other dangerous scheme
    }
  }
  
  return false
}

/**
 * Sanitize a URL attribute value by removing dangerous schemes.
 * Returns empty string if dangerous scheme detected.
 */
function sanitizeUrlValue(url: string): string {
  if (!url || typeof url !== 'string') return ''
  
  // Check for dangerous schemes
  if (containsDangerousScheme(url)) {
    return ''
  }
  
  // Additional check: ensure URL starts with safe scheme or is relative
  const trimmed = url.trim()
  const lowerTrimmed = trimmed.toLowerCase()
  
  // Allow http:, https:, and relative URLs
  if (
    lowerTrimmed.startsWith('http://') ||
    lowerTrimmed.startsWith('https://') ||
    lowerTrimmed.startsWith('/') ||
    lowerTrimmed.startsWith('#') ||
    lowerTrimmed.startsWith('./') ||
    lowerTrimmed.startsWith('../') ||
    (!lowerTrimmed.includes(':')) // No scheme = relative
  ) {
    return trimmed
  }
  
  // Check for safe data: URIs
  for (const safeType of ALLOWED_DATA_URI_TYPES) {
    if (lowerTrimmed.startsWith(`data:${safeType}`)) {
      return trimmed
    }
  }
  
  // Unknown scheme - block for safety
  return ''
}

// UUID generation using Web Crypto API
function generateUUID(): string {
  // Use crypto.randomUUID() if available (secure and standard)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback to crypto.getRandomValues() for environments without randomUUID
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    
    // Set version (4) and variant (2) bits for UUID v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 2
    
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }
  
  // Last resort fallback for environments without crypto (should not happen in modern browsers)
  throw new Error('Crypto API not available for secure UUID generation');
}

// File type definitions with magic numbers (file signatures)
export interface FileTypeDefinition {
  mimeType: string;
  extensions: string[];
  magicNumbers: number[][];
  maxSizeBytes: number;
}

// Allowed file types with their magic numbers
export const ALLOWED_FILE_TYPES: Record<string, FileTypeDefinition> = {
  // Images
  'image/jpeg': {
    mimeType: 'image/jpeg',
    extensions: ['jpg', 'jpeg'],
    magicNumbers: [
      [0xFF, 0xD8, 0xFF], // JPEG standard
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'image/png': {
    mimeType: 'image/png',
    extensions: ['png'],
    magicNumbers: [
      [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'image/gif': {
    mimeType: 'image/gif',
    extensions: ['gif'],
    magicNumbers: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'image/webp': {
    mimeType: 'image/webp',
    extensions: ['webp'],
    magicNumbers: [
      [0x52, 0x49, 0x46, 0x46], // RIFF header (followed by WEBP)
    ],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  'image/svg+xml': {
    mimeType: 'image/svg+xml',
    extensions: ['svg'],
    magicNumbers: [], // SVG is text-based, validated by content parsing
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
  },
  // Videos
  'video/mp4': {
    mimeType: 'video/mp4',
    extensions: ['mp4', 'm4v'],
    magicNumbers: [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // MP4 v1
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // MP4 v2
      [0x66, 0x74, 0x79, 0x70], // ftyp anywhere in first 512 bytes
    ],
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
  },
  'video/webm': {
    mimeType: 'video/webm',
    extensions: ['webm'],
    magicNumbers: [
      [0x1A, 0x45, 0xDF, 0xA3], // EBML header
    ],
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
  },
  'video/quicktime': {
    mimeType: 'video/quicktime',
    extensions: ['mov', 'qt'],
    magicNumbers: [
      [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // ftyp
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp variant
      [0x71, 0x74, 0x20, 0x20], // 'qt  ' (older QuickTime)
    ],
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
  },
  // Documents
  'application/pdf': {
    mimeType: 'application/pdf',
    extensions: ['pdf'],
    magicNumbers: [
      [0x25, 0x50, 0x44, 0x46], // %PDF
    ],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
  'application/msword': {
    mimeType: 'application/msword',
    extensions: ['doc'],
    magicNumbers: [
      [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // OLE Compound Document
    ],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['docx'],
    magicNumbers: [
      [0x50, 0x4B, 0x03, 0x04], // ZIP (DOCX is a ZIP file)
    ],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
  'text/plain': {
    mimeType: 'text/plain',
    extensions: ['txt'],
    magicNumbers: [], // Text files don't have magic numbers
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  // Audio
  'audio/mpeg': {
    mimeType: 'audio/mpeg',
    extensions: ['mp3'],
    magicNumbers: [
      [0xFF, 0xFB], // MPEG-1 Layer 3 without CRC
      [0xFF, 0xF3], // MPEG-1 Layer 3 with CRC
      [0xFF, 0xF2], // MPEG-2 Layer 3
      [0x49, 0x44, 0x33], // ID3 tag
    ],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  },
  'audio/wav': {
    mimeType: 'audio/wav',
    extensions: ['wav'],
    magicNumbers: [
      [0x52, 0x49, 0x46, 0x46], // RIFF
    ],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  },
  'audio/ogg': {
    mimeType: 'audio/ogg',
    extensions: ['ogg', 'oga'],
    magicNumbers: [
      [0x4F, 0x67, 0x67, 0x53], // OggS
    ],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  },
};

// Blocked extensions (executable files)
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'dll', 'bat', 'cmd', 'msi', 'ps1', 'vbs', 'js', 'jar', 'scr',
  'com', 'sh', 'php', 'pl', 'py', 'rb', 'app', 'dmg', 'pkg', 'deb', 'rpm'
]);

// Suspicious patterns in filenames
export const SUSPICIOUS_FILENAME_PATTERNS = [
  /\.\./,                    // Path traversal
  /[<>]/,                    // HTML injection
  /[/\\]/,                   // Directory separators
  /\x00/,                    // Null bytes
  /^\./,                     // Hidden files
  /\.(exe|bat|cmd|sh|php)$/i, // Executable extensions
  /\.[a-z0-9]{1,5}\.(exe|bat|cmd|msi|ps1|vbs|js|jar|scr|com|sh|php|pl)$/i, // Double extension
];

export interface FileSecurityResult {
  isValid: boolean;
  detectedMimeType: string | null;
  errors: string[];
  warnings: string[];
}

export interface SecureFileInfo {
  secureFilename: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  metadata: {
    hasExif?: boolean;
    width?: number;
    height?: number;
    duration?: number;
  };
}

/**
 * Validates file by checking magic numbers (file signatures)
 * This prevents MIME type spoofing attacks
 */
export async function validateFileSignature(
  file: File,
  expectedMimeType?: string
): Promise<FileSecurityResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file size first (quick rejection)
  if (file.size === 0) {
    return {
      isValid: false,
      detectedMimeType: null,
      errors: ['File is empty'],
      warnings: [],
    };
  }

  // Read first 8 bytes for magic number detection
  const headerBytes = await readFileBytes(file, 0, 8);
  
  // Detect MIME type from file signature
  let detectedMimeType: string | null = null;
  
  for (const [mimeType, definition] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (checkMagicNumbers(headerBytes, definition.magicNumbers)) {
      detectedMimeType = mimeType;
      break;
    }
  }

  // Special handling for SVG (text-based)
  if (!detectedMimeType && file.name.toLowerCase().endsWith('.svg')) {
    const isValidSvg = await validateSvgContent(file);
    if (isValidSvg) {
      detectedMimeType = 'image/svg+xml';
    }
  }
  
  // SECURITY: If it's an SVG, sanitize the content before allowing
  if (detectedMimeType === 'image/svg+xml') {
    try {
      const svgText = await file.text();
      const sanitizedSvg = sanitizeSvgContent(svgText);
      // Check if sanitization removed significant content (potential attack)
      if (sanitizedSvg.length < svgText.length * 0.5) {
        errors.push('SVG file contains potentially dangerous content');
        detectedMimeType = null;
      }
    } catch {
      errors.push('Failed to validate SVG content');
      detectedMimeType = null;
    }
  }

  // Special handling for text files
  if (!detectedMimeType && file.type === 'text/plain') {
    detectedMimeType = 'text/plain';
  }

  // If expected MIME type is provided, verify it matches
  if (expectedMimeType && detectedMimeType) {
    if (expectedMimeType !== detectedMimeType) {
      errors.push(
        `MIME type mismatch: expected ${expectedMimeType}, detected ${detectedMimeType}`
      );
    }
  }

  // Check if MIME type is allowed
  if (detectedMimeType && !ALLOWED_FILE_TYPES[detectedMimeType]) {
    errors.push(`File type not allowed: ${detectedMimeType}`);
  }

  // Check file size against allowed limit
  if (detectedMimeType) {
    const maxSize = ALLOWED_FILE_TYPES[detectedMimeType].maxSizeBytes;
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
      errors.push(`File size exceeds limit of ${maxSizeMB}MB`);
    }
  }

  return {
    isValid: errors.length === 0,
    detectedMimeType,
    errors,
    warnings,
  };
}

/**
 * Reads a portion of the file as bytes
 */
async function readFileBytes(
  file: File,
  start: number,
  length: number
): Promise<Uint8Array> {
  const slice = file.slice(start, start + length);
  const arrayBuffer = await slice.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Checks if file header matches any of the magic numbers
 */
function checkMagicNumbers(
  headerBytes: Uint8Array,
  magicNumbers: number[][]
): boolean {
  if (magicNumbers.length === 0) return false;

  for (const magic of magicNumbers) {
    if (headerBytes.length < magic.length) continue;

    let matches = true;
    for (let i = 0; i < magic.length; i++) {
      if (headerBytes[i] !== magic[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

/**
 * Validates SVG content for security issues
 * - Checks for JavaScript/script tags
 * - Checks for external references
 * - Validates XML structure
 * - Comprehensive URL scheme validation
 */
export async function validateSvgContent(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const lowerText = text.toLowerCase();

    // Check for script tags
    if (/<script\b/i.test(text)) {
      return false;
    }

    // Check for JavaScript event handlers
    if (/\son\w+\s*=/i.test(text)) {
      return false;
    }

    // Check for any dangerous URL schemes in attributes
    const urlPattern = /(?:href|src|action|formaction|poster|cite|url)\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = urlPattern.exec(text)) !== null) {
      const url = match[1];
      if (containsDangerousScheme(url)) {
        return false;
      }
    }

    // Check for javascript: pattern anywhere
    if (/javascript:/i.test(text)) {
      return false;
    }

    // Check for dangerous data: URIs
    if (DANGEROUS_DATA_URI_REGEX.test(text)) {
      return false;
    }

    // Check for other dangerous schemes
    for (const scheme of DANGEROUS_URL_SCHEMES) {
      if (scheme === 'data:') continue; // Already checked above
      const schemeRegex = new RegExp('(?:^|[\\s"\'\\(=]+)' + scheme.replace(':', '\\:'), 'i');
      if (schemeRegex.test(text)) {
        return false;
      }
    }

    // Check for foreignObject (can contain HTML)
    if (/<foreignobject\b/i.test(text)) {
      return false;
    }

    // Check for embed elements
    if (/<embed\b/i.test(text)) {
      return false;
    }

    // Check for iframe elements
    if (/<iframe\b/i.test(text)) {
      return false;
    }

    // Check for object elements
    if (/<object\b/i.test(text)) {
      return false;
    }

    // Basic SVG structure check
    if (!lowerText.includes('<svg') || !lowerText.includes('</svg>')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes SVG content by removing dangerous elements
 * SECURITY FIX: Uses DOMPurify with SVG-specific config for comprehensive sanitization
 * This prevents XSS bypass attacks that could evade simple DOMParser-based filtering
 */
export function sanitizeSvgContent(svgContent: string): string {
  // SECURITY: Use DOMPurify with SVG-specific config for comprehensive sanitization
  return DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true },
    FORBID_TAGS: ['script', 'foreignObject', 'animate', 'set', 'animateMotion', 'animateTransform', 'mpath'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onmousemove', 
                  'onmousedown', 'onmouseup', 'onfocus', 'onblur', 'onkeydown', 'onkeyup', 
                  'onkeypress', 'onsubmit', 'onreset', 'onselect', 'onchange'],
    ALLOW_DATA_ATTR: false, // Disallow data-* attributes which can be exploited
  });
}

/**
 * Validates filename for security issues
 */
export function validateFilename(filename: string): {
  isValid: boolean;
  errors: string[];
  extension: string | null;
} {
  const errors: string[] = [];

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_FILENAME_PATTERNS) {
    if (pattern.test(filename)) {
      errors.push(`Filename contains suspicious characters or patterns`);
      break;
    }
  }

  // Extract and check extension
  const parts = filename.split('.');
  const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || null : null;

  if (extension && BLOCKED_EXTENSIONS.has(extension)) {
    errors.push(`File extension .${extension} is not allowed`);
  }

  // Check for double extensions
  if (parts.length > 1) {
    const secondExtension = parts.pop()?.toLowerCase();
    if (secondExtension && BLOCKED_EXTENSIONS.has(secondExtension)) {
      errors.push(`Double extension with blocked type detected`);
    }
  }

  // Check filename length
  if (filename.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    extension,
  };
}

/**
 * Generates a cryptographically secure filename
 */
export function generateSecureFilename(
  originalFilename: string,
  mimeType: string
): { filename: string; extension: string } {
  const uuid = generateUUID();
  
  // Get proper extension from MIME type or original filename
  let extension = '';
  const fileType = ALLOWED_FILE_TYPES[mimeType];
  
  if (fileType && fileType.extensions.length > 0) {
    extension = fileType.extensions[0];
  } else {
    // Fallback to original extension if valid
    const originalExt = originalFilename.split('.').pop()?.toLowerCase();
    if (originalExt && /^[a-z0-9]{1,10}$/.test(originalExt)) {
      extension = originalExt;
    }
  }

  const filename = extension ? `${uuid}.${extension}` : uuid;
  
  return { filename, extension };
}

/**
 * Gets image dimensions for validation
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Validates image dimensions against limits
 */
export function validateImageDimensions(
  width: number,
  height: number,
  maxWidth = 16384,
  maxHeight = 16384
): { isValid: boolean; error?: string } {
  if (width <= 0 || height <= 0) {
    return { isValid: false, error: 'Invalid image dimensions' };
  }

  if (width > maxWidth || height > maxHeight) {
    return {
      isValid: false,
      error: `Image dimensions too large (max ${maxWidth}x${maxHeight})`,
    };
  }

  // Check for decompression bomb (uncompressed size would be too large)
  const pixelCount = width * height;
  const maxPixels = 100_000_000; // 100 megapixels
  if (pixelCount > maxPixels) {
    return {
      isValid: false,
      error: `Image pixel count too large (max ${maxPixels} pixels)`,
    };
  }

  return { isValid: true };
}

/**
 * Checks if image has EXIF data
 */
export async function checkExifData(file: File): Promise<boolean> {
  // Only check JPEG files for EXIF
  if (file.type !== 'image/jpeg') {
    return false;
  }

  try {
    const bytes = await readFileBytes(file, 0, Math.min(file.size, 65536));
    
    // Look for EXIF marker (0xFFE1)
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xE1) {
        // Check for "Exif" string
        if (i + 6 < bytes.length) {
          const exifString = String.fromCharCode(...bytes.slice(i + 4, i + 8));
          if (exifString === 'Exif') {
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
  file: File,
  options: {
    allowedMimeTypes?: string[];
    maxFileSize?: number;
    validateImageDimensions?: boolean;
    scanContent?: boolean;
  } = {}
): Promise<FileSecurityResult & { secureInfo?: SecureFileInfo }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate filename
  const filenameValidation = validateFilename(file.name);
  if (!filenameValidation.isValid) {
    errors.push(...filenameValidation.errors);
  }

  // Validate file signature
  const signatureResult = await validateFileSignature(file, file.type);
  if (!signatureResult.isValid) {
    errors.push(...signatureResult.errors);
  }
  if (signatureResult.warnings.length > 0) {
    warnings.push(...signatureResult.warnings);
  }

  // Check against allowed MIME types
  if (options.allowedMimeTypes && signatureResult.detectedMimeType) {
    if (!options.allowedMimeTypes.includes(signatureResult.detectedMimeType)) {
      errors.push(`File type ${signatureResult.detectedMimeType} is not allowed`);
    }
  }

  // Check custom max file size
  if (options.maxFileSize && file.size > options.maxFileSize) {
    const maxMB = (options.maxFileSize / 1024 / 1024).toFixed(0);
    errors.push(`File size exceeds ${maxMB}MB limit`);
  }

  // Validate image dimensions
  if (options.validateImageDimensions && file.type.startsWith('image/')) {
    const dimensions = await getImageDimensions(file);
    if (dimensions) {
      const dimensionValidation = validateImageDimensions(
        dimensions.width,
        dimensions.height
      );
      if (!dimensionValidation.isValid) {
        errors.push(dimensionValidation.error!);
      }
    }
  }

  // Check for EXIF data (informational)
  if (file.type === 'image/jpeg') {
    const hasExif = await checkExifData(file);
    if (hasExif) {
      warnings.push('Image contains EXIF metadata');
    }
  }

  // Generate secure file info if validation passed
  let secureInfo: SecureFileInfo | undefined;
  if (errors.length === 0 && signatureResult.detectedMimeType) {
    const { filename } = generateSecureFilename(
      file.name,
      signatureResult.detectedMimeType
    );

    const dimensions = file.type.startsWith('image/')
      ? await getImageDimensions(file)
      : null;

    secureInfo = {
      secureFilename: filename,
      storagePath: '', // Will be set later with user ID
      originalFilename: file.name,
      mimeType: signatureResult.detectedMimeType,
      sizeBytes: file.size,
      metadata: {
        hasExif: file.type === 'image/jpeg' ? await checkExifData(file) : undefined,
        width: dimensions?.width,
        height: dimensions?.height,
      },
    };
  }

  return {
    isValid: errors.length === 0,
    detectedMimeType: signatureResult.detectedMimeType,
    errors,
    warnings,
    secureInfo,
  };
}

/**
 * Creates a secure storage path
 */
export function createSecureStoragePath(
  userId: string,
  mediaType: string,
  secureFilename: string
): string {
  // Use UUID for path segmentation to prevent enumeration
  const pathSegment = generateUUID().substring(0, 8);
  return `${userId}/${mediaType}/${pathSegment}/${secureFilename}`;
}

/**
 * Calculates SHA-256 hash of file for integrity verification
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
