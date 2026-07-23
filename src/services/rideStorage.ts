// 주행 기록을 브라우저 저장소(localStorage)에 저장/불러오기.
// MVP 단계에서는 간단하게 localStorage를 씁니다.
// (나중에 Cloudflare R2에 올려서 기기 간 동기화로 확장 가능)

export interface RideRecord {
  id: string;
  startTime: string; // ISO
  endTime: string; // ISO
  distance: number; // meters
  duration: number; // seconds
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  elevationGain: number;
  elevationLoss: number;
  track: { lat: number; lng: number; elevation?: number; t: number }[];
}

const KEY = 'busan-cyclenav-rides';

export function getRides(): RideRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RideRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveRide(ride: RideRecord): void {
  const rides = getRides();
  rides.unshift(ride); // 최신 기록을 맨 앞에
  localStorage.setItem(KEY, JSON.stringify(rides.slice(0, 100))); // 최대 100개 유지
}

export function deleteRide(id: string): void {
  const rides = getRides().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(rides));
}

/** 주행 기록을 GPX 파일 문자열로 변환 (스트라바 등에서 열 수 있음) */
export function toGPX(ride: RideRecord): string {
  const points = ride.track
    .map(
      (p) =>
        `      <trkpt lat="${p.lat}" lon="${p.lng}">` +
        (p.elevation != null ? `<ele>${p.elevation.toFixed(1)}</ele>` : '') +
        `<time>${new Date(p.t).toISOString()}</time></trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="BusanCycleNav" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>부산 라이딩 ${new Date(ride.startTime).toLocaleString('ko-KR')}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
}
