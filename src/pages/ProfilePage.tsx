import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Trash2,
  Loader2,
  Mail,
  ShieldCheck,
  LogOut,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useProfileStore } from "@/store/useProfileStore";
import { validateAvatarFile, validateNickname, normalizeNickname } from "@/lib/profile";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button, Input, Textarea, Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Human-readable labels for the OAuth providers Supabase reports.
const PROVIDER_LABELS: Record<string, string> = {
  email: "Email",
  google: "Google",
  github: "GitHub",
};

// The editable form fields, kept as a flat object so dirty-tracking is a simple
// shallow compare against the loaded profile.
interface FormState {
  full_name: string;
  nickname: string;
  bio: string;
  phone_number: string;
  country: string;
  city: string;
  timezone: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  nickname: "",
  bio: "",
  phone_number: "",
  country: "",
  city: "",
  timezone: "",
};

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.initialized);
  const signOut = useAuthStore((s) => s.signOut);
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);

  const { profile, avatarUrl, loading, saving, uploading, error, loadProfile, saveProfile, uploadAvatar, removeAvatar, clearError } =
    useProfileStore();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // ── Auth gate ───────────────────────────────────────────────────────────
  // Wait for auth to initialise (so a refresh doesn't bounce a logged-in user),
  // then redirect anyone who isn't signed in.
  useEffect(() => {
    if (authInitialized && isSupabaseConfigured && !user) {
      navigate("/login", { replace: true });
    }
  }, [authInitialized, user, navigate]);

  // Load the profile once we have a user.
  useEffect(() => {
    if (user) void loadProfile();
  }, [user, loadProfile]);

  // Hydrate the form whenever a fresh profile lands.
  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      nickname: profile.nickname ?? "",
      bio: profile.bio ?? "",
      phone_number: profile.phone_number ?? "",
      country: profile.country ?? "",
      city: profile.city ?? "",
      timezone: profile.timezone ?? "",
    });
  }, [profile]);

  const setField = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (formError) setFormError(null);
    if (error) clearError();
  };

  // Dirty = any field differs from the loaded profile.
  const isDirty = useMemo(() => {
    if (!profile) return false;
    return (
      form.full_name !== (profile.full_name ?? "") ||
      form.nickname !== (profile.nickname ?? "") ||
      form.bio !== (profile.bio ?? "") ||
      form.phone_number !== (profile.phone_number ?? "") ||
      form.country !== (profile.country ?? "") ||
      form.city !== (profile.city ?? "") ||
      form.timezone !== (profile.timezone ?? "")
    );
  }, [form, profile]);

  const providers: string[] = useMemo(() => {
    const meta = user?.app_metadata as { providers?: string[]; provider?: string } | undefined;
    if (meta?.providers?.length) return meta.providers;
    if (meta?.provider) return [meta.provider];
    return [];
  }, [user]);

  const emailConfirmed = Boolean(user?.email_confirmed_at);
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Your account";
  const initials = useMemo(() => deriveInitials(profile?.full_name, user?.email), [profile?.full_name, user?.email]);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side validation before hitting the network.
    const trimmedNick = normalizeNickname(form.nickname);
    if (trimmedNick) {
      const nickErr = validateNickname(trimmedNick);
      if (nickErr) return setFormError(nickErr);
    }
    if (form.bio.length > 500) return setFormError("Bio must be 500 characters or fewer.");

    const { error: saveError } = await saveProfile({
      full_name: form.full_name,
      nickname: form.nickname,
      bio: form.bio,
      phone_number: form.phone_number,
      country: form.country,
      city: form.city,
      timezone: form.timezone,
    });
    if (saveError) return; // surfaced via store error banner
    toast("Profile saved");
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
  if (!isSupabaseConfigured) {
    return <UnavailableState />;
  }

  if (!authInitialized || (!user && isSupabaseConfigured)) {
    return <FullPageSpinner />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border-strong)] bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link to="/app" className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]">
            <ArrowLeft size={16} /> Back to app
          </Link>
          <Link to="/" className="flex items-center gap-2" title="Framefore home">
            <img src="/black.svg" alt="Framefore" className="h-7 w-7" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-12">
        {/* Identity header */}
        <div className="mb-8 flex items-center gap-4">
          <Avatar url={avatarUrl} initials={initials} size={64} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl text-[var(--color-charcoal)]">{displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="truncate text-sm text-[var(--color-ink-soft)]">{user?.email}</span>
              {providers.map((p) => (
                <Badge key={p} className="bg-[var(--color-stone-surface)] text-[var(--color-ink-soft)] ring-[var(--color-border-strong)]">
                  {PROVIDER_LABELS[p] ?? p}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Store-level error banner (DB/storage failures) */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !profile ? (
          <ProfileSkeleton />
        ) : (
          <div className="flex flex-col gap-6">
            {/* ── Section: Profile ──────────────────────────────────────── */}
            <SectionCard title="Profile" description="How you appear inside Framefore.">
              <div className="flex flex-col gap-6">
                <AvatarUploader
                  url={avatarUrl}
                  initials={initials}
                  uploading={uploading}
                  hasAvatar={Boolean(profile?.avatar_path || profile?.avatar_url)}
                  hasUploaded={Boolean(profile?.avatar_path)}
                  onUpload={async (file) => {
                    const { error: upErr } = await uploadAvatar(file);
                    if (!upErr) toast("Avatar updated");
                  }}
                  onRemove={async () => {
                    const { error: rmErr } = await removeAvatar();
                    if (!rmErr) toast("Avatar removed");
                  }}
                />

                <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                  <FieldRow>
                    <LabeledInput
                      label="Full name"
                      value={form.full_name}
                      onChange={setField("full_name")}
                      placeholder="Jane Director"
                      maxLength={160}
                    />
                    <LabeledInput
                      label="Nickname"
                      hint="3–30 chars · a-z, 0-9, _ -"
                      value={form.nickname}
                      onChange={setField("nickname")}
                      placeholder="janedirector"
                      maxLength={30}
                    />
                  </FieldRow>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel label="Bio" hint={`${form.bio.length}/500`} />
                    <Textarea
                      value={form.bio}
                      onChange={(e) => setField("bio")(e.target.value)}
                      placeholder="A short line about your work…"
                      maxLength={500}
                      dir="auto"
                    />
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}

                  <SaveBar
                    sectionFooter
                    isDirty={isDirty}
                    saving={saving}
                    onReset={() => profile && setForm(profileToForm(profile))}
                  />
                </form>
              </div>
            </SectionCard>

            {/* ── Section: Contact ──────────────────────────────────────── */}
            <SectionCard title="Contact" description="Optional details. Email comes from your sign-in and can't be changed here.">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col gap-1.5">
                  <FieldLabel label="Email" />
                  <div className="flex items-center gap-2 rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-stone-surface)] px-3 py-2 text-sm text-[var(--color-ink-soft)]">
                    <Mail size={15} className="shrink-0" />
                    <span className="truncate">{user?.email ?? "—"}</span>
                    {emailConfirmed && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <FieldRow>
                  <LabeledInput
                    label="Phone number"
                    hint="Optional"
                    value={form.phone_number}
                    onChange={setField("phone_number")}
                    placeholder="+1 555 123 4567"
                    maxLength={32}
                    type="tel"
                  />
                  <LabeledInput
                    label="Timezone"
                    value={form.timezone}
                    onChange={setField("timezone")}
                    placeholder="Europe/Amsterdam"
                    maxLength={80}
                  />
                </FieldRow>

                <FieldRow>
                  <LabeledInput
                    label="Country"
                    value={form.country}
                    onChange={setField("country")}
                    placeholder="Netherlands"
                    maxLength={80}
                  />
                  <LabeledInput
                    label="City"
                    value={form.city}
                    onChange={setField("city")}
                    placeholder="Amsterdam"
                    maxLength={100}
                  />
                </FieldRow>

                <SaveBar
                  sectionFooter
                  isDirty={isDirty}
                  saving={saving}
                  onReset={() => profile && setForm(profileToForm(profile))}
                />
              </form>
            </SectionCard>

            {/* ── Section: Security ─────────────────────────────────────── */}
            <SectionCard title="Security" description="Manage how you sign in.">
              <div className="flex flex-col divide-y divide-[var(--color-border-strong)]">
                <SecurityRow
                  icon={<KeyRound size={16} />}
                  title="Password"
                  description={
                    user?.email
                      ? "Send a reset link to your email to set a new password."
                      : "No email is associated with this account."
                  }
                  action={
                    user?.email ? (
                      <Button variant="outline" size="sm" onClick={handlePasswordReset} disabled={resetting}>
                        {resetting ? <Loader2 size={14} className="animate-spin" /> : "Send reset email"}
                      </Button>
                    ) : null
                  }
                />

                <SecurityRow
                  icon={<ShieldCheck size={16} />}
                  title="Sign-in providers"
                  description={
                    providers.length
                      ? `Connected: ${providers.map((p) => PROVIDER_LABELS[p] ?? p).join(", ")}.`
                      : "Email and password."
                  }
                />

                {/* 2FA is intentionally a static note, not a control. It will be
                    implemented in a dedicated security phase. */}
                <SecurityRow
                  icon={<ShieldCheck size={16} />}
                  title="Two-factor authentication"
                  description="Two-factor authentication will be added in a dedicated security phase."
                  muted
                />

                <SecurityRow
                  icon={<LogOut size={16} />}
                  title="Sign out"
                  description="Sign out of Framefore on this device. Local projects stay on this device."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await signOut();
                        navigate("/", { replace: true });
                      }}
                    >
                      Sign out
                    </Button>
                  }
                />
              </div>
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function profileToForm(p: NonNullable<ReturnType<typeof useProfileStore.getState>["profile"]>): FormState {
  return {
    full_name: p.full_name ?? "",
    nickname: p.nickname ?? "",
    bio: p.bio ?? "",
    phone_number: p.phone_number ?? "",
    country: p.country ?? "",
    city: p.city ?? "",
    timezone: p.timezone ?? "",
  };
}

function deriveInitials(fullName?: string | null, email?: string | null): string {
  const source = fullName?.trim() || email?.split("@")[0] || "";
  if (!source) return "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// ── Presentational components ─────────────────────────────────────────────────

function Avatar({ url, initials, size }: { url: string | null; initials: string; size: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-charcoal)] text-white"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display" style={{ fontSize: size * 0.36 }}>
          {initials}
        </span>
      )}
    </div>
  );
}

function AvatarUploader({
  url,
  initials,
  uploading,
  hasAvatar,
  hasUploaded,
  onUpload,
  onRemove,
}: {
  url: string | null;
  initials: string;
  uploading: boolean;
  hasAvatar: boolean;
  hasUploaded: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const err = validateAvatarFile(file);
    if (err) return setLocalError(err);
    setLocalError(null);
    onUpload(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--color-charcoal)] text-white ring-2 ring-transparent transition-all",
            dragging && "ring-[var(--color-ember)] ring-offset-2",
          )}
        >
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-2xl">{initials}</span>
          )}
          {uploading && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Camera size={14} /> {hasAvatar ? "Change" : "Upload"}
            </Button>
            {hasUploaded && (
              <Button type="button" variant="ghost" size="sm" onClick={onRemove} disabled={uploading}>
                <Trash2 size={14} /> Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-[var(--color-ink-faint)]">PNG, JPEG, WebP or GIF · up to 2 MB. Drag &amp; drop onto the avatar.</p>
        </div>
      </div>

      {localError && <p className="text-sm text-red-600">{localError}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--color-border-strong)] bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="font-display text-lg text-[var(--color-charcoal)]">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">{description}</p>}
      </div>
      {children}
    </section>
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
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        dir="auto"
      />
    </label>
  );
}

function SaveBar({
  isDirty,
  saving,
  onReset,
  sectionFooter,
}: {
  isDirty: boolean;
  saving: boolean;
  onReset: () => void;
  sectionFooter?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-end gap-2", sectionFooter && "border-t border-[var(--color-border-strong)] pt-4")}>
      {isDirty && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={saving}>
          Discard
        </Button>
      )}
      <Button type="submit" variant="primary" size="sm" disabled={!isDirty || saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : "Save changes"}
      </Button>
    </div>
  );
}

function SecurityRow({
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
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-stone-surface)] text-[var(--color-ink-soft)]", muted && "opacity-60")}>
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

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-[var(--color-border-strong)] bg-white p-6">
          <div className="mb-5 h-5 w-32 animate-pulse rounded bg-[var(--color-stone-surface)]" />
          <div className="flex flex-col gap-4">
            <div className="h-10 animate-pulse rounded-lg bg-[var(--color-stone-surface)]" />
            <div className="h-10 animate-pulse rounded-lg bg-[var(--color-stone-surface)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
      <Loader2 className="animate-spin text-[var(--color-ink-faint)]" />
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl text-[var(--color-charcoal)]">Account unavailable</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Profile and account features need Supabase to be configured. You can keep using Framefore locally in the meantime.
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
