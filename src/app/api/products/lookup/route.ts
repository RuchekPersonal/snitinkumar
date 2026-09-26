import { z } from "zod";
import { getViewer } from "@/lib/server/session";
import { getProductsByCodes } from "@/lib/server/catalog";

// Used by the enquiry list to refresh product details. Rates are included only for
// viewers allowed to see them (the repository strips them otherwise).
const Body = z.object({ codes: z.array(z.string().regex(/^SN-\d{3,6}$/i)).max(100) });

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const viewer = await getViewer();
  const items = await getProductsByCodes(parsed.data.codes, viewer);
  return Response.json({ items, role: viewer.role }, { headers: { "Cache-Control": "private, no-store" } });
}
