import type { ReactNode } from "react";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminTopbar } from "@/admin/components/AdminTopbar";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <div className="lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminTopbar />
          <main className="dot-canvas min-h-[calc(100vh-96px)] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
