import { z } from "zod";
import { getViewer } from "@/lib/server/session";
import { createEnquiry } from "@/lib/server/enquiries";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { siteUrl } from "@/lib/site";

const Body = z.object({
  lines: z
    .array(z.object({ code: z.string().regex(/^SN-\d{3,6}$/i), qty: z.number().int().min(1).max(10000) }))
    .min(1)
    .max(100),
  note: z.string().trim().max(500).default(""),
  contact: z
    .object({
      name: z.string().trim().max(80).optional(),
      shop: z.string().trim().max(120).optional(),
      city: z.string().trim().max(80).optional(),
    })
    .default({}),
});

export async function POST(req: Request) {
  if (!rateLimit(`enq:${clientIp(req)}`, 10, 10 * 60_000)) {
    return Response.json({ error: "Too many enquiries. Please try again in a few minutes." }, { status: 429 });
  }

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "Invalid enquiry" }, { status: 400 });

  const viewer = await getViewer();
  let result;
  try {
    result = await createEnquiry(parsed.data.lines, parsed.data.note, parsed.data.contact, viewer, siteUrl().origin);
  } catch (err) {
    console.error("[enquiries]", err);
    // The client falls back to opening WhatsApp without a reference, so the retailer is never stuck.
    return Response.json({ error: "Could not save the enquiry." }, { status: 503 });
  }
  if ("error" in result) return Response.json({ error: result.error }, { status: 422 });
  return Response.json(result, { status: 201 });
}
