import { type ReactNode, useState } from "react";
import { AdminSidebar } from "@/admin/components/AdminSidebar";
import { AdminTopbar } from "@/admin/components/AdminTopbar";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#111111]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar
          open={sidebarOpen}
          collapsed={collapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />

        {/* Main area */}
        <div className="min-w-0 flex-1 transition-all duration-300">
          <AdminTopbar onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="min-h-[calc(100vh-60px)] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
