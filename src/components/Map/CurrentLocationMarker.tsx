import { useEffect, useRef } from 'react';
import type { LatLng } from '../../types';

interface Props {
  map: any;
  position: LatLng;
  accuracy?: number; // 정확도 원의 반지름(m)
  heading?: number | null; // 진행 방향(도)
}

/**
 * 지도 위에 "현재 내 위치"를 표시합니다.
 * - 바깥쪽 옅은 민트색 원 = 정확도 범위
 * - 안쪽 오렌지 점 = 실제 위치
 */
export function CurrentLocationMarker({ map, position, accuracy = 0, heading }: Props) {
  const circleRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !window.kakao) return;

    const kakao = window.kakao;
    const pos = new kakao.maps.LatLng(position.lat, position.lng);

    // 정확도 원
    if (!circleRef.current) {
      circleRef.current = new kakao.maps.Circle({
        strokeWeight: 1,
        strokeColor: '#4ECDC4',
        strokeOpacity: 0.5,
        fillColor: '#4ECDC4',
        fillOpacity: 0.12,
      });
      circleRef.current.setMap(map);
    }
    circleRef.current.setPosition(pos);
    circleRef.current.setRadius(Math.max(accuracy, 5));

    // 위치 점 (방향 화살표 포함) — 커스텀 오버레이
    const rotation = heading != null && !Number.isNaN(heading) ? heading : 0;
    const content = document.createElement('div');
    content.style.cssText = 'position:relative;width:22px;height:22px;';
    content.innerHTML = `
      <div style="
        position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
        width:18px;height:18px;border-radius:50%;
        background:#FF6B35;border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(255,107,53,0.25);
      "></div>
      <div style="
        position:absolute;left:50%;top:50%;
        transform:translate(-50%,-140%) rotate(${rotation}deg);
        width:0;height:0;
        border-left:5px solid transparent;border-right:5px solid transparent;
        border-bottom:8px solid #FF6B35;
      "></div>
    `;

    if (!overlayRef.current) {
      overlayRef.current = new kakao.maps.CustomOverlay({
        position: pos,
        content,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 5,
      });
      overlayRef.current.setMap(map);
    } else {
      overlayRef.current.setPosition(pos);
      overlayRef.current.setContent(content);
    }
  }, [map, position, accuracy, heading]);

  // 컴포넌트 제거 시 지도에서 정리
  useEffect(() => {
    return () => {
      circleRef.current?.setMap(null);
      overlayRef.current?.setMap(null);
    };
  }, []);

  return null;
}
