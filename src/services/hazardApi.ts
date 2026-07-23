import type { HazardReport } from '../types';

// 프론트엔드에서 위험 신고 API(Cloudflare R2 백엔드)를 호출하는 함수들.
// 배포 후 같은 도메인의 /api/hazards 로 요청합니다.

/** 활성화된(만료 전) 위험 신고 목록을 가져옵니다. */
export async function fetchHazards(): Promise<HazardReport[]> {
  try {
    const res = await fetch('/api/hazards');
    if (!res.ok) return [];
    return (await res.json()) as HazardReport[];
  } catch {
    return [];
  }
}

/** 새 위험 신고를 등록합니다. */
export async function reportHazard(input: {
  lat: number;
  lng: number;
  type: string;
  description?: string;
  reported_by?: string;
}): Promise<HazardReport | null> {
  try {
    const res = await fetch('/api/hazards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    return (await res.json()) as HazardReport;
  } catch {
    return null;
  }
}
