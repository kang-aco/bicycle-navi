import { useEffect, useState } from 'react';

/**
 * 값이 바뀐 뒤 delay(ms) 동안 추가 변경이 없을 때만 최종 값을 반환합니다.
 * 검색창에서 타이핑할 때마다 API를 호출하지 않도록 막아줍니다. (디바운스)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
