import type { Metadata } from "next";
import { getCategoriesPage } from "@/lib/server/admin/categories";
import { Card, PageHeader } from "@/components/admin/ui";
import { CategoryList } from "./category-list";
import { AttributeList } from "./attribute-list";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const data = await getCategoriesPage();
  return (
    <>
      <PageHeader
        title="Categories & attributes"
        subtitle="Use the arrows to set the order they appear in the storefront filters"
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card
          title="Product categories"
          action={
            <span className="text-[13px] text-muted">{data.categories.filter((c) => c.is_visible).length} active</span>
          }
        >
          <CategoryList categories={data.categories} />
        </Card>
        <div className="space-y-5">
          <Card title="Fabrics">
            <AttributeList
              table="fabrics"
              items={data.fabrics.map((f) => ({ id: f.id, text: f.name, uses: f.uses }))}
            />
          </Card>
          <Card title="Colours">
            <AttributeList
              table="colours"
              items={data.colours.map((c) => ({ id: c.id, text: c.name, uses: c.uses, hex: c.hex }))}
            />
          </Card>
          <Card title="Sizes">
            <AttributeList table="sizes" items={data.sizes.map((s) => ({ id: s.id, text: s.label, uses: s.uses }))} />
          </Card>
        </div>
      </div>
    </>
  );
}
