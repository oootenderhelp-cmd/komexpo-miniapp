/**
 * CRM pipeline state machine.
 *
 * Stages progress forward through the tender lifecycle. From most stages you may
 * also drop to `lost` (no bid / lost auction). Backward moves are allowed only
 * one step (e.g. return from pricing to analysis for rework). `won` and `lost`
 * are terminal.
 */
import type { AuditSink } from "./audit.js";

export type CrmStage =
  | "lead"
  | "qualification"
  | "analysis"
  | "pricing"
  | "approval"
  | "submitted"
  | "won"
  | "lost";

export const CRM_STAGES: CrmStage[] = [
  "lead",
  "qualification",
  "analysis",
  "pricing",
  "approval",
  "submitted",
  "won",
  "lost",
];

const FORWARD: Record<CrmStage, CrmStage[]> = {
  lead: ["qualification", "lost"],
  qualification: ["analysis", "lost"],
  analysis: ["pricing", "lost"],
  pricing: ["approval", "analysis", "lost"], // may return to analysis for rework
  approval: ["submitted", "pricing", "lost"], // may bounce back to pricing
  submitted: ["won", "lost"],
  won: [],
  lost: [],
};

export function allowedTransitions(from: CrmStage): CrmStage[] {
  return FORWARD[from];
}

export function canTransition(from: CrmStage, to: CrmStage): boolean {
  return FORWARD[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: CrmStage,
    readonly to: CrmStage,
  ) {
    super(`Недопустимый переход воронки: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export interface PipelineItem {
  id: string;
  stage: CrmStage;
  workspaceId?: string;
}

/**
 * Move a pipeline item to a new stage. Throws on an illegal transition and
 * writes an audit record on success.
 */
export async function moveStage(
  item: PipelineItem,
  to: CrmStage,
  ctx: { audit: AuditSink; actorId?: string },
): Promise<PipelineItem> {
  if (!canTransition(item.stage, to)) {
    throw new InvalidTransitionError(item.stage, to);
  }
  const from = item.stage;
  const next: PipelineItem = { ...item, stage: to };
  await ctx.audit.record({
    action: "crm.stage.moved",
    entityType: "crm_pipeline_item",
    entityId: item.id,
    actorId: ctx.actorId,
    workspaceId: item.workspaceId,
    metadata: { from, to },
  });
  return next;
}

/** Aggregate funnel statistics from a set of items. */
export function funnelStats(items: PipelineItem[]): Record<CrmStage, number> {
  const stats = Object.fromEntries(CRM_STAGES.map((s) => [s, 0])) as Record<CrmStage, number>;
  for (const it of items) stats[it.stage] += 1;
  return stats;
}
