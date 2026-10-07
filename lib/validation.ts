import type { Criterion, CriterionStatus, EvidenceKind, EvidenceRef, ProductResult } from "@/lib/types";

export const MAX_EVIDENCE_PER_CRITERION = 2;
export const MAX_EVIDENCE_TOTAL = 10;
export const MAX_EVIDENCE_URL_CHARS = 600;
export const EVIDENCE_KINDS: EvidenceKind[] = ["VERSIONED_SOURCE", "TRANSACTION", "PUBLIC_ARTIFACT", "LIVE_DEPLOYMENT"];

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return false;
  const values = parts.map(Number);
  if (values.some((value) => value < 0 || value > 255)) return false;
  const [first, second] = values;
  return first === 0 || first === 10 || first === 127 || (first === 100 && second >= 64 && second <= 127) || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const compact = normalized.replaceAll(":", "");
  if (normalized === "::" || normalized === "::1" || compact === "" || compact === "1") return true;
  const first = normalized.split(":", 1)[0];
  if (/^(fc|fd)/.test(first) || /^fe[89ab]/.test(first)) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    if (mapped.includes(".") && isPrivateIpv4(mapped)) return true;
    const parts = mapped.split(":");
    if (parts.length === 2 && parts.every((part) => /^[0-9a-f]{1,4}$/.test(part))) {
      const left = Number.parseInt(parts[0], 16); const right = Number.parseInt(parts[1], 16);
      return isPrivateIpv4(`${left >> 8}.${left & 255}.${right >> 8}.${right & 255}`);
    }
  }
  return false;
}

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host === "localhost.localdomain" || host.endsWith(".local") || host.endsWith(".internal") || isPrivateIpv4(host) || isPrivateIpv6(host);
}

export function validateEvidenceUrl(raw: string): string {
  const value = raw.trim();
  if (value.length < 12 || value.length > MAX_EVIDENCE_URL_CHARS || /\s/.test(value)) return "Evidence URL length is invalid.";
  let parsed: URL;
  try { parsed = new URL(value); } catch { return "Evidence must be a valid HTTPS URL."; }
  if (parsed.protocol !== "https:") return "Evidence must use HTTPS.";
  if (parsed.username || parsed.password || parsed.hash) return "Evidence URLs cannot contain credentials or fragments.";
  if (!parsed.hostname || isPrivateOrLocalHostname(parsed.hostname)) return "Private or local evidence URLs are not allowed.";
  return "";
}

export function deriveProductResult(criteria: Criterion[], statuses: Array<{ index: number; status: CriterionStatus }>): ProductResult {
  const byIndex = new Map(statuses.map((item) => [item.index, item.status]));
  if (criteria.some((criterion) => !byIndex.has(criterion.index))) return "INCONCLUSIVE";
  if (criteria.some((criterion) => criterion.required && byIndex.get(criterion.index) === "NOT_MET")) return "REVISION_REQUIRED";
  if (criteria.some((criterion) => criterion.required && byIndex.get(criterion.index) === "UNVERIFIABLE")) return "INCONCLUSIVE";
  return "ACCEPTED";
}

export function validateEvidenceRefs(criteria: Criterion[], refs: EvidenceRef[]): string {
  if (refs.length < 1 || refs.length > MAX_EVIDENCE_TOTAL) return "Use 1–10 evidence references.";
  const known = new Set(criteria.map((criterion) => criterion.index));
  const counts = new Map<number, number>(); const identities = new Set<string>();
  for (const ref of refs) {
    if (!known.has(ref.criterion)) return "Evidence references an unknown criterion.";
    if (!EVIDENCE_KINDS.includes(ref.kind)) return "Evidence source kind is not supported.";
    const urlError = validateEvidenceUrl(ref.url); if (urlError) return urlError;
    const count = (counts.get(ref.criterion) || 0) + 1; if (count > MAX_EVIDENCE_PER_CRITERION) return "Each criterion may have at most two evidence references."; counts.set(ref.criterion, count);
    const identity = `${ref.criterion}:${ref.kind}:${ref.url}`; if (identities.has(identity)) return "Duplicate evidence references are not allowed."; identities.add(identity);
  }
  return "";
}
