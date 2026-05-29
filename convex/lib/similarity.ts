/**
 * Compute similarity between two strings using Levenshtein-based ratio.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const truncatedA = a.length > 500 ? a.slice(0, 500) : a;
  const truncatedB = b.length > 500 ? b.slice(0, 500) : b;
  const distance = levenshteinDistance(truncatedA, truncatedB);
  return Math.round((1 - distance / Math.max(truncatedA.length, truncatedB.length)) * 100) / 100;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}
