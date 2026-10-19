import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin-auth";
import { listAdminUsers } from "@/lib/server/admin/users";
import { timeAgo } from "@/lib/server/admin/util";
import { Card, PageHeader } from "@/components/admin/ui";
import { AddAdminUser } from "./add-admin-user";

export const metadata: Metadata = { title: "Admin users" };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

export default async function AdminUsersPage() {
  const [me, users] = await Promise.all([requireAdmin(), listAdminUsers()]);
  return (
    <>
      <PageHeader
        title="Admin users"
        subtitle={`${users.length} ${users.length === 1 ? "person" : "people"} can log in to this admin portal`}
        actions={<AddAdminUser />}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[14px]">
            <thead className="bg-cream/60 text-left">
              <tr className="eyebrow text-[10px] text-muted">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Last login</th>
                <th className="px-5 py-3 font-semibold">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 font-semibold">
                    {u.name}
                    {u.id === me.id && <span className="ml-2 text-[12px] font-normal text-muted">(you)</span>}
                  </td>
                  <td className="px-3 py-3">{u.email}</td>
                  <td className="px-3 py-3 text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                  <td className="px-5 py-3 text-muted">{date(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
