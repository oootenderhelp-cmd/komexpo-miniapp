export type Role =
  | "owner"
  | "admin"
  | "tender_specialist"
  | "lawyer"
  | "estimator";

export type Permission =
  | "workspace:manage"
  | "workspace:read"
  | "users:invite"
  | "users:remove"
  | "users:list"
  | "roles:assign"
  | "tenders:create"
  | "tenders:read"
  | "tenders:update"
  | "tenders:delete"
  | "tenders:search"
  | "tenders:import"
  | "approvals:create"
  | "approvals:approve"
  | "approvals:reject"
  | "approvals:view"
  | "pricing:read"
  | "pricing:write"
  | "crm:read"
  | "crm:write"
  | "documents:read"
  | "documents:upload"
  | "documents:delete"
  | "integrations:manage"
  | "integrations:read"
  | "monitoring:manage"
  | "monitoring:read"
  | "support:read"
  | "support:write"
  | "ads:read"
  | "ads:manage"
  | "billing:read"
  | "billing:manage"
  | "audit:read"
  | "submission:execute";

const PERMISSION_MATRIX: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([
    "workspace:manage",
    "workspace:read",
    "users:invite",
    "users:remove",
    "users:list",
    "roles:assign",
    "tenders:create",
    "tenders:read",
    "tenders:update",
    "tenders:delete",
    "tenders:search",
    "tenders:import",
    "approvals:create",
    "approvals:approve",
    "approvals:reject",
    "approvals:view",
    "pricing:read",
    "pricing:write",
    "crm:read",
    "crm:write",
    "documents:read",
    "documents:upload",
    "documents:delete",
    "integrations:manage",
    "integrations:read",
    "monitoring:manage",
    "monitoring:read",
    "support:read",
    "support:write",
    "ads:read",
    "ads:manage",
    "billing:read",
    "billing:manage",
    "audit:read",
    "submission:execute",
  ]),

  admin: new Set<Permission>([
    "workspace:read",
    "users:invite",
    "users:remove",
    "users:list",
    "roles:assign",
    "tenders:create",
    "tenders:read",
    "tenders:update",
    "tenders:delete",
    "tenders:search",
    "tenders:import",
    "approvals:create",
    "approvals:approve",
    "approvals:reject",
    "approvals:view",
    "pricing:read",
    "pricing:write",
    "crm:read",
    "crm:write",
    "documents:read",
    "documents:upload",
    "documents:delete",
    "integrations:manage",
    "integrations:read",
    "monitoring:manage",
    "monitoring:read",
    "support:read",
    "support:write",
    "ads:read",
    "ads:manage",
    "billing:read",
    "audit:read",
  ]),

  tender_specialist: new Set<Permission>([
    "workspace:read",
    "users:list",
    "tenders:create",
    "tenders:read",
    "tenders:update",
    "tenders:search",
    "tenders:import",
    "approvals:create",
    "approvals:view",
    "pricing:read",
    "crm:read",
    "crm:write",
    "documents:read",
    "documents:upload",
    "integrations:read",
    "monitoring:read",
    "support:read",
    "support:write",
  ]),

  lawyer: new Set<Permission>([
    "workspace:read",
    "users:list",
    "tenders:read",
    "tenders:search",
    "approvals:approve",
    "approvals:reject",
    "approvals:view",
    "pricing:read",
    "documents:read",
    "documents:upload",
    "support:read",
  ]),

  estimator: new Set<Permission>([
    "workspace:read",
    "users:list",
    "tenders:read",
    "tenders:search",
    "approvals:view",
    "pricing:read",
    "pricing:write",
    "documents:read",
    "documents:upload",
    "support:read",
  ]),
};

export const ALL_ROLES: readonly Role[] = [
  "owner",
  "admin",
  "tender_specialist",
  "lawyer",
  "estimator",
] as const;

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = PERMISSION_MATRIX[role];
  return perms.has(permission);
}

export function getPermissions(role: Role): readonly Permission[] {
  return [...PERMISSION_MATRIX[role]];
}

export function isValidRole(value: string): value is Role {
  return ALL_ROLES.includes(value as Role);
}

export class PermissionDeniedError extends Error {
  constructor(
    public readonly role: Role,
    public readonly permission: Permission,
  ) {
    super(`Role "${role}" does not have permission "${permission}"`);
    this.name = "PermissionDeniedError";
  }
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionDeniedError(role, permission);
  }
}

export function roleHierarchyLevel(role: Role): number {
  const levels: Record<Role, number> = {
    owner: 100,
    admin: 80,
    tender_specialist: 50,
    lawyer: 40,
    estimator: 30,
  };
  return levels[role];
}

export function isHigherRole(a: Role, b: Role): boolean {
  return roleHierarchyLevel(a) > roleHierarchyLevel(b);
}
