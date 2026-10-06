import { describe, expect, it } from "vitest";
import { CHAIN_ID, RPC_URL } from "../../lib/constants";
import { deriveProductResult, validateEvidenceRefs } from "../../lib/validation";
import type { Criterion, EvidenceRef } from "../../lib/types";

describe("Accordant network lock", () => {
  it("targets Studionet 61999", () => expect(CHAIN_ID).toBe(61999));
  it("targets the Studionet RPC", () => expect(RPC_URL).toContain("studio.genlayer.com/api"));

  const criteria: Criterion[] = [{ index: 0, text: "A required deliverable exists", required: true }, { index: 1, text: "An optional polish pass exists", required: false }];
  it("derives required-result precedence and ignores optional failures", () => {
    expect(deriveProductResult(criteria, [{ index: 0, status: "MET" }, { index: 1, status: "NOT_MET" }])).toBe("ACCEPTED");
    expect(deriveProductResult(criteria, [{ index: 0, status: "UNVERIFIABLE" }, { index: 1, status: "MET" }])).toBe("INCONCLUSIVE");
    expect(deriveProductResult(criteria, [{ index: 0, status: "NOT_MET" }, { index: 1, status: "UNVERIFIABLE" }])).toBe("REVISION_REQUIRED");
  });
  it("keeps evidence criterion-bound and bounded", () => {
    const ref: EvidenceRef = { criterion: 0, kind: "VERSIONED_SOURCE", url: "https://example.com/commit/abc" };
    expect(validateEvidenceRefs(criteria, [ref])).toBe("");
    expect(validateEvidenceRefs(criteria, [{ ...ref, url: "http://example.com" }])).not.toBe("");
    expect(validateEvidenceRefs(criteria, [{ ...ref, criterion: 9 }])).not.toBe("");
    expect(validateEvidenceRefs(criteria, [ref, ref])).not.toBe("");
  });
});
