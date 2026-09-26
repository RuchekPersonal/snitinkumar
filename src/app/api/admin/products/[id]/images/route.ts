import { z } from "zod";
import { requireAdminApi } from "@/lib/server/admin-auth";
import { addProductImage } from "@/lib/server/admin/products";

// One photo per request keeps each upload well under Vercel's 4.5 MB body limit
// (the browser also resizes to ≤1600 px before sending).
export async function POST(req: Request, ctx: RouteContext<"/api/admin/products/[id]/images">) {
  const auth = await requireAdminApi(req);
  if (auth instanceof Response) return auth;

  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Invalid product" }, { status: 400 });

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return Response.json({ error: "Upload a photo" }, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json({ error: "Upload a photo" }, { status: 400 });

  try {
    const saved = await addProductImage(id, file);
    return Response.json(saved, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 422 });
  }
}
