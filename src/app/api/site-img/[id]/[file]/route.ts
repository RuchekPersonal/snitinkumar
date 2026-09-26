import { getSiteImage } from "@/lib/server/site-content";

const FILE_RE = /^(full|thumb)\.webp$|^(og)\.jpg$/;

// Home-page hero and category photos. Ids change whenever a photo is replaced, so
// responses can be cached forever.
export async function GET(_req: Request, ctx: RouteContext<"/api/site-img/[id]/[file]">) {
  const { id, file } = await ctx.params;
  const m = file.match(FILE_RE);
  if (!m) return new Response("Not found", { status: 404 });
  const variant = (m[1] ?? m[2]) as "full" | "thumb" | "og";

  const bytes = await getSiteImage(id, variant);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": variant === "og" ? "image/jpeg" : "image/webp",
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
