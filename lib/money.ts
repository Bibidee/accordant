const GEN_DECIMALS = 18;

export function parseGenAmount(value: string): bigint {
  const clean = value.trim();
  if (!/^\d+(?:\.\d{1,18})?$/.test(clean)) throw new Error("Enter a valid GEN amount with up to 18 decimal places.");
  const [whole, fraction = ""] = clean.split(".");
  return BigInt(whole) * 10n ** BigInt(GEN_DECIMALS) + BigInt((fraction + "0".repeat(GEN_DECIMALS)).slice(0, GEN_DECIMALS));
}

export function formatGenAmount(value: number | string | bigint): string {
  const wei = typeof value === "bigint" ? value : BigInt(String(value));
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export const GEN_DECIMALS_COUNT = GEN_DECIMALS;
