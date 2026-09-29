export interface JustifiedItem {
  index: number;
  /** Rendered width in px (height comes from the row). */
  width: number;
}

export interface JustifiedRow {
  items: JustifiedItem[];
  /** Rendered height in px, shared by every tile in the row. */
  height: number;
}

/** Safety cap so a row with very few photos can't grow absurdly tall. */
const MAX_ROW_SCALE = 1.9;

/**
 * Partition `weights` into `k` contiguous groups so the largest group sum is as
 * small as possible (classic linear-partition DP). Keeps photo order intact
 * while balancing how "wide" each row is, which avoids lonely orphan rows.
 */
function linearPartition(weights: number[], k: number): number[][] {
  const n = weights.length;
  if (k <= 1) return [weights.map((_, i) => i)];
  if (k >= n) return weights.map((_, i) => [i]);

  const prefix = [0];
  for (let i = 0; i < n; i++) prefix.push(prefix[i] + weights[i]);

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(Infinity));
  const split: number[][] = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][1] = prefix[i];

  for (let j = 2; j <= k; j++) {
    for (let i = j; i <= n; i++) {
      for (let p = j - 1; p < i; p++) {
        const cost = Math.max(dp[p][j - 1], prefix[i] - prefix[p]);
        if (cost < dp[i][j]) {
          dp[i][j] = cost;
          split[i][j] = p;
        }
      }
    }
  }

  const groups: number[][] = [];
  let i = n;
  let j = k;
  while (j > 0) {
    const p = j === 1 ? 0 : split[i][j];
    groups.unshift(Array.from({ length: i - p }, (_, t) => p + t));
    i = p;
    j -= 1;
  }
  return groups;
}

/**
 * Lay every photo out exactly ONCE in justified, gap-free rows (Flickr-style):
 * photos are split into balanced rows, then each row's height is solved so the
 * scaled widths + gaps fill the container width exactly. Every tile box keeps its
 * photo's REAL aspect ratio, so nothing is ever cropped — and balanced rows mean
 * no lonely orphan row with empty space beside it.
 */
export function buildJustifiedRows(
  photos: { w: number; h: number }[],
  containerWidth: number,
  targetRowHeight: number,
  gap: number,
): JustifiedRow[] {
  if (photos.length === 0 || containerWidth <= 0) return [];

  const ratios = photos.map((p) => (p.h > 0 ? p.w / p.h : 1));
  const totalRatio = ratios.reduce((sum, r) => sum + r, 0);

  // How many rows make each row land near the target height.
  const rowCount = Math.max(
    1,
    Math.min(photos.length, Math.round((totalRatio * targetRowHeight) / containerWidth)),
  );

  const groups = linearPartition(ratios, rowCount);
  const maxHeight = targetRowHeight * MAX_ROW_SCALE;

  return groups.map((group) => {
    const gaps = gap * (group.length - 1);
    const available = containerWidth - gaps;
    const ratioSum = group.reduce((sum, idx) => sum + ratios[idx], 0);
    const height = Math.min(available / ratioSum, maxHeight);
    return {
      height,
      items: group.map((idx) => ({ index: idx, width: ratios[idx] * height })),
    };
  });
}
