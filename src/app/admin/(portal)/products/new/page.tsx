import type { Metadata } from "next";
import Link from "next/link";
import { getLookups, MAX_PHOTOS, suggestNextCode } from "@/lib/server/admin/products";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const [lookups, code] = await Promise.all([getLookups(), suggestNextCode()]);
  return (
    <>
      <PageHeader
        title="Add product"
        subtitle={
          <>
            <Link href="/admin/products" className="hover:text-maroon">
              Products
            </Link>{" "}
            / New
          </>
        }
      />
      <ProductForm
        lookups={lookups}
        images={[]}
        maxPhotos={MAX_PHOTOS}
        initial={{
          code,
          name: "",
          categoryId: "",
          fabricId: "",
          colourId: "",
          description: "",
          work: "",
          lengthIn: "",
          setIncludes: "",
          washCare: "",
          rate: "",
          mrp: "",
          moq: "3",
          stock: "0",
          sizeIds: [],
          colourIds: [],
          markNew: true,
          trending: false,
          visible: false,
        }}
      />
    </>
  );
}
