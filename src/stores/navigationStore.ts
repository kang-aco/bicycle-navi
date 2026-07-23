import { create } from 'zustand';
import type { LatLng, RouteResult } from '../types';

/** 지도에 표시할 지점(이름 포함) */
export interface NamedPoint extends LatLng {
  name: string;
}

// 앱의 진행 단계
export type AppPhase = 'idle' | 'routing' | 'preview' | 'navigating';

interface NavigationState {
  origin: NamedPoint | null;
  destination: NamedPoint | null;
  route: RouteResult | null;
  phase: AppPhase;
  voiceEnabled: boolean;
  isLoadingRoute: boolean;
  routeError: string | null;

  setOrigin: (p: NamedPoint | null) => void;
  setDestination: (p: NamedPoint | null) => void;
  setRoute: (r: RouteResult | null) => void;
  setPhase: (p: AppPhase) => void;
  setVoiceEnabled: (v: boolean) => void;
  setLoadingRoute: (v: boolean) => void;
  setRouteError: (msg: string | null) => void;
  reset: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  origin: null,
  destination: null,
  route: null,
  phase: 'idle',
  voiceEnabled: true,
  isLoadingRoute: false,
  routeError: null,

  setOrigin: (p) => set({ origin: p }),
  setDestination: (p) => set({ destination: p }),
  setRoute: (r) => set({ route: r }),
  setPhase: (p) => set({ phase: p }),
  setVoiceEnabled: (v) => set({ voiceEnabled: v }),
  setLoadingRoute: (v) => set({ isLoadingRoute: v }),
  setRouteError: (msg) => set({ routeError: msg }),
  reset: () =>
    set({
      route: null,
      phase: 'idle',
      isLoadingRoute: false,
      routeError: null,
    }),
}));
