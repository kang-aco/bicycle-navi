import type { HazardType } from '../../types';

// 위험 종류별 이모지/색상/라벨 (신고 버튼과 지도 마커에서 공용)
export const hazardConfig: Record<HazardType, { emoji: string; label: string; color: string }> = {
  pothole: { emoji: '🕳️', label: '포트홀', color: '#EF4444' },
  construction: { emoji: '🚧', label: '공사중', color: '#F59E0B' },
  parked_car: { emoji: '🚗', label: '불법주차', color: '#3B82F6' },
  slippery: { emoji: '💧', label: '미끄러움', color: '#4ECDC4' },
  narrow_path: { emoji: '📏', label: '좁은길', color: '#A479E2' },
  other: { emoji: '⚠️', label: '기타', color: '#94A3B8' },
};

export const hazardTypeList = Object.keys(hazardConfig) as HazardType[];
