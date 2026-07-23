/** 거리를 사람이 읽기 좋은 형태로 (예: 1.2km, 350m) */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

/** 소요시간(초)을 "n시간 n분" / "n분" 형태로 */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  return `${Math.max(mins, 1)}분`;
}
