# 12 — Phone Number Linking Plan

## Recommendation up front
**Do not build phone auth or phone linking in MVP.** Framefore is a planning tool,
not a high-security or transactional app; phone adds SMS cost, abuse surface, and
provider setup for little near-term value. Document the design, ship later.

## Phone login vs phone linking (they differ)
| | Phone **login** | Phone **linking** |
|---|---|---|
| Purpose | Sign in using phone + OTP | Add a phone to an existing (email/OAuth) account |
| Identity | Phone is a primary login | Phone is a secondary, optional attribute / 2FA factor |
| Requires | SMS provider, phone enabled as a provider | SMS provider only for verification |
| MVP | ❌ no | ❌ no (future, optional) |

## If/when we add phone linking (future)
- **Phone as an optional account field**, verified by OTP, surfaced in account
  settings — not a login method.
- Flow:
  ```
  Settings → add phone → supabase.auth.updateUser({ phone })  (or signInWithOtp for verify)
    → Supabase sends SMS OTP
    → user enters code → supabase.auth.verifyOtp({ phone, token, type:'phone_change' })
    → phone stored on the user
  ```

## OTP / verification
- 6-digit code, short expiry. Supabase handles generation/validation via the
  configured SMS provider (Twilio/MessageBird/Vonage).

## Country code handling
- Store + send E.164 format (`+<country><number>`).
- UI: country-code selector defaulting from locale; validate before submit.

## Rate limits & abuse prevention
- SMS is a cost + abuse vector. Mitigations:
  - Supabase per-phone / per-IP send limits.
  - App-side cooldown (e.g. 60s) between OTP requests.
  - Cap attempts; lock after N failures.
  - CAPTCHA on the OTP request if abuse appears.
- Without these, attackers can run up SMS bills ("SMS pumping"/toll fraud).

## Privacy considerations
- Phone numbers are PII — store only when the user opts in; never expose via
  `profiles` (keep on `auth.users`, not a public table).
- Don't log full numbers; mask in UI (`+1 ••• ••• 1234`).
- Provide a "remove phone" action.

## Recommended MVP approach
1. Ship email + OAuth only.
2. Leave phone provider disabled in Supabase.
3. Revisit when (a) there's demand, or (b) 2FA-by-SMS is requested — and even
   then prefer **TOTP** over SMS for 2FA (see [13](13-mfa-2fa-security-plan.md)).

## Open decision
- Is phone ever needed? Default answer: **no, not for a planning tool.** Confirm
  in [20](20-open-questions-and-decisions.md).
