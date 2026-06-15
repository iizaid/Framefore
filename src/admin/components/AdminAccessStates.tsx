import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";

type AdminAccessStateProps = {
  message?: string;
};

function AdminAccessShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-6 py-10">
      <div className="w-full max-w-md text-center">
        {children}
      </div>
    </div>
  );
}

export function AdminAccessLoading() {
  // Reuse the same branded video loading screen that appears on first site load.
  // ready={false} keeps it visible until AdminGuard replaces this component.
  // forceActive={true} ensures it shows even if the boot sequence was already seen.
  return <AppLoadingScreen ready={false} forceActive={true} />;
}

export function AdminForbidden() {
  return (
    <AdminAccessShell>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#f1f1ef] text-[#333333]">
        <ShieldAlert size={18} />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#111111]">Access denied</h1>
      <p className="mt-2 text-sm text-[#6b6b66]">You do not have access to the admin console.</p>
      <div className="mt-5 flex justify-center gap-3">
        <Link
          to="/app"
          className="inline-flex items-center justify-center rounded-lg bg-[#111111] px-3 py-2 text-sm font-medium text-white hover:bg-black"
        >
          Back to app
        </Link>
        <Link
          to="/profile"
          className="inline-flex items-center justify-center rounded-lg border border-[#dedbd3] px-3 py-2 text-sm font-medium text-[#333333] hover:bg-[#f7f7f5]"
        >
          Profile
        </Link>
      </div>
    </AdminAccessShell>
  );
}

export function AdminUnavailable({ message = "Admin access is temporarily unavailable." }: AdminAccessStateProps) {
  return (
    <AdminAccessShell>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[#f1f1ef] text-[#333333]">
        <AlertTriangle size={18} />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#111111]">Admin unavailable</h1>
      <p className="mt-2 text-sm text-[#6b6b66]">{message}</p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#dedbd3] px-3 py-2 text-sm font-medium text-[#333333] hover:bg-[#f7f7f5]"
      >
        <ArrowLeft size={15} />
        Back to home
      </Link>
    </AdminAccessShell>
  );
}
