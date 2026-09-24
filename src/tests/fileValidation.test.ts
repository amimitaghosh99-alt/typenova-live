/**
 * Bug Report File Upload Validation & Security Test Suite
 * 
 * Verifies:
 * - Strict blocking of PHP, JSP, ASP, executables, scripts, and HTML/SVG.
 * - Multi-dot / double extension attack prevention (e.g. exploit.php.png).
 * - Max file size enforcement (5MB limit).
 * - Empty file rejection (0 bytes).
 * - Magic bytes / signature verification to block disguise attacks.
 * - Acceptance of authentic PNG, JPEG, WebP, GIF within safe limits.
 */

import { describe, it, expect } from './testHarness.ts';
import {
  validateBugReportFile,
  verifyImageMagicBytes,
  formatFileSize,
  MAX_REPORT_FILE_SIZE,
  BLOCKED_DANGEROUS_EXTENSIONS,
} from '../lib/fileValidation.ts';

// Helper to create mock File objects with custom byte arrays
function createMockFile(
  name: string,
  bytes: number[],
  type = 'image/png'
): File {
  const uint8 = new Uint8Array(bytes);
  return new File([uint8], name, { type });
}

// Helper to create an oversized mock file
function createOversizedFile(name: string, sizeBytes: number, type = 'image/png'): File {
  // Use Uint8Array of specified size
  const uint8 = new Uint8Array(sizeBytes);
  // Fill initial bytes with PNG signature so it would pass magic byte check if not for size
  const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < pngHeader.length; i++) {
    uint8[i] = pngHeader[i];
  }
  return new File([uint8], name, { type });
}

export function registerFileValidationTests(): void {
  describe('File Upload Security — Dangerous File Types & Extension Blocking', () => {
    it('blocks dangerous PHP extensions (.php, .phtml, .php5, .phar)', async () => {
      const phpExtensions = ['test.php', 'shell.phtml', 'script.php5', 'bundle.phar'];
      for (const name of phpExtensions) {
        const file = createMockFile(name, [0x3C, 0x3F, 0x70, 0x68, 0x70], 'application/x-php');
        const res = await validateBugReportFile(file);
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
        expect(res.error?.includes('Blocked unsafe file type')).toBe(true);
      }
    });

    it('blocks dangerous JSP extensions (.jsp, .jspx, .jar, .class)', async () => {
      const jspExtensions = ['payload.jsp', 'exploit.jspx', 'app.jar', 'Binary.class'];
      for (const name of jspExtensions) {
        const file = createMockFile(name, [0x3C, 0x25, 0x40], 'text/plain');
        const res = await validateBugReportFile(file);
        expect(res.valid).toBe(false);
        expect(res.error).toBeDefined();
        expect(res.error?.includes('Blocked unsafe file type')).toBe(true);
      }
    });

    it('blocks ASP and ASPX script extensions', async () => {
      const aspExtensions = ['cmd.asp', 'shell.aspx', 'handler.ashx'];
      for (const name of aspExtensions) {
        const file = createMockFile(name, [0x3C, 0x25], 'text/plain');
        const res = await validateBugReportFile(file);
        expect(res.valid).toBe(false);
        expect(res.error?.includes('Blocked unsafe file type')).toBe(true);
      }
    });

    it('blocks binary and executable files (.exe, .sh, .bat, .cmd, .dll)', async () => {
      const exeFiles = ['malware.exe', 'runner.sh', 'batch.bat', 'win.cmd', 'lib.dll'];
      for (const name of exeFiles) {
        const file = createMockFile(name, [0x4D, 0x5A, 0x90, 0x00], 'application/octet-stream');
        const res = await validateBugReportFile(file);
        expect(res.valid).toBe(false);
        expect(res.error?.includes('Blocked unsafe file type')).toBe(true);
      }
    });

    it('blocks stored XSS vectors (.html, .htm, .svg, .xml)', async () => {
      const xssFiles = ['xss.html', 'page.htm', 'vector.svg', 'data.xml'];
      for (const name of xssFiles) {
        const file = createMockFile(name, [0x3C, 0x73, 0x76, 0x67], 'image/svg+xml');
        const res = await validateBugReportFile(file);
        expect(res.valid).toBe(false);
        expect(res.error?.includes('Blocked unsafe file type')).toBe(true);
      }
    });

    it('blocks script files (.js, .ts, .py, .pl, .cgi)', async () => {
      const scriptFiles = ['script.js', 'type.ts', 'exploit.py', 'handler.cgi'];
      for (const name of scriptFiles) {
        const file = createMockFile(name, [0x63, 0x6F, 0x6E, 0x73], 'text/javascript');
        const res = await validateBugReportFile(file);
        expect(res.valid).toBe(false);
        expect(res.error?.includes('Blocked unsafe file type')).toBe(true);
      }
    });

    it('ensures BLOCKED_DANGEROUS_EXTENSIONS contains php, jsp, asp, and critical exploits', () => {
      expect(BLOCKED_DANGEROUS_EXTENSIONS.has('php')).toBe(true);
      expect(BLOCKED_DANGEROUS_EXTENSIONS.has('jsp')).toBe(true);
      expect(BLOCKED_DANGEROUS_EXTENSIONS.has('asp')).toBe(true);
      expect(BLOCKED_DANGEROUS_EXTENSIONS.has('exe')).toBe(true);
      expect(BLOCKED_DANGEROUS_EXTENSIONS.has('svg')).toBe(true);
      expect(BLOCKED_DANGEROUS_EXTENSIONS.has('html')).toBe(true);
    });
  });

  describe('File Upload Security — Multi-Dot & Double Extension Defense', () => {
    it('detects and blocks double extension attacks (e.g., shell.php.png)', async () => {
      const doubleExts = [
        'shell.php.png',
        'backdoor.jsp.jpg',
        'exploit.asp.webp',
        'trojan.exe.gif',
        'xss.html.png',
        'code.js.jpeg',
      ];

      for (const name of doubleExts) {
        // Even with a valid PNG magic byte header, it must be rejected!
        const file = createMockFile(
          name,
          [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D],
          'image/png'
        );
        const res = await validateBugReportFile(file);
        expect(res.valid).toBe(false);
        expect(res.error?.includes('Blocked unsafe file type')).toBe(true);
      }
    });

    it('rejects filenames with null bytes or control characters', async () => {
      const file = createMockFile(
        'innocent.png\0.php',
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        'image/png'
      );
      const res = await validateBugReportFile(file);
      expect(res.valid).toBe(false);
      expect(res.error?.includes('suspicious')).toBe(true);
    });

    it('rejects files without any extension', async () => {
      const file = createMockFile(
        'screenshot_without_ext',
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        'image/png'
      );
      const res = await validateBugReportFile(file);
      expect(res.valid).toBe(false);
      expect(res.error?.includes('valid image extension')).toBe(true);
    });
  });

  describe('File Upload Security — Upload Size Limits', () => {
    it('rejects empty 0-byte files', async () => {
      const file = createMockFile('empty.png', [], 'image/png');
      const res = await validateBugReportFile(file);
      expect(res.valid).toBe(false);
      expect(res.error?.includes('empty')).toBe(true);
    });

    it('rejects files strictly exceeding 5MB limit', async () => {
      // 5MB + 1 byte
      const oversized = createOversizedFile('large_screenshot.png', MAX_REPORT_FILE_SIZE + 1);
      const res = await validateBugReportFile(oversized);
      expect(res.valid).toBe(false);
      expect(res.error?.includes('exceeds 5MB limit')).toBe(true);
    });

    it('accurately formats byte sizes into human readable labels', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024 * 512)).toBe('512.0 KB');
      expect(formatFileSize(1024 * 1024 * 3.5)).toBe('3.5 MB');
    });
  });

  describe('File Upload Security — Magic Bytes & Header Verification', () => {
    it('rejects files where a script payload is renamed with a .png extension', async () => {
      // PHP content disguised as a .png
      const fakePng = createMockFile(
        'disguised_script.png',
        [0x3C, 0x3F, 0x70, 0x68, 0x70, 0x20, 0x65, 0x63, 0x68, 0x6F, 0x20, 0x27, 0x68, 0x69, 0x27],
        'image/png'
      );
      const res = await validateBugReportFile(fakePng);
      expect(res.valid).toBe(false);
      expect(res.error?.includes('valid image signature')).toBe(true);
    });

    it('accepts authentic PNG image file signatures', async () => {
      const pngFile = createMockFile(
        'valid_screenshot.png',
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52],
        'image/png'
      );
      const sig = await verifyImageMagicBytes(pngFile);
      expect(sig.matches).toBe(true);
      expect(sig.detectedType).toBe('png');

      const res = await validateBugReportFile(pngFile);
      expect(res.valid).toBe(true);
      expect(res.sanitizedExt).toBe('png');
    });

    it('accepts authentic JPEG/JPG image file signatures', async () => {
      const jpegFile = createMockFile(
        'evidence.jpeg',
        [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01],
        'image/jpeg'
      );
      const sig = await verifyImageMagicBytes(jpegFile);
      expect(sig.matches).toBe(true);
      expect(sig.detectedType).toBe('jpg');

      const res = await validateBugReportFile(jpegFile);
      expect(res.valid).toBe(true);
      expect(res.sanitizedExt).toBe('jpg');
    });

    it('accepts authentic GIF image file signatures', async () => {
      const gifFile = createMockFile(
        'animation.gif',
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x00, 0x20, 0x00, 0x80, 0x00],
        'image/gif'
      );
      const sig = await verifyImageMagicBytes(gifFile);
      expect(sig.matches).toBe(true);
      expect(sig.detectedType).toBe('gif');

      const res = await validateBugReportFile(gifFile);
      expect(res.valid).toBe(true);
      expect(res.sanitizedExt).toBe('gif');
    });

    it('accepts authentic WebP image file signatures', async () => {
      // 'RIFF' + 4 size bytes + 'WEBP'
      const webpFile = createMockFile(
        'capture.webp',
        [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20],
        'image/webp'
      );
      const sig = await verifyImageMagicBytes(webpFile);
      expect(sig.matches).toBe(true);
      expect(sig.detectedType).toBe('webp');

      const res = await validateBugReportFile(webpFile);
      expect(res.valid).toBe(true);
      expect(res.sanitizedExt).toBe('webp');
    });
  });
}
