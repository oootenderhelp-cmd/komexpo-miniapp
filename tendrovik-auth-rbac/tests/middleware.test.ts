import { describe, it, expect } from "vitest";
import { signJwt } from "../src/jwt/index.js";
import {
  extractBearerToken,
  authenticate,
  requirePermission,
  requireWorkspace,
} from "../src/middleware/index.js";
import type { AuthContext } from "../src/middleware/index.js";

const SECRET = "test-secret-key-at-least-32-chars-long";

function makeToken(overrides: Record<string, unknown> = {}) {
  return signJwt(
    {
      sub: "user-1",
      role: "tender_specialist",
      workspaceId: "ws-1",
      ...overrides,
    },
    SECRET,
    { expiresInSeconds: 3600 },
  );
}

describe("extractBearerToken", () => {
  it("extracts token from valid Bearer header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("returns null for missing header", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  it("case-insensitive Bearer prefix", () => {
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
    expect(extractBearerToken("BEARER abc123")).toBe("abc123");
  });
});

describe("authenticate", () => {
  it("returns AuthResult on valid token", () => {
    const token = makeToken();
    const result = authenticate(`Bearer ${token}`, SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ctx.userId).toBe("user-1");
      expect(result.ctx.role).toBe("tender_specialist");
      expect(result.ctx.workspaceId).toBe("ws-1");
    }
  });

  it("returns 401 when no Authorization header", () => {
    const result = authenticate(undefined, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("NO_TOKEN");
    }
  });

  it("returns 401 for invalid token", () => {
    const result = authenticate("Bearer invalid.token.here", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it("returns 401 for expired token", () => {
    const token = signJwt(
      { sub: "u", role: "admin", workspaceId: "ws-1" },
      SECRET,
      { expiresInSeconds: -60 },
    );
    const result = authenticate(`Bearer ${token}`, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("EXPIRED");
    }
  });

  it("returns 401 for wrong secret", () => {
    const token = makeToken();
    const result = authenticate(`Bearer ${token}`, "different-secret-that-is-long-enough");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("INVALID_SIGNATURE");
    }
  });

  it("returns 403 for unknown role", () => {
    const token = signJwt(
      { sub: "u", role: "superadmin", workspaceId: "ws-1" },
      SECRET,
    );
    const result = authenticate(`Bearer ${token}`, SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.code).toBe("INVALID_ROLE");
    }
  });

  it("passes through issuer/audience verification", () => {
    const token = signJwt(
      { sub: "u", role: "admin", workspaceId: "ws-1" },
      SECRET,
      { issuer: "tendrovik", audience: "tendrovik-api" },
    );
    const result = authenticate(`Bearer ${token}`, SECRET, {
      issuer: "tendrovik",
      audience: "tendrovik-api",
    });
    expect(result.ok).toBe(true);
  });
});

describe("requirePermission", () => {
  const ctx: AuthContext = {
    userId: "user-1",
    role: "tender_specialist",
    workspaceId: "ws-1",
    claims: { sub: "user-1", role: "tender_specialist", workspaceId: "ws-1" },
  };

  it("returns null when permission is granted", () => {
    expect(requirePermission(ctx, "tenders:create")).toBeNull();
    expect(requirePermission(ctx, "tenders:read")).toBeNull();
  });

  it("returns 403 failure when permission is denied", () => {
    const result = requirePermission(ctx, "tenders:delete");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    expect(result!.code).toBe("PERMISSION_DENIED");
  });

  it("owner can do everything", () => {
    const ownerCtx: AuthContext = { ...ctx, role: "owner" };
    expect(requirePermission(ownerCtx, "workspace:manage")).toBeNull();
    expect(requirePermission(ownerCtx, "submission:execute")).toBeNull();
    expect(requirePermission(ownerCtx, "billing:manage")).toBeNull();
  });

  it("estimator cannot create tenders", () => {
    const estCtx: AuthContext = { ...ctx, role: "estimator" };
    const result = requirePermission(estCtx, "tenders:create");
    expect(result).not.toBeNull();
    expect(result!.code).toBe("PERMISSION_DENIED");
  });
});

describe("requireWorkspace", () => {
  const ctx: AuthContext = {
    userId: "user-1",
    role: "admin",
    workspaceId: "ws-1",
    claims: { sub: "user-1", role: "admin", workspaceId: "ws-1" },
  };

  it("returns null when workspace matches", () => {
    expect(requireWorkspace(ctx, "ws-1")).toBeNull();
  });

  it("returns 403 when workspace does not match", () => {
    const result = requireWorkspace(ctx, "ws-other");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    expect(result!.code).toBe("WORKSPACE_MISMATCH");
  });
});

describe("Full auth pipeline", () => {
  it("authenticate → requirePermission → requireWorkspace (happy path)", () => {
    const token = signJwt(
      { sub: "u1", role: "owner", workspaceId: "ws-10" },
      SECRET,
      { expiresInSeconds: 3600 },
    );
    const authResult = authenticate(`Bearer ${token}`, SECRET);
    expect(authResult.ok).toBe(true);
    if (!authResult.ok) return;

    expect(requirePermission(authResult.ctx, "submission:execute")).toBeNull();
    expect(requireWorkspace(authResult.ctx, "ws-10")).toBeNull();
  });

  it("authenticate → requirePermission fails for wrong role", () => {
    const token = signJwt(
      { sub: "u2", role: "estimator", workspaceId: "ws-10" },
      SECRET,
      { expiresInSeconds: 3600 },
    );
    const authResult = authenticate(`Bearer ${token}`, SECRET);
    expect(authResult.ok).toBe(true);
    if (!authResult.ok) return;

    const permResult = requirePermission(authResult.ctx, "submission:execute");
    expect(permResult).not.toBeNull();
    expect(permResult!.code).toBe("PERMISSION_DENIED");
  });

  it("authenticate → requireWorkspace fails for wrong workspace", () => {
    const token = signJwt(
      { sub: "u3", role: "admin", workspaceId: "ws-10" },
      SECRET,
      { expiresInSeconds: 3600 },
    );
    const authResult = authenticate(`Bearer ${token}`, SECRET);
    expect(authResult.ok).toBe(true);
    if (!authResult.ok) return;

    const wsResult = requireWorkspace(authResult.ctx, "ws-999");
    expect(wsResult).not.toBeNull();
    expect(wsResult!.code).toBe("WORKSPACE_MISMATCH");
  });
});
