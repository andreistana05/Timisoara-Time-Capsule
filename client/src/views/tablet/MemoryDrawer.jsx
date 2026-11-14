/**
 * "Ignite a Memory Spark" drawer. Owner: Member 2.
 * Name + typed or voice-dictated memory (Web Speech API) + symbol → ADD_MEMORY.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Send, X, Sparkles, Loader2, MicOff } from 'lucide-react';
import { CHAPTERS, LANGUAGES, SYMBOLS } from '@shared/events.js';
import { ui, UI } from '@shared/i18n.js';
import { SymbolIcon, SYMBOL_META } from '../../components/common.jsx';
import { t, haptic, ROMAN, TABLET_STRINGS } from './strings.js';

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
// Chrome on Android duplicates final results in continuous mode; use one utterance per tap there.
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const MAX_TEXT = 600;
const MAX_NAME = 40;

const join = (a, b) => (a.trim() ? `${a.trim()} ${b.trim()}` : b.trim()).slice(0, MAX_TEXT);

function useDictation(lang, onFinal) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null); // null | 'micDenied' | 'noSpeech' | 'generic'
  const recRef = useRef(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    rec.onend = rec.onresult = rec.onerror = null;
    try {
      rec.abort();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) return;
    abort();
    setError(null);
    const rec = new SpeechRecognition();
    rec.lang = LANGUAGES.find((l) => l.code === lang)?.speech || 'en-GB';
    rec.interimResults = true;
    rec.continuous = !IS_ANDROID;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let finals = '';
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += ` ${r[0].transcript}`;
        else live += ` ${r[0].transcript}`;
      }
      if (finals.trim()) onFinalRef.current(finals.trim());
      setInterim(live.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      setError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'micDenied' : e.error === 'no-speech' ? 'noSpeech' : 'generic');
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      haptic(18);
    } catch {
      setError('generic');
    }
  }, [lang, abort]);

  useEffect(() => abort, [abort]); // stop the mic on unmount / language change

  return { supported: !!SpeechRecognition, listening, interim, error, start, stop, abort };
}

function VoiceBars({ color }) {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: color }}
          animate={{ height: ['20%', '100%', '35%', '80%', '20%'] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

export default function MemoryDrawer({ open, onClose, lang, chapterId, addMemory, accent }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [symbol, setSymbol] = useState('candle');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const closeTimer = useRef(null);

  const dictation = useDictation(lang, (chunk) => setText((prev) => join(prev, chunk)));
  const chapter = CHAPTERS[chapterId];

  useEffect(() => {
    if (!open) {
      dictation.abort();
      setStatus('idle');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const symbolColor = SYMBOL_META[symbol].color;
  const preview = dictation.interim ? join(text, dictation.interim) : text;
  const canSend = text.trim().length > 0 && status !== 'sending' && status !== 'sent';

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    dictation.abort();
    setStatus('sending');
    const ack = await addMemory({ name: name.trim(), text: text.trim(), symbol, language: lang, chapter: chapterId });
    if (ack?.ok) {
      haptic([20, 60, 20, 60, 40]);
      setStatus('sent');
      setText('');
      setName('');
      closeTimer.current = setTimeout(onClose, 2600);
    } else {
      haptic(80);
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label={ui('igniteSpark', lang)}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[96dvh] max-w-3xl overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-t-[2rem] border border-white/10 bg-obsidian-2/95 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-8"
            style={{ boxShadow: `0 -24px 90px ${accent}38` }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 240 }}
          >
            {/* grab handle */}
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/15" />

            {/* success: the spark rises */}
            <AnimatePresence>
              {status === 'sent' && (
                <motion.div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 overflow-hidden rounded-t-[2rem] bg-obsidian/95"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="absolute bottom-0 left-1/2 w-24 -translate-x-1/2"
                    style={{ background: `linear-gradient(to top, ${symbolColor}00, ${symbolColor}55, ${symbolColor}00)` }}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: '100%', opacity: [0, 1, 0.4] }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="relative flex h-28 w-28 items-center justify-center rounded-full"
                    style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${symbolColor}aa 40%, ${symbolColor}00 72%)`, boxShadow: `0 0 80px ${symbolColor}` }}
                    initial={{ scale: 0.2, y: 220 }}
                    animate={{ scale: 1, y: -10 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 70 }}
                  >
                    <SymbolIcon symbol={symbol} size={44} style={{ color: '#0a0a0f' }} />
                  </motion.div>
                  <motion.p
                    className="relative font-display text-3xl sm:text-4xl"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  >
                    ✦ {ui('newMemory', lang)} ✦
                  </motion.p>
                  <motion.p
                    className="relative font-mono text-xs uppercase tracking-[0.3em] text-mist"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.8 }}
                  >
                    {t('rising', lang)}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-3 font-display text-3xl font-semibold leading-tight">
                  <Sparkles style={{ color: accent }} className="shrink-0" /> {ui('igniteSpark', lang)}
                </h2>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-mist">
                  {t('willJoin', lang)}:{' '}
                  <span style={{ color: accent }}>
                    {ROMAN[chapter.order]} · {chapter.title[lang]}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-mist hover:bg-white/10 active:bg-white/15"
                aria-label={ui('cancel', lang)}
              >
                <X />
              </button>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME}
              placeholder={ui('yourName', lang)}
              autoComplete="off"
              enterKeyHint="next"
              className="mb-3 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-lg outline-none transition focus:border-white/30"
            />

            {/* memory text + dictation */}
            <div
              className="relative rounded-2xl border bg-black/40 transition-[border-color,box-shadow] duration-500"
              style={{
                borderColor: dictation.listening ? '#ef4444aa' : 'rgba(255,255,255,.1)',
                boxShadow: dictation.listening ? '0 0 32px #ef444433' : 'none',
              }}
            >
              <textarea
                value={preview}
                onChange={(e) => {
                  if (dictation.listening) dictation.stop();
                  setText(e.target.value.slice(0, MAX_TEXT));
                }}
                maxLength={MAX_TEXT}
                rows={4}
                placeholder={dictation.listening ? t('speakNow', lang) : ui('yourMemory', lang)}
                className="block w-full resize-none bg-transparent px-5 pb-16 pt-4 font-display text-xl leading-relaxed outline-none placeholder:text-mist/60"
              />
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] tracking-widest text-mist/70">
                  {preview.length}/{MAX_TEXT}
                </span>
                {dictation.supported && (
                  <button
                    type="button"
                    onClick={dictation.listening ? dictation.stop : dictation.start}
                    aria-pressed={dictation.listening}
                    className={`flex h-12 items-center gap-2 rounded-full px-4 font-semibold transition ${
                      dictation.listening ? 'bg-crimson text-white' : 'bg-white/10 text-ivory active:bg-white/20'
                    }`}
                  >
                    {dictation.listening ? (
                      <>
                        <VoiceBars color="#fff" />
                        <Square size={14} fill="currentColor" />
                        <span className="text-sm">{t('tapToStop', lang)}</span>
                      </>
                    ) : (
                      <>
                        <Mic size={20} />
                        <span className="text-sm">{ui('dictate', lang)}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {dictation.listening && (
                <span className="pointer-events-none absolute right-4 top-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-crimson">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-crimson" />
                  {ui('listening', lang)}
                </span>
              )}
            </div>

            {!dictation.supported && (
              <p className="mt-2 flex items-center gap-2 text-xs text-mist">
                <MicOff size={14} /> {t('dictationUnsupported', lang)}
              </p>
            )}
            {dictation.error && (
              <p className="mt-2 text-sm text-crimson">{t(dictation.error === 'generic' ? 'noSpeech' : dictation.error, lang)}</p>
            )}

            {/* symbol picker */}
            <p className="mb-2 mt-6 font-mono text-xs uppercase tracking-[0.25em] text-mist">{ui('pickSymbol', lang)}</p>
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label={ui('pickSymbol', lang)}>
              {SYMBOLS.map((s) => {
                const active = s === symbol;
                const c = SYMBOL_META[s].color;
                return (
                  <motion.button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      haptic();
                      setSymbol(s);
                    }}
                    className="relative flex min-h-[104px] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border px-2 py-4 transition-[border-color,background-color,box-shadow] duration-500"
                    style={{
                      borderColor: active ? c : 'rgba(255,255,255,.1)',
                      background: active ? `${c}22` : 'rgba(0,0,0,.3)',
                      boxShadow: active ? `0 0 32px ${c}44, inset 0 0 24px ${c}22` : 'none',
                    }}
                  >
                    <motion.span animate={active ? { y: [0, -4, 0] } : { y: 0 }} transition={{ duration: 2, repeat: active ? Infinity : 0, ease: 'easeInOut' }}>
                      <SymbolIcon symbol={s} size={34} />
                    </motion.span>
                    <span className="text-center text-sm font-semibold leading-tight">{UI.symbols[s][lang]}</span>
                    <span className="text-center text-[11px] leading-tight text-mist">{TABLET_STRINGS.symbolMeaning[s][lang]}</span>
                  </motion.button>
                );
              })}
            </div>

            {status === 'error' && <p className="mt-4 text-sm text-crimson">{t('sendError', lang)}</p>}

            <motion.button
              type="submit"
              disabled={!canSend}
              whileTap={canSend ? { scale: 0.98 } : undefined}
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl py-4 text-lg font-semibold text-obsidian transition disabled:opacity-40"
              style={{ background: `linear-gradient(90deg, ${accent}, #fde68a, ${symbolColor})`, boxShadow: canSend ? `0 0 40px ${accent}55` : 'none' }}
            >
              {status === 'sending' ? <Loader2 className="animate-spin" /> : <Send size={20} />}
              {ui('submit', lang)}
            </motion.button>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}
