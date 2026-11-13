import type { Metadata } from "next";
import { requireOwner } from "@/lib/server/admin-auth";
import { listAdminUsers } from "@/lib/server/admin/users";
import { timeAgo } from "@/lib/server/admin/util";
import { Card, PageHeader } from "@/components/admin/ui";
import { AddAdminUser } from "./add-admin-user";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Admin users" };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

export default async function AdminUsersPage() {
  const me = await requireOwner();
  const users = await listAdminUsers();
  const owners = users.filter((u) => u.role === "owner").length;
  return (
    <>
      <PageHeader
        title="Admin users"
        subtitle={`${owners} ${owners === 1 ? "owner" : "owners"} · ${users.length - owners} staff · staff can do everything except manage admin users`}
        actions={<AddAdminUser />}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead className="bg-cream/60 text-left">
              <tr className="eyebrow text-[10px] text-muted">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Last login</th>
                <th className="px-3 py-3 font-semibold">Added</th>
                <th className="px-5 py-3" />
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
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${
                        u.role === "owner" ? "bg-maroon-50 text-maroon" : "bg-chip text-chip-ink"
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.locked && (
                      <span className="ml-1.5 text-[12px] text-maroon" title="Too many wrong passwords">
                        Locked
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}</td>
                  <td className="px-3 py-3 text-muted">{date(u.createdAt)}</td>
                  <td className="px-5 py-3">
                    {u.id !== me.id && <UserActions id={u.id} name={u.name} role={u.role} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
