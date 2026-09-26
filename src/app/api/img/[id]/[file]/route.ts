import { getImage, VARIANTS, type Variant } from "@/lib/server/images";

const ID_RE = /^[a-z0-9-]{3,64}$/;
const FILE_RE = /^(thumb|card|full|og)\.(webp|jpg)$/;

export async function GET(_req: Request, ctx: RouteContext<"/api/img/[id]/[file]">) {
  const { id, file } = await ctx.params;
  const m = file.match(FILE_RE);
  if (!ID_RE.test(id) || !m) return new Response("Not found", { status: 404 });

  const variant = m[1] as Variant;
  const format = VARIANTS[variant].format;
  if ((format === "jpeg") !== (m[2] === "jpg")) return new Response("Not found", { status: 404 });

  const bytes = await getImage(id, variant);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": format === "jpeg" ? "image/jpeg" : "image/webp",
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
