import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin-auth";
import { Card, PageHeader } from "@/components/admin/ui";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AdminAccountPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title="Account" subtitle={`${admin.name} · ${admin.email} · ${admin.role}`} />
      <Card title="Change password" className="max-w-lg">
        <div className="p-5">
          <PasswordForm />
        </div>
      </Card>
    </>
  );
}
