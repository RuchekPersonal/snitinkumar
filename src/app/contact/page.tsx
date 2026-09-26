import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ContentPage } from "@/components/content-page";
import { WhatsAppIcon } from "@/components/icons";
import { site } from "@/lib/site";
import { generalEnquiryText, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  description: `WhatsApp ${site.helplineDisplay} · ${site.hours}.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <ContentPage eyebrow="Contact" title="Talk to us on WhatsApp">
      <p>The fastest way to reach us is WhatsApp. We reply within business hours ({site.hours}).</p>
      <a
        href={waLink(generalEnquiryText)}
        className="inline-flex h-12 items-center gap-2 rounded-md bg-whatsapp px-6 font-semibold text-white"
      >
        <WhatsAppIcon /> Chat on WhatsApp
      </a>
      <h2>Details</h2>
      <ul>
        <li>
          Phone / WhatsApp:{" "}
          <a href={`tel:${site.helplineTel}`} className="font-semibold text-maroon">
            {site.helplineDisplay}
          </a>
        </li>
        <li>
          Email:{" "}
          <a href={`mailto:${site.email}`} className="font-semibold text-maroon">
            {site.email}
          </a>
        </li>
        <li>Address: {site.address}</li>
      </ul>
    </ContentPage>
  );
}
