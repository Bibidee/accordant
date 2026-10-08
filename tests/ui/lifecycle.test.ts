import { describe, expect, it } from "vitest";
import { CHAIN_ID, RPC_URL } from "../../lib/constants";
import { deriveProductResult, isPrivateOrLocalHostname, normalizeEvidenceUrl, validateEvidenceRefs, validateEvidenceUrl, validatePerformerAddress } from "../../lib/validation";
import { attemptIdentityMatches, attemptStateIsConsistent, canSubmitEvidence, canonicalAttemptMatch, canonicalEvidence, canonicalFrozenTerms, canonicalJson, computeSubmissionDigest, computeTermsDigest, findCanonicalAttemptAfterBaseline, frozenTermsMatch } from "../../lib/canonical";
import { FAILURE_PHASES, SUCCESS_STAGES, transactionRailState } from "../../lib/transaction";
import { isCurrentWalletPageRequest, latestFirstPage, latestPageWithRetry, olderPage } from "../../lib/pagination";
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
    const ref: EvidenceRef = { criterion: 0, kind: "VERSIONED_SOURCE", url: "https://github.com/example/repository/commit/0123456789abcdef0123456789abcdef01234567/proof", repository: "example/repository", revision: "0123456789abcdef0123456789abcdef01234567", revision_kind: "commit" };
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

  it("fetches one stable latest page when the total is unchanged", async () => {
    const calls: Array<[number, number]> = [];
    const result = await latestPageWithRetry(
      async () => ({ total: 53 }),
      async (offset, limit) => { calls.push([offset, limit]); return { total: 53, ids: [] }; },
      (page) => page.total,
      20,
    );
    expect(result).toMatchObject({ offset: 33, limit: 20, retried: false, probeTotal: 53 });
    expect(calls).toEqual([[33, 20]]);
  });

  it("recalculates once when one concurrent append changes the page total", async () => {
    const calls: Array<[number, number]> = [];
    let pageReads = 0;
    const result = await latestPageWithRetry(
      async () => ({ total: 53 }),
      async (offset, limit) => { calls.push([offset, limit]); pageReads += 1; return { total: pageReads === 1 ? 54 : 54, ids: [] }; },
      (page) => page.total,
      20,
    );
    expect(result).toMatchObject({ offset: 34, limit: 20, retried: true, probeTotal: 53 });
    expect(calls).toEqual([[33, 20], [34, 20]]);
  });

  it("accepts the second bounded response if writes continue during the retry", async () => {
    let pageReads = 0;
    const result = await latestPageWithRetry(
      async () => ({ total: 53 }),
      async () => { pageReads += 1; return { total: 53 + pageReads, ids: [] }; },
      (page) => page.total,
      20,
    );
    expect(result.retried).toBe(true);
    expect(pageReads).toBe(2);
    expect(result.page.total).toBe(55);
  });

  it("uses a safe one-record query for an empty index", async () => {
    const calls: Array<[number, number]> = [];
    const result = await latestPageWithRetry(
      async () => ({ total: 0 }),
      async (offset, limit) => { calls.push([offset, limit]); return { total: 0, ids: [] }; },
      (page) => page.total,
      20,
    );
    expect(result).toMatchObject({ offset: 0, limit: 1, retried: false });
    expect(calls).toEqual([[0, 1]]);
  });
});

describe("canonical frozen terms and evidence", () => {
  it("only keeps the evidence desk open for active engagements", () => {
    expect(canSubmitEvidence({ status: "ACTIVE" })).toBe(true);
    for (const status of ["PROPOSED", "COMPLETED", "DECLINED", "CANCELLED", "EXPIRED"] as const) {
      expect(canSubmitEvidence({ status })).toBe(false);
    }
  });

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
    await expect(computeTermsDigest(terms)).resolves.toBe("c81b3cec3baca6f25d81f0dca726fa4d93ac8e37c1cd20f65e456bca592f5761");
  });

  it("uses contract-compatible checksum addresses for mixed-case wallet input", async () => {
    const mixedCase = canonicalFrozenTerms({
      ...terms,
      requester: "0xff203bb65942f50cb81a8af98c5f5bd9d8a79b54",
      performer: "0x3c4c71d8c449471acc31ad59187231001856655c",
    });
    expect(mixedCase.requester).toBe("0xFf203Bb65942F50CB81A8AF98c5F5bd9d8a79b54");
    expect(mixedCase.performer).toBe("0x3c4c71D8C449471acC31AD59187231001856655C");
    const digest = await computeTermsDigest(mixedCase);
    expect(frozenTermsMatch({
      id: "18", requester: mixedCase.requester, performer: mixedCase.performer, title: mixedCase.title, summary: mixedCase.summary,
      criteria: mixedCase.criteria, terms_digest: digest, proposal_deadline: mixedCase.proposalDeadline, delivery_deadline: mixedCase.deliveryDeadline,
      evidence_policy_json: mixedCase.evidencePolicyJson, challenge_window_seconds: mixedCase.challengeWindowSeconds, escrow_amount: Number(mixedCase.escrowAmountWei),
      status: "PROPOSED", accepted_at: 0, attempt_count: 0, latest_result: "", completed_at: 0, created_at: 1,
    } as Engagement, mixedCase, digest)).toBe(true);
  });

  it("requires every frozen term and criterion position to match", async () => {
    const digest = await computeTermsDigest(terms);
    const engagement = {
      id: "7", requester: terms.requester, performer: terms.performer, title: terms.title, summary: terms.summary,
      criteria: terms.criteria, terms_digest: digest, proposal_deadline: terms.proposalDeadline, delivery_deadline: terms.deliveryDeadline,
      evidence_policy_json: terms.evidencePolicyJson, challenge_window_seconds: terms.challengeWindowSeconds, escrow_amount: Number(terms.escrowAmountWei),
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
      { criterion: 0, kind: "VERSIONED_SOURCE", url: "https://github.com/example/repository/commit/0123456789abcdef0123456789abcdef01234567/a", note: "Note", repository: "example/repository", revision: "0123456789abcdef0123456789abcdef01234567", revision_kind: "commit" },
    ];
    const canonical = canonicalEvidence(refs);
    expect(canonical.storedJson).toBe('[{"chain_id":0,"contract":"","criterion":0,"kind":"VERSIONED_SOURCE","network":"","note":"Note","repository":"example/repository","revision":"0123456789abcdef0123456789abcdef01234567","revision_kind":"commit","transaction_hash":"","url":"https://github.com/example/repository/commit/0123456789abcdef0123456789abcdef01234567/a"},{"chain_id":0,"contract":"","criterion":1,"kind":"PUBLIC_ARTIFACT","network":"","note":"second","repository":"","revision":"","revision_kind":"commit","transaction_hash":"","url":"https://example.com/b"}]');
    await expect(computeSubmissionDigest("1", "070bac1d584d5c7f1744f95c6b7caef0a58a36607595b5d29684315d6aaf6eb2", refs)).resolves.toMatchObject({
      digest: "3b85a11c6ea0dfc7384a872dcd94ce49e61f3e8292c4e5e404db036a412ffd20",
      storedJson: canonical.storedJson,
    });
  });

  it("verifies a concurrent submission by digest among appended attempts", async () => {
    const attempts = [
      { number: 3, submission_digest: "digest-A", evidence_json: "evidence-A", result: "REVISION_REQUIRED", decisions_json: "[]", submitted_at: 1 },
      { number: 4, submission_digest: "digest-B", evidence_json: "evidence-B", result: "INCONCLUSIVE", decisions_json: "[]", submitted_at: 2 },
    ] as Attempt[];
    const found = await findCanonicalAttemptAfterBaseline({
      baselineAttemptCount: 2, currentAttemptCount: 4, expectedDigest: "digest-B", expectedEvidenceJson: "evidence-B",
      readPage: async (offset, limit) => ({ items: attempts.filter((attempt) => attempt.number > offset && attempt.number <= offset + limit), next_offset: 0, total: 4 }),
    });
    expect(found?.number).toBe(4);
  });

  it("accepts a historical revision attempt even after a later attempt changes latest_result", async () => {
    const userAttempt = { number: 3, submission_digest: "digest-B", evidence_json: "evidence-B", result: "REVISION_REQUIRED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const found = await findCanonicalAttemptAfterBaseline({
      baselineAttemptCount: 2, currentAttemptCount: 4, expectedDigest: "digest-B", expectedEvidenceJson: "evidence-B",
      readPage: async () => ({ items: [userAttempt, { ...userAttempt, number: 4, submission_digest: "digest-C", evidence_json: "evidence-C", result: "INCONCLUSIVE" } as Attempt], next_offset: 0, total: 4 }),
    });
    const engagement = { status: "ACTIVE", latest_result: "INCONCLUSIVE", attempt_count: 4 } as Engagement;
    expect(found?.number).toBe(3);
    expect(attemptIdentityMatches(userAttempt, "digest-B", "evidence-B")).toBe(true);
    expect(attemptStateIsConsistent(engagement, userAttempt)).toBe(true);
    expect(canonicalAttemptMatch({ engagement, attempt: userAttempt, expectedDigest: "digest-B", expectedEvidenceJson: "evidence-B" })).toBe(true);
  });

  it("verifies latest revision and accepted terminal attempts with their compatible state", () => {
    const revision = { number: 3, submission_digest: "digest", evidence_json: "evidence", result: "REVISION_REQUIRED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const accepted = { number: 3, submission_digest: "digest-A", evidence_json: "evidence-A", result: "ACCEPTED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    expect(attemptStateIsConsistent({ status: "ACTIVE", latest_result: "REVISION_REQUIRED", attempt_count: 3 } as Engagement, revision)).toBe(true);
    expect(attemptStateIsConsistent({ status: "COMPLETED", latest_result: "ACCEPTED", attempt_count: 3 } as Engagement, accepted)).toBe(true);
  });

  it("keeps a latest inconclusive attempt canonical after expiry", () => {
    const attempt = { number: 3, submission_digest: "digest-I", evidence_json: "evidence-I", result: "INCONCLUSIVE", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const engagement = { status: "EXPIRED", latest_result: "INCONCLUSIVE", attempt_count: 3 } as Engagement;
    expect(canonicalAttemptMatch({ engagement, attempt, expectedDigest: "digest-I", expectedEvidenceJson: "evidence-I" })).toBe(true);
  });

  it("keeps a latest revision-required attempt canonical after expiry", () => {
    const attempt = { number: 3, submission_digest: "digest-R", evidence_json: "evidence-R", result: "REVISION_REQUIRED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const engagement = { status: "EXPIRED", latest_result: "REVISION_REQUIRED", attempt_count: 3 } as Engagement;
    expect(canonicalAttemptMatch({ engagement, attempt, expectedDigest: "digest-R", expectedEvidenceJson: "evidence-R" })).toBe(true);
  });

  it("keeps a historical revision-required attempt canonical after a later attempt expires", () => {
    const attempt = { number: 3, submission_digest: "digest-R", evidence_json: "evidence-R", result: "REVISION_REQUIRED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const engagement = { status: "EXPIRED", latest_result: "INCONCLUSIVE", attempt_count: 4 } as Engagement;
    expect(canonicalAttemptMatch({ engagement, attempt, expectedDigest: "digest-R", expectedEvidenceJson: "evidence-R" })).toBe(true);
  });

  it("keeps a historical inconclusive attempt canonical after a later accepted attempt", () => {
    const attempt = { number: 3, submission_digest: "digest-I", evidence_json: "evidence-I", result: "INCONCLUSIVE", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const engagement = { status: "COMPLETED", latest_result: "ACCEPTED", attempt_count: 4 } as Engagement;
    expect(canonicalAttemptMatch({ engagement, attempt, expectedDigest: "digest-I", expectedEvidenceJson: "evidence-I" })).toBe(true);
  });

  it("rejects a latest non-accepted attempt paired with completed status", () => {
    const attempt = { number: 3, submission_digest: "digest-R", evidence_json: "evidence-R", result: "REVISION_REQUIRED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const engagement = { status: "COMPLETED", latest_result: "REVISION_REQUIRED", attempt_count: 3 } as Engagement;
    expect(canonicalAttemptMatch({ engagement, attempt, expectedDigest: "digest-R", expectedEvidenceJson: "evidence-R" })).toBe(false);
  });

  it("rejects an accepted attempt that is historical", () => {
    const attempt = { number: 3, submission_digest: "digest-A", evidence_json: "evidence-A", result: "ACCEPTED", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const engagement = { status: "COMPLETED", latest_result: "ACCEPTED", attempt_count: 4 } as Engagement;
    expect(canonicalAttemptMatch({ engagement, attempt, expectedDigest: "digest-A", expectedEvidenceJson: "evidence-A" })).toBe(false);
  });

  it("fails closed for no match, duplicate match, and an unchanged attempt count", async () => {
    const page = (items: Attempt[], total = 4) => async () => ({ items, next_offset: 0, total });
    const expected = { baselineAttemptCount: 2, currentAttemptCount: 4, expectedDigest: "digest", expectedEvidenceJson: "evidence" };
    const attempt = { number: 3, submission_digest: "digest", evidence_json: "evidence", result: "INCONCLUSIVE", decisions_json: "[]", submitted_at: 1 } as Attempt;
    await expect(findCanonicalAttemptAfterBaseline({ ...expected, readPage: page([]) })).resolves.toBeNull();
    await expect(findCanonicalAttemptAfterBaseline({ ...expected, readPage: page([attempt, { ...attempt, number: 4 }]) })).resolves.toBeNull();
    await expect(findCanonicalAttemptAfterBaseline({ ...expected, currentAttemptCount: 2, readPage: page([attempt]) })).resolves.toBeNull();
  });

  it("does not scan attempts beyond the canonical appended range", async () => {
    const offsets: number[] = [];
    const attempt = { number: 21, submission_digest: "digest", evidence_json: "evidence", result: "INCONCLUSIVE", decisions_json: "[]", submitted_at: 1 } as Attempt;
    const found = await findCanonicalAttemptAfterBaseline({
      baselineAttemptCount: 20, currentAttemptCount: 21, expectedDigest: "digest", expectedEvidenceJson: "evidence",
      readPage: async (offset, limit) => { offsets.push(offset, limit); return { items: [attempt], next_offset: 0, total: 21 }; },
    });
    expect(found?.number).toBe(21);
    expect(offsets).toEqual([20, 20]);
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
