import type { Metadata } from "next";
import { getHomeAdmin } from "@/lib/server/admin/site";
import { PageHeader } from "@/components/admin/ui";
import { HomeEditor } from "./home-editor";

export const metadata: Metadata = { title: "Home page" };

export default async function HomeAdminPage() {
  const { hero, customised, slots } = await getHomeAdmin();
  return (
    <>
      <PageHeader
        title="Home page"
        subtitle="The top section of the storefront. Changes go live as soon as you save. Category photos are set under Categories."
      />
      <HomeEditor initial={hero} customised={customised} slots={slots} />
    </>
  );
}
