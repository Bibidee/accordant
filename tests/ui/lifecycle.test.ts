import { describe, expect, it } from "vitest";
import { CHAIN_ID, RPC_URL } from "../../lib/constants";
import { deriveProductResult, isPrivateOrLocalHostname, validateEvidenceRefs, validateEvidenceUrl } from "../../lib/validation";
import type { Criterion, EvidenceRef } from "../../lib/types";

describe("Accordant network lock", () => {
  it("targets Studionet 61999", () => expect(CHAIN_ID).toBe(61999));
  it("targets the Studionet RPC", () => expect(RPC_URL).toContain("studio.genlayer.com/api"));

  const criteria: Criterion[] = [{ index: 0, text: "A required deliverable exists", required: true }, { index: 1, text: "An optional polish pass exists", required: false }];
  it("derives required-result precedence and ignores optional failures", () => {
    expect(deriveProductResult(criteria, [{ index: 0, status: "MET" }, { index: 1, status: "NOT_MET" }])).toBe("ACCEPTED");
    expect(deriveProductResult(criteria, [{ index: 0, status: "UNVERIFIABLE" }, { index: 1, status: "MET" }])).toBe("INCONCLUSIVE");
    expect(deriveProductResult(criteria, [{ index: 0, status: "NOT_MET" }, { index: 1, status: "UNVERIFIABLE" }])).toBe("REVISION_REQUIRED");
    expect(deriveProductResult(criteria, [{ index: 0, status: "MET" }])).toBe("INCONCLUSIVE");
    expect(deriveProductResult(criteria, [{ index: 0, status: "MET" }, { index: 0, status: "MET" }])).toBe("INCONCLUSIVE");
  });
  it("keeps evidence criterion-bound and bounded", () => {
    const ref: EvidenceRef = { criterion: 0, kind: "VERSIONED_SOURCE", url: "https://example.com/commit/abc" };
    expect(validateEvidenceRefs(criteria, [ref])).toBe("");
    expect(validateEvidenceRefs(criteria, [{ ...ref, url: "http://example.com" }])).not.toBe("");
    expect(validateEvidenceRefs(criteria, [{ ...ref, criterion: 9 }])).not.toBe("");
    expect(validateEvidenceRefs(criteria, [ref, ref])).not.toBe("");
  });

  it("keeps frontend evidence URL rules aligned with the contract boundary", () => {
    for (const url of ["https://example.com/proof", "https://example.com:443/proof", "https://EXAMPLE.com./proof", "https://[2001:4860:4860::8888]/proof"]) {
      expect(validateEvidenceUrl(url)).toBe("");
    }
    for (const url of ["http://example.com/proof", "https://localhost/proof", "https://127.0.0.1/proof", "https://10.0.0.1/proof", "https://[::1]/proof", "https://[fd00::1]/proof", "https://example.com/proof#fragment", "https://user:pass@example.com/proof", "https://example.com:bad/proof"]) {
      expect(validateEvidenceUrl(url)).not.toBe("");
    }
    expect(isPrivateOrLocalHostname("localhost")).toBe(true);
    expect(isPrivateOrLocalHostname("192.168.1.4")).toBe(true);
    expect(isPrivateOrLocalHostname("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateOrLocalHostname("example.com")).toBe(false);
  });
});
