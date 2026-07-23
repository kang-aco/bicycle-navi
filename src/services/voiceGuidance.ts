// 음성 안내 엔진 — 브라우저 내장 Web Speech API(TTS)를 사용합니다.
// 별도 SDK나 키가 필요 없습니다.

class VoiceGuidance {
  private synth: SpeechSynthesis | null =
    typeof window !== 'undefined' ? window.speechSynthesis : null;
  private enabled = true;
  private lastSpoken = '';
  private lastSpokenAt = 0;

  setEnabled(v: boolean) {
    this.enabled = v;
    if (!v) this.stop();
  }

  /**
   * 문장을 읽어줍니다.
   * priority 'high' 이면 지금 말하고 있는 것을 끊고 즉시 안내합니다.
   * 같은 문장을 3초 안에 반복하지 않도록 막습니다.
   */
  speak(text: string, priority: 'high' | 'normal' = 'normal') {
    if (!this.enabled || !this.synth || !text) return;

    const now = Date.now();
    if (text === this.lastSpoken && now - this.lastSpokenAt < 3000) return;

    if (priority === 'high') {
      this.synth.cancel();
    } else if (this.synth.speaking) {
      return; // 이미 말하는 중이면 일반 안내는 건너뜀
    }

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 1.05;
    u.pitch = 1.0;
    this.synth.speak(u);

    this.lastSpoken = text;
    this.lastSpokenAt = now;
  }

  stop() {
    this.synth?.cancel();
  }
}

export const voiceGuidance = new VoiceGuidance();

/**
 * 남은 거리에 따라 언제 무엇을 안내할지 결정합니다.
 * 반환값이 빈 문자열이면 지금은 안내하지 않는다는 뜻입니다.
 */
export function guidanceForTurn(
  instruction: string,
  distanceToTurn: number
): { text: string; priority: 'high' | 'normal' } | null {
  // 회전 지점까지 남은 거리별 안내 (300m / 100m / 30m)
  if (distanceToTurn <= 30) {
    return { text: instruction, priority: 'high' };
  }
  if (distanceToTurn <= 100) {
    return { text: `잠시 후 ${instruction}`, priority: 'high' };
  }
  if (distanceToTurn <= 300) {
    return { text: `${Math.round(distanceToTurn / 10) * 10}미터 앞 ${instruction}`, priority: 'normal' };
  }
  return null;
}
