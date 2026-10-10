import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const rpcUrl = process.env.ACCORDANT_RPC || "https://studio.genlayer.com/api";
const contract = process.env.ACCORDANT_CONTRACT || "0xF34B9BbA585137b05Fc00a3921297614661D836D";
const sourcePath = process.env.ACCORDANT_SOURCE || "contracts/accordant.py";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function normalizedLineEndings(bytes) {
  const text = Buffer.from(bytes).toString("utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return {
    lf: Buffer.from(text, "utf8"),
    crlf: Buffer.from(text.replace(/\n/g, "\r\n"), "utf8"),
  };
}

function lineEndingSummary(bytes) {
  const text = Buffer.from(bytes).toString("utf8");
  const crlf = (text.match(/\r\n/g) || []).length;
  const bareLf = (text.replace(/\r\n/g, "").match(/\n/g) || []).length;
  const bareCr = (text.replace(/\r\n/g, "").match(/\r/g) || []).length;
  return { crlf, bareLf, bareCr };
}

async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`RPC ${JSON.stringify(payload.error)}`);
  return payload.result;
}

const localRaw = await readFile(sourcePath);
const localNormalized = normalizedLineEndings(localRaw);
const onChainBase64 = await rpc("gen_getContractCode", [contract]);
if (typeof onChainBase64 !== "string" || !onChainBase64) throw new Error("gen_getContractCode did not return base64 source");
const onChainRaw = Buffer.from(onChainBase64, "base64");
const onChainNormalized = normalizedLineEndings(onChainRaw);

const report = {
  rpc: rpcUrl,
  contract,
  source: sourcePath,
  local: {
    bytes: localRaw.length,
    line_endings: lineEndingSummary(localRaw),
    sha256_raw: sha256(localRaw),
    sha256_lf: sha256(localNormalized.lf),
    sha256_crlf: sha256(localNormalized.crlf),
  },
  on_chain: {
    bytes: onChainRaw.length,
    line_endings: lineEndingSummary(onChainRaw),
    sha256_raw: sha256(onChainRaw),
    sha256_lf: sha256(onChainNormalized.lf),
    sha256_crlf: sha256(onChainNormalized.crlf),
    exact_byte_match: onChainRaw.equals(localRaw),
    normalized_lf_match: onChainNormalized.lf.equals(localNormalized.lf),
  },
};

console.log(JSON.stringify(report, null, 2));

if (!report.on_chain.normalized_lf_match) {
  process.exitCode = 1;
}
