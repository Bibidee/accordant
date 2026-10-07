import { describe, expect, it } from "vitest";
import { CHAIN_ID, RPC_URL } from "../../lib/constants";
import { deriveProductResult, isPrivateOrLocalHostname, normalizeEvidenceUrl, validateEvidenceRefs, validateEvidenceUrl, validatePerformerAddress } from "../../lib/validation";
import { canonicalAttemptMatch, canonicalEvidence, canonicalFrozenTerms, canonicalJson, computeSubmissionDigest, computeTermsDigest, frozenTermsMatch } from "../../lib/canonical";
import { FAILURE_PHASES, SUCCESS_STAGES, transactionRailState } from "../../lib/transaction";
import { isCurrentWalletPageRequest, latestFirstPage, olderPage } from "../../lib/pagination";
import { WORK_SECTION_CONFIG, workSectionLabel } from "../../lib/work";
import type { Attempt, Criterion, Engagement, EvidenceRef } from "../../lib/types";

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
    for (const url of ["https://127.1/proof", "https://2130706433/proof", "https://0x7f000001/proof", "https://0177.0.0.1/proof", "https://[0:0:0:0:0:ffff:7f00:1]/proof", "https://example.com:0/proof", "https://example.com:65536/proof", "https://2001:db8::1/proof"]) {
      expect(validateEvidenceUrl(url)).not.toBe("");
    }
    expect(normalizeEvidenceUrl("https://EXAMPLE.com.:443/proof")).toBe("https://example.com/proof");
    expect(validatePerformerAddress("0x0000000000000000000000000000000000000000")).not.toBe("");
    expect(validatePerformerAddress("0x1111111111111111111111111111111111111111")).toBe("");
    expect(isPrivateOrLocalHostname("localhost")).toBe(true);
    expect(isPrivateOrLocalHostname("192.168.1.4")).toBe(true);
    expect(isPrivateOrLocalHostname("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateOrLocalHostname("example.com")).toBe(false);
  });
});

describe("latest-first wallet pagination", () => {
  it("opens at the newest bounded window for every boundary total", () => {
    const expected: Array<[number, number, number, number, boolean, number]> = [
      [0, 0, 1, 0, false, 0], [1, 0, 1, 1, false, 0], [19, 0, 19, 19, false, 0],
      [20, 0, 20, 20, false, 0], [21, 1, 20, 20, true, 1], [39, 19, 20, 20, true, 19],
      [40, 20, 20, 20, true, 20], [41, 21, 20, 20, true, 21], [100, 80, 20, 20, true, 80],
      [121, 101, 20, 20, true, 101],
    ];
    for (const [total, offset, limit, count, hasOlder, remainingCount] of expected) {
      expect(latestFirstPage(total, 20)).toEqual({ offset, limit, count, hasOlder, remainingCount });
      expect(latestFirstPage(total, 20).count).toBeLessThanOrEqual(20);
    }
  });

  it("walks older windows without gaps, duplicates, or underflow", () => {
    const first = latestFirstPage(53, 20);
    const second = olderPage(53, first.offset, 20);
    const third = olderPage(53, second.offset, 20);
    expect(first).toEqual({ offset: 33, limit: 20, count: 20, hasOlder: true, remainingCount: 33 });
    expect(second).toEqual({ offset: 13, limit: 20, count: 20, hasOlder: true, remainingCount: 13 });
    expect(third).toEqual({ offset: 0, limit: 13, count: 13, hasOlder: false, remainingCount: 0 });
  });

  it("rejects stale account or generation results", () => {
    expect(isCurrentWalletPageRequest("0xAAA", 2, "0xaaa", 2)).toBe(true);
    expect(isCurrentWalletPageRequest("0xAAA", 2, "0xbbb", 2)).toBe(false);
    expect(isCurrentWalletPageRequest("0xAAA", 2, "0xaaa", 3)).toBe(false);
  });

  it("keeps the three role sections distinct", () => {
    expect(WORK_SECTION_CONFIG.map((section) => [section.key, section.method])).toEqual([
      ["created", "get_requester_engagements"],
      ["incoming", "get_performer_incoming"],
      ["accepted", "get_performer_engagements"],
    ]);
    expect(workSectionLabel("incoming")).toBe("Incoming");
    expect(workSectionLabel("accepted")).toBe("Accepted performer");
  });
});

describe("canonical frozen terms and evidence", () => {
  const terms = canonicalFrozenTerms({
    requester: "0x1111111111111111111111111111111111111111",
    performer: "0x2222222222222222222222222222222222222222",
    title: " Ship the view ",
    summary: " A production analytics view is available ",
    criteria: [
      { text: "A required deliverable exists", required: true },
      { text: "An optional polish pass exists", required: false },
    ],
    proposalDeadline: 1700000000,
    deliveryDeadline: 1700003600,
  });

  it("matches the contract terms digest fixture", async () => {
    expect(canonicalJson({ z: "é", a: 1 })).toBe('{"a":1,"z":"\\u00e9"}');
    await expect(computeTermsDigest(terms)).resolves.toBe("070bac1d584d5c7f1744f95c6b7caef0a58a36607595b5d29684315d6aaf6eb2");
  });

  it("requires every frozen term and criterion position to match", async () => {
    const digest = await computeTermsDigest(terms);
    const engagement = {
      id: "7", requester: terms.requester, performer: terms.performer, title: terms.title, summary: terms.summary,
      criteria: terms.criteria, terms_digest: digest, proposal_deadline: terms.proposalDeadline, delivery_deadline: terms.deliveryDeadline,
      status: "PROPOSED", accepted_at: 0, attempt_count: 0, latest_result: "", completed_at: 0, created_at: 1,
    } as Engagement;
    expect(frozenTermsMatch(engagement, terms, digest)).toBe(true);
    expect(frozenTermsMatch({ ...engagement, criteria: [...terms.criteria].reverse() }, terms, digest)).toBe(false);
    expect(frozenTermsMatch({ ...engagement, summary: "different" }, terms, digest)).toBe(false);
    expect(frozenTermsMatch({ ...engagement, terms_digest: "different" }, terms, digest)).toBe(false);
  });

  it("matches the contract submission digest and canonical stored payload", async () => {
    const refs: EvidenceRef[] = [
      { criterion: 1, kind: "PUBLIC_ARTIFACT", url: "https://example.com/b", note: " second " },
      { criterion: 0, kind: "VERSIONED_SOURCE", url: "https://EXAMPLE.com.:443/a", note: "Note" },
    ];
    const canonical = canonicalEvidence(refs);
    expect(canonical.storedJson).toBe('[{"criterion":0,"kind":"VERSIONED_SOURCE","note":"Note","url":"https://example.com/a"},{"criterion":1,"kind":"PUBLIC_ARTIFACT","note":"second","url":"https://example.com/b"}]');
    await expect(computeSubmissionDigest("1", "070bac1d584d5c7f1744f95c6b7caef0a58a36607595b5d29684315d6aaf6eb2", refs)).resolves.toMatchObject({
      digest: "953c9f11a96d4d72293f23a3a4c678ce10676156e90ba2134581006b1f616377",
      storedJson: canonical.storedJson,
    });
  });

  it("only verifies the exact newly appended attempt and resulting status", () => {
    const attempt = { number: 2, submission_digest: "digest", evidence_json: "evidence", result: "REVISION_REQUIRED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const engagement = { status: "ACTIVE", latest_result: "REVISION_REQUIRED" } as Engagement;
    expect(canonicalAttemptMatch(engagement, attempt, 2, "digest", "evidence")).toBe(true);
    expect(canonicalAttemptMatch(engagement, { ...attempt, number: 1 }, 2, "digest", "evidence")).toBe(false);
    expect(canonicalAttemptMatch({ ...engagement, latest_result: "INCONCLUSIVE" }, attempt, 2, "digest", "evidence")).toBe(false);
  });
});

describe("transaction terminal and canonical states", () => {
  it("keeps all terminal failures off the successful rail", () => {
    for (const phase of ["FAILED", "CANCELED", "UNDETERMINED", "MONITORING_STOPPED"] as const) {
      expect(FAILURE_PHASES.has(phase)).toBe(true);
      expect(transactionRailState(phase, false)).toEqual({ terminalFailure: true, current: phase });
      expect(SUCCESS_STAGES.some((stage) => stage.key === phase)).toBe(false);
    }
  });

  it("only reaches canonical verified after the explicit callback succeeds", () => {
    expect(transactionRailState("FINALIZED", false)).toEqual({ terminalFailure: false, current: "FINALIZED" });
    expect(transactionRailState("FINALIZED", true)).toEqual({ terminalFailure: false, current: "CANONICAL_VERIFIED" });
  });
});
