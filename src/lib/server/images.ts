import "server-only";
import { db } from "./db";
import { VARIANTS, type Variant } from "./image-variants";

export { VARIANTS, type Variant };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Reads one variant of a product photo (stored as base64, RFD §6) and returns its bytes,
 * or null if the id is unknown or its product is hidden. Only the requested column is
 * selected, so a request never pulls the other sizes.
 */
export async function getImage(id: string, variant: Variant): Promise<Buffer | null> {
  if (!UUID_RE.test(id)) return null;
  const column = `${variant}_b64` as const;
  const { data, error } = await db()
    .from("product_images")
    .select(`${column}, products!inner(is_visible)`)
    .eq("id", id)
    .eq("products.is_visible", true)
    .maybeSingle();
  if (error) throw new Error(`image lookup failed: ${error.message}`);
  const b64 = (data as Record<string, string> | null)?.[column];
  return b64 ? Buffer.from(b64, "base64") : null;
}
