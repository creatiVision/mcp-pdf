import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import emojiRegexFactory from 'emoji-regex';
import { type Font, openSync as fontkitOpenSync } from 'fontkit';
import type PDFKit from 'pdfkit';
import type { FontConfig } from './types/typography.ts';

export type { FontConfig } from './types/typography.ts';

// All 14 PDF Standard Fonts (built into PDF spec, no files needed)
export const PDF_STANDARD_FONTS = ['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique', 'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic', 'Symbol', 'ZapfDingbats'] as const;

export type PDFStandardFont = (typeof PDF_STANDARD_FONTS)[number];

/**
 * Type guard to check if a string is a PDF standard font
 */
export function isPDFStandardFont(font: string): font is PDFStandardFont {
  return (PDF_STANDARD_FONTS as readonly string[]).includes(font);
}

/**
 * Detect if text contains Unicode characters beyond ASCII + Latin-1
 * Returns true if font needs Unicode support (emoji, CJK, Cyrillic, Arabic, etc.)
 */
export function needsUnicodeFont(text: string): boolean {
  // Anything beyond ASCII + Latin-1 (0x00-0xFF) needs Unicode font
  return /[Ā-￿]/.test(text);
}

/**
 * Detect if text contains emoji characters that need special rendering
 *
 * Uses the industry-standard emoji-regex package to detect all valid emoji
 * as per the Unicode Standard, including:
 * - ZWJ sequences (👨‍💼, 🧘‍♂️)
 * - Variation selectors (️)
 * - Skin tone modifiers (🏻-🏿)
 * - Flag sequences (🇺🇸)
 * - Keycap sequences (0️⃣-9️⃣, #️⃣, *️⃣)
 * - All other emoji per Unicode Standard
 *
 * @param text - Text to check for emoji
 * @returns True if text contains emoji
 */
// Cache the emoji regex instance globally to avoid recompiling on every call
const cachedEmojiRegex = emojiRegexFactory();

export function hasEmoji(text: string): boolean {
  // Reset lastIndex because the cached regex is global (/g) and test() mutates lastIndex
  cachedEmojiRegex.lastIndex = 0;
  return cachedEmojiRegex.test(text);
}

/**
 * Check if an IP address is a private, loopback, or internal address
 */
export function isPrivateIP(ip: string): boolean {
  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4Part = ip.slice(7);
    if (isIP(ipv4Part) === 4) {
      return isPrivateIP(ipv4Part);
    }
  }

  const ipType = isIP(ip);
  if (ipType === 4) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(Number.isNaN)) {
      return true; // invalid IPv4, treat as restricted
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;
    // 100.64.0.0/10 (Shared address space / CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link-local, cloud metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private network)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && parts[2] === 0) return true;
    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    // 192.88.99.0/24 (6to4 Relay Anycast)
    if (a === 192 && b === 88 && parts[2] === 99) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;

    return false;
  }

  if (ipType === 6) {
    const normalized = ip.toLowerCase();
    // Loopback ::1 or 0:0:0:0:0:0:0:1 or ::
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1' || normalized === '::') return true;
    // Link-local fe80::/10
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    // Unique local fc00::/7
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Documentation 2001:db8::/32
    if (normalized.startsWith('2001:db8') || normalized.startsWith('2001:0db8')) return true;
    // Discard-only 100::/64
    if (normalized.startsWith('100::')) return true;

    return false;
  }

  return true; // invalid/unknown IP type -> treat as restricted
}

/**
 * Check if a hostname is a local/internal hostname
 */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.localhost')) {
    return true;
  }
  return false;
}

export interface ValidatedUrl extends URL {
  resolvedAddresses: Array<{ address: string; family: number }>;
}

/**
 * Validate font URL against SSRF vulnerabilities:
 * - Only allow HTTP/HTTPS
 * - Disallow local/private hostnames and IP addresses
 * - Perform DNS lookup to verify resolved IP addresses
 * - Enforce optional ALLOWED_FONT_DOMAINS allowlist
 */
export async function validateFontUrl(urlStr: string): Promise<ValidatedUrl> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    throw new Error(`Invalid URL: ${urlStr}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Font download rejected: Only HTTP and HTTPS protocols are allowed (got ${parsedUrl.protocol})`);
  }

  const hostname = parsedUrl.hostname;
  if (!hostname) {
    throw new Error(`Font download rejected: Missing hostname in URL ${urlStr}`);
  }

  if (isPrivateHost(hostname)) {
    throw new Error(`Font download rejected: Access to local/internal host '${hostname}' is disallowed`);
  }

  let addresses: Array<{ address: string; family: number }> = [];

  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new Error(`Font download rejected: Access to private/restricted IP address '${hostname}' is disallowed`);
    }
    addresses = [{ address: hostname, family: isIP(hostname) }];
  } else {
    try {
      const resolved = await lookup(hostname, { all: true });
      if (!resolved || resolved.length === 0) {
        throw new Error(`Font download rejected: Could not resolve hostname '${hostname}'`);
      }

      for (const addr of resolved) {
        if (isPrivateIP(addr.address)) {
          throw new Error(`Font download rejected: Hostname '${hostname}' resolved to private/restricted IP address '${addr.address}'`);
        }
      }
      addresses = resolved;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('Font download rejected:')) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Font download rejected: DNS lookup failed for '${hostname}': ${msg}`);
    }
  }

  const allowedDomainsEnv = process.env.ALLOWED_FONT_DOMAINS;
  if (allowedDomainsEnv) {
    const allowedList = allowedDomainsEnv
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    const lowerHost = hostname.toLowerCase();
    const isAllowed = allowedList.some((domain) => lowerHost === domain || lowerHost.endsWith(`.${domain}`));
    if (!isAllowed) {
      throw new Error(`Font download rejected: Hostname '${hostname}' is not in the allowed font domains list`);
    }
  }

  return Object.assign(parsedUrl, { resolvedAddresses: addresses });
}

interface SafeFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function httpRequestPinned(validatedUrl: ValidatedUrl): Promise<SafeFetchResponse> {
  return new Promise((resolve, reject) => {
    const protocol = validatedUrl.protocol === 'https:' ? https : http;
    const addrs = validatedUrl.resolvedAddresses;

    const req = protocol.request(
      validatedUrl,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'mcp-pdf-font-downloader',
          Accept: '*/*',
        },
        lookup: (_hostname, options, callback) => {
          if (options && options.all) {
            callback(null, addrs);
          } else if (addrs.length > 0) {
            callback(null, addrs[0].address, addrs[0].family);
          } else {
            callback(new Error('No resolved IP available'), '', 4);
          }
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const headersMap = new Headers();
          for (const [key, val] of Object.entries(res.headers)) {
            if (Array.isArray(val)) {
              for (const v of val) headersMap.append(key, v);
            } else if (val !== undefined) {
              headersMap.set(key, val);
            }
          }

          const buf = Buffer.concat(chunks);
          const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

          resolve({
            ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
            status: res.statusCode ?? 500,
            statusText: res.statusMessage ?? '',
            headers: headersMap,
            arrayBuffer: async () => arrayBuf,
          });
        });
        res.on('error', reject);
      }
    );

    req.on('error', reject);
    req.end();
  });
}

/**
 * Safely fetch a resource with SSRF protection on redirects and DNS pinning
 */
async function fetchSafe(urlStr: string, maxRedirects = 5): Promise<SafeFetchResponse> {
  let currentUrl = urlStr;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const validatedUrl = await validateFontUrl(currentUrl);

    const response = await httpRequestPinned(validatedUrl);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Font download failed: Redirect status ${response.status} with no Location header`);
      }
      currentUrl = new URL(location, validatedUrl).toString();
      redirectCount++;
      continue;
    }

    return response;
  }

  throw new Error(`Font download failed: Too many redirects (exceeded ${maxRedirects})`);
}

/**
 * Auto-detect a system font with Unicode support
 * Returns path to first found Unicode-capable font, or null if none found
 * Prioritizes fonts with known CJK (Chinese/Japanese/Korean) support
 */
let cachedSystemFont: string | null | undefined;

/**
 * Auto-detect a system font with Unicode support
 * Returns path to first found Unicode-capable font, or null if none found
 * Prioritizes fonts with known CJK (Chinese/Japanese/Korean) support
 * Caches the result to avoid synchronous file system existence checks on every call.
 */
export function getSystemFont(): string | null {
  if (cachedSystemFont !== undefined) {
    return cachedSystemFont;
  }

  // System fonts ordered by Unicode/CJK support quality
  const unicodeSupportedFonts = [
    // macOS - prioritize Arial Unicode (full CJK support)
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf', // 50k+ glyphs, full CJK
    '/System/Library/Fonts/SFNS.ttf', // System font (limited CJK)
    '/System/Library/Fonts/SFNSText.ttf',
    // Linux - Noto fonts have excellent CJK support
    '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    '/usr/share/fonts/noto/NotoSans-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
    // Windows - Segoe UI has better Unicode than Arial
    'C:WindowsFontssegoeui.ttf',
    'C:WindowsFontsNotoSans-Regular.ttf',
    'C:WindowsFontsarial.ttf',
  ];

  for (const fontPath of unicodeSupportedFonts) {
    if (existsSync(fontPath)) {
      cachedSystemFont = fontPath;
      return fontPath;
    }
  }

  cachedSystemFont = null;
  return null;
}

/**
 * Download font from URL to temp directory
 * Returns path to downloaded font
 * Caches downloads - if the file already exists, returns cached path
 * Throws error if download fails
 */
async function downloadToTemp(url: string): Promise<string> {
  const tempDir = join(tmpdir(), 'mcp-pdf-fonts');
  await mkdir(tempDir, { recursive: true });

  // Validate URL and resolve font safely (SSRF protection)
  const validatedUrl = await validateFontUrl(url);

  // Extract filename safely using SHA-256 hash of full URL to prevent cache collisions
  const urlHash = createHash('sha256').update(url).digest('hex').slice(0, 16);
  const rawFilename = validatedUrl.pathname.split('/').pop() || 'font.woff2';
  const sanitizedFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'font.woff2';
  const tempPath = join(tempDir, `font-${urlHash}-${sanitizedFilename}`);

  // Check if already cached
  if (existsSync(tempPath)) {
    return tempPath;
  }

  // Download if not cached
  const response = await fetchSafe(url);
  if (!response.ok) {
    throw new Error(`Font download failed (HTTP ${response.status}): ${response.statusText}`);
  }

  const MAX_FONT_SIZE = 20 * 1024 * 1024; // 20 MB max
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_FONT_SIZE) {
    throw new Error(`Font download failed: File size exceeds maximum allowed limit (${MAX_FONT_SIZE} bytes)`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_FONT_SIZE) {
    throw new Error(`Font download failed: Downloaded file size exceeds maximum allowed limit (${MAX_FONT_SIZE} bytes)`);
  }

  await writeFile(tempPath, Buffer.from(buffer));
  return tempPath;
}

/**
 * Resolve font specification to actual font path or name
 * Supports: PDF standard fonts, absolute paths, URLs, 'auto' detection
 * Returns null if font cannot be resolved (caller should use fallback)
 * Throws error if URL download fails
 */
export async function resolveFont(fontSpec: string): Promise<string | null> {
  // 1. Check if it's a PDF standard font (built-in, no file needed)
  if (isPDFStandardFont(fontSpec)) {
    return fontSpec;
  }

  // 2. Auto-detect system font
  if (fontSpec === 'auto') {
    return getSystemFont();
  }

  // 3. Absolute path
  if (fontSpec.startsWith('/') || fontSpec.match(/^[A-Z]:\\/)) {
    return existsSync(fontSpec) ? fontSpec : null;
  }

  // 4. URL (http/https) - throws on download failure
  if (fontSpec.startsWith('http://') || fontSpec.startsWith('https://')) {
    return await downloadToTemp(fontSpec);
  }

  // Unknown font specification
  return null;
}

/**
 * Setup fonts for PDF document
 * Resolves font specification and registers with PDFKit
 * Returns FontConfig with regular/bold/oblique variants
 * Falls back to Helvetica if font resolution or registration fails
 */
export async function setupFonts(_doc: PDFKit.PDFDocument, fontSpec: string | undefined): Promise<FontConfig> {
  // Default to auto-detect if not specified
  const spec = fontSpec || 'auto';

  // Resolve the font (may throw on URL download failure)
  const resolvedFont = await resolveFont(spec);

  // Fall back to Helvetica if resolution failed
  if (!resolvedFont) {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique',
      boldItalic: 'Helvetica-BoldOblique',
    };
  }

  // If it's a standard PDF font, use its variants
  if (isPDFStandardFont(resolvedFont)) {
    // Map to standard font families
    if (resolvedFont.startsWith('Helvetica')) {
      return {
        regular: 'Helvetica',
        bold: 'Helvetica-Bold',
        italic: 'Helvetica-Oblique',
        boldItalic: 'Helvetica-BoldOblique',
      };
    }
    if (resolvedFont.startsWith('Times')) {
      return {
        regular: 'Times-Roman',
        bold: 'Times-Bold',
        italic: 'Times-Italic',
        boldItalic: 'Times-BoldItalic',
      };
    }
    if (resolvedFont.startsWith('Courier')) {
      return {
        regular: 'Courier',
        bold: 'Courier-Bold',
        italic: 'Courier-Oblique',
        boldItalic: 'Courier-BoldOblique',
      };
    }

    // For Symbol or ZapfDingbats, just use as-is for all variants
    return {
      regular: resolvedFont,
      bold: resolvedFont,
      italic: resolvedFont,
      boldItalic: resolvedFont,
    };
  }

  // It's a custom font file path (from auto-detect or explicit path)
  // Custom fonts typically don't have separate bold/italic files readily available,
  // so we fall back to Helvetica which has all variants built-in.
  // This ensures bold/italic markdown styling works correctly.
  // Note: We intentionally do NOT register the custom font since we won't use it.
  return {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
    boldItalic: 'Helvetica-BoldOblique',
  };
}

export interface CharacterValidationResult {
  hasUnsupportedCharacters: boolean;
  warnings: string[];
  unsupportedChars: Map<string, number>; // char -> codePoint
}

// Cache for opened fontkit font instances by file path
const fontCache = new Map<string, Font | null>();

/**
 * Clear the internal fontkit font instance cache
 */
export function clearFontCache(): void {
  fontCache.clear();
  cachedSystemFont = undefined;
}

/**
 * Validate text against a specific font's glyph coverage
 *
 * For standard PDF fonts: checks WinAnsi range (0x20-0xFF)
 * For custom fonts: uses fontkit to check actual glyph support
 *
 * @param text - Text to validate
 * @param fontName - Font name (e.g., 'Helvetica', 'CustomFont')
 * @param fontPath - Path to font file (required for custom fonts)
 * @returns Validation result with warnings
 */
export function validateTextForFont(text: string, fontName: string, fontPath: string | undefined): CharacterValidationResult {
  const result: CharacterValidationResult = {
    hasUnsupportedCharacters: false,
    warnings: [],
    unsupportedChars: new Map(),
  };

  // Check if it's a standard PDF font
  const isStandardFont = PDF_STANDARD_FONTS.some((f) => {
    const baseName = f.split('-')[0];
    return baseName && fontName.startsWith(baseName);
  });

  if (isStandardFont) {
    // Standard PDF fonts only support WinAnsi encoding (0x20-0xFF)
    for (const char of text) {
      const code = char.charCodeAt(0);

      if (code < 0x20 || code > 0xff) {
        result.hasUnsupportedCharacters = true;
        result.unsupportedChars.set(char, code);
      }
    }

    if (result.hasUnsupportedCharacters) {
      const chars = Array.from(result.unsupportedChars.entries())
        .slice(0, 5)
        .map(([char, code]) => `"${char}" (U+${code.toString(16).toUpperCase().padStart(4, '0')})`)
        .join(', ');
      const more = result.unsupportedChars.size > 5 ? ` and ${result.unsupportedChars.size - 5} more` : '';

      result.warnings.push(`Characters ${chars}${more} won't render in ${fontName}. Standard PDF fonts only support WinAnsi encoding (0x20-0xFF). Consider using a custom Unicode font or alternative characters.`);
    }
  } else if (fontPath && !fontName.startsWith('CustomFont')) {
    // Custom font - check actual glyph coverage using fontkit
    try {
      let font = fontCache.get(fontPath);
      if (font === undefined) {
        const fontOrCollection = fontkitOpenSync(fontPath);
        font = 'fonts' in fontOrCollection ? (fontOrCollection.fonts[0] ?? null) : (fontOrCollection ?? null);
        fontCache.set(fontPath, font);
      }

      if (!font) {
        // Font collection is empty or invalid - can't validate
        return result;
      }

      for (const char of text) {
        const codePoint = char.codePointAt(0);
        if (codePoint && !font.hasGlyphForCodePoint(codePoint)) {
          result.hasUnsupportedCharacters = true;
          result.unsupportedChars.set(char, codePoint);
        }
      }

      if (result.hasUnsupportedCharacters) {
        const chars = Array.from(result.unsupportedChars.entries())
          .slice(0, 5)
          .map(([char, code]) => `"${char}" (U+${code.toString(16).toUpperCase().padStart(4, '0')})`)
          .join(', ');
        const more = result.unsupportedChars.size > 5 ? ` and ${result.unsupportedChars.size - 5} more` : '';

        result.warnings.push(`Characters ${chars}${more} are not supported by font ${fontName}. Consider using a different font or alternative characters.`);
      }
    } catch (_err) {
      // If we can't load the font, we can't validate - remain silent (no false positives)
    }
  }

  // For unknown fonts or when we can't determine support, remain silent
  // (no false positives)

  return result;
}
