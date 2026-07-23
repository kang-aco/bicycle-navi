import type { LatLng, RoutePoint } from '../types';

const R = 6371000; // 지구 반지름 (미터)
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** 두 좌표 사이 거리(미터) — 하버사인 공식 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** a에서 b를 바라보는 방위각(0~360도, 북=0, 동=90) */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 각도 차이를 -180~180 범위로 정규화 (양수=우회전, 음수=좌회전) */
export function angleDiff(from: number, to: number): number {
  let d = ((to - from + 540) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

/** 경로 전체 길이(미터) */
export function pathLength(path: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distanceMeters(path[i - 1], path[i]);
  return total;
}

/** 각 점까지의 누적 거리 배열 */
export function cumulativeDistances(path: RoutePoint[]): number[] {
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    cum[i] = cum[i - 1] + distanceMeters(path[i - 1], path[i]);
  }
  return cum;
}

/** 경로에서 주어진 좌표에 가장 가까운 점의 인덱스 */
export function nearestIndex(pos: LatLng, path: RoutePoint[]): number {
  let min = Infinity;
  let idx = 0;
  for (let i = 0; i < path.length; i++) {
    const d = distanceMeters(pos, path[i]);
    if (d < min) {
      min = d;
      idx = i;
    }
  }
  return idx;
}
