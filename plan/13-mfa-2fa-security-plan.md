# 13 — MFA / 2FA Security Plan

## Recommendation
MFA is an **optional, opt-in account-security feature** for a **future phase**,
not MVP. When built, use **TOTP (authenticator app)** as the primary factor —
not SMS. Supabase has first-class TOTP MFA (`supabase.auth.mfa.*`).

## Why TOTP over SMS
- No SMS cost or toll-fraud surface.
- Not vulnerable to SIM-swap / SMS interception.
- Works offline; standard authenticator apps (Google Authenticator, 1Password,
  Authy).

## Supabase compatibility
- `supabase.auth.mfa.enroll({ factorType: 'totp' })` → returns QR + secret.
- `supabase.auth.mfa.challenge({ factorId })` + `verify({ factorId, challengeId, code })`.
- Assurance levels (AAL1/AAL2): after enrolling, sensitive sessions require AAL2.
- Enable TOTP MFA in Supabase Auth settings before use.

## Enrollment flow (future)
```
Account settings → "Enable two-factor"
  → mfa.enroll({ factorType:'totp' }) → show QR + manual secret
  → user scans in authenticator app
  → user enters current 6-digit code → mfa.verify(...)
  → factor verified → generate & show recovery codes (store hashed)
```

## Challenge flow (login with MFA enabled)
```
signIn(email, password) → session at AAL1
  → app detects enrolled factor (mfa.getAuthenticatorAssuranceLevel)
  → prompt for 6-digit code → mfa.challenge + verify → AAL2
  → proceed to /app
```

## Recovery codes
- Generate N one-time codes at enrollment; show once; user stores safely.
- Store only hashes (server-side); used to regain access if the device is lost.
- Note: recovery-code management may need a custom table + Edge Function
  (doc 16), since Supabase's built-in recovery handling is limited — confirm
  current capabilities at build time.

## Disable MFA flow
```
Settings → "Disable two-factor" → require current code (or recovery code)
  → mfa.unenroll({ factorId }) → confirm
```

## Lost device handling
- Primary: recovery codes.
- Fallback: support-assisted reset (manual identity check) — needs an admin/Edge
  path; out of MVP scope.

## UI requirements
- Settings section: enable/disable, show enrolled factors, regenerate recovery
  codes.
- Login: a clean code-entry step (6 digits, paste-friendly, auto-submit).
- Clear messaging that 2FA protects their account/projects.

## Phone-based OTP limitations (why not for 2FA)
- SIM-swap, interception, SMS cost/fraud (see [12](12-phone-number-linking-plan.md)).
- If ever offered, present as a weaker secondary option behind TOTP.

## MVP vs future
| Item | Phase |
|---|---|
| Email + password + OAuth | MVP |
| TOTP MFA enroll/challenge | Future |
| Recovery codes | Future (with TOTP) |
| SMS 2FA | Not planned (discouraged) |

## Open decision
- Is MFA needed before launch? Likely **no** for a planning tool, but design is
  ready. Confirm in [20](20-open-questions-and-decisions.md).
