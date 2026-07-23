import { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { getCurrentPosition } from '../../hooks/useGeolocation';
import { reportHazard } from '../../services/hazardApi';
import { hazardConfig, hazardTypeList } from './hazardConfig';
import type { HazardType } from '../../types';

interface Props {
  /** 내 현재 위치 (있으면 GPS 재요청 없이 바로 사용) */
  myPos?: { lat: number; lng: number } | null;
  /** 신고가 끝나면 호출 (지도 마커 새로고침용) */
  onReported?: () => void;
}

/** 우측 하단 위험신고 버튼 + 종류 선택 시트 */
export function HazardReportButton({ myPos, onReported }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState<HazardType | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReport = async (type: HazardType) => {
    setSubmitting(type);
    setError(null);
    try {
      let pos = myPos;
      if (!pos) {
        const g = await getCurrentPosition();
        pos = { lat: g.coords.latitude, lng: g.coords.longitude };
      }
      const result = await reportHazard({
        lat: pos.lat,
        lng: pos.lng,
        type,
        description: `${hazardConfig[type].label} 신고`,
      });
      if (!result) throw new Error('server');
      setDone(true);
      onReported?.();
      setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 1200);
    } catch {
      setError('신고에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-28 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full
                   bg-danger shadow-lg shadow-danger/30 transition-transform active:scale-95"
        aria-label="위험 신고"
        title="위험 신고하기"
      >
        <AlertTriangle className="h-6 w-6 text-white" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full rounded-t-3xl bg-surface-elevated p-6 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">위험 신고하기</h3>
              <button onClick={() => setOpen(false)} aria-label="닫기">
                <X className="h-6 w-6 text-text-secondary" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20">
                  <Check className="h-7 w-7 text-secondary" />
                </div>
                <p className="font-medium text-text-primary">신고 완료! 감사합니다 🙏</p>
                <p className="text-sm text-text-muted">24시간 동안 다른 라이더에게 표시됩니다</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-text-secondary">현재 내 위치에 어떤 위험이 있나요?</p>
                <div className="grid grid-cols-3 gap-3">
                  {hazardTypeList.map((type) => {
                    const cfg = hazardConfig[type];
                    return (
                      <button
                        key={type}
                        onClick={() => handleReport(type)}
                        disabled={submitting !== null}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-surface p-4
                                   transition-colors hover:border-danger/50 hover:bg-danger/10 disabled:opacity-50"
                      >
                        <span className="text-2xl">{cfg.emoji}</span>
                        <span className="text-sm text-text-secondary">
                          {submitting === type ? '신고 중…' : cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
