import { requireAdminApi } from "@/lib/server/admin-auth";
import { setCategoryCover, setHeroImage } from "@/lib/server/admin/site";

// Uploads one home-page hero photo (kind=hero, position 0–4) or a category photo
// (kind=category, categoryId). One photo per request, resized in the browser first.
export async function POST(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth instanceof Response) return auth;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Upload a photo" }, { status: 400 });

  try {
    const kind = form!.get("kind");
    if (kind === "hero") {
      return Response.json(await setHeroImage(Number(form!.get("position")), file), { status: 201 });
    }
    if (kind === "category") {
      const id = Number(form!.get("categoryId"));
      if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "Invalid category" }, { status: 400 });
      return Response.json(await setCategoryCover(id, file), { status: 201 });
    }
    return Response.json({ error: "Unknown image type" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 422 });
  }
}
