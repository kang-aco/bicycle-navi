import { useEffect, useMemo, useRef } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { RoutePoint } from '../../types';

interface Props {
  path: RoutePoint[];
  /** 네비게이션 중 현재 위치 인덱스 (없으면 -1) */
  currentIndex?: number;
}

/** 경로의 고도 변화를 캔버스 그래프로 그립니다. */
export function ElevationProfile({ path, currentIndex = -1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stats = useMemo(() => {
    const els = path.map((p) => p.elevation ?? 0);
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < els.length; i++) {
      const d = els[i] - els[i - 1];
      if (d > 0) gain += d;
      else loss += Math.abs(d);
    }
    return { gain: Math.round(gain), loss: Math.round(loss) };
  }, [path]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || path.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 8, right: 8, bottom: 8, left: 8 };
    const els = path.map((p) => p.elevation ?? 0);
    const min = Math.min(...els);
    const max = Math.max(...els);
    const range = max - min || 1;

    const xAt = (i: number) => pad.left + (i / (els.length - 1)) * (w - pad.left - pad.right);
    const yAt = (el: number) => pad.top + (1 - (el - min) / range) * (h - pad.top - pad.bottom);

    ctx.clearRect(0, 0, w, h);

    // 채우기 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,107,53,0.35)');
    grad.addColorStop(1, 'rgba(255,107,53,0.03)');
    ctx.beginPath();
    els.forEach((el, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(el)) : ctx.lineTo(xAt(i), yAt(el))));
    ctx.lineTo(xAt(els.length - 1), h - pad.bottom);
    ctx.lineTo(xAt(0), h - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // 라인
    ctx.beginPath();
    els.forEach((el, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(el)) : ctx.lineTo(xAt(i), yAt(el))));
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 현재 위치 세로선
    if (currentIndex >= 0 && currentIndex < els.length) {
      const x = xAt(currentIndex);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, h - pad.bottom);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [path, currentIndex]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">고도 프로필</h3>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-secondary">
            <TrendingUp className="h-3 w-3" /> +{stats.gain}m
          </span>
          <span className="flex items-center gap-1 text-accent">
            <TrendingDown className="h-3 w-3" /> -{stats.loss}m
          </span>
        </div>
      </div>
      <canvas ref={canvasRef} className="h-20 w-full" style={{ width: '100%', height: '80px' }} />
    </div>
  );
}
