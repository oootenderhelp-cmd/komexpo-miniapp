import { describe, it, expect } from "vitest";
import {
  assertWorkspace,
  scopeToWorkspace,
  belongsToWorkspace,
  WorkspaceMismatchError,
} from "../src/workspace/index.js";

describe("Workspace scoping", () => {
  it("assertWorkspace passes when workspaces match", () => {
    expect(() => assertWorkspace("ws-1", "ws-1")).not.toThrow();
  });

  it("assertWorkspace throws WorkspaceMismatchError on mismatch", () => {
    expect(() => assertWorkspace("ws-1", "ws-2")).toThrow(WorkspaceMismatchError);
    try {
      assertWorkspace("ws-1", "ws-2");
    } catch (e) {
      const err = e as WorkspaceMismatchError;
      expect(err.expected).toBe("ws-2");
      expect(err.actual).toBe("ws-1");
    }
  });

  it("scopeToWorkspace adds workspaceId to query", () => {
    const query = { status: "active", page: 1 };
    const scoped = scopeToWorkspace(query, "ws-42");
    expect(scoped.workspaceId).toBe("ws-42");
    expect(scoped.status).toBe("active");
    expect(scoped.page).toBe(1);
  });

  it("scopeToWorkspace overrides existing workspaceId", () => {
    const query = { workspaceId: "old" };
    const scoped = scopeToWorkspace(query, "new");
    expect(scoped.workspaceId).toBe("new");
  });

  it("belongsToWorkspace returns true for matching entity", () => {
    expect(belongsToWorkspace({ workspaceId: "ws-1" }, "ws-1")).toBe(true);
  });

  it("belongsToWorkspace returns false for non-matching entity", () => {
    expect(belongsToWorkspace({ workspaceId: "ws-1" }, "ws-2")).toBe(false);
  });
});
