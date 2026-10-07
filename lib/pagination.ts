export type PageWindow = {
  offset: number;
  limit: number;
  count: number;
  hasOlder: boolean;
  remainingCount: number;
};

function safeTotal(total: number): number {
  return Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
}

function safePageSize(pageSize: number): number {
  return Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
}

function pageAt(total: number, offset: number, pageSize: number, limit = pageSize): PageWindow {
  const normalizedTotal = safeTotal(total);
  const normalizedPageSize = safePageSize(pageSize);
  const boundedOffset = Math.min(normalizedTotal, Math.max(0, Math.floor(offset)));
  const boundedLimit = Math.max(1, Math.min(normalizedPageSize, Math.floor(limit)));
  return {
    offset: boundedOffset,
    limit: boundedLimit,
    count: Math.min(boundedLimit, Math.max(0, normalizedTotal - boundedOffset)),
    hasOlder: boundedOffset > 0,
    remainingCount: boundedOffset,
  };
}

export function latestFirstPage(total: number, pageSize: number): PageWindow {
  const normalizedTotal = safeTotal(total);
  const normalizedPageSize = safePageSize(pageSize);
  const offset = Math.max(0, normalizedTotal - normalizedPageSize);
  return pageAt(normalizedTotal, offset, normalizedPageSize, offset === 0 ? Math.max(1, Math.min(normalizedPageSize, normalizedTotal)) : normalizedPageSize);
}

export function pageAtOffset(total: number, offset: number, pageSize: number): PageWindow {
  return pageAt(total, offset, pageSize);
}

export function olderPage(total: number, currentOffset: number, pageSize: number): PageWindow {
  const normalizedPageSize = safePageSize(pageSize);
  const normalizedOffset = Math.max(0, Math.floor(currentOffset) - normalizedPageSize);
  return pageAt(total, normalizedOffset, normalizedPageSize, normalizedOffset === 0 ? Math.max(1, Math.min(normalizedPageSize, Math.floor(currentOffset))) : normalizedPageSize);
}

export function isCurrentWalletPageRequest(
  requestWallet: string,
  requestVersion: number,
  currentWallet: string,
  currentVersion: number,
): boolean {
  return requestVersion === currentVersion && requestWallet.trim().toLowerCase() === currentWallet.trim().toLowerCase();
}
