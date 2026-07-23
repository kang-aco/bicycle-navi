import { useEffect, useRef } from 'react';
import type { BikePOI, POIType } from '../../types';
import { poiConfig } from './poiConfig';

interface Props {
  map: any;
  pois: BikePOI[];
  /** 현재 켜져 있는 POI 종류들만 표시 */
  activeTypes: Set<POIType>;
  onSelect?: (poi: BikePOI) => void;
}

/**
 * POI 목록을 지도 위에 커스텀 오버레이(이모지 핀)로 표시합니다.
 * activeTypes 에 포함된 종류만 보여줍니다.
 */
export function POIMarkers({ map, pois, activeTypes, onSelect }: Props) {
  const overlaysRef = useRef<any[]>([]);

  useEffect(() => {
    if (!map || !window.kakao) return;
    const kakao = window.kakao;

    // 기존 오버레이 제거 후 다시 그리기
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    pois
      .filter((poi) => activeTypes.has(poi.type))
      .forEach((poi) => {
        const cfg = poiConfig[poi.type];
        const el = document.createElement('div');
        el.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          width:30px;height:30px;border-radius:50%;
          background:${cfg.color};border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:15px;cursor:pointer;
        `;
        el.textContent = cfg.emoji;
        el.title = poi.name;
        el.onclick = () => onSelect?.(poi);

        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(poi.lat, poi.lng),
          content: el,
          yAnchor: 0.5,
          xAnchor: 0.5,
          zIndex: 3,
        });
        overlay.setMap(map);
        overlaysRef.current.push(overlay);
      });

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    };
  }, [map, pois, activeTypes, onSelect]);

  return null;
}
