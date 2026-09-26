/* eslint-disable @next/next/no-img-element -- images are served pre-sized by /api/img */
import type { Metadata } from "next";
import Link from "next/link";
import { getLookups, listAdminProducts } from "@/lib/server/admin/products";
import { rupees } from "@/lib/format";
import { btnPrimary, btnSecondary, Card, Empty, input, PageHeader, Tabs } from "@/components/admin/ui";
import { VisibilityToggle } from "./visibility-toggle";
import { ImportCsv } from "./import-csv";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q).slice(0, 60);
  const category = one(sp.category);
  const show = one(sp.show);
  const [{ items, total, hidden }, lookups] = await Promise.all([
    listAdminProducts({ q, category, show }),
    getLookups(),
  ]);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(category && { category }), ...(show && { show }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${total} designs · ${hidden} hidden from store`}
        actions={
          <>
            <ImportCsv />
            {}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV file download */}
            <a href="/api/admin/export/products" className={btnSecondary}>
              Export
            </a>
            <Link href="/admin/products/new" className={btnPrimary}>
              + Add product
            </Link>
          </>
        }
      />

      <Tabs
        tabs={[
          { href: qs({ show: "" }), label: "All", active: !show },
          { href: qs({ show: "visible" }), label: "Visible", active: show === "visible" },
          { href: qs({ show: "hidden" }), label: "Hidden", active: show === "hidden" },
          { href: qs({ show: "low" }), label: "Low stock", active: show === "low" },
          { href: qs({ show: "nophoto" }), label: "No photo", active: show === "nophoto" },
        ]}
      />

      <Card>
        <form className="flex flex-wrap gap-2 border-b border-line p-4" role="search">
          {show && <input type="hidden" name="show" value={show} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search code, name or fabric"
            className={`${input} max-w-xs flex-1`}
          />
          <select name="category" defaultValue={category} className={`${input} w-auto`} aria-label="Category">
            <option value="">All categories</option>
            {lookups.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button className={btnSecondary}>Filter</button>
        </form>

        {items.length === 0 ? (
          <Empty>No designs match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[14px]">
              <thead className="bg-cream/60 text-left">
                <tr className="eyebrow text-[10px] text-muted">
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-3 py-3 font-semibold">Design</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Fabric</th>
                  <th className="px-3 py-3 text-right font-semibold">Rate</th>
                  <th className="px-3 py-3 text-right font-semibold">MOQ</th>
                  <th className="px-3 py-3 text-right font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Visible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-cream/50">
                    <td className="px-5 py-2.5 font-bold">
                      <Link href={`/admin/products/${p.code}`} className="hover:text-maroon">
                        {p.code}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/products/${p.code}`} className="flex items-center gap-3">
                        {p.coverImageId ? (
                          <img
                            src={`/api/img/${p.coverImageId}/thumb.webp`}
                            alt=""
                            width={36}
                            height={48}
                            className="h-12 w-9 shrink-0 rounded bg-sand object-cover"
                          />
                        ) : (
                          <span className="grid h-12 w-9 shrink-0 place-items-center rounded bg-sand text-[9px] text-muted">
                            No photo
                          </span>
                        )}
                        <span className="line-clamp-2 max-w-64 font-medium">
                          {p.name}
                          {p.isNew && (
                            <span className="ml-1.5 rounded-sm bg-gold px-1 py-0.5 align-middle text-[9px] font-bold text-ink">
                              NEW
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{p.categoryName}</td>
                    <td className="px-3 py-2.5 text-muted">{p.fabric}</td>
                    <td className="px-3 py-2.5 text-right">{rupees(p.ratePaise)}</td>
                    <td className="px-3 py-2.5 text-right">{p.moq}</td>
                    <td className={`px-3 py-2.5 text-right ${p.lowStock ? "font-semibold text-maroon" : ""}`}>
                      {p.stockPcs}
                      {p.lowStock && <span className="font-normal"> · low</span>}
                    </td>
                    <td className="px-5 py-2.5">
                      <VisibilityToggle id={p.id} visible={p.isVisible} code={p.code} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
