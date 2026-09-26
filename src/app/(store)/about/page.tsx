import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Our Manufacturing",
  description: `${site.name} designs, cuts, stitches and finishes every kurti in-house for consistent sizing and repeatable quality.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <ContentPage eyebrow="About us" title="Made in our own unit, sold direct to your shop">
      <p>
        {site.name} is a manufacturer and wholesaler of women&apos;s ethnic wear — kurtis, kurti with pant and dupatta
        sets, and 3-piece suits. We supply retailers and boutiques across India.
      </p>
      <h2>Why retailers buy from us</h2>
      <ul>
        <li>Own manufacturing: cutting, stitching and finishing in-house, with no middlemen.</li>
        <li>Consistent sizing, so repeat orders match the first lot.</li>
        <li>Fabric pre-checked for shrinkage and colour fastness.</li>
        <li>Fresh designs every fortnight.</li>
      </ul>
    </ContentPage>
  );
}
