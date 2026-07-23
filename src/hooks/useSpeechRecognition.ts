import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 음성 인식 훅 (브라우저 내장 Web Speech API).
 * 마이크로 말하면 한국어(ko-KR)로 텍스트를 인식해 onResult로 넘겨줍니다.
 * ⚠️ 크롬(안드로이드 포함)에서 잘 되고, 아이폰 사파리는 미지원일 수 있습니다.
 */
export function useSpeechRecognition(onResult: (text: string) => void) {
  const [supported] = useState(
    () =>
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const start = useCallback(() => {
    if (!supported) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => {
      setListening(true);
      setError(null);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      setError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? '마이크 권한을 허용해주세요.'
          : '음성을 인식하지 못했어요. 다시 시도해주세요.'
      );
    };
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) onResultRef.current(text);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* 이미 실행 중이면 무시 */
    }
  }, [supported]);

  const stop = useCallback(() => {
    recRef.current?.stop?.();
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recRef.current?.abort?.();
    };
  }, []);

  return { supported, listening, error, start, stop };
}
