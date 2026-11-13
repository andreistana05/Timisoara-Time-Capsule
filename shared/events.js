/**
 * TIMIȘOARA TIME CAPSULE — Shared Socket Contract
 * ------------------------------------------------------------
 * Imported by BOTH the server (Node ESM) and the client (Vite).
 * FROZEN after scaffold: changing a name or payload here breaks
 * every other screen. Coordinate with the whole team first.
 * See CLAUDE.md → "Socket.io contract" for payload shapes.
 */

// ---- Socket event names -------------------------------------------------
export const EVENTS = Object.freeze({
  // server -> single client (on connect)
  STATE_INIT: 'STATE_INIT',
  // server -> all clients (after any mutation)
  STATE_UPDATED: 'STATE_UPDATED',
  // client -> server
  CHANGE_CHAPTER: 'CHANGE_CHAPTER',
  CHANGE_LANGUAGE: 'CHANGE_LANGUAGE',
  SELECT_MEMORY_NODE: 'SELECT_MEMORY_NODE',
  ADD_MEMORY: 'ADD_MEMORY',
  // server -> all clients (celebration trigger, fired once per new memory)
  MEMORY_ADDED: 'MEMORY_ADDED',

  // ── v2 additions (additive only; older clients can ignore them) ──
  // client -> server  { token? }  → ack { ok, removed }
  // Restores the 9 seeds + chapter 1 + 'ro', wipes visitor memories (a backup is kept), broadcasts STATE_UPDATED.
  RESET_TO_SEED: 'RESET_TO_SEED',
  // client -> server  { question, language?, chapter?, spotlight? }  → ack { ok, answer: ArchiveAnswer }
  ASK_ARCHIVE: 'ASK_ARCHIVE',
  // server -> all clients  ArchiveAnswer  (one-shot, fired once per answered question, e.g. for the stage)
  ARCHIVE_ANSWER: 'ARCHIVE_ANSWER',

  // ── v3 Phase 2: rotary time-scrubbing + anchored 3D plazas (additive only) ──
  // client -> server  { timeProgress } | { year }   (send freely while the dial turns; ack optional)
  TIME_SCRUB: 'TIME_SCRUB',
  // server -> all clients  TimeScrub  — throttled + volatile while turning, one reliable "settled" emit at rest
  TIME_SCRUB_UPDATED: 'TIME_SCRUB_UPDATED',
  // ar -> server  { locked, plazaId?, pose? }  → ack { ok, anchor }
  LOCK_ANCHOR_STATE: 'LOCK_ANCHOR_STATE',
  // server -> all clients  AnchorState  — so tablet/stage know the plaza is locked in space
  ANCHOR_STATE_UPDATED: 'ANCHOR_STATE_UPDATED',
});

export const {
  STATE_INIT,
  STATE_UPDATED,
  CHANGE_CHAPTER,
  CHANGE_LANGUAGE,
  SELECT_MEMORY_NODE,
  ADD_MEMORY,
  MEMORY_ADDED,
  RESET_TO_SEED,
  ASK_ARCHIVE,
  ARCHIVE_ANSWER,
  TIME_SCRUB,
  TIME_SCRUB_UPDATED,
  LOCK_ANCHOR_STATE,
  ANCHOR_STATE_UPDATED,
} = EVENTS;

/**
 * Optional `memory.translation` metadata (v2, visitor memories only; seeds omit it):
 *   {
 *     status: 'pending' | 'translated' | 'original-only' | 'failed',
 *     provider: 'claude' | null,
 *     languages: Lang[],   // languages holding genuine text (original + finished translations)
 *     updatedAt: ISOString
 *   }
 * `title`/`text` always carry all 5 language keys; a language missing from `languages`
 * holds the original-language text as a fallback (pick the speech voice accordingly).
 *
 * ArchiveAnswer (ASK_ARCHIVE ack + ARCHIVE_ANSWER broadcast):
 *   {
 *     id: string, question: string, language: Lang, chapter: ChapterId,
 *     answer: string,          // plain text, already in `language`
 *     sourceIds: string[],     // memory ids drawn on (can be passed to SELECT_MEMORY_NODE)
 *     composite: boolean,      // true if the answer draws on composite seed testimonies
 *     provider: 'claude' | 'archive',
 *     createdAt: ISOString
 *   }
 */
export const TRANSLATION_STATUSES = Object.freeze(['pending', 'translated', 'original-only', 'failed']);

// ---- Languages ----------------------------------------------------------
export const LANGUAGES = Object.freeze([
  { code: 'ro', label: 'Română', short: 'RO', speech: 'ro-RO' },
  { code: 'en', label: 'English', short: 'EN', speech: 'en-GB' },
  { code: 'hu', label: 'Magyar', short: 'HU', speech: 'hu-HU' },
  { code: 'de', label: 'Deutsch', short: 'DE', speech: 'de-DE' },
  { code: 'sr', label: 'Srpski', short: 'SR', speech: 'sr-RS' },
]);
export const LANGUAGE_CODES = Object.freeze(LANGUAGES.map((l) => l.code));
export const DEFAULT_LANGUAGE = 'ro';

// ---- Memory symbols -----------------------------------------------------
export const SYMBOLS = Object.freeze(['candle', 'flower', 'musical_note']);

// ---- Design tokens (mirror of CSS variables in client/src/index.css) ----
export const COLORS = Object.freeze({
  obsidian: '#0a0a0f',
  amber: '#f59e0b',
  crimson: '#ef4444',
  cyan: '#38bdf8',
  ivory: '#f5f0e6',
});

// ---- Chapters -----------------------------------------------------------
export const CHAPTER_IDS = Object.freeze(['1989_piata_maria', '1989_opera', 'multicultural_mosaic']);
export const DEFAULT_CHAPTER = '1989_piata_maria';

export const CHAPTERS = Object.freeze({
  '1989_piata_maria': {
    id: '1989_piata_maria',
    order: 1,
    date: '1989-12-16',
    place: 'Piața Maria',
    theme: { primary: '#ef4444', secondary: '#f59e0b', glow: '#ff7a45' },
    title: {
      ro: 'Scânteia din Piața Maria',
      en: 'The Spark of Piața Maria',
      hu: 'A Mária téri szikra',
      de: 'Der Funke vom Maria-Platz',
      sr: 'Iskra sa Trga Marije',
    },
    dateLabel: {
      ro: '16 decembrie 1989',
      en: '16 December 1989',
      hu: '1989. december 16.',
      de: '16. Dezember 1989',
      sr: '16. decembar 1989.',
    },
    subtitle: {
      ro: 'Un lanț uman în jurul casei parohiale a pastorului Tőkés László devine începutul Revoluției.',
      en: "A human chain around Pastor László Tőkés's parish house becomes the beginning of the Revolution.",
      hu: 'A Tőkés László lelkész parókiája körüli élőlánc a forradalom kezdetévé válik.',
      de: 'Eine Menschenkette um das Pfarrhaus von Pastor László Tőkés wird zum Beginn der Revolution.',
      sr: 'Ljudski lanac oko parohijskog doma pastora Lasla Tekeša postaje početak Revolucije.',
    },
    narrative: {
      ro: 'Credincioși de toate confesiunile se adună pentru a împiedica evacuarea pastorului reformat. Tramvaiele se opresc în Piața Maria, pasagerii coboară și se alătură mulțimii. Până seara, rugăciunea devine strigăt: „Libertate!”.',
      en: 'Believers of every faith gather to stop the eviction of the Reformed pastor. Trams halt in Piața Maria, passengers step down and join the crowd. By nightfall, a prayer has become a chant: "Freedom!".',
      hu: 'Minden felekezet hívei összegyűlnek, hogy megakadályozzák a református lelkész kilakoltatását. A villamosok megállnak a Mária téren, az utasok leszállnak és csatlakoznak a tömeghez. Estére az imából kiáltás lesz: „Szabadság!”.',
      de: 'Gläubige aller Konfessionen versammeln sich, um die Räumung des reformierten Pfarrers zu verhindern. Straßenbahnen halten am Maria-Platz, Fahrgäste steigen aus und schließen sich der Menge an. Bei Einbruch der Nacht wird aus dem Gebet ein Ruf: „Freiheit!“.',
      sr: 'Vernici svih veroispovesti okupljaju se da spreče iseljenje reformatskog pastora. Tramvaji staju na Trgu Marije, putnici izlaze i pridružuju se masi. Do noći, molitva postaje poklič: „Sloboda!”.',
    },
  },
  '1989_opera': {
    id: '1989_opera',
    order: 2,
    date: '1989-12-20',
    place: 'Piața Victoriei / Opera',
    theme: { primary: '#f59e0b', secondary: '#38bdf8', glow: '#ffd27a' },
    title: {
      ro: 'Balconul Operei',
      en: 'The Opera Balcony',
      hu: 'Az Opera erkélye',
      de: 'Der Balkon der Oper',
      sr: 'Balkon Opere',
    },
    dateLabel: {
      ro: '20 decembrie 1989',
      en: '20 December 1989',
      hu: '1989. december 20.',
      de: '20. Dezember 1989',
      sr: '20. decembar 1989.',
    },
    subtitle: {
      ro: 'Peste 100.000 de oameni în Piața Operei. Timișoara se declară primul oraș liber de comunism din România.',
      en: 'Over 100,000 people fill Opera Square. Timișoara declares itself the first city in Romania free of communism.',
      hu: 'Több mint 100 000 ember az Opera téren. Temesvár Románia első kommunizmustól szabad városának nyilvánítja magát.',
      de: 'Über 100.000 Menschen auf dem Opernplatz. Temeswar erklärt sich zur ersten vom Kommunismus freien Stadt Rumäniens.',
      sr: 'Više od 100.000 ljudi na Trgu Opere. Temišvar se proglašava prvim gradom u Rumuniji slobodnim od komunizma.',
    },
    narrative: {
      ro: 'Fabricile intră în grevă, iar muncitorii mărșăluiesc spre centru. De pe balconul Operei se citesc revendicările Frontului Democratic Român. Mulțimea ține lumânări aprinse și cântă „Deșteaptă-te, române!” — un oraș întreg care nu mai are frică.',
      en: 'Factories go on strike and workers march to the centre. From the Opera balcony, the demands of the Romanian Democratic Front are read aloud. The crowd holds lit candles and sings "Deșteaptă-te, române!" — an entire city that is no longer afraid.',
      hu: 'A gyárak sztrájkba lépnek, a munkások a központba vonulnak. Az Opera erkélyéről felolvassák a Román Demokratikus Front követeléseit. A tömeg gyertyákat tart és énekel — egy egész város, amely már nem fél.',
      de: 'Die Fabriken streiken, Arbeiter ziehen ins Zentrum. Vom Opernbalkon werden die Forderungen der Rumänischen Demokratischen Front verlesen. Die Menge hält brennende Kerzen und singt — eine ganze Stadt, die keine Angst mehr hat.',
      sr: 'Fabrike stupaju u štrajk, a radnici marširaju ka centru. Sa balkona Opere čitaju se zahtevi Rumunskog demokratskog fronta. Masa drži upaljene sveće i peva — ceo grad koji se više ne boji.',
    },
  },
  multicultural_mosaic: {
    id: 'multicultural_mosaic',
    order: 3,
    date: '1716-2026',
    place: 'Fabric · Iosefin · Elisabetin · Cetate',
    theme: { primary: '#38bdf8', secondary: '#f59e0b', glow: '#a78bfa' },
    title: {
      ro: 'Mozaicul celor 21 de comunități',
      en: 'The Mosaic of 21 Communities',
      hu: 'A 21 közösség mozaikja',
      de: 'Das Mosaik der 21 Gemeinschaften',
      sr: 'Mozaik 21 zajednice',
    },
    dateLabel: {
      ro: 'Trei secole de conviețuire',
      en: 'Three centuries of living together',
      hu: 'Három évszázad együttélés',
      de: 'Drei Jahrhunderte des Zusammenlebens',
      sr: 'Tri veka zajedničkog života',
    },
    subtitle: {
      ro: 'Români, maghiari, germani șvabi, sârbi, evrei, bulgari și multe alte comunități care au construit împreună un oraș.',
      en: 'Romanians, Hungarians, Swabian Germans, Serbs, Jews, Bulgarians and many more communities who built one city together.',
      hu: 'Románok, magyarok, sváb németek, szerbek, zsidók, bolgárok és sok más közösség, akik együtt építettek egy várost.',
      de: 'Rumänen, Ungarn, Banater Schwaben, Serben, Juden, Bulgaren und viele weitere Gemeinschaften, die gemeinsam eine Stadt erbauten.',
      sr: 'Rumuni, Mađari, Švapski Nemci, Srbi, Jevreji, Bugari i mnoge druge zajednice koje su zajedno izgradile jedan grad.',
    },
    narrative: {
      ro: 'În cartierele Fabric și Iosefin, sinagogi, biserici ortodoxe, catolice și reformate stau la câțiva pași una de alta. Fațadele Secession, piețele de cartier și muzica de la nunți poartă amprenta fiecărei comunități — un mozaic viu, nu o colecție de piese separate.',
      en: 'In the Fabric and Iosefin districts, synagogues and Orthodox, Catholic and Reformed churches stand a few steps apart. Secession façades, neighbourhood markets and wedding music carry the imprint of every community — a living mosaic, not a collection of separate pieces.',
      hu: 'A Gyárváros és Józsefváros negyedeiben zsinagógák, ortodox, katolikus és református templomok állnak néhány lépésre egymástól. A szecessziós homlokzatok, a piacok és a lakodalmi zene minden közösség lenyomatát hordozzák — élő mozaik.',
      de: 'In der Fabrikstadt und der Josefstadt stehen Synagogen sowie orthodoxe, katholische und reformierte Kirchen nur wenige Schritte voneinander entfernt. Jugendstilfassaden, Märkte und Hochzeitsmusik tragen die Spuren jeder Gemeinschaft — ein lebendiges Mosaik.',
      sr: 'U četvrtima Fabrik i Josefin, sinagoge i pravoslavne, katoličke i reformatske crkve stoje na nekoliko koraka jedna od druge. Secesijske fasade, pijace i svadbena muzika nose trag svake zajednice — živi mozaik.',
    },
  },
});

export const isValidChapter = (id) => CHAPTER_IDS.includes(id);
export const isValidLanguage = (code) => LANGUAGE_CODES.includes(code);
export const isValidSymbol = (s) => SYMBOLS.includes(s);

/**
 * Pick a translated string from a `{ ro, en, hu, de, sr }` object.
 * Falls back to: requested -> memory.originalLanguage -> en -> ro -> first value.
 */
export function tr(obj, lang, fallbackLang) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || (fallbackLang && obj[fallbackLang]) || obj.en || obj.ro || Object.values(obj)[0] || '';
}

// ---- Timeline (v3 Phase 2: rotary time-scrubbing 1900 → 2026) ----------
/**
 * The dial is a normalized `timeProgress` t ∈ [0, 1]. Years are NOT linear in t:
 * the scale is piecewise-linear through the station anchors, so each "Tuning Station"
 * lands on its exact year (e.g. t 0.85 → 1989) and the dense decades get more travel.
 *
 * Backward compatibility: stations never invent chapter ids. Each one names the
 * EXISTING chapter it snaps `activeChapter` to (`chapter`) and the chapters that
 * already count as "on this station" (`chapters`), so e.g. Piața Maria is not
 * overridden by Opera when the dial enters 1989. CHAPTER_IDS is unchanged.
 *
 * TimeScrub (TIME_SCRUB_UPDATED payload):
 *   { timeProgress, currentYear, nearestStation: StationId, stationProximity: 0..1,
 *     inStation: boolean, settled: boolean, activeChapter, source: socketId | null }
 *   stationProximity = 1 on the clean frequency → 0 at/after the band edge (pure static).
 *
 * AnchorState (ANCHOR_STATE_UPDATED payload, also globalState.anchor):
 *   { locked, plazaId: string | null,
 *     pose: { position:[x,y,z], rotation:[x,y,z,w], scale } | null,
 *     by: role | null, updatedAt: ISOString | null }
 */
export const TIMELINE = Object.freeze({ startYear: 1900, endYear: 2026, defaultProgress: 0.85 });

export const STATION_IDS = Object.freeze(['1910_secession', '1977_phoenix', '1989_opera', '2026_modern']);

export const TIMELINE_ERAS = Object.freeze([
  {
    id: '1910_secession',
    order: 1,
    t: 0.1,
    year: 1910,
    halfWidth: 0.05, // band around t where the static clears (proximity > 0)
    chapter: 'multicultural_mosaic',
    chapters: ['multicultural_mosaic'],
    plazaId: 'piata_libertatii_1900',
    theme: { primary: '#d4a35a', secondary: '#7fb59a', glow: '#f3d9a4' },
    sound: 'brass_band',
    title: {
      ro: 'Piața Libertății și curțile Secession',
      en: 'Piața Libertății & the Secession Courtyards',
      hu: 'A Szabadság tér és a szecessziós udvarok',
      de: 'Freiheitsplatz und die Jugendstil-Höfe',
      sr: 'Trg slobode i secesijska dvorišta',
    },
    subtitle: {
      ro: 'O fanfară la 1910 și meșteșugari din toate comunitățile orașului.',
      en: 'A 1910 brass band and craftsmen from every community of the city.',
      hu: 'Egy 1910-es fúvószenekar és a város minden közösségének mesteremberei.',
      de: 'Eine Blaskapelle um 1910 und Handwerker aus allen Gemeinschaften der Stadt.',
      sr: 'Limena muzika oko 1910. i zanatlije iz svih zajednica grada.',
    },
  },
  {
    id: '1977_phoenix',
    order: 2,
    t: 0.6,
    year: 1977,
    halfWidth: 0.05,
    chapter: 'multicultural_mosaic',
    chapters: ['multicultural_mosaic'],
    plazaId: 'piata_unirii_1977',
    theme: { primary: '#a855f7', secondary: '#f97316', glow: '#d8b4fe' },
    sound: 'censored_rock',
    title: {
      ro: 'Rockul din subterană și evadarea Phoenix',
      en: 'Underground Rock & the Phoenix Escape',
      hu: 'Underground rock és a Phoenix szökése',
      de: 'Untergrund-Rock und die Flucht von Phoenix',
      sr: 'Andergraund rok i bekstvo grupe Phoenix',
    },
    subtitle: {
      ro: '1977: rock cenzurat; membrii trupei timișorene Phoenix fug din țară ascunși în boxe de sunet.',
      en: "1977: censored rock; members of Timișoara's band Phoenix flee the country hidden in loudspeaker cabinets.",
      hu: '1977: cenzúrázott rock; a temesvári Phoenix együttes tagjai hangfaldobozokba rejtőzve szöknek el.',
      de: '1977: zensierter Rock; Mitglieder der Temeswarer Band Phoenix fliehen versteckt in Lautsprecherboxen.',
      sr: '1977: cenzurisani rok; članovi temišvarske grupe Phoenix beže iz zemlje skriveni u zvučnim kutijama.',
    },
  },
  {
    id: '1989_opera',
    order: 3,
    t: 0.85,
    year: 1989,
    halfWidth: 0.05,
    chapter: '1989_opera',
    chapters: ['1989_piata_maria', '1989_opera'],
    plazaId: 'piata_operei_1989',
    theme: { primary: '#f59e0b', secondary: '#ef4444', glow: '#ffd27a' },
    sound: 'crowd_libertate',
    title: {
      ro: 'Decembrie 1989 — Piața Maria și balconul Operei',
      en: 'December 1989 — Piața Maria & the Opera Balcony',
      hu: '1989 decembere — a Mária tér és az Opera erkélye',
      de: 'Dezember 1989 — Maria-Platz und Opernbalkon',
      sr: 'Decembar 1989 — Trg Marije i balkon Opere',
    },
    subtitle: {
      ro: 'Peste 100.000 de oameni strigă „Libertate!”.',
      en: 'More than 100,000 people chant "Libertate!".',
      hu: 'Több mint 100 000 ember kiáltja: „Libertate!”.',
      de: 'Über 100.000 Menschen rufen „Libertate!“.',
      sr: 'Više od 100.000 ljudi uzvikuje „Libertate!”.',
    },
  },
  {
    id: '2026_modern',
    order: 4,
    t: 0.98,
    year: 2026,
    halfWidth: 0.04, // narrower: the dial ends at t = 1
    chapter: 'multicultural_mosaic',
    chapters: ['multicultural_mosaic'],
    plazaId: 'timisoara_2026',
    theme: { primary: '#38bdf8', secondary: '#a78bfa', glow: '#7dd3fc' },
    sound: 'tram_symphony',
    title: {
      ro: 'Timișoara multiculturală vie și simfonia tramvaielor',
      en: 'Living Multicultural Timișoara & the Tram Symphony',
      hu: 'Az élő, multikulturális Temesvár és a villamosszimfónia',
      de: 'Das lebendige multikulturelle Temeswar und die Straßenbahn-Sinfonie',
      sr: 'Živi multikulturni Temišvar i simfonija tramvaja',
    },
    subtitle: {
      ro: 'Ambient modern și scântei de la comunități.',
      en: 'Modern ambience and sparks from the communities.',
      hu: 'Modern hangulat és a közösségek szikrái.',
      de: 'Moderne Klangwelt und Funken aus den Gemeinschaften.',
      sr: 'Moderni ambijent i iskre zajednica.',
    },
  },
]);

export const TIMELINE_ERA_BY_ID = Object.freeze(Object.fromEntries(TIMELINE_ERAS.map((e) => [e.id, e])));
export const isValidStation = (id) => STATION_IDS.includes(id);

// Piecewise-linear (t → year) anchors: both dial ends + every station.
const TIME_ANCHORS = Object.freeze([[0, TIMELINE.startYear], ...TIMELINE_ERAS.map((e) => [e.t, e.year]), [1, TIMELINE.endYear]]);

export const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));

/** Exact (fractional) year for a dial position. Round it for display. */
export function yearFromProgress(t) {
  const x = clamp01(t);
  for (let i = 1; i < TIME_ANCHORS.length; i++) {
    const [t0, y0] = TIME_ANCHORS[i - 1];
    const [t1, y1] = TIME_ANCHORS[i];
    if (x <= t1) return t1 === t0 ? y1 : y0 + ((x - t0) / (t1 - t0)) * (y1 - y0);
  }
  return TIMELINE.endYear;
}

/** Inverse of yearFromProgress (first t for a year; years clamp to 1900–2026). */
export function progressFromYear(year) {
  const y = Math.min(TIMELINE.endYear, Math.max(TIMELINE.startYear, Number(year) || TIMELINE.startYear));
  for (let i = 1; i < TIME_ANCHORS.length; i++) {
    const [t0, y0] = TIME_ANCHORS[i - 1];
    const [t1, y1] = TIME_ANCHORS[i];
    if (y <= y1) return y1 === y0 ? t0 : t0 + ((y - y0) / (y1 - y0)) * (t1 - t0);
  }
  return 1;
}

/**
 * Radio reading for a dial position. Pure and cheap, so clients can call it every
 * frame for zero-latency local feedback and treat the server echo as confirmation.
 * stationProximity: cosine falloff, 1 on the station's exact t → 0 at ±halfWidth.
 * inStation: proximity ≥ STATION_LOCK_THRESHOLD (the static has mostly cleared).
 */
export const STATION_LOCK_THRESHOLD = 0.5;
export function readTimeDial(t) {
  const x = clamp01(t);
  let nearest = TIMELINE_ERAS[0];
  for (const e of TIMELINE_ERAS) if (Math.abs(x - e.t) < Math.abs(x - nearest.t)) nearest = e;
  const d = Math.abs(x - nearest.t) / nearest.halfWidth;
  const stationProximity = d >= 1 ? 0 : +(0.5 + 0.5 * Math.cos(Math.PI * d)).toFixed(4);
  return {
    timeProgress: +x.toFixed(4),
    currentYear: Math.round(yearFromProgress(x)),
    nearestStation: nearest.id,
    stationProximity,
    inStation: stationProximity >= STATION_LOCK_THRESHOLD,
  };
}

/**
 * Which chapter should be active for a dial position, given the current one.
 * Unchanged between stations, or when the current chapter already belongs to the
 * station. Always returns a valid existing chapter id.
 */
export function chapterForProgress(t, currentChapter) {
  const r = readTimeDial(t);
  if (!r.inStation) return currentChapter;
  const era = TIMELINE_ERA_BY_ID[r.nearestStation];
  return era.chapters.includes(currentChapter) ? currentChapter : era.chapter;
}

/**
 * Station to move the dial to when a chapter is picked directly (e.g. on the tablet):
 * the latest station that hosts the chapter (1989 chapters → 1989, mosaic → 2026).
 */
export function stationForChapter(chapterId) {
  return TIMELINE_ERAS.filter((e) => e.chapters.includes(chapterId)).at(-1) || null;
}
