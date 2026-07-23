import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import type { PlaceResult } from '../../types';

interface Props {
  placeholder: string;
  value?: string;
  onSelect: (place: PlaceResult) => void;
  /** 검색 우선 중심점 (부산 위주로 결과가 나오도록) */
  bias?: { lat: number; lng: number };
}

/**
 * 카카오 키워드 검색을 이용한 장소 검색 입력창.
 * 타이핑을 멈추면(디바운스) 자동으로 후보 목록을 보여줍니다.
 */
export function PlaceSearch({ placeholder, value, onSelect, bias }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(query, 300);

  useEffect(() => {
    setQuery(value ?? '');
  }, [value]);

  useEffect(() => {
    const keyword = debounced.trim();
    if (!keyword || !window.kakao?.maps?.services) {
      setResults([]);
      return;
    }

    const ps = new window.kakao.maps.services.Places();
    const options: any = {};
    if (bias) {
      options.location = new window.kakao.maps.LatLng(bias.lat, bias.lng);
      options.radius = 20000; // 20km 반경 우선
    }

    ps.keywordSearch(
      keyword,
      (data: PlaceResult[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK) {
          setResults(data.slice(0, 8));
          setOpen(true);
        } else {
          setResults([]);
        }
      },
      options
    );
  }, [debounced, bias]);

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-4 h-5 w-5 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-surface py-3.5 pl-12 pr-10
                     text-text-primary placeholder:text-text-muted
                     transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 p-1"
            aria-label="지우기"
          >
            <X className="h-5 w-5 text-text-muted" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          className="glass absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl shadow-xl"
        >
          {results.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => {
                onSelect(place);
                setQuery(place.place_name);
                setOpen(false);
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">{place.place_name}</p>
                <p className="truncate text-sm text-text-secondary">
                  {place.road_address_name || place.address_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
