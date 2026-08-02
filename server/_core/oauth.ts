import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { SignJWT } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function hashPassword(password: string, salt: string): string {
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return hash === testHash;
}

async function createSessionToken(
  openId: string,
  name: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(ENV.cookieSecret);
  const expiresInMs = ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

  return new SignJWT({
    openId,
    appId: ENV.appId,
    name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export function registerOAuthRoutes(app: Express) {
  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (password.length < 6) {
        res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
        return;
      }

      // Check if user already exists
      const existing = await db.getUserByOpenId(email);
      if (existing) {
        res.status(409).json({ error: "User with this email already exists" });
        return;
      }

      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);

      await db.upsertUser({
        openId: email,
        name: name || null,
        email: email,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Store password hash
      await db.updateUserPasswordHash(email, passwordHash);

      const sessionToken = await createSessionToken(email, name || "");
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Register failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const user = await db.getUserByOpenId(email);
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const passwordHash = await db.getUserPasswordHash(email);
      if (!passwordHash || !verifyPassword(password, passwordHash)) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const sessionToken = await createSessionToken(email, user.name || "");
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      await db.upsertUser({
        openId: email,
        lastSignedIn: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    } catch {
      res.json(null);
    }
  });
}
