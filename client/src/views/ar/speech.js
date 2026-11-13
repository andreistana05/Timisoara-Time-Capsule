import { LANGUAGES } from '@shared/events.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

export function speak(text, langCode, { onEnd } = {}) {
  if (!synth || !text) return;
  synth.cancel();
  const speechLang = LANGUAGES.find((l) => l.code === langCode)?.speech || 'en-GB';
  const u = new SpeechSynthesisUtterance(text);
  u.lang = speechLang;
  u.rate = 0.95;
  u.pitch = 1;
  const voices = synth.getVoices();
  u.voice =
    voices.find((v) => v.lang === speechLang) || voices.find((v) => v.lang?.toLowerCase().startsWith(langCode)) || null;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  synth.speak(u);
}

export function stopSpeaking() {
  synth?.cancel();
}

export const canSpeak = !!synth;
