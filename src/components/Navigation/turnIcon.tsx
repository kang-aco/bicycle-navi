import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  RotateCcw,
} from 'lucide-react';
import type { TurnType } from '../../types';

/** 회전 종류에 맞는 아이콘을 돌려줍니다. */
export function TurnIcon({ type, className = 'h-10 w-10' }: { type: TurnType; className?: string }) {
  switch (type) {
    case 'turn_left':
      return <CornerUpLeft className={className} />;
    case 'turn_right':
      return <CornerUpRight className={className} />;
    case 'slight_left':
      return <ArrowUpLeft className={className} />;
    case 'slight_right':
      return <ArrowUpRight className={className} />;
    case 'uturn':
      return <RotateCcw className={className} />;
    case 'arrive':
      return <Flag className={className} />;
    default:
      return <ArrowUp className={className} />;
  }
}
