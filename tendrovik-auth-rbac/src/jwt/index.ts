import { createHmac, timingSafeEqual } from "node:crypto";

export interface JwtHeader {
  alg: "HS256";
  typ: "JWT";
}

export interface JwtPayload {
  sub: string;
  role: string;
  workspaceId: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

export interface SignOptions {
  expiresInSeconds?: number;
  issuer?: string;
  audience?: string;
}

export interface VerifyOptions {
  issuer?: string;
  audience?: string;
  clockToleranceSeconds?: number;
}

export class JwtError extends Error {
  constructor(
    message: string,
    public readonly code: JwtErrorCode,
  ) {
    super(message);
    this.name = "JwtError";
  }
}

export type JwtErrorCode =
  | "MALFORMED"
  | "INVALID_SIGNATURE"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "INVALID_ISSUER"
  | "INVALID_AUDIENCE"
  | "MISSING_CLAIM";

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function base64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function hmacSha256(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data, "utf8").digest();
}

export function signJwt(
  payload: Omit<JwtPayload, "iat">,
  secret: string,
  options: SignOptions = {},
): string {
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
  } as JwtPayload;

  if (options.expiresInSeconds !== undefined) {
    fullPayload.exp = now + options.expiresInSeconds;
  }
  if (options.issuer !== undefined) {
    fullPayload.iss = options.issuer;
  }
  if (options.audience !== undefined) {
    fullPayload.aud = options.audience;
  }

  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(fullPayload));
  const sigInput = `${headerB64}.${payloadB64}`;
  const signature = base64url(hmacSha256(sigInput, secret));

  return `${sigInput}.${signature}`;
}

export function verifyJwt(
  token: string,
  secret: string,
  options: VerifyOptions = {},
): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new JwtError("Token must have 3 parts", "MALFORMED");
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  let header: JwtHeader;
  try {
    header = JSON.parse(base64urlDecode(headerB64)) as JwtHeader;
  } catch {
    throw new JwtError("Invalid header encoding", "MALFORMED");
  }

  if (header.alg !== "HS256") {
    throw new JwtError(`Unsupported algorithm: ${header.alg}`, "MALFORMED");
  }

  const sigInput = `${headerB64}.${payloadB64}`;
  const expectedSig = hmacSha256(sigInput, secret);
  const actualSig = Buffer.from(signatureB64, "base64url");

  if (
    expectedSig.length !== actualSig.length ||
    !timingSafeEqual(expectedSig, actualSig)
  ) {
    throw new JwtError("Signature verification failed", "INVALID_SIGNATURE");
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64)) as JwtPayload;
  } catch {
    throw new JwtError("Invalid payload encoding", "MALFORMED");
  }

  if (!payload.sub) {
    throw new JwtError("Missing required claim: sub", "MISSING_CLAIM");
  }
  if (!payload.role) {
    throw new JwtError("Missing required claim: role", "MISSING_CLAIM");
  }
  if (!payload.workspaceId) {
    throw new JwtError("Missing required claim: workspaceId", "MISSING_CLAIM");
  }

  const tolerance = options.clockToleranceSeconds ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp !== undefined && now > payload.exp + tolerance) {
    throw new JwtError("Token has expired", "EXPIRED");
  }

  if (payload.iat !== undefined && now < payload.iat - tolerance) {
    throw new JwtError("Token used before issued", "NOT_YET_VALID");
  }

  if (options.issuer !== undefined && payload.iss !== options.issuer) {
    throw new JwtError(
      `Invalid issuer: expected "${options.issuer}", got "${payload.iss ?? ""}"`,
      "INVALID_ISSUER",
    );
  }

  if (options.audience !== undefined && payload.aud !== options.audience) {
    throw new JwtError(
      `Invalid audience: expected "${options.audience}", got "${payload.aud ?? ""}"`,
      "INVALID_AUDIENCE",
    );
  }

  return payload;
}

export function decodeJwt(token: string): { header: JwtHeader; payload: JwtPayload } {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new JwtError("Token must have 3 parts", "MALFORMED");
  }
  const [headerB64, payloadB64] = parts as [string, string, string];
  const header = JSON.parse(base64urlDecode(headerB64)) as JwtHeader;
  const payload = JSON.parse(base64urlDecode(payloadB64)) as JwtPayload;
  return { header, payload };
}
