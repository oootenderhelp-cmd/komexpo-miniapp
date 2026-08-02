export class WorkspaceMismatchError extends Error {
  constructor(
    public readonly expected: string,
    public readonly actual: string,
  ) {
    super(`Workspace mismatch: token workspace "${actual}" does not match requested "${expected}"`);
    this.name = "WorkspaceMismatchError";
  }
}

export function assertWorkspace(tokenWorkspaceId: string, requestedWorkspaceId: string): void {
  if (tokenWorkspaceId !== requestedWorkspaceId) {
    throw new WorkspaceMismatchError(requestedWorkspaceId, tokenWorkspaceId);
  }
}

export function scopeToWorkspace<T extends Record<string, unknown>>(
  query: T,
  workspaceId: string,
): T & { workspaceId: string } {
  return { ...query, workspaceId };
}

export function belongsToWorkspace(
  entity: { workspaceId: string },
  workspaceId: string,
): boolean {
  return entity.workspaceId === workspaceId;
}
