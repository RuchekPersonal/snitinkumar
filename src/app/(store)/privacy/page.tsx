import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ContentPage } from "@/components/content-page";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Privacy",
  description: "How S. Nitinkumar uses the details you share with us.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="Privacy" title="How we use your details">
      <ul>
        <li>
          We collect only what you give us: shop name, your name, city, mobile number and, optionally, GSTIN and
          address.
        </li>
        <li>We use these details only to reply to your enquiries and to approve your trade account.</li>
        <li>Your enquiry list is stored on your own device until you send it.</li>
        <li>We do not sell or share your details with anyone.</li>
        <li>To see or delete your details, message us on WhatsApp or email {site.email}.</li>
      </ul>
    </ContentPage>
  );
}
