import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { LANGUAGES, SYMBOLS } from '@shared/events.js';
import { ui, UI } from '@shared/i18n.js';
import { SymbolIcon, SYMBOL_META } from '../../components/common.jsx';

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function MemoryDrawer({ open, onClose, lang, chapterId, addMemory, accent }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [symbol, setSymbol] = useState('candle');
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const recRef = useRef(null);

  useEffect(() => {
    if (!open) {
      recRef.current?.stop();
      setStatus('idle');
    }
  }, [open]);

  const toggleDictation = () => {
    if (!SpeechRecognition) return;
    if (listening) return recRef.current?.stop();
    const rec = new SpeechRecognition();
    rec.lang = LANGUAGES.find((l) => l.code === lang)?.speech || 'en-GB';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      const chunk = Array.from(e.results)
        .slice(e.resultIndex)
        .filter((r) => r.isFinal)
        .map((r) => r[0].transcript)
        .join(' ');
      if (chunk) setText((t) => (t ? `${t.trim()} ${chunk.trim()}` : chunk.trim()));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || status === 'sending') return;
    recRef.current?.stop();
    setStatus('sending');
    const ack = await addMemory({ name, text, symbol, language: lang, chapter: chapterId });
    if (ack?.ok) {
      setStatus('sent');
      setText('');
      setName('');
      setTimeout(onClose, 1600);
    } else {
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.form
            onSubmit={submit}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-[2rem] border border-white/10 bg-obsidian-2/95 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-8"
            style={{ boxShadow: `0 -20px 80px ${accent}33` }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            <AnimatePresence>
              {status === 'sent' && (
                <motion.div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-t-[2rem] bg-obsidian/95"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div initial={{ scale: 0.3, y: 40 }} animate={{ scale: 1.2, y: -10 }} transition={{ type: 'spring' }}>
                    <SymbolIcon symbol={symbol} size={72} />
                  </motion.div>
                  <p className="font-display text-3xl">✦ {ui('newMemory', lang)} ✦</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-3 font-display text-3xl font-semibold">
                <Sparkles style={{ color: accent }} /> {ui('igniteSpark', lang)}
              </h2>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-mist hover:bg-white/10" aria-label={ui('cancel', lang)}>
                <X />
              </button>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder={ui('yourName', lang)}
              className="mb-3 w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-lg outline-none focus:border-amber-gold/60"
            />
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={600}
                rows={4}
                placeholder={ui('yourMemory', lang)}
                className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 pr-16 text-lg leading-relaxed outline-none focus:border-amber-gold/60"
              />
              {SpeechRecognition && (
                <button
                  type="button"
                  onClick={toggleDictation}
                  className={`absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full transition ${
                    listening ? 'animate-pulse bg-crimson text-white' : 'bg-white/10 text-ivory hover:bg-white/20'
                  }`}
                  title={ui(listening ? 'listening' : 'dictate', lang)}
                >
                  {listening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              )}
            </div>

            <p className="mb-2 mt-5 font-mono text-xs uppercase tracking-widest text-mist">{ui('pickSymbol', lang)}</p>
            <div className="grid grid-cols-3 gap-3">
              {SYMBOLS.map((s) => {
                const active = s === symbol;
                const c = SYMBOL_META[s].color;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSymbol(s)}
                    className="flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition"
                    style={{
                      borderColor: active ? c : 'rgba(255,255,255,.1)',
                      background: active ? `${c}22` : 'rgba(0,0,0,.3)',
                    }}
                  >
                    <SymbolIcon symbol={s} size={30} />
                    <span className="text-sm">{UI.symbols[s][lang]}</span>
                  </button>
                );
              })}
            </div>

            {status === 'error' && <p className="mt-3 text-sm text-crimson">Could not reach the server — try again.</p>}

            <button
              type="submit"
              disabled={!text.trim() || status === 'sending'}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-lg font-semibold text-obsidian transition disabled:opacity-40"
              style={{ background: `linear-gradient(90deg, ${accent}, #fde68a)` }}
            >
              {status === 'sending' ? <Loader2 className="animate-spin" /> : <Send size={20} />}
              {ui('submit', lang)}
            </button>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}
