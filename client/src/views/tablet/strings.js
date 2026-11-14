/**
 * Tablet-only UI strings (Member 2). Shared strings live in @shared/i18n.js.
 * Usage: t('composite', lang)
 */
export const TABLET_STRINGS = Object.freeze({
  composite: {
    ro: 'Mărturie compozită',
    en: 'Composite testimony',
    hu: 'Összetett tanúságtétel',
    de: 'Zusammengesetztes Zeugnis',
    sr: 'Kompozitno svedočanstvo',
  },
  visitor: {
    ro: 'Amintire de vizitator',
    en: 'Visitor memory',
    hu: 'Látogatói emlék',
    de: 'Besuchererinnerung',
    sr: 'Sećanje posetioca',
  },
  live: { ro: 'Live', en: 'Live', hu: 'Élő', de: 'Live', sr: 'Uživo' },
  fresh: { ro: 'Nou', en: 'New', hu: 'Új', de: 'Neu', sr: 'Novo' },
  noMemories: {
    ro: 'Încă nicio amintire în acest capitol. Fii primul care aprinde o scânteie.',
    en: 'No memories in this chapter yet. Be the first to ignite a spark.',
    hu: 'Ebben a fejezetben még nincs emlék. Légy az első, aki szikrát gyújt.',
    de: 'Noch keine Erinnerungen in diesem Kapitel. Entzünde den ersten Funken.',
    sr: 'Još nema sećanja u ovom poglavlju. Budi prvi koji će zapaliti iskru.',
  },
  tapToSpotlight: {
    ro: 'Atinge o amintire pentru a o aduce în lumină pe toate ecranele',
    en: 'Tap a memory to spotlight it on every screen',
    hu: 'Érints meg egy emléket, hogy minden képernyőn reflektorfénybe kerüljön',
    de: 'Tippe auf eine Erinnerung, um sie auf allen Bildschirmen hervorzuheben',
    sr: 'Dodirni sećanje da ga istakneš na svim ekranima',
  },
  clearSpotlight: {
    ro: 'Stinge reflectorul',
    en: 'Clear spotlight',
    hu: 'Reflektor kikapcsolása',
    de: 'Rampenlicht aus',
    sr: 'Ugasi reflektor',
  },
  sealHint: {
    ro: 'Îndreaptă lentila AR spre Sigiliu',
    en: 'Point the AR lens at the Seal',
    hu: 'Irányítsd az AR-lencsét a Pecsétre',
    de: 'Richte die AR-Linse auf das Siegel',
    sr: 'Usmeri AR sočivo ka Pečatu',
  },
  chooseChapter: {
    ro: 'Alege un capitol',
    en: 'Choose a chapter',
    hu: 'Válassz fejezetet',
    de: 'Wähle ein Kapitel',
    sr: 'Izaberi poglavlje',
  },
  willJoin: {
    ro: 'Se va alătura capitolului',
    en: 'Will join the chapter',
    hu: 'Ehhez a fejezethez kerül',
    de: 'Wird Teil des Kapitels',
    sr: 'Pridružiće se poglavlju',
  },
  anonymous: { ro: 'Anonim', en: 'Anonymous', hu: 'Névtelen', de: 'Anonym', sr: 'Anonimno' },
  speakNow: {
    ro: 'Vorbește acum, în română…',
    en: 'Speak now, in English…',
    hu: 'Beszélj most, magyarul…',
    de: 'Sprich jetzt, auf Deutsch…',
    sr: 'Govori sada, na srpskom…',
  },
  tapToStop: { ro: 'Atinge pentru a opri', en: 'Tap to stop', hu: 'Érintsd meg a leállításhoz', de: 'Zum Beenden tippen', sr: 'Dodirni da zaustaviš' },
  dictationUnsupported: {
    ro: 'Dictarea vocală nu este disponibilă în acest browser — poți scrie amintirea.',
    en: 'Voice dictation is not available in this browser — you can type your memory.',
    hu: 'A hangalapú diktálás ebben a böngészőben nem érhető el — begépelheted az emléked.',
    de: 'Sprachdiktat ist in diesem Browser nicht verfügbar — du kannst deine Erinnerung tippen.',
    sr: 'Glasovno diktiranje nije dostupno u ovom pregledaču — možeš da otkucaš sećanje.',
  },
  micDenied: {
    ro: 'Accesul la microfon a fost refuzat. Permite-l din setările browserului (necesită HTTPS).',
    en: 'Microphone access was blocked. Allow it in the browser settings (requires HTTPS).',
    hu: 'A mikrofon hozzáférése le van tiltva. Engedélyezd a böngésző beállításaiban (HTTPS szükséges).',
    de: 'Mikrofonzugriff wurde blockiert. Erlaube ihn in den Browsereinstellungen (HTTPS erforderlich).',
    sr: 'Pristup mikrofonu je blokiran. Dozvoli ga u podešavanjima pregledača (potreban je HTTPS).',
  },
  noSpeech: {
    ro: 'Nu am auzit nimic. Mai încearcă o dată.',
    en: "I didn't hear anything. Try once more.",
    hu: 'Nem hallottam semmit. Próbáld újra.',
    de: 'Ich habe nichts gehört. Versuch es noch einmal.',
    sr: 'Nisam ništa čuo. Pokušaj ponovo.',
  },
  sendError: {
    ro: 'Nu am putut ajunge la server — încearcă din nou.',
    en: 'Could not reach the server — please try again.',
    hu: 'Nem érhető el a szerver — próbáld újra.',
    de: 'Server nicht erreichbar — bitte erneut versuchen.',
    sr: 'Server nije dostupan — pokušaj ponovo.',
  },
  rising: {
    ro: 'Scânteia ta se înalță deasupra Sigiliului…',
    en: 'Your spark is rising above the Seal…',
    hu: 'A szikrád a Pecsét fölé emelkedik…',
    de: 'Dein Funke steigt über dem Siegel auf…',
    sr: 'Tvoja iskra se uzdiže iznad Pečata…',
  },
  // ── Time Tuner (rotary dial 1900–2026) ──
  tuner: { ro: 'Acordor de timp', en: 'Time tuner', hu: 'Időhangoló', de: 'Zeit-Tuner', sr: 'Vremenski tjuner' },
  stations: {
    ro: 'Posturi istorice',
    en: 'Tuning stations',
    hu: 'Történelmi állomások',
    de: 'Historische Sender',
    sr: 'Istorijske stanice',
  },
  turnHint: {
    ro: 'Rotește inelul exterior · 1900 → 2026',
    en: 'Turn the outer ring · 1900 → 2026',
    hu: 'Forgasd a külső gyűrűt · 1900 → 2026',
    de: 'Dreh den äußeren Ring · 1900 → 2026',
    sr: 'Okreni spoljni prsten · 1900 → 2026',
  },
  signal: { ro: 'Semnal', en: 'Signal', hu: 'Jel', de: 'Signal', sr: 'Signal' },
  locked: { ro: 'Acordat', en: 'Locked', hu: 'Behangolva', de: 'Empfang', sr: 'Uhvaćeno' },
  searching: {
    ro: 'Între posturi — paraziți',
    en: 'Between stations — static',
    hu: 'Állomások között — zörej',
    de: 'Zwischen den Sendern — Rauschen',
    sr: 'Između stanica — šum',
  },
  tuningIn: {
    ro: 'Se prinde semnalul',
    en: 'Tuning in',
    hu: 'Jel befogása',
    de: 'Sender kommt näher',
    sr: 'Hvatanje signala',
  },
  yearDial: {
    ro: 'Selector de an, 1900–2026',
    en: 'Year dial, 1900–2026',
    hu: 'Évválasztó tárcsa, 1900–2026',
    de: 'Jahresregler, 1900–2026',
    sr: 'Birač godine, 1900–2026',
  },
  arAnchor: { ro: 'Ancoră AR', en: 'AR anchor', hu: 'AR-horgony', de: 'AR-Anker', sr: 'AR sidro' },
  anchorLocked: {
    ro: 'Lentilă ancorată',
    en: 'Lens locked',
    hu: 'Lencse rögzítve',
    de: 'Linse verankert',
    sr: 'Sočivo usidreno',
  },
  symbolMeaning: {
    candle: { ro: 'pentru amintire', en: 'for remembrance', hu: 'az emlékezésért', de: 'zum Gedenken', sr: 'za sećanje' },
    flower: { ro: 'pentru recunoștință', en: 'for gratitude', hu: 'a hálaért', de: 'aus Dankbarkeit', sr: 'za zahvalnost' },
    musical_note: { ro: 'pentru bucurie și cântec', en: 'for joy and song', hu: 'az örömért és a dalért', de: 'für Freude und Gesang', sr: 'za radost i pesmu' },
  },
});

export function t(key, lang) {
  const entry = TABLET_STRINGS[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

/** Short station names for the dial presets (full titles live in TIMELINE_ERAS). */
export const STATION_SHORT = Object.freeze({
  '1910_secession': { ro: 'Secession', en: 'Secession', hu: 'Szecesszió', de: 'Jugendstil', sr: 'Secesija' },
  '1977_phoenix': { ro: 'Rock Phoenix', en: 'Phoenix Rock', hu: 'Phoenix-rock', de: 'Phoenix-Rock', sr: 'Phoenix rok' },
  '1989_opera': { ro: 'Revoluția', en: 'Revolution', hu: 'Forradalom', de: 'Revolution', sr: 'Revolucija' },
  '2026_modern': { ro: 'Prezent', en: 'Modern', hu: 'Jelen', de: 'Gegenwart', sr: 'Sadašnjost' },
});

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

/** Light haptic tick on devices that support it (Android Chrome). Silent elsewhere. */
export function haptic(pattern = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
