import { useEffect, useRef } from 'react';
import type { HazardReport } from '../../types';
import { hazardConfig } from './hazardConfig';

interface Props {
  map: any;
  hazards: HazardReport[];
}

/** 다른 라이더들이 신고한 위험 지점을 지도에 마커로 표시합니다. */
export function HazardMarkers({ map, hazards }: Props) {
  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    if (!map || !window.kakao) return;
    const kakao = window.kakao;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    hazards.forEach((h) => {
      const cfg = hazardConfig[h.type] ?? hazardConfig.other;
      const el = document.createElement('div');
      el.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${cfg.color};border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.5);
      `;
      const inner = document.createElement('span');
      inner.style.cssText = 'transform:rotate(45deg);font-size:13px;';
      inner.textContent = cfg.emoji;
      el.appendChild(inner);
      el.title = `${cfg.label} 신고`;

      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(h.lat, h.lng),
        content: el,
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: 4,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    };
  }, [map, hazards]);

  return null;
}
