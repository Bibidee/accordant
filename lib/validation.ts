import type { Criterion, CriterionStatus, EvidenceKind, EvidenceRef, ProductResult } from "@/lib/types";
import { ZERO_ADDRESS } from "./constants";

export const MAX_EVIDENCE_PER_CRITERION = 2;
export const MAX_EVIDENCE_TOTAL = 10;
export const MAX_EVIDENCE_URL_CHARS = 600;
export const EVIDENCE_KINDS: EvidenceKind[] = ["VERSIONED_SOURCE", "TRANSACTION", "PUBLIC_ARTIFACT", "LIVE_DEPLOYMENT"];

export function validatePerformerAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value.trim())) return "Enter a valid 20-byte performer wallet address.";
  if (value.trim().toLowerCase() === ZERO_ADDRESS) return "The performer wallet cannot be the zero address.";
  return "";
}

function ipv4Parts(hostname: string): number[] {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return [];
  if (parts.some((part) => part.length > 1 && part.startsWith("0"))) return [];
  const values = parts.map(Number);
  if (values.some((value) => value < 0 || value > 255)) return [];
  return values;
}

function isPrivateIpv4(hostname: string): boolean {
  const values = ipv4Parts(hostname);
  if (!values.length) return false;
  const [first, second] = values;
  return first === 0 || first === 10 || first === 127 || (first === 100 && second >= 64 && second <= 127) || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized.includes(".")) {
    const dotted = normalized.slice(normalized.lastIndexOf(":") + 1);
    const parts = ipv4Parts(dotted);
    if (!parts.length) return true;
  }
  let expanded = normalized;
  if (expanded.includes(".")) {
    const dotted = expanded.slice(expanded.lastIndexOf(":") + 1);
    const parts = ipv4Parts(dotted);
    expanded = `${expanded.slice(0, expanded.lastIndexOf(":") + 1)}${((parts[0] << 8) | parts[1]).toString(16)}:${((parts[2] << 8) | parts[3]).toString(16)}`;
  }
  if ((expanded.match(/::/g) || []).length > 1) return true;
  let groups: number[];
  if (expanded.includes("::")) {
    const [leftRaw, rightRaw] = expanded.split("::");
    const left = leftRaw ? leftRaw.split(":") : [];
    const right = rightRaw ? rightRaw.split(":") : [];
    const missing = 8 - left.length - right.length;
    if (missing < 1 || [...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return true;
    groups = [...left, ...Array(missing).fill("0"), ...right].map((part) => Number.parseInt(part, 16));
  } else {
    const parts = expanded.split(":");
    if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return true;
    groups = parts.map((part) => Number.parseInt(part, 16));
  }
  if (groups.every((value) => value === 0) || groups.slice(0, 7).every((value) => value === 0) && groups[7] === 1) return true;
  if ((groups[0] & 0xfe00) === 0xfc00 || (groups[0] & 0xffc0) === 0xfe80) return true;
  if (groups.slice(0, 5).every((value) => value === 0) && groups[5] === 0xffff) {
    return isPrivateIpv4(`${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`);
  }
  return false;
}

function isNumericHostForm(hostname: string): boolean {
  if (/^0x/i.test(hostname) || /^\d+$/.test(hostname)) return true;
  const parts = hostname.split(".");
  return parts.every((part) => /^\d+$/.test(part)) && !ipv4Parts(hostname).length;
}

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return host === "localhost" || host === "localhost.localdomain" || host.endsWith(".local") || host.endsWith(".internal") || isNumericHostForm(host) || isPrivateIpv4(host) || (host.includes(":") && isPrivateIpv6(host));
}

export function normalizeEvidenceUrl(raw: string): string {
  const value = raw.trim();
  if (value.length < 12 || value.length > MAX_EVIDENCE_URL_CHARS || /\s/.test(value)) return "";
  let parsed: URL;
  try { parsed = new URL(value); } catch { return ""; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash || !parsed.hostname || isPrivateOrLocalHostname(parsed.hostname)) return "";
  if (parsed.port && (Number(parsed.port) < 1 || Number(parsed.port) > 65535)) return "";
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const authorityHost = hostname.includes(":") ? `[${hostname}]` : hostname;
  const port = parsed.port && parsed.port !== "443" ? `:${parsed.port}` : "";
  return `https://${authorityHost}${port}${parsed.pathname}${parsed.search}`;
}

export function validateEvidenceUrl(raw: string): string {
  const value = raw.trim();
  if (value.length < 12 || value.length > MAX_EVIDENCE_URL_CHARS || /\s/.test(value)) return "Evidence URL length is invalid.";
  if (!normalizeEvidenceUrl(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:") return "Evidence must use HTTPS.";
      if (parsed.username || parsed.password || parsed.hash) return "Evidence URLs cannot contain credentials or fragments.";
    } catch { return "Evidence must be a valid HTTPS URL."; }
    return "Private or local evidence URLs are not allowed.";
  }
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
    if (ref.kind === "VERSIONED_SOURCE") {
      if (!ref.repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(ref.repository.trim().replace(/^\/+|\/+$/g, ""))) return "Versioned sources require an owner/repository declaration.";
      const revisionKind = ref.revision_kind || "commit";
      if (revisionKind === "commit" && !/^[0-9a-fA-F]{40}$/.test(ref.revision || "")) return "Versioned commits require a full 40-character SHA.";
      if (revisionKind === "release" && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(ref.revision || "")) return "Versioned releases require a valid immutable tag.";
      const sourceUrl = new URL(normalizeEvidenceUrl(ref.url));
      const parts = sourceUrl.pathname.split("/").filter(Boolean);
      const [owner, repository] = ref.repository.trim().replace(/^\/+|\/+$/g, "").split("/");
      const matchesCommit = revisionKind === "commit"
        && ((sourceUrl.hostname === "github.com" && parts[0]?.toLowerCase() === owner.toLowerCase() && parts[1]?.toLowerCase() === repository.toLowerCase() && parts[2] === "commit" && parts[3]?.toLowerCase() === ref.revision?.toLowerCase())
          || (sourceUrl.hostname === "raw.githubusercontent.com" && parts[0]?.toLowerCase() === owner.toLowerCase() && parts[1]?.toLowerCase() === repository.toLowerCase() && parts[2]?.toLowerCase() === ref.revision?.toLowerCase()));
      const matchesRelease = revisionKind === "release" && sourceUrl.hostname === "github.com" && parts[0]?.toLowerCase() === owner.toLowerCase() && parts[1]?.toLowerCase() === repository.toLowerCase() && parts[2] === "releases" && parts[3] === "tag" && parts[4] === ref.revision;
      if (!matchesCommit && !matchesRelease) return "Versioned source URL must be bound to the declared GitHub repository and revision.";
    }
    if (ref.kind === "TRANSACTION") {
      if (!/^0x[0-9a-fA-F]{64}$/.test(ref.transaction_hash || "")) return "Transactions require a 32-byte transaction hash.";
      if (ref.network?.trim().toLowerCase() !== "genlayer-studionet" || ref.chain_id !== 61999) return "Transactions must declare GenLayer Studionet and chain ID 61999.";
      if (!/^0x[0-9a-fA-F]{40}$/.test(ref.contract || "")) return "Transactions require the proven contract address.";
      const transactionUrl = new URL(normalizeEvidenceUrl(ref.url));
      if (transactionUrl.hostname !== "explorer-studio.genlayer.com" || !transactionUrl.pathname.toLowerCase().includes((ref.transaction_hash || "").toLowerCase())) return "Transactions must point to the matching Studionet explorer record.";
    }
    const count = (counts.get(ref.criterion) || 0) + 1; if (count > MAX_EVIDENCE_PER_CRITERION) return "Each criterion may have at most two evidence references."; counts.set(ref.criterion, count);
    const identity = `${ref.criterion}:${ref.kind}:${normalizeEvidenceUrl(ref.url)}`; if (identities.has(identity)) return "Duplicate evidence references are not allowed."; identities.add(identity);
  }
  return "";
}
