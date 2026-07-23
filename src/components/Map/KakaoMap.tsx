import { useEffect, useRef, useState } from 'react';
import { loadKakaoMap } from '../../services/kakaoLoader';
import type { LatLng } from '../../types';

interface KakaoMapProps {
  center?: LatLng;
  level?: number; // 지도 확대 레벨 (숫자가 작을수록 확대)
  /** 지도 생성이 끝나면 map 인스턴스를 넘겨줍니다 */
  onMapReady?: (map: any) => void;
  className?: string;
}

// 부산 시청 좌표 (기본 중심점)
const BUSAN_CENTER: LatLng = { lat: 35.1796, lng: 129.0756 };

export function KakaoMap({
  center = BUSAN_CENTER,
  level = 6,
  onMapReady,
  className = '',
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMap()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const map = new window.kakao.maps.Map(containerRef.current, {
          center: new window.kakao.maps.LatLng(center.lat, center.lng),
          level,
        });

        // 우측 하단 확대/축소 컨트롤
        const zoomControl = new window.kakao.maps.ZoomControl();
        map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

        setLoading(false);
        onMapReady?.(map);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // center/level 은 최초 한 번만 적용 (지도 재생성 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div ref={containerRef} className="h-full w-full" />

      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-text-secondary">지도를 불러오는 중…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background p-6">
          <div className="glass max-w-sm rounded-2xl p-5 text-center">
            <p className="mb-2 font-semibold text-danger">지도를 불러오지 못했습니다</p>
            <p className="text-sm text-text-secondary">{error}</p>
            <p className="mt-3 text-xs text-text-muted">
              카카오 개발자센터에서 이 앱의 도메인(예: localhost)이 등록되어 있는지 확인하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
