import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Loader2,
  Mail,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { validateNickname, normalizeNickname } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button, Input, Textarea } from "@/components/ui/primitives";
import { AvatarCircle, deriveInitials } from "@/components/account/AccountMenu";
import { AvatarCropDialog } from "@/components/account/AvatarCropDialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const PROVIDER_LABELS: Record<string, string> = {
  email: "Email",
  google: "Google",
  github: "GitHub",
};

// Two independent edit groups, each with its own dirty-tracking and Save button.
interface PersonalForm {
  full_name: string;
  nickname: string;
  bio: string;
}
interface ContactForm {
  phone_number: string;
  country: string;
  city: string;
  timezone: string;
}

const EMPTY_PERSONAL: PersonalForm = { full_name: "", nickname: "", bio: "" };
const EMPTY_CONTACT: ContactForm = { phone_number: "", country: "", city: "", timezone: "" };

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.initialized);
  const signOut = useAuthStore((s) => s.signOut);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const {
    profile,
    avatarUrl,
    loading,
    saving,
    uploading,
    error,
    loadProfile,
    saveProfile,
    uploadAvatar,
    removeAvatar,
    clearError,
  } = useProfileStore();

  const [personal, setPersonal] = useState<PersonalForm>(EMPTY_PERSONAL);
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Auth gate — wait for init so a refresh doesn't bounce a signed-in user.
  useEffect(() => {
    if (authInitialized && isSupabaseConfigured && !user) {
      navigate("/login", { replace: true });
    }
  }, [authInitialized, user, navigate]);

  // Load once; the store dedupes concurrent callers (AccountMenu may also ask).
  useEffect(() => {
    if (user && !profile) void loadProfile();
  }, [user, profile, loadProfile]);

  // Hydrate both forms when a fresh profile lands.
  useEffect(() => {
    if (!profile) return;
    setPersonal({
      full_name: profile.full_name ?? "",
      nickname: profile.nickname ?? "",
      bio: profile.bio ?? "",
    });
    setContact({
      phone_number: profile.phone_number ?? "",
      country: profile.country ?? "",
      city: profile.city ?? "",
      timezone: profile.timezone ?? "",
    });
  }, [profile]);

  const setPersonalField = (key: keyof PersonalForm) => (value: string) => {
    setPersonal((f) => ({ ...f, [key]: value }));
    if (formError) setFormError(null);
    if (error) clearError();
  };
  const setContactField = (key: keyof ContactForm) => (value: string) => {
    setContact((f) => ({ ...f, [key]: value }));
    if (error) clearError();
  };

  const personalDirty = useMemo(() => {
    if (!profile) return false;
    return (
      personal.full_name !== (profile.full_name ?? "") ||
      personal.nickname !== (profile.nickname ?? "") ||
      personal.bio !== (profile.bio ?? "")
    );
  }, [personal, profile]);

  const contactDirty = useMemo(() => {
    if (!profile) return false;
    return (
      contact.phone_number !== (profile.phone_number ?? "") ||
      contact.country !== (profile.country ?? "") ||
      contact.city !== (profile.city ?? "") ||
      contact.timezone !== (profile.timezone ?? "")
    );
  }, [contact, profile]);

  const providers: string[] = useMemo(() => {
    const meta = user?.app_metadata as { providers?: string[]; provider?: string } | undefined;
    if (meta?.providers?.length) return meta.providers;
    if (meta?.provider) return [meta.provider];
    return [];
  }, [user]);

  const emailConfirmed = Boolean(user?.email_confirmed_at);
  const initials = useMemo(() => deriveInitials(profile?.full_name, user?.email), [profile?.full_name, user?.email]);

  // ── Submit handlers ───────────────────────────────────────────────────────
  const savePersonal = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedNick = normalizeNickname(personal.nickname);
    if (trimmedNick) {
      const nickErr = validateNickname(trimmedNick);
      if (nickErr) return setFormError(nickErr);
    }
    if (personal.bio.length > 500) return setFormError("Bio must be 500 characters or fewer.");
    const { error: saveError } = await saveProfile(personal);
    if (!saveError) toast("Profile saved");
  };

  const saveContact = async (e: FormEvent) => {
    e.preventDefault();
    const { error: saveError } = await saveProfile(contact);
    if (!saveError) toast("Contact details saved");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetting(true);
    const { error: resetError } = await requestPasswordReset(user.email);
    setResetting(false);
    if (resetError) toast(resetError, "error");
    else toast("Password reset email sent.");
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!isSupabaseConfigured) return <UnavailableState />;
  if (!authInitialized || !user) return <PageChrome><ProfileHeader /><CardsSkeleton /></PageChrome>;

  return (
    <PageChrome>
      <ProfileHeader />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && !profile ? (
        <CardsSkeleton />
      ) : (
        <div className="flex flex-col gap-5">
          {/* ── Avatar and identity ── */}
          <Card title="Avatar and identity">
            <form onSubmit={savePersonal} className="flex flex-col gap-5" noValidate>
              <AvatarRow
                url={avatarUrl}
                initials={initials}
                uploading={uploading}
                hasUploaded={Boolean(profile?.avatar_path)}
                onUpload={async (file) => {
                  const { error: upErr } = await uploadAvatar(file);
                  if (!upErr) toast("Avatar updated");
                  return { error: upErr };
                }}
                onRemove={async () => {
                  const { error: rmErr } = await removeAvatar();
                  if (!rmErr) toast("Avatar removed");
                }}
              />

              <Divider />

              <FieldRow>
                <LabeledInput label="Full name" value={personal.full_name} onChange={setPersonalField("full_name")} placeholder="Jane Director" maxLength={160} />
                <LabeledInput label="Nickname" hint="3–30 · a-z 0-9 _ -" value={personal.nickname} onChange={setPersonalField("nickname")} placeholder="janedirector" maxLength={30} />
              </FieldRow>

              <label className="flex flex-col gap-1.5">
                <FieldLabel label="Bio" hint={`${personal.bio.length}/500`} />
                <Textarea value={personal.bio} onChange={(e) => setPersonalField("bio")(e.target.value)} placeholder="A short line about your work…" maxLength={500} dir="auto" />
              </label>

              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <SaveBar dirty={personalDirty} saving={saving} onDiscard={() => profile && setPersonal({ full_name: profile.full_name ?? "", nickname: profile.nickname ?? "", bio: profile.bio ?? "" })} />
            </form>
          </Card>

          {/* ── Contact ── */}
          <Card title="Contact and location">
            <form onSubmit={saveContact} className="flex flex-col gap-5" noValidate>
              <label className="flex flex-col gap-1.5">
                <FieldLabel label="Email" />
                <div className="flex items-center gap-2 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink-soft)]">
                  <Mail size={15} className="shrink-0" />
                  <span className="truncate">{user.email ?? "—"}</span>
                  {emailConfirmed && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 size={13} /> Verified
                    </span>
                  )}
                </div>
              </label>

              <FieldRow>
                <LabeledInput label="Phone number" hint="Optional" value={contact.phone_number} onChange={setContactField("phone_number")} placeholder="+1 555 123 4567" maxLength={32} type="tel" />
                <LabeledInput label="Timezone" value={contact.timezone} onChange={setContactField("timezone")} placeholder="Europe/Amsterdam" maxLength={80} />
              </FieldRow>
              <FieldRow>
                <LabeledInput label="Country" value={contact.country} onChange={setContactField("country")} placeholder="Netherlands" maxLength={80} />
                <LabeledInput label="City" value={contact.city} onChange={setContactField("city")} placeholder="Amsterdam" maxLength={100} />
              </FieldRow>

              <SaveBar dirty={contactDirty} saving={saving} onDiscard={() => profile && setContact({ phone_number: profile.phone_number ?? "", country: profile.country ?? "", city: profile.city ?? "", timezone: profile.timezone ?? "" })} />
            </form>
          </Card>

          {/* ── Security ── */}
          <Card title="Sign-in and security">
            <div className="flex flex-col divide-y divide-[var(--color-border-strong)]">
              <Row
                icon={<KeyRound size={16} />}
                title="Password"
                description={user.email ? "Send a reset link to your email to set a new password." : "No email is associated with this account."}
                action={user.email ? (
                  <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={resetting}>
                    {resetting ? <Loader2 size={14} className="animate-spin" /> : "Send reset email"}
                  </Button>
                ) : null}
              />
              <Row
                icon={<ShieldCheck size={16} />}
                title="Sign-in providers"
                description={providers.length ? `Connected: ${providers.map((p) => PROVIDER_LABELS[p] ?? p).join(", ")}.` : "Email and password."}
              />
              {/* Static note — 2FA arrives in a dedicated security phase. Not a control. */}
              <Row icon={<ShieldCheck size={16} />} title="Two-factor authentication" description="Two-factor authentication will be added in a dedicated security phase." muted />
              <Row
                icon={<ArrowLeft size={16} />}
                title="Sign out"
                description="Sign out on this device. Local projects stay on this device."
                action={
                  <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/", { replace: true }); }}>
                    Sign out
                  </Button>
                }
              />
            </div>
          </Card>
        </div>
      )}
    </PageChrome>
  );
}

// ── Layout chrome ─────────────────────────────────────────────────────────────

function PageChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border-strong)] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link to="/app" className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]">
            <ArrowLeft size={16} /> Back to app
          </Link>
          <Link to="/" title="Framefore home">
            <img src="/black.svg" alt="Framefore" className="h-6 w-6" />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

function ProfileHeader() {
  return (
    <header className="mb-8">
      <h1 className="font-display text-2xl font-semibold text-[var(--ff-ink)]">Profile settings</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        Manage your personal details, avatar, contact information, and sign-in options.
      </p>
    </header>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border-strong)] bg-white p-5 sm:p-6">
      <h2 className="mb-4 font-display text-base text-[var(--ff-ink)]">{title}</h2>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="h-px bg-[var(--color-border-strong)]" />;
}

function AvatarRow({
  url,
  initials,
  uploading,
  hasUploaded,
  onUpload,
  onRemove,
}: {
  url: string | null;
  initials: string;
  uploading: boolean;
  hasUploaded: boolean;
  onUpload: (file: File) => Promise<{ error: string | null }>;
  onRemove: () => void;
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const handleCropSave = async (croppedFile: File) => {
    setLocalError(null);
    const result = await onUpload(croppedFile);
    if (result?.error) {
      setLocalError(result.error);
      return result;
    }
    return { error: null };
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="relative">
          <AvatarCircle url={url} initials={initials} size={48} />
          {uploading && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
              <Loader2 size={16} className="animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-ink)]">Avatar</p>
          <p className="text-xs text-[var(--color-ink-faint)]">PNG, JPEG, WebP or GIF · up to 2 MB.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setCropOpen(true)} disabled={uploading}>
            <Camera size={14} /> Change
          </Button>
          {hasUploaded && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={uploading} aria-label="Remove avatar">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
      {localError && <p className="text-sm text-red-600">{localError}</p>}

      {cropOpen && <AvatarCropDialog onClose={() => setCropOpen(false)} onSave={handleCropSave} />}
    </div>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>;
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="flex items-center justify-between text-xs font-medium text-[var(--color-ink-soft)]">
      {label}
      {hint && <span className="font-normal text-[var(--color-ink-faint)]">{hint}</span>}
    </span>
  );
}

function LabeledInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <FieldLabel label={label} hint={hint} />
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} dir="auto" />
    </label>
  );
}

function SaveBar({ dirty, saving, onDiscard }: { dirty: boolean; saving: boolean; onDiscard: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-strong)] pt-4">
      {dirty && (
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
          Discard
        </Button>
      )}
      <Button type="submit" variant="primary" size="sm" disabled={!dirty || saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : "Save changes"}
      </Button>
    </div>
  );
}

function Row({
  icon,
  title,
  description,
  action,
  muted,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]", muted && "opacity-60")}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium text-[var(--color-ink)]", muted && "text-[var(--color-ink-soft)]")}>{title}</p>
        <p className="text-sm text-[var(--color-ink-soft)]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-[var(--color-border-strong)] bg-white p-6">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-[var(--color-surface-2)]" />
          <div className="flex flex-col gap-4">
            <div className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
            <div className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-[var(--ff-ink)]">Account unavailable</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Profile and account features are temporarily unavailable. You can keep using Framefore locally in the meantime.
        </p>
        <Link to="/app" className="mt-6 inline-block">
          <Button variant="primary" size="md">
            <ArrowLeft size={16} /> Back to app
          </Button>
        </Link>
      </div>
    </div>
  );
}
