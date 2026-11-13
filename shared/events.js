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
