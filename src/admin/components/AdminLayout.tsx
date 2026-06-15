import type { ReactNode } from "react";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminTopbar } from "@/admin/components/AdminTopbar";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f1f1ef] text-[#111111]">
      <div className="lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <AdminTopbar />
          <main className="min-h-[calc(100vh-57px)] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
            <div className="w-full">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
