export const userRoles = ["SHIPPER", "CARRIER", "DRIVER", "ADMIN"] as const;

export type UserRole = (typeof userRoles)[number];

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  accountStatus: "ACTIVE" | "LOCKED";
  mustChangePassword: boolean;
};

const roleSet = new Set<string>(userRoles);

export function parseUser(body: unknown): AuthUser {
  if (typeof body !== "object" || body === null || !("user" in body)) {
    throw new Error("invalid_user");
  }
  const user = (body as { user: unknown }).user;
  if (typeof user !== "object" || user === null) {
    throw new Error("invalid_user");
  }
  const record = user as Record<string, unknown>;
  const role = record.role;
  if (typeof record.id !== "string" || record.id.length === 0 || typeof role !== "string" || !roleSet.has(role)) {
    throw new Error("invalid_user");
  }
  return {
    id: record.id,
    email: typeof record.email === "string" ? record.email : "",
    username: typeof record.username === "string" ? record.username : null,
    role: role as UserRole,
    accountStatus: record.accountStatus === "LOCKED" ? "LOCKED" : "ACTIVE",
    mustChangePassword: record.mustChangePassword === true,
  };
}
