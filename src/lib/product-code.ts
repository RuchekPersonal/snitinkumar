// Product codes are chosen by the admin (SN-123 is only the suggested pattern). They are
// stored upper-case and appear in URLs, carts and enquiries, so they are limited to
// letters, numbers, hyphens, underscores and dots; spaces become hyphens.

export const PRODUCT_CODE_RE = /^[A-Z0-9][A-Z0-9._-]{0,29}$/i;

export const PRODUCT_CODE_HINT = "Letters, numbers, - _ or . (up to 30). Spaces become hyphens.";

export function normaliseProductCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "-").toUpperCase();
}
