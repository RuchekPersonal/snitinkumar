import { Suspense } from "react";
import { demoRolesEnabled, getViewer } from "@/lib/server/session";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DemoRoleBar } from "@/components/layout/demo-role-bar";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const accountHref = viewer.role === "guest" ? "/login" : "/account";

  return (
    <div className="flex min-h-dvh flex-col pb-safe-nav">
      {demoRolesEnabled() && (
        <Suspense>
          <DemoRoleBar role={viewer.role} />
        </Suspense>
      )}
      <Header viewer={viewer} />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav accountHref={accountHref} />
    </div>
  );
}
