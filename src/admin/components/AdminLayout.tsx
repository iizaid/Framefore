import type { ReactNode } from "react";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminTopbar } from "@/admin/components/AdminTopbar";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#111111]">
      <div className="lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminTopbar />
          <main className="min-h-[calc(100vh-96px)] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
