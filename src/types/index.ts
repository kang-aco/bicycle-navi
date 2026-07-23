// ===== 앱 전체에서 공통으로 쓰는 타입 정의 =====

/** 위도(lat)/경도(lng) 좌표 한 쌍 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 경로를 이루는 한 점 (고도 정보 포함 가능) */
export interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number; // 해발 고도(m)
}

/** 경로 요약 정보 */
export interface RouteSummary {
  distance: number; // 총 거리 (미터)
  duration: number; // 예상 소요시간 (초)
  elevationGain: number; // 총 상승 고도 (미터)
  elevationLoss: number; // 총 하강 고도 (미터)
}

/** 턴바턴 안내 지점 (우회전/좌회전 등) */
export type TurnType =
  | 'straight'
  | 'turn_left'
  | 'turn_right'
  | 'slight_left'
  | 'slight_right'
  | 'uturn'
  | 'arrive'
  | 'depart';

export interface TurnGuide {
  /** 경로 시작점부터 이 안내 지점까지의 누적 거리(m) */
  distanceFromStart: number;
  instruction: string; // "우회전입니다" 등 표시 문구
  type: TurnType;
  point: RoutePoint; // 안내가 일어나는 좌표
  roadName?: string; // 도로명
}

/** 경로 탐색 결과 전체 */
export interface RouteResult {
  path: RoutePoint[]; // 경로를 이루는 모든 좌표
  summary: RouteSummary;
  guides: TurnGuide[]; // 턴바턴 안내 목록
  provider: 'brouter' | 'osrm' | 'kakao'; // 어떤 엔진으로 찾았는지
}

/** 장소 검색 결과 (카카오 키워드 검색) */
export interface PlaceResult {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string; // 경도(lng) — 문자열로 옴
  y: string; // 위도(lat) — 문자열로 옴
}

/** 자전거 관련 POI (공기주입소/수리점/대여소 등) */
export type POIType = 'air_pump' | 'repair_shop' | 'bike_rental' | 'rest_area' | 'cafe';

export interface BikePOI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: POIType;
  address: string;
  phone?: string;
  hours?: string;
  isFree?: boolean;
  description?: string;
}

/** 위험 신고 (Cloudflare R2에 저장) */
export type HazardType =
  | 'pothole'
  | 'construction'
  | 'parked_car'
  | 'narrow_path'
  | 'slippery'
  | 'other';

export interface HazardReport {
  id: string;
  lat: number;
  lng: number;
  type: HazardType;
  description: string;
  reported_by: string;
  created_at: string; // ISO 문자열
  expires_at: string; // ISO 문자열 (24시간 후)
}
