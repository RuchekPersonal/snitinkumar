import { requireAdminApi } from "@/lib/server/admin-auth";
import { exportProductRows } from "@/lib/server/admin/products";
import { exportEnquiryRows } from "@/lib/server/admin/enquiries";
import { exportCustomerRows } from "@/lib/server/admin/customers";
import { csvResponse, istDate, toCsv } from "@/lib/server/admin/util";

export async function GET(req: Request, ctx: RouteContext<"/api/admin/export/[kind]">) {
  const auth = await requireAdminApi(req);
  if (auth instanceof Response) return auth;

  const { kind } = await ctx.params;
  const stamp = istDate();

  if (kind === "products") return csvResponse(`products-${stamp}.csv`, toCsv(await exportProductRows()));
  if (kind === "customers") return csvResponse(`retailers-${stamp}.csv`, toCsv(await exportCustomerRows()));
  if (kind === "enquiries") {
    const month = new URL(req.url).searchParams.get("month") ?? stamp.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "month must be YYYY-MM" }, { status: 400 });
    return csvResponse(`enquiries-${month}.csv`, toCsv(await exportEnquiryRows(month)));
  }
  return new Response("Not found", { status: 404 });
}
