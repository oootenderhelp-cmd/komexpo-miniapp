export {
  signJwt,
  verifyJwt,
  decodeJwt,
  JwtError,
  type JwtHeader,
  type JwtPayload,
  type JwtErrorCode,
  type SignOptions,
  type VerifyOptions,
} from "./jwt/index.js";

export {
  hasPermission,
  getPermissions,
  assertPermission,
  isValidRole,
  isHigherRole,
  roleHierarchyLevel,
  PermissionDeniedError,
  ALL_ROLES,
  type Role,
  type Permission,
} from "./rbac/index.js";

export {
  assertWorkspace,
  scopeToWorkspace,
  belongsToWorkspace,
  WorkspaceMismatchError,
} from "./workspace/index.js";

export {
  extractBearerToken,
  authenticate,
  requirePermission,
  requireWorkspace,
  type AuthContext,
  type AuthResult,
  type AuthFailure,
  type AuthOutcome,
} from "./middleware/index.js";
