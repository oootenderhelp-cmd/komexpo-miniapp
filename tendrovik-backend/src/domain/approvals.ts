/**
 * Approval workflow.
 *
 * A tender submission requires a chain of sign-offs. The default required chain
 * is: estimator (сметчик) → lawyer (юрист) → tender_specialist (тендеровик) →
 * owner (владелец). Submission is HARD-BLOCKED until every required step is
 * approved. Even then, the foundation module never performs the legally
 * significant submission itself — it only unlocks a human confirmation step.
 */
import type { AuditSink } from "./audit.js";

export type ApprovalRole = "estimator" | "lawyer" | "tender_specialist" | "owner";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_requested";

export const DEFAULT_APPROVAL_CHAIN: ApprovalRole[] = [
  "estimator",
  "lawyer",
  "tender_specialist",
  "owner",
];

export interface ApprovalStep {
  role: ApprovalRole;
  order: number;
  required: boolean;
  status: ApprovalStatus;
}

export interface ApprovalRequest {
  id: string;
  tenderId: string;
  workspaceId?: string;
  steps: ApprovalStep[];
}

export function createApprovalRequest(
  id: string,
  tenderId: string,
  opts: { chain?: ApprovalRole[]; workspaceId?: string } = {},
): ApprovalRequest {
  const chain = opts.chain ?? DEFAULT_APPROVAL_CHAIN;
  return {
    id,
    tenderId,
    workspaceId: opts.workspaceId,
    steps: chain.map((role, i) => ({ role, order: i + 1, required: true, status: "pending" })),
  };
}

/** Record a decision for a role's step. Emits an audit record. */
export async function signStep(
  request: ApprovalRequest,
  role: ApprovalRole,
  status: Exclude<ApprovalStatus, "pending">,
  ctx: { audit: AuditSink; actorId?: string; comment?: string },
): Promise<ApprovalRequest> {
  const step = request.steps.find((s) => s.role === role);
  if (!step) throw new Error(`В заявке нет шага для роли ${role}`);
  step.status = status;
  await ctx.audit.record({
    action: "approval.signed",
    entityType: "approval_step",
    entityId: `${request.id}:${role}`,
    actorId: ctx.actorId,
    workspaceId: request.workspaceId,
    metadata: { role, status, comment: ctx.comment },
  });
  return request;
}

export interface GateResult {
  allowed: boolean;
  missing: ApprovalRole[];
  rejected: ApprovalRole[];
}

/** Pure check: are all required steps approved (and none rejected)? */
export function evaluateGate(request: ApprovalRequest): GateResult {
  const missing: ApprovalRole[] = [];
  const rejected: ApprovalRole[] = [];
  for (const s of request.steps) {
    if (!s.required) continue;
    if (s.status === "rejected" || s.status === "changes_requested") rejected.push(s.role);
    else if (s.status !== "approved") missing.push(s.role);
  }
  return { allowed: missing.length === 0 && rejected.length === 0, missing, rejected };
}

export class SubmissionBlockedError extends Error {
  constructor(readonly result: GateResult) {
    const parts: string[] = [];
    if (result.missing.length) parts.push(`нет согласований: ${result.missing.join(", ")}`);
    if (result.rejected.length) parts.push(`есть отклонения: ${result.rejected.join(", ")}`);
    super(`Подача запрещена — ${parts.join("; ")}.`);
    this.name = "SubmissionBlockedError";
  }
}

/**
 * Gate the (human-confirmed) submission. Throws unless every required approval
 * is in place. On success emits an audit record. This does NOT submit anything
 * to a procurement platform — it authorizes the human confirmation step only.
 */
export async function authorizeSubmission(
  request: ApprovalRequest,
  ctx: { audit: AuditSink; actorId?: string },
): Promise<GateResult> {
  const result = evaluateGate(request);
  if (!result.allowed) throw new SubmissionBlockedError(result);
  await ctx.audit.record({
    action: "submission.authorized",
    entityType: "approval_request",
    entityId: request.id,
    actorId: ctx.actorId,
    workspaceId: request.workspaceId,
    metadata: { tenderId: request.tenderId },
  });
  return result;
}
