/**
 * WebSpeech narration with word callbacks (used for word-by-word highlighting and orb pulses).
 *  - Text is split into sentence chunks, because desktop Chrome cuts off long utterances after about 15 s.
 *  - onWord(charIndex) fires on `boundary` events. When a voice doesn't send them
 *    (common on Android), the position is estimated from elapsed time.
 *  - speak() must be called synchronously inside the tap handler (iOS).
 */
import { LANGUAGES } from '@shared/events.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
export const canSpeak = !!synth;

// voices load asynchronously in Chrome, so warm the list up early
if (synth) {
  synth.getVoices();
  synth.addEventListener?.('voiceschanged', () => synth.getVoices());
}

const RATE = 0.95;
const CHARS_PER_SEC = 14.5 * RATE;
let generation = 0;
let timer = null;

function pickVoice(langCode, speechLang) {
  const voices = synth.getVoices();
  const local = (v) => v.localService;
  return (
    voices.find((v) => v.lang === speechLang && local(v)) ||
    voices.find((v) => v.lang === speechLang) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(langCode)) ||
    null
  );
}

function chunk(text) {
  const parts = [];
  const re = /[^.!?…]+[.!?…]*["”“»]?\s*/g;
  let m;
  while ((m = re.exec(text))) if (m[0].trim()) parts.push({ text: m[0], offset: m.index });
  return parts.length ? parts : [{ text, offset: 0 }];
}

export function speak(text, langCode, { onEnd, onWord } = {}) {
  if (!synth || !text) return;
  stopSpeaking();
  const gen = ++generation;
  const speechLang = LANGUAGES.find((l) => l.code === langCode)?.speech || 'en-GB';
  const voice = pickVoice(langCode, speechLang);
  const chunks = chunk(text);

  let boundarySeen = false;
  let chunkStart = 0;
  let chunkOffset = 0;
  let lastIdx = -1;
  const emit = (idx) => {
    if (gen !== generation || idx === lastIdx) return;
    lastIdx = idx;
    onWord?.(idx);
  };

  // time-based estimator (only used when the voice sends no boundary events)
  timer = setInterval(() => {
    if (gen !== generation || boundarySeen || !chunkStart) return;
    const est = chunkOffset + Math.floor(((performance.now() - chunkStart) / 1000) * CHARS_PER_SEC);
    // snap to the start of the word under the estimate
    const before = text.slice(0, Math.min(est, text.length));
    const ws = before.lastIndexOf(' ') + 1;
    emit(Math.min(ws, text.length - 1));
  }, 110);

  // Some devices have no voice for a language and never fire onstart. Give up after 3 s so the UI doesn't stay on "Stop".
  let started = false;
  setTimeout(() => {
    if (gen === generation && !started) {
      stopSpeaking();
      onEnd?.();
    }
  }, 3000);

  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c.text);
    u.lang = speechLang;
    if (voice) u.voice = voice;
    u.rate = RATE;
    u.pitch = 1;
    u.onstart = () => {
      started = true;
      chunkStart = performance.now();
      chunkOffset = c.offset;
      emit(c.offset);
    };
    u.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      boundarySeen = true;
      emit(c.offset + e.charIndex);
    };
    if (i === chunks.length - 1) {
      u.onend = () => {
        if (gen !== generation) return;
        clearInterval(timer);
        onEnd?.();
      };
    }
    u.onerror = (e) => {
      if (gen !== generation || e.error === 'interrupted' || e.error === 'canceled') return;
      clearInterval(timer);
      onEnd?.();
    };
    synth.speak(u);
  });
}

export function stopSpeaking() {
  generation++;
  clearInterval(timer);
  synth?.cancel();
}
