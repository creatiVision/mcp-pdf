/**
 * Image dimension utilities for PDF generation.
 *
 * Follows the React Native pattern:
 * - Local files: Read intrinsic dimensions from file headers
 * - Network images: Require explicit dimensions (throw error otherwise)
 */

import * as fs from 'fs';
import imageSize from 'image-size';
import * as path from 'path';

export interface ImageDimensions {
  width: number;
  height: number;
}

interface CacheEntry {
  mtimeMs: number;
  dimensions: ImageDimensions;
}

const MAX_CACHE_SIZE = 500;
const dimensionCache = new Map<string, CacheEntry>();

/**
 * Clear the image dimension cache (mainly for testing).
 */
export function clearImageDimensionsCache(): void {
  dimensionCache.clear();
}

/**
 * Check if a path is a URL (http:// or https://)
 */
function isUrl(imagePath: string): boolean {
  return imagePath.startsWith('http://') || imagePath.startsWith('https://');
}

/**
 * Set entry in LRU cache with eviction if limit reached.
 */
function setCacheEntry(key: string, entry: CacheEntry): void {
  if (dimensionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = dimensionCache.keys().next().value;
    if (oldestKey !== undefined) {
      dimensionCache.delete(oldestKey);
    }
  }
  dimensionCache.set(key, entry);
}

/**
 * Get intrinsic dimensions of a local image file asynchronously.
 *
 * @param imagePath - Absolute or relative path to image file
 * @returns Dimensions or null if file doesn't exist or can't be read
 */
async function getLocalImageDimensionsAsync(imagePath: string): Promise<ImageDimensions | null> {
  try {
    const cwd = process.cwd();
    // Resolve relative paths
    const resolvedPath = path.isAbsolute(imagePath) ? path.resolve(imagePath) : path.resolve(cwd, imagePath);

    // Prevent path traversal outside working directory
    const relative = path.relative(cwd, resolvedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return null;
    }

    const stat = await fs.promises.stat(resolvedPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return null;
    }

    const cached = dimensionCache.get(resolvedPath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.dimensions;
    }

    const buffer = await fs.promises.readFile(resolvedPath);
    const dimensions = imageSize(new Uint8Array(buffer));
    if (dimensions.width && dimensions.height) {
      const result: ImageDimensions = {
        width: dimensions.width,
        height: dimensions.height,
      };
      setCacheEntry(resolvedPath, { mtimeMs: stat.mtimeMs, dimensions: result });
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get intrinsic dimensions of a local image file synchronously.
 *
 * @param imagePath - Absolute or relative path to image file
 * @returns Dimensions or null if file doesn't exist or can't be read
 */
function getLocalImageDimensions(imagePath: string): ImageDimensions | null {
  try {
    const resolvedPath = path.isAbsolute(imagePath) ? imagePath : path.resolve(process.cwd(), imagePath);

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    const stat = fs.statSync(resolvedPath);
    const cached = dimensionCache.get(resolvedPath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.dimensions;
    }

    const buffer = fs.readFileSync(resolvedPath);
    const dimensions = imageSize(new Uint8Array(buffer));
    if (dimensions.width && dimensions.height) {
      const result: ImageDimensions = {
        width: dimensions.width,
        height: dimensions.height,
      };
      setCacheEntry(resolvedPath, { mtimeMs: stat.mtimeMs, dimensions: result });
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get image dimensions with appropriate handling for local vs network images asynchronously.
 */
async function getImageDimensionsAsync(imagePath: string): Promise<ImageDimensions | null> {
  if (isUrl(imagePath)) {
    return null;
  }

  return getLocalImageDimensionsAsync(imagePath);
}

/**
 * Get image dimensions with appropriate handling for local vs network images synchronously.
 */
function getImageDimensions(imagePath: string): ImageDimensions | null {
  if (isUrl(imagePath)) {
    return null;
  }

  return getLocalImageDimensions(imagePath);
}

/**
 * Resolve image dimensions with explicit overrides asynchronously.
 *
 * Priority:
 * 1. Explicit width/height from user
 * 2. Intrinsic dimensions from file (local files only)
 * 3. Throw error if dimensions cannot be determined
 *
 * If only width or height is provided, the other is calculated from aspect ratio
 * (if intrinsic dimensions are available).
 *
 * @param imagePath - Path or URL to image
 * @param explicitWidth - User-provided width (optional)
 * @param explicitHeight - User-provided height (optional)
 * @returns Resolved dimensions promise
 * @throws Error if dimensions cannot be determined
 */
export async function resolveImageDimensionsAsync(imagePath: string, explicitWidth?: number, explicitHeight?: number): Promise<ImageDimensions> {
  // Both dimensions provided - use them directly
  if (explicitWidth !== undefined && explicitHeight !== undefined) {
    return { width: explicitWidth, height: explicitHeight };
  }

  // Try to get intrinsic dimensions asynchronously
  const intrinsic = await getImageDimensionsAsync(imagePath);

  // Only width provided - calculate height from aspect ratio
  if (explicitWidth !== undefined && intrinsic) {
    const aspectRatio = intrinsic.height / intrinsic.width;
    return { width: explicitWidth, height: explicitWidth * aspectRatio };
  }

  // Only height provided - calculate width from aspect ratio
  if (explicitHeight !== undefined && intrinsic) {
    const aspectRatio = intrinsic.width / intrinsic.height;
    return { width: explicitHeight * aspectRatio, height: explicitHeight };
  }

  // No explicit dimensions - use intrinsic if available
  if (intrinsic) {
    return intrinsic;
  }

  // Cannot determine dimensions
  if (isUrl(imagePath)) {
    throw new Error(`Image dimensions required for network images. Please provide explicit width and height for: ${imagePath}`);
  }

  throw new Error(`Cannot determine image dimensions for: ${imagePath}. File may not exist or format is unsupported. Please provide explicit width and height.`);
}

/**
 * Resolve image dimensions with explicit overrides synchronously.
 *
 * Priority:
 * 1. Explicit width/height from user
 * 2. Intrinsic dimensions from file (local files only)
 * 3. Throw error if dimensions cannot be determined
 *
 * If only width or height is provided, the other is calculated from aspect ratio
 * (if intrinsic dimensions are available).
 *
 * @param imagePath - Path or URL to image
 * @param explicitWidth - User-provided width (optional)
 * @param explicitHeight - User-provided height (optional)
 * @returns Resolved dimensions
 * @throws Error if dimensions cannot be determined
 */
export function resolveImageDimensions(imagePath: string, explicitWidth?: number, explicitHeight?: number): ImageDimensions {
  // Both dimensions provided - use them directly
  if (explicitWidth !== undefined && explicitHeight !== undefined) {
    return { width: explicitWidth, height: explicitHeight };
  }

  // Try to get intrinsic dimensions synchronously
  const intrinsic = getImageDimensions(imagePath);

  // Only width provided - calculate height from aspect ratio
  if (explicitWidth !== undefined && intrinsic) {
    const aspectRatio = intrinsic.height / intrinsic.width;
    return { width: explicitWidth, height: explicitWidth * aspectRatio };
  }

  // Only height provided - calculate width from aspect ratio
  if (explicitHeight !== undefined && intrinsic) {
    const aspectRatio = intrinsic.width / intrinsic.height;
    return { width: explicitHeight * aspectRatio, height: explicitHeight };
  }

  // No explicit dimensions - use intrinsic if available
  if (intrinsic) {
    return intrinsic;
  }

  // Cannot determine dimensions
  if (isUrl(imagePath)) {
    throw new Error(`Image dimensions required for network images. Please provide explicit width and height for: ${imagePath}`);
  }

  throw new Error(`Cannot determine image dimensions for: ${imagePath}. File may not exist or format is unsupported. Please provide explicit width and height.`);
}
