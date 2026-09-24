/**
 * Secure File Upload Validation for TypeNova Bug Reports
 * 
 * Enforces defense-in-depth:
 * 1. File size limits (Max 5MB).
 * 2. Explicit blocking of dangerous server-side scripts, executables, and XSS vectors
 *    (e.g., PHP, JSP, ASP, shell scripts, binaries, HTML, SVG).
 * 3. Whitelist validation of raster image extensions (.png, .jpg, .jpeg, .webp, .gif, .avif).
 * 4. Multi-dot / double extension inspection (e.g., blocking `exploit.php.png`).
 * 5. MIME type verification.
 * 6. Magic bytes / file signature inspection to prevent renamed malicious payloads.
 */

export const MAX_REPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_REPORT_FILE_SIZE_LABEL = '5MB';

export const ALLOWED_IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'avif',
] as const;

export type AllowedImageExtension = (typeof ALLOWED_IMAGE_EXTENSIONS)[number];

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

/**
 * List of dangerous extensions to explicitly identify and flag with detailed error feedback.
 */
export const BLOCKED_DANGEROUS_EXTENSIONS = new Set([
  // PHP & server-side scripts
  'php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'phps', 'inc',
  // JSP / Java
  'jsp', 'jspx', 'jsw', 'jsv', 'jspf', 'class', 'jar', 'war', 'ear',
  // ASP / .NET
  'asp', 'aspx', 'cer', 'asa', 'asax', 'ascx', 'ashx', 'asmx', 'axd', 'cs', 'vb',
  // Executables & Binaries
  'exe', 'dll', 'so', 'dylib', 'bin', 'com', 'msi', 'app', 'dmg', 'apk', 'deb', 'rpm',
  // Scripts & Automation
  'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1', 'vbs', 'vbe', 'wsf', 'wsh',
  'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'pyc', 'rb', 'pl', 'cgi', 'lua',
  // HTML / Web / SVG (stored XSS vectors in image viewers)
  'html', 'htm', 'xhtml', 'shtml', 'svg', 'svgz', 'xml', 'css',
  // Containers & Archives
  'zip', 'tar', 'gz', 'bz2', 'xz', 'rar', '7z', 'iso',
  // Configuration & Server configs
  'sql', 'env', 'htaccess', 'htpasswd', 'conf', 'config', 'ini', 'yaml', 'yml',
]);

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedExt?: AllowedImageExtension;
}

/**
 * Formats byte size into a human-readable string (e.g., "1.4 MB", "420 KB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Inspects initial byte signature (magic bytes) to verify raster image format.
 */
export async function verifyImageMagicBytes(
  file: File | Blob
): Promise<{ matches: boolean; detectedType?: AllowedImageExtension }> {
  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 4) return { matches: false };

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4E &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0D &&
      bytes[5] === 0x0A &&
      bytes[6] === 0x1A &&
      bytes[7] === 0x0A
    ) {
      return { matches: true, detectedType: 'png' };
    }

    // JPEG: FF D8 FF
    if (
      bytes.length >= 3 &&
      bytes[0] === 0xFF &&
      bytes[1] === 0xD8 &&
      bytes[2] === 0xFF
    ) {
      return { matches: true, detectedType: 'jpg' };
    }

    // GIF: GIF87a or GIF89a (47 49 46 38)
    if (
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return { matches: true, detectedType: 'gif' };
    }

    // WebP: RIFF at 0..3 (52 49 46 46) and WEBP at 8..11 (57 45 42 50)
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { matches: true, detectedType: 'webp' };
    }

    // AVIF: bytes 4..7 = 'ftyp' (66 74 79 70), bytes 8..11 = 'avif' (61 76 69 66) or 'avis' (61 76 69 73)
    if (
      bytes.length >= 12 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70 &&
      bytes[8] === 0x61 &&
      bytes[9] === 0x76 &&
      bytes[10] === 0x69 &&
      (bytes[11] === 0x66 || bytes[11] === 0x73)
    ) {
      return { matches: true, detectedType: 'avif' };
    }

    return { matches: false };
  } catch {
    return { matches: false };
  }
}

/**
 * Validates an uploaded bug report screenshot file against all security and size criteria.
 */
export async function validateBugReportFile(file: File | null | undefined): Promise<FileValidationResult> {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // 1. Check for empty file
  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes). Please upload a valid screenshot.' };
  }

  // 2. Check maximum size limit (5MB)
  if (file.size > MAX_REPORT_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_REPORT_FILE_SIZE_LABEL} limit (${formatFileSize(file.size)}). Please attach a smaller image.`,
    };
  }

  // 3. Check for null byte or control characters in filename
  if (file.name.includes('\0') || /[\x00-\x1F]/.test(file.name)) {
    return { valid: false, error: 'Filename contains invalid or suspicious characters.' };
  }

  // 4. Multi-dot & extension security check
  const nameClean = file.name.trim().toLowerCase();
  const parts = nameClean.split('.').filter(Boolean);

  if (parts.length < 2) {
    return { valid: false, error: 'File must have a valid image extension (.png, .jpg, .webp, .gif).' };
  }

  // Check all segments for blocked dangerous extensions (prevents double extensions like exploit.php.png)
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    if (BLOCKED_DANGEROUS_EXTENSIONS.has(segment)) {
      return {
        valid: false,
        error: `Blocked unsafe file type (.${segment}). Only safe images (PNG, JPG, WebP, GIF) under ${MAX_REPORT_FILE_SIZE_LABEL} are permitted.`,
      };
    }
  }

  // Final extension check
  const finalExt = parts[parts.length - 1];
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(finalExt as AllowedImageExtension)) {
    return {
      valid: false,
      error: `Unsupported format (.${finalExt}). Please upload an image file (PNG, JPG, WebP, GIF, or AVIF).`,
    };
  }

  // 5. MIME Type Check
  const normalizedMime = file.type.toLowerCase().trim();
  if (normalizedMime && !ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime as any)) {
    return {
      valid: false,
      error: `Invalid file MIME type (${normalizedMime}). Please attach a standard screenshot image.`,
    };
  }

  // 6. Magic Bytes Verification
  const signature = await verifyImageMagicBytes(file);
  if (!signature.matches) {
    return {
      valid: false,
      error: 'File content does not match a valid image signature. Renamed or corrupted files are not permitted.',
    };
  }

  // Normalize final extension (e.g. jpeg -> jpg)
  const sanitizedExt = (finalExt === 'jpeg' ? 'jpg' : finalExt) as AllowedImageExtension;

  return {
    valid: true,
    sanitizedExt,
  };
}
