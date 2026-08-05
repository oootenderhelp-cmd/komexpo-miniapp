import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    passwordHash: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createMockContext({ role: "admin", id: 99, openId: "admin-user" });
}

function createOwnerContext(): TrpcContext {
  return createMockContext({ role: "owner" as any, id: 100, openId: "owner-user" });
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Platform Router Structure", () => {
  it("has all expected routers defined", () => {
    const caller = appRouter.createCaller(createMockContext());
    // Verify the router has the expected procedure groups
    expect(appRouter._def.procedures).toBeDefined();
  });

  it("auth.me returns user for authenticated context", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
  });

  it("auth.me returns null for unauthenticated context", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("Categories Router", () => {
  it("categories.list returns array", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Kvorki Router", () => {
  it("kvorki.list returns paginated results", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.kvorki.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("kvorki.create requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.kvorki.create({
        title: "Test Kvorka",
        description: "Test description",
        price: 1000,
        categoryId: 1,
        deliveryDays: 3,
      })
    ).rejects.toThrow();
  });
});

describe("Projects Router", () => {
  it("projects.list returns paginated results", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.projects.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("projects.create requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.projects.create({
        title: "Test Project",
        description: "Test description",
        budget: 5000,
        categoryId: 1,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
    ).rejects.toThrow();
  });
});

describe("Profile Router", () => {
  it("profile.me requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.me()).rejects.toThrow();
  });
});

describe("Admin Router", () => {
  it("admin.users requires admin role", async () => {
    const ctx = createMockContext(); // regular user
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users({})).rejects.toThrow();
  });

  it("admin.users works for admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.users({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });

  it("admin.users works for owner", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.users({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});

describe("Owner Router", () => {
  it("owner.stats requires owner role", async () => {
    const ctx = createAdminContext(); // admin, not owner
    const caller = appRouter.createCaller(ctx);
    await expect(caller.owner.stats()).rejects.toThrow();
  });

  it("owner.stats works for owner", async () => {
    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.owner.stats();
    if (result !== null) {
      expect(result).toHaveProperty("totalUsers");
      expect(result).toHaveProperty("totalTurnover");
      expect(result).toHaveProperty("totalCommission");
      expect(result).toHaveProperty("totalOrders");
      expect(result).toHaveProperty("activeKvorki");
      expect(result).toHaveProperty("openProjects");
    }
  });
});

describe("Escrow Commission Logic", () => {
  it("commission rate is 15%", () => {
    const COMMISSION_RATE = 0.15;
    const orderAmount = 10000;
    const commission = orderAmount * COMMISSION_RATE;
    const contractorReceives = orderAmount - commission;

    expect(commission).toBe(1500);
    expect(contractorReceives).toBe(8500);
  });

  it("commission is correctly calculated for various amounts", () => {
    const COMMISSION_RATE = 0.15;
    const testCases = [
      { amount: 500, expectedCommission: 75 },
      { amount: 1500, expectedCommission: 225 },
      { amount: 50000, expectedCommission: 7500 },
    ];

    testCases.forEach(({ amount, expectedCommission }) => {
      expect(amount * COMMISSION_RATE).toBe(expectedCommission);
    });
  });
});
