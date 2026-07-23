import type { BikePOI, POIType } from '../types';

// POI 종류 → 카카오 장소검색에 쓸 검색어
const categoryKeyword: Record<POIType, string> = {
  air_pump: '자전거 공기주입기',
  repair_shop: '자전거 수리',
  bike_rental: '자전거 대여소',
  rest_area: '자전거 쉼터',
  cafe: '카페',
};

/**
 * 카카오 장소검색으로 지정한 종류의 실제 장소를 지도 중심 주변에서 찾습니다.
 * (별도 공공데이터 키 없이, 이미 로드된 카카오 SDK를 그대로 사용합니다.)
 */
export function searchPOIByType(
  type: POIType,
  center: { lat: number; lng: number },
  radius = 5000
): Promise<BikePOI[]> {
  return new Promise((resolve) => {
    if (!window.kakao?.maps?.services) {
      resolve([]);
      return;
    }
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(
      categoryKeyword[type],
      (data: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          resolve(
            data.slice(0, 15).map((p) => ({
              id: `kakao-${type}-${p.id}`,
              name: p.place_name,
              lat: Number(p.y),
              lng: Number(p.x),
              type,
              address: p.road_address_name || p.address_name || '',
              phone: p.phone || undefined,
            }))
          );
        } else {
          resolve([]);
        }
      },
      { location: new window.kakao.maps.LatLng(center.lat, center.lng), radius }
    );
  });
}
