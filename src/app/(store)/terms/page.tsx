import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Wholesale Terms — Minimum Order & Enquiries",
  description: "Minimum order quantities, how enquiries are confirmed, dispatch and defect replacement.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <ContentPage eyebrow="Wholesale terms" title="Minimum order & how enquiries work">
      <p>{site.name} supplies retailers and boutiques only. We do not sell single pieces to consumers.</p>
      <h2>Minimum order</h2>
      <ul>
        <li>
          Minimum 3 pieces per design (some daily-wear designs are 5 pieces). The minimum is shown on each design.
        </li>
        <li>A set is one piece of each available size. Single-size lots are available on request.</li>
      </ul>
      <h2>Enquiries, not online orders</h2>
      <ul>
        <li>Add designs to your enquiry list and send it to us on WhatsApp. No payment is taken on the website.</li>
        <li>We confirm the rate, stock and dispatch date on WhatsApp before anything is packed.</li>
        <li>Wholesale rates are visible to registered, approved retailers.</li>
      </ul>
      <h2>Dispatch</h2>
      <ul>
        <li>Confirmed orders are packed and dispatched within 48 hours.</li>
        <li>Surface or air across India; transport of your choice for bulk lots.</li>
      </ul>
      <h2>Defects</h2>
      <p>Manufacturing defects are replaced. Please share photos on WhatsApp within 7 days of receiving the parcel.</p>
    </ContentPage>
  );
}
