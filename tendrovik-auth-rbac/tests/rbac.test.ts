import { describe, it, expect } from "vitest";
import {
  hasPermission,
  getPermissions,
  assertPermission,
  isValidRole,
  isHigherRole,
  roleHierarchyLevel,
  PermissionDeniedError,
  ALL_ROLES,
} from "../src/rbac/index.js";
import type { Role, Permission } from "../src/rbac/index.js";

describe("RBAC permission matrix", () => {
  it("defines exactly 5 roles", () => {
    expect(ALL_ROLES).toHaveLength(5);
    expect(ALL_ROLES).toContain("owner");
    expect(ALL_ROLES).toContain("admin");
    expect(ALL_ROLES).toContain("tender_specialist");
    expect(ALL_ROLES).toContain("lawyer");
    expect(ALL_ROLES).toContain("estimator");
  });

  it("owner has all permissions including submission:execute", () => {
    expect(hasPermission("owner", "workspace:manage")).toBe(true);
    expect(hasPermission("owner", "submission:execute")).toBe(true);
    expect(hasPermission("owner", "billing:manage")).toBe(true);
    expect(hasPermission("owner", "audit:read")).toBe(true);
  });

  it("only owner has workspace:manage", () => {
    expect(hasPermission("owner", "workspace:manage")).toBe(true);
    expect(hasPermission("admin", "workspace:manage")).toBe(false);
    expect(hasPermission("tender_specialist", "workspace:manage")).toBe(false);
    expect(hasPermission("lawyer", "workspace:manage")).toBe(false);
    expect(hasPermission("estimator", "workspace:manage")).toBe(false);
  });

  it("only owner has submission:execute", () => {
    for (const role of ALL_ROLES) {
      if (role === "owner") {
        expect(hasPermission(role, "submission:execute")).toBe(true);
      } else {
        expect(hasPermission(role, "submission:execute")).toBe(false);
      }
    }
  });

  it("admin has most permissions but not workspace:manage or billing:manage", () => {
    expect(hasPermission("admin", "tenders:create")).toBe(true);
    expect(hasPermission("admin", "users:invite")).toBe(true);
    expect(hasPermission("admin", "integrations:manage")).toBe(true);
    expect(hasPermission("admin", "workspace:manage")).toBe(false);
    expect(hasPermission("admin", "billing:manage")).toBe(false);
    expect(hasPermission("admin", "submission:execute")).toBe(false);
  });

  it("tender_specialist can create and update tenders", () => {
    expect(hasPermission("tender_specialist", "tenders:create")).toBe(true);
    expect(hasPermission("tender_specialist", "tenders:update")).toBe(true);
    expect(hasPermission("tender_specialist", "tenders:read")).toBe(true);
    expect(hasPermission("tender_specialist", "tenders:search")).toBe(true);
    expect(hasPermission("tender_specialist", "tenders:import")).toBe(true);
    expect(hasPermission("tender_specialist", "approvals:create")).toBe(true);
  });

  it("tender_specialist cannot delete tenders or manage integrations", () => {
    expect(hasPermission("tender_specialist", "tenders:delete")).toBe(false);
    expect(hasPermission("tender_specialist", "integrations:manage")).toBe(false);
    expect(hasPermission("tender_specialist", "billing:read")).toBe(false);
  });

  it("lawyer can approve/reject but not create tenders", () => {
    expect(hasPermission("lawyer", "approvals:approve")).toBe(true);
    expect(hasPermission("lawyer", "approvals:reject")).toBe(true);
    expect(hasPermission("lawyer", "approvals:view")).toBe(true);
    expect(hasPermission("lawyer", "tenders:create")).toBe(false);
    expect(hasPermission("lawyer", "tenders:update")).toBe(false);
  });

  it("estimator can write pricing but not approve", () => {
    expect(hasPermission("estimator", "pricing:read")).toBe(true);
    expect(hasPermission("estimator", "pricing:write")).toBe(true);
    expect(hasPermission("estimator", "approvals:approve")).toBe(false);
    expect(hasPermission("estimator", "tenders:create")).toBe(false);
  });

  it("all roles have workspace:read", () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, "workspace:read")).toBe(true);
    }
  });

  it("all roles have users:list", () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, "users:list")).toBe(true);
    }
  });

  it("getPermissions returns non-empty array for every role", () => {
    for (const role of ALL_ROLES) {
      const perms = getPermissions(role);
      expect(perms.length).toBeGreaterThan(0);
    }
  });

  it("owner has more permissions than admin", () => {
    const ownerPerms = getPermissions("owner");
    const adminPerms = getPermissions("admin");
    expect(ownerPerms.length).toBeGreaterThan(adminPerms.length);
  });
});

describe("assertPermission", () => {
  it("does not throw when permission exists", () => {
    expect(() => assertPermission("owner", "workspace:manage")).not.toThrow();
  });

  it("throws PermissionDeniedError when permission missing", () => {
    expect(() => assertPermission("estimator", "tenders:create"))
      .toThrow(PermissionDeniedError);
  });

  it("error contains role and permission", () => {
    try {
      assertPermission("lawyer", "tenders:create");
    } catch (e) {
      expect(e).toBeInstanceOf(PermissionDeniedError);
      const err = e as PermissionDeniedError;
      expect(err.role).toBe("lawyer");
      expect(err.permission).toBe("tenders:create");
    }
  });
});

describe("isValidRole", () => {
  it("returns true for known roles", () => {
    for (const role of ALL_ROLES) {
      expect(isValidRole(role)).toBe(true);
    }
  });

  it("returns false for unknown strings", () => {
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("OWNER")).toBe(false);
  });
});

describe("Role hierarchy", () => {
  it("owner > admin > tender_specialist > lawyer > estimator", () => {
    expect(roleHierarchyLevel("owner")).toBeGreaterThan(roleHierarchyLevel("admin"));
    expect(roleHierarchyLevel("admin")).toBeGreaterThan(roleHierarchyLevel("tender_specialist"));
    expect(roleHierarchyLevel("tender_specialist")).toBeGreaterThan(roleHierarchyLevel("lawyer"));
    expect(roleHierarchyLevel("lawyer")).toBeGreaterThan(roleHierarchyLevel("estimator"));
  });

  it("isHigherRole compares correctly", () => {
    expect(isHigherRole("owner", "admin")).toBe(true);
    expect(isHigherRole("admin", "owner")).toBe(false);
    expect(isHigherRole("owner", "owner")).toBe(false);
    expect(isHigherRole("tender_specialist", "estimator")).toBe(true);
  });
});
