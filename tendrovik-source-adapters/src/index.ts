export type {
  SourceSegment,
  SourceAccessMethod,
  SourceCapability,
  SourceTermsGate,
  SourceHealth,
  TenderDocumentRef,
  NormalizedTender,
  TenderSource,
} from "./interfaces/index.js";

export { isGateOpen, CLOSED_GATE } from "./interfaces/index.js";

export {
  SOURCE_REGISTRY,
  getSource,
  listSources,
  sourcesBySegment,
  sourcesRequiringKep,
  sourcesWithPublicSearch,
} from "./registry/sources.js";

export {
  ImportBlockedError,
  checkGate,
  assertImportAllowed,
  guardedImport,
  openGate,
} from "./gate/index.js";

export { normalize, deduplicate, dedupeKey } from "./normalizer/index.js";

export type {
  RawTenderPayload,
  EisRawTender,
  B2bCenterRawTender,
  SberbankAstRawTender,
} from "./fixtures/index.js";

export {
  FIXTURE_EIS,
  FIXTURE_B2B_CENTER,
  FIXTURE_SBERBANK_AST,
} from "./fixtures/index.js";
