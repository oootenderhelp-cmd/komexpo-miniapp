import { describe, it, expect } from "vitest";
import { signJwt, verifyJwt, decodeJwt, JwtError } from "../src/jwt/index.js";

const SECRET = "test-secret-key-at-least-32-chars-long";

const PAYLOAD = {
  sub: "user-1",
  role: "admin",
  workspaceId: "ws-1",
};

describe("JWT sign & verify", () => {
  it("signs and verifies a token", () => {
    const token = signJwt(PAYLOAD, SECRET);
    const result = verifyJwt(token, SECRET);
    expect(result.sub).toBe("user-1");
    expect(result.role).toBe("admin");
    expect(result.workspaceId).toBe("ws-1");
    expect(result.iat).toBeTypeOf("number");
  });

  it("produces a 3-part dot-separated string", () => {
    const token = signJwt(PAYLOAD, SECRET);
    expect(token.split(".")).toHaveLength(3);
  });

  it("sets iat automatically", () => {
    const token = signJwt(PAYLOAD, SECRET);
    const { payload } = decodeJwt(token);
    expect(payload.iat).toBeTypeOf("number");
    expect(payload.iat!).toBeGreaterThan(0);
  });

  it("sets exp from expiresInSeconds", () => {
    const token = signJwt(PAYLOAD, SECRET, { expiresInSeconds: 3600 });
    const { payload } = decodeJwt(token);
    expect(payload.exp).toBe(payload.iat! + 3600);
  });

  it("sets iss and aud from options", () => {
    const token = signJwt(PAYLOAD, SECRET, {
      issuer: "tendrovik",
      audience: "tendrovik-api",
    });
    const { payload } = decodeJwt(token);
    expect(payload.iss).toBe("tendrovik");
    expect(payload.aud).toBe("tendrovik-api");
  });

  it("rejects token signed with different secret", () => {
    const token = signJwt(PAYLOAD, SECRET);
    expect(() => verifyJwt(token, "wrong-secret-that-is-also-long"))
      .toThrow(JwtError);
    try {
      verifyJwt(token, "wrong-secret-that-is-also-long");
    } catch (e) {
      expect((e as JwtError).code).toBe("INVALID_SIGNATURE");
    }
  });

  it("rejects tampered payload", () => {
    const token = signJwt(PAYLOAD, SECRET);
    const parts = token.split(".");
    const decoded = JSON.parse(
      Buffer.from(parts[1]!, "base64url").toString("utf8"),
    );
    decoded.role = "owner";
    parts[1] = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    const tampered = parts.join(".");
    expect(() => verifyJwt(tampered, SECRET)).toThrow(JwtError);
  });

  it("rejects expired token", () => {
    const token = signJwt(PAYLOAD, SECRET, { expiresInSeconds: -10 });
    expect(() => verifyJwt(token, SECRET)).toThrow(JwtError);
    try {
      verifyJwt(token, SECRET);
    } catch (e) {
      expect((e as JwtError).code).toBe("EXPIRED");
    }
  });

  it("allows expired token within clock tolerance", () => {
    const token = signJwt(PAYLOAD, SECRET, { expiresInSeconds: -2 });
    const result = verifyJwt(token, SECRET, { clockToleranceSeconds: 10 });
    expect(result.sub).toBe("user-1");
  });

  it("rejects wrong issuer", () => {
    const token = signJwt(PAYLOAD, SECRET, { issuer: "other" });
    expect(() => verifyJwt(token, SECRET, { issuer: "tendrovik" }))
      .toThrow(JwtError);
    try {
      verifyJwt(token, SECRET, { issuer: "tendrovik" });
    } catch (e) {
      expect((e as JwtError).code).toBe("INVALID_ISSUER");
    }
  });

  it("rejects wrong audience", () => {
    const token = signJwt(PAYLOAD, SECRET, { audience: "other-api" });
    expect(() => verifyJwt(token, SECRET, { audience: "tendrovik-api" }))
      .toThrow(JwtError);
    try {
      verifyJwt(token, SECRET, { audience: "tendrovik-api" });
    } catch (e) {
      expect((e as JwtError).code).toBe("INVALID_AUDIENCE");
    }
  });

  it("rejects malformed token (too few parts)", () => {
    expect(() => verifyJwt("aaa.bbb", SECRET)).toThrow(JwtError);
    try {
      verifyJwt("aaa.bbb", SECRET);
    } catch (e) {
      expect((e as JwtError).code).toBe("MALFORMED");
    }
  });

  it("rejects token with empty string", () => {
    expect(() => verifyJwt("", SECRET)).toThrow(JwtError);
  });

  it("header is always HS256 + JWT", () => {
    const token = signJwt(PAYLOAD, SECRET);
    const { header } = decodeJwt(token);
    expect(header.alg).toBe("HS256");
    expect(header.typ).toBe("JWT");
  });
});

describe("decodeJwt", () => {
  it("decodes without verifying", () => {
    const token = signJwt(PAYLOAD, SECRET);
    const { header, payload } = decodeJwt(token);
    expect(header.alg).toBe("HS256");
    expect(payload.sub).toBe("user-1");
  });

  it("decodes even with wrong secret (no verification)", () => {
    const token = signJwt(PAYLOAD, SECRET);
    const { payload } = decodeJwt(token);
    expect(payload.role).toBe("admin");
  });

  it("throws on malformed token", () => {
    expect(() => decodeJwt("not-a-jwt")).toThrow(JwtError);
  });
});
