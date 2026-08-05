/**
 * Lightweight OpenAPI sanity check (no network, no heavy validator).
 * Parses the YAML and asserts the required top-level shape + that every
 * required endpoint group is present. Run: `npm run openapi:validate`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = join(__dirname, "..", "openapi", "tendrovik.openapi.yaml");

const doc = parse(readFileSync(specPath, "utf8"));

const errors = [];
if (doc.openapi !== "3.1.0") errors.push(`openapi must be 3.1.0, got ${doc.openapi}`);
if (!doc.info?.title) errors.push("info.title missing");
if (!doc.paths || Object.keys(doc.paths).length === 0) errors.push("no paths defined");

const requiredPaths = [
  "/onboarding/survey",
  "/tenders",
  "/tenders/{tenderId}",
  "/tenders/{tenderId}/pricing",
  "/tenders/{tenderId}/decision",
  "/tenders/{tenderId}/approval-requests",
  "/approval-requests/{requestId}/steps/{role}",
  "/approval-requests/{requestId}/authorize-submission",
  "/knowledge/documents",
  "/crm/pipeline",
  "/crm/stats",
  "/support/chat",
  "/support/tickets",
  "/ads/slots/{slotCode}/serve",
  "/integrations",
  "/monitoring/rules",
  "/notifications",
];
for (const p of requiredPaths) {
  if (!doc.paths[p]) errors.push(`missing required path: ${p}`);
}

// Every referenced component schema must exist.
const specText = readFileSync(specPath, "utf8");
const refs = [...specText.matchAll(/#\/components\/schemas\/([A-Za-z0-9]+)/g)].map((m) => m[1]);
const defined = new Set(Object.keys(doc.components?.schemas ?? {}));
for (const r of new Set(refs)) {
  if (!defined.has(r)) errors.push(`dangling $ref: #/components/schemas/${r}`);
}

if (errors.length) {
  console.error("OpenAPI validation FAILED:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}

console.log(
  `OpenAPI OK: ${Object.keys(doc.paths).length} paths, ${defined.size} schemas, ${new Set(refs).size} refs resolved.`,
);
