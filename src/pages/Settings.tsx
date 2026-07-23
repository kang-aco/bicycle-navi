import { Link } from 'react-router-dom';
import { ArrowLeft, History, Info, Volume2 } from 'lucide-react';
import { useNavigationStore } from '../stores/navigationStore';

export function Settings() {
  const voiceEnabled = useNavigationStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useNavigationStore((s) => s.setVoiceEnabled);

  const hasKakaoKey = Boolean(import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY);

  return (
    <div className="min-h-full bg-background pb-10">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4 pt-safe">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5">
            <ArrowLeft className="h-5 w-5 text-text-primary" />
          </Link>
          <h1 className="text-xl font-bold text-text-primary">설정</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
        {/* 음성 안내 토글 */}
        <div className="glass flex items-center justify-between rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-text-primary">음성 안내</p>
              <p className="text-sm text-text-muted">주행 중 회전 안내를 소리로 알려줍니다</p>
            </div>
          </div>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              voiceEnabled ? 'bg-primary' : 'bg-surface-elevated'
            }`}
            aria-label="음성 안내 토글"
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                voiceEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 주행 기록 링크 */}
        <Link to="/history" className="glass flex items-center gap-3 rounded-2xl p-4">
          <History className="h-5 w-5 text-secondary" />
          <div className="flex-1">
            <p className="font-medium text-text-primary">주행 기록</p>
            <p className="text-sm text-text-muted">지난 라이딩 기록과 GPX 내보내기</p>
          </div>
        </Link>

        {/* 앱 정보 */}
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 flex items-center gap-3">
            <Info className="h-5 w-5 text-text-secondary" />
            <p className="font-medium text-text-primary">앱 정보</p>
          </div>
          <dl className="space-y-1 text-sm">
            <Row label="이름" value="BusanCycleNav" />
            <Row label="버전" value="0.1.0 (MVP)" />
            <Row label="지도" value="카카오맵" />
            <Row label="경로" value="BRouter · OSRM" />
            <Row label="카카오 키" value={hasKakaoKey ? '연결됨 ✅' : '없음 ⚠️'} />
          </dl>
        </div>

        <p className="px-2 text-center text-xs text-text-muted">
          부산 자전거 실시간 네비게이션 · 다크 모드 "Midnight Ride"
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text-secondary">{value}</dd>
    </div>
  );
}
