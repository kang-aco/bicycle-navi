import type { LatLng, RoutePoint, RouteResult, TurnGuide, TurnType } from '../types';
import { angleDiff, bearing, cumulativeDistances, distanceMeters, pathLength } from './geo';

// 자전거 평균 속도(초당 이동거리 계산용). 15km/h = 4.17 m/s
const BIKE_SPEED_MS = 15 / 3.6;

const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;

/**
 * 출발지 → 도착지 자전거 경로를 탐색합니다.
 * 1순위: BRouter(자전거 프로파일, 무료·키없음)
 * 2순위: OSRM (공개 데모 서버)
 * 3순위: 카카오 모빌리티 (REST 키가 승인된 경우에만)
 * 모두 실패하면 직선 경로라도 돌려줍니다.
 */
export async function searchBikeRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResult> {
  // 1) BRouter — 자전거에 최적화된 무료 라우팅
  try {
    return await searchBRouter(origin, destination);
  } catch (e) {
    console.warn('[route] BRouter 실패, OSRM으로 폴백합니다:', e);
  }

  // 2) OSRM 공개 데모 서버
  try {
    return await searchOSRM(origin, destination);
  } catch (e) {
    console.warn('[route] OSRM 실패, 카카오로 폴백합니다:', e);
  }

  // 3) 카카오 모빌리티 (키 승인 시)
  if (KAKAO_REST_KEY) {
    try {
      return await searchKakao(origin, destination);
    } catch (e) {
      console.warn('[route] 카카오 실패:', e);
    }
  }

  // 4) 최후: 직선 경로
  const path: RoutePoint[] = [origin, destination];
  const distance = distanceMeters(origin, destination);
  return {
    path,
    summary: { distance, duration: distance / BIKE_SPEED_MS, elevationGain: 0, elevationLoss: 0 },
    guides: buildGuides(path, cumulativeDistances(path)),
    provider: 'osrm',
  };
}

// ===================== BRouter =====================
async function searchBRouter(origin: LatLng, destination: LatLng): Promise<RouteResult> {
  const lonlats = `${origin.lng},${origin.lat}|${destination.lng},${destination.lat}`;
  const url = `https://brouter.de/brouter?lonlats=${lonlats}&profile=trekking&alternativeidx=0&format=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`BRouter HTTP ${res.status}`);
  const data = await res.json();

  const feature = data?.features?.[0];
  const coords: number[][] = feature?.geometry?.coordinates;
  if (!coords || coords.length < 2) throw new Error('BRouter 경로 없음');

  // BRouter 좌표는 [경도, 위도, 고도?] 순서
  const path: RoutePoint[] = coords.map((c) => ({
    lat: c[1],
    lng: c[0],
    elevation: c[2],
  }));

  const props = feature.properties ?? {};
  const distance = Number(props['track-length']) || pathLength(path);
  const duration = Number(props['total-time']) || distance / BIKE_SPEED_MS;

  const withEle = await ensureElevation(path);
  const cum = cumulativeDistances(withEle);
  return {
    path: withEle,
    summary: { distance, duration, ...elevationStats(withEle) },
    guides: buildGuides(withEle, cum),
    provider: 'brouter',
  };
}

// ===================== OSRM =====================
async function searchOSRM(origin: LatLng, destination: LatLng): Promise<RouteResult> {
  const url =
    `https://router.project-osrm.org/route/v1/bike/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();

  const route = data?.routes?.[0];
  const coords: number[][] = route?.geometry?.coordinates;
  if (!coords || coords.length < 2) throw new Error('OSRM 경로 없음');

  const rawPath: RoutePoint[] = coords.map((c) => ({ lat: c[1], lng: c[0] }));
  const path = await ensureElevation(rawPath);
  const cum = cumulativeDistances(path);

  return {
    path,
    summary: {
      distance: route.distance ?? pathLength(path),
      duration: route.duration ?? pathLength(path) / BIKE_SPEED_MS,
      ...elevationStats(path),
    },
    guides: buildGuides(path, cum),
    provider: 'osrm',
  };
}

// ===================== 카카오 모빌리티 =====================
async function searchKakao(origin: LatLng, destination: LatLng): Promise<RouteResult> {
  const res = await fetch('https://apis.kakaomobility.com/v1/directions/bicycle', {
    method: 'POST',
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin: `${origin.lng},${origin.lat}`,
      destination: `${destination.lng},${destination.lat}`,
      priority: 'RECOMMEND',
    }),
  });
  if (!res.ok) throw new Error(`Kakao HTTP ${res.status}`);
  const data = await res.json();

  // 카카오 응답의 vertexes(경도,위도 평면 배열)를 좌표로 변환
  const section = data?.routes?.[0]?.sections?.[0];
  const path: RoutePoint[] = [];
  section?.roads?.forEach((road: any) => {
    const v: number[] = road.vertexes || [];
    for (let i = 0; i < v.length; i += 2) path.push({ lng: v[i], lat: v[i + 1] });
  });
  if (path.length < 2) throw new Error('카카오 경로 없음');

  const withEle = await ensureElevation(path);
  const cum = cumulativeDistances(withEle);
  const distance = data?.routes?.[0]?.summary?.distance ?? pathLength(withEle);
  const duration = data?.routes?.[0]?.summary?.duration ?? distance / BIKE_SPEED_MS;
  return {
    path: withEle,
    summary: { distance, duration, ...elevationStats(withEle) },
    guides: buildGuides(withEle, cum),
    provider: 'kakao',
  };
}

// ===================== 고도 데이터 =====================
/** 경로에 고도값이 없으면 Open Topo Data로 채워 넣습니다 (최대 90개 샘플). */
async function ensureElevation(path: RoutePoint[]): Promise<RoutePoint[]> {
  const hasElevation = path.some((p) => typeof p.elevation === 'number' && p.elevation !== 0);
  if (hasElevation) return path;

  try {
    // 점이 많으면 균등하게 90개만 뽑아서 요청 (공개 API 100개 제한)
    const maxSamples = 90;
    const step = Math.max(1, Math.ceil(path.length / maxSamples));
    const sampleIdx: number[] = [];
    for (let i = 0; i < path.length; i += step) sampleIdx.push(i);
    if (sampleIdx[sampleIdx.length - 1] !== path.length - 1) sampleIdx.push(path.length - 1);

    const locations = sampleIdx.map((i) => `${path[i].lat},${path[i].lng}`).join('|');
    const res = await fetch(`https://api.opentopodata.org/v1/srtm90m?locations=${locations}`);
    if (!res.ok) throw new Error(`elevation HTTP ${res.status}`);
    const data = await res.json();

    const sampleEle: number[] = (data.results || []).map((r: any) => r.elevation ?? 0);
    // 샘플 지점 고도를 원본 경로에 선형 보간으로 채움
    return path.map((p, i) => {
      // i가 속한 두 샘플 사이를 찾아 보간
      let s = 0;
      while (s < sampleIdx.length - 1 && sampleIdx[s + 1] <= i) s++;
      const i0 = sampleIdx[s];
      const i1 = sampleIdx[Math.min(s + 1, sampleIdx.length - 1)];
      const e0 = sampleEle[s] ?? 0;
      const e1 = sampleEle[Math.min(s + 1, sampleEle.length - 1)] ?? e0;
      const t = i1 === i0 ? 0 : (i - i0) / (i1 - i0);
      return { ...p, elevation: e0 + (e1 - e0) * t };
    });
  } catch (e) {
    console.warn('[route] 고도 데이터를 불러오지 못했습니다:', e);
    return path.map((p) => ({ ...p, elevation: p.elevation ?? 0 }));
  }
}

function elevationStats(path: RoutePoint[]): { elevationGain: number; elevationLoss: number } {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < path.length; i++) {
    const diff = (path[i].elevation ?? 0) - (path[i - 1].elevation ?? 0);
    if (diff > 0) gain += diff;
    else loss += Math.abs(diff);
  }
  return { elevationGain: Math.round(gain), elevationLoss: Math.round(loss) };
}

// ===================== 턴바턴 안내 생성 =====================
/**
 * 경로 좌표의 방향(방위각) 변화를 분석해서 좌/우회전 안내를 스스로 만듭니다.
 * (라우팅 서버마다 안내 형식이 달라서, 좌표만 있으면 되는 이 방식이 가장 안정적입니다.)
 */
function buildGuides(path: RoutePoint[], cum: number[]): TurnGuide[] {
  const guides: TurnGuide[] = [];
  const total = cum[cum.length - 1] ?? 0;

  guides.push({
    distanceFromStart: 0,
    instruction: '경로 안내를 시작합니다',
    type: 'depart',
    point: path[0],
  });

  // 너무 짧은 구간의 미세한 꺾임은 무시하기 위해, 최소 18m 이동한 지점들만 노드로 사용
  const minSeg = 18;
  const nodes: number[] = [0];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += distanceMeters(path[i - 1], path[i]);
    if (acc >= minSeg) {
      nodes.push(i);
      acc = 0;
    }
  }
  if (nodes[nodes.length - 1] !== path.length - 1) nodes.push(path.length - 1);

  let lastGuideDist = 0;
  for (let k = 1; k < nodes.length - 1; k++) {
    const a = path[nodes[k - 1]];
    const b = path[nodes[k]];
    const c = path[nodes[k + 1]];
    const delta = angleDiff(bearing(a, b), bearing(b, c));
    const mag = Math.abs(delta);
    if (mag < 25) continue; // 직진에 가까우면 안내 생략

    const distFromStart = cum[nodes[k]];
    if (distFromStart - lastGuideDist < 25) continue; // 너무 촘촘하면 생략
    lastGuideDist = distFromStart;

    const type = classifyTurn(delta);
    guides.push({
      distanceFromStart: distFromStart,
      instruction: turnText(type),
      type,
      point: b,
    });
  }

  guides.push({
    distanceFromStart: total,
    instruction: '목적지에 도착했습니다',
    type: 'arrive',
    point: path[path.length - 1],
  });

  return guides;
}

function classifyTurn(delta: number): TurnType {
  const mag = Math.abs(delta);
  const right = delta > 0;
  if (mag >= 150) return 'uturn';
  if (mag >= 55) return right ? 'turn_right' : 'turn_left';
  return right ? 'slight_right' : 'slight_left';
}

function turnText(type: TurnType): string {
  const map: Record<TurnType, string> = {
    turn_left: '좌회전입니다',
    turn_right: '우회전입니다',
    slight_left: '왼쪽 방향입니다',
    slight_right: '오른쪽 방향입니다',
    uturn: '유턴입니다',
    straight: '직진입니다',
    depart: '출발합니다',
    arrive: '목적지입니다',
  };
  return map[type];
}
