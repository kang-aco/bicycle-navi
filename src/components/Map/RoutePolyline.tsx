import { useEffect, useRef } from 'react';
import type { RoutePoint } from '../../types';

interface Props {
  map: any;
  path: RoutePoint[];
  /** true면 경로 전체가 화면에 들어오도록 지도를 맞춤 */
  fitBounds?: boolean;
}

/**
 * 지도 위에 경로 선(Polyline)을 그립니다.
 * 아래쪽에 굵은 반투명 오렌지(글로우) + 위쪽에 선명한 선을 겹쳐서
 * 라이딩 앱 특유의 발광 느낌을 줍니다.
 */
export function RoutePolyline({ map, path, fitBounds = true }: Props) {
  const linesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!map || !window.kakao || path.length < 2) return;
    const kakao = window.kakao;

    const linePath = path.map((p) => new kakao.maps.LatLng(p.lat, p.lng));

    const glow = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 12,
      strokeColor: '#FF6B35',
      strokeOpacity: 0.2,
      strokeStyle: 'solid',
    });
    const line = new kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: '#FF6B35',
      strokeOpacity: 0.95,
      strokeStyle: 'solid',
    });
    glow.setMap(map);
    line.setMap(map);
    linesRef.current = [glow, line];

    if (fitBounds) {
      const bounds = new kakao.maps.LatLngBounds();
      linePath.forEach((p: any) => bounds.extend(p));
      map.setBounds(bounds, 60, 60, 60, 60);
    }

    return () => {
      linesRef.current.forEach((l) => l.setMap(null));
      linesRef.current = [];
    };
  }, [map, path, fitBounds]);

  return null;
}
