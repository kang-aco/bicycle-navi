import type { POIType } from '../../types';

// POI 종류별 색상/이모지/라벨 설정 (마커와 필터에서 공용으로 사용)
export const poiConfig: Record<POIType, { color: string; emoji: string; label: string }> = {
  air_pump: { color: '#4ECDC4', emoji: '💨', label: '공기주입' },
  repair_shop: { color: '#FF6B35', emoji: '🔧', label: '수리점' },
  bike_rental: { color: '#3B82F6', emoji: '🚲', label: '대여소' },
  rest_area: { color: '#10B981', emoji: '🌳', label: '쉼터' },
  cafe: { color: '#F59E0B', emoji: '☕', label: '카페' },
};
