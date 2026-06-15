import { z } from "zod";
import { ADMIN_ROLES, type AdminRole, type AdminUsersListResult } from "@/admin/types";

// Runtime validation for the admin_list_users() RPC payload.
//
// This is the trust boundary for the Users list contract. The schema only
// describes the minimal, safe summary fields — there is intentionally no place
// for avatar_path, raw auth metadata, phone, bio, city, country, or any
// creative content, so such fields can never reach the validated output even if
// a payload carried them.

const ROLE_SET = new Set<string>(ADMIN_ROLES);

// Roles come from an aggregate of user_roles.role. An unexpected/stray role
// string should not invalidate the whole row — it is filtered out, leaving a
// clean, deduped AdminRole[].
const rolesSchema = z.array(z.unknown()).transform((values) => {
  const roles: AdminRole[] = [];
  for (const value of values) {
    if (typeof value === "string" && ROLE_SET.has(value)) {
      const role = value as AdminRole;
      if (!roles.includes(role)) roles.push(role);
    }
  }
  return roles;
});

// Accepts string | null | undefined and collapses empty/whitespace to null.
const nullableText = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => (typeof value === "string" && value.trim() !== "" ? value : null));

// A single user row. userId must be a non-empty string; rows that fail this
// (or any other field) are dropped by the array parser below rather than
// becoming UI-ready data.
const userItemSchema = z
  .object({
    userId: z.string().trim().min(1),
    email: nullableText,
    displayName: nullableText,
    createdAt: z.string(),
    lastSignInAt: nullableText,
    profileCompleted: z.boolean(),
    hasUploadedAvatar: z.boolean(),
    roles: rolesSchema,
    isOwner: z.boolean(),
    isAdmin: z.boolean(),
  })
  .transform((row) => ({
    ...row,
    // Reinforce the role-derived flags so they can never under-report access.
    isOwner: row.isOwner || row.roles.includes("owner"),
    isAdmin: row.isAdmin || row.roles.includes("owner") || row.roles.includes("admin"),
  }));

// Validate each row independently and keep only the valid ones. A single bad
// row never collapses the whole list.
const usersArraySchema = z.array(z.unknown()).transform((rows) => {
  const items: z.infer<typeof userItemSchema>[] = [];
  for (const row of rows) {
    const parsed = userItemSchema.safeParse(row);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
});

// Page counters are always whole, non-negative numbers. Validating them
// strictly (not as generic numbers) keeps a malformed/older payload from
// producing nonsensical pagination math in the UI.
const nonNegativeIntegerSchema = z.number().int().nonnegative();

const pageSchema = z.object({
  limit: nonNegativeIntegerSchema,
  offset: nonNegativeIntegerSchema,
  returned: nonNegativeIntegerSchema,
  total: nonNegativeIntegerSchema,
  hasMore: z.boolean(),
});

const roleFilterSchema = z
  .union([z.enum(ADMIN_ROLES), z.null()])
  .optional()
  .transform((value) => value ?? null);

const filtersSchema = z.object({
  search: nullableText,
  role: roleFilterSchema,
  profileCompleted: z
    .union([z.boolean(), z.null()])
    .optional()
    .transform((value) => (typeof value === "boolean" ? value : null)),
});

export const adminUsersListSchema = z.object({
  generatedAt: z.string(),
  sourceVersion: z.literal("phase-f1"),
  page: pageSchema,
  filters: filtersSchema,
  users: usersArraySchema,
}) satisfies z.ZodType<AdminUsersListResult>;

export type ParsedAdminUsersListResult = z.infer<typeof adminUsersListSchema>;
