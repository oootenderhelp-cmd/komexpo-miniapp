import { verifyJwt, JwtError } from "../jwt/index.js";
import type { JwtPayload, VerifyOptions } from "../jwt/index.js";
import { hasPermission, isValidRole } from "../rbac/index.js";
import type { Role, Permission } from "../rbac/index.js";
import { assertWorkspace, WorkspaceMismatchError } from "../workspace/index.js";

export interface AuthContext {
  userId: string;
  role: Role;
  workspaceId: string;
  claims: JwtPayload;
}

export interface AuthResult {
  ok: true;
  ctx: AuthContext;
}

export interface AuthFailure {
  ok: false;
  status: number;
  error: string;
  code: string;
}

export type AuthOutcome = AuthResult | AuthFailure;

export function extractBearerToken(authorizationHeader: string | undefined | null): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader);
  return match?.[1] ?? null;
}

export function authenticate(
  authorizationHeader: string | undefined | null,
  secret: string,
  verifyOptions?: VerifyOptions,
): AuthOutcome {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Missing or malformed Authorization header",
      code: "NO_TOKEN",
    };
  }

  let payload: JwtPayload;
  try {
    payload = verifyJwt(token, secret, verifyOptions);
  } catch (e) {
    if (e instanceof JwtError) {
      return {
        ok: false,
        status: 401,
        error: e.message,
        code: e.code,
      };
    }
    throw e;
  }

  if (!isValidRole(payload.role)) {
    return {
      ok: false,
      status: 403,
      error: `Unknown role: ${payload.role}`,
      code: "INVALID_ROLE",
    };
  }

  return {
    ok: true,
    ctx: {
      userId: payload.sub,
      role: payload.role,
      workspaceId: payload.workspaceId,
      claims: payload,
    },
  };
}

export function requirePermission(
  ctx: AuthContext,
  permission: Permission,
): AuthFailure | null {
  if (!hasPermission(ctx.role, permission)) {
    return {
      ok: false,
      status: 403,
      error: `Role "${ctx.role}" does not have permission "${permission}"`,
      code: "PERMISSION_DENIED",
    };
  }
  return null;
}

export function requireWorkspace(
  ctx: AuthContext,
  requestedWorkspaceId: string,
): AuthFailure | null {
  try {
    assertWorkspace(ctx.workspaceId, requestedWorkspaceId);
    return null;
  } catch (e) {
    if (e instanceof WorkspaceMismatchError) {
      return {
        ok: false,
        status: 403,
        error: e.message,
        code: "WORKSPACE_MISMATCH",
      };
    }
    throw e;
  }
}
