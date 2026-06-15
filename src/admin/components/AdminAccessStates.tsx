import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

type AdminAccessStateProps = {
  message?: string;
};

function AdminAccessShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f5] px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#e6e4de] bg-white p-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {children}
      </div>
    </div>
  );
}

export function AdminAccessLoading() {
  return (
    <AdminAccessShell>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f1f1ef] text-[#333333]">
        <Loader2 size={18} className="animate-spin" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#111111]">Checking admin access</h1>
      <p className="mt-2 text-sm text-[#6b6b66]">Please wait while your session is verified.</p>
    </AdminAccessShell>
  );
}

export function AdminForbidden() {
  return (
    <AdminAccessShell>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f1f1ef] text-[#333333]">
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
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#f1f1ef] text-[#333333]">
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
