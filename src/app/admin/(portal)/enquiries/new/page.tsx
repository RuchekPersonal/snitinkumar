import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin-auth";
import { Card, PageHeader } from "@/components/admin/ui";
import { ManualEnquiryForm } from "./manual-form";

export const metadata: Metadata = { title: "New enquiry" };

export default async function NewEnquiryPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader
        title="Record a WhatsApp enquiry"
        subtitle={
          <>
            <Link href="/admin/enquiries" className="hover:text-maroon">
              Enquiries
            </Link>{" "}
            / New — for orders that came straight to WhatsApp or by phone
          </>
        }
      />
      <Card className="max-w-2xl">
        <div className="p-5">
          <ManualEnquiryForm />
        </div>
      </Card>
    </>
  );
}
