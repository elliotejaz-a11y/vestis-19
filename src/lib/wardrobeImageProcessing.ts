/**
 * Wardrobe image processing: validation helpers for wardrobe item uploads.
 */

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export function isAllowedWardrobeImageType(type: string): boolean {
  return ALLOWED_TYPES.includes(type);
}

export function isAllowedWardrobeImageSize(bytes: number): boolean {
  return bytes <= MAX_FILE_BYTES;
}