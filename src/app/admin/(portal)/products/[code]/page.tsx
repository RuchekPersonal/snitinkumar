import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct, getLookups, MAX_PHOTOS } from "@/lib/server/admin/products";
import { istDate } from "@/lib/server/admin/util";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../product-form";

export async function generateMetadata({ params }: PageProps<"/admin/products/[code]">): Promise<Metadata> {
  return { title: `Edit ${(await params).code}` };
}

export default async function EditProductPage({ params }: PageProps<"/admin/products/[code]">) {
  const { code } = await params;
  const [product, lookups] = await Promise.all([getAdminProduct(code), getLookups()]);
  if (!product) notFound();

  const str = (n: number | null) => (n === null ? "" : String(n));
  return (
    <>
      <PageHeader
        title={`${product.code} · ${product.name}`}
        subtitle={
          <>
            <Link href="/admin/products" className="hover:text-maroon">
              Products
            </Link>{" "}
            / Edit
          </>
        }
      />
      <ProductForm
        key={product.updated_at}
        lookups={lookups}
        productId={product.id}
        images={product.images}
        maxPhotos={MAX_PHOTOS}
        initial={{
          code: product.code,
          name: product.name,
          categoryId: String(product.category_id),
          fabricId: String(product.fabric_id),
          colourId: String(product.colour_id),
          description: product.description,
          work: product.work,
          lengthIn: str(product.length_in),
          setIncludes: product.set_includes,
          washCare: product.wash_care,
          rate: String(product.rate_paise / 100),
          mrp: product.mrp_paise === null ? "" : String(product.mrp_paise / 100),
          moq: String(product.moq),
          stock: String(product.stock_pcs),
          sizeIds: product.sizeIds,
          colourIds: product.colourIds,
          markNew: !!product.new_until && product.new_until >= istDate(),
          trending: product.is_trending,
          visible: product.is_visible,
        }}
      />
    </>
  );
}
