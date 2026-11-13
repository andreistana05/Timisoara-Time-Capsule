/**
 * Common UI strings used by more than one screen. FROZEN (Member 1 owns).
 * View-specific strings should live inside the view's own folder.
 * Usage: import { UI, ui } from '@shared/i18n.js'; ui('connected', lang)
 */
export const UI = Object.freeze({
  appName: {
    ro: 'Capsula Timpului Timișoara',
    en: 'Timișoara Time Capsule',
    hu: 'Temesvári Időkapszula',
    de: 'Zeitkapsel Temeswar',
    sr: 'Temišvarska vremenska kapsula',
  },
  tagline: {
    ro: 'Muzeu holografic viu',
    en: 'Holographic Living Museum',
    hu: 'Holografikus élő múzeum',
    de: 'Holografisches lebendiges Museum',
    sr: 'Holografski živi muzej',
  },
  connected: { ro: 'Conectat', en: 'Connected', hu: 'Csatlakozva', de: 'Verbunden', sr: 'Povezano' },
  offline: { ro: 'Deconectat', en: 'Offline', hu: 'Nincs kapcsolat', de: 'Getrennt', sr: 'Van mreže' },
  chapter: { ro: 'Capitol', en: 'Chapter', hu: 'Fejezet', de: 'Kapitel', sr: 'Poglavlje' },
  language: { ro: 'Limbă', en: 'Language', hu: 'Nyelv', de: 'Sprache', sr: 'Jezik' },
  memories: { ro: 'Amintiri', en: 'Memories', hu: 'Emlékek', de: 'Erinnerungen', sr: 'Sećanja' },
  igniteSpark: {
    ro: 'Aprinde o scânteie de amintire',
    en: 'Ignite a Memory Spark',
    hu: 'Gyújts egy emlékszikrát',
    de: 'Entzünde einen Erinnerungsfunken',
    sr: 'Zapali iskru sećanja',
  },
  yourName: { ro: 'Numele tău', en: 'Your name', hu: 'A neved', de: 'Dein Name', sr: 'Tvoje ime' },
  yourMemory: {
    ro: 'Amintirea sau gândul tău…',
    en: 'Your memory or reflection…',
    hu: 'Emléked vagy gondolatod…',
    de: 'Deine Erinnerung oder dein Gedanke…',
    sr: 'Tvoje sećanje ili misao…',
  },
  pickSymbol: { ro: 'Alege un simbol', en: 'Choose a symbol', hu: 'Válassz szimbólumot', de: 'Wähle ein Symbol', sr: 'Izaberi simbol' },
  submit: { ro: 'Trimite în capsulă', en: 'Send to the capsule', hu: 'Küldés a kapszulába', de: 'In die Kapsel senden', sr: 'Pošalji u kapsulu' },
  cancel: { ro: 'Anulează', en: 'Cancel', hu: 'Mégse', de: 'Abbrechen', sr: 'Otkaži' },
  dictate: { ro: 'Dictează', en: 'Dictate', hu: 'Diktálás', de: 'Diktieren', sr: 'Diktiraj' },
  listening: { ro: 'Ascult…', en: 'Listening…', hu: 'Figyelek…', de: 'Ich höre zu…', sr: 'Slušam…' },
  newMemory: { ro: 'Amintire nouă', en: 'New memory', hu: 'Új emlék', de: 'Neue Erinnerung', sr: 'Novo sećanje' },
  spotlight: { ro: 'În lumina reflectorului', en: 'In the spotlight', hu: 'Reflektorfényben', de: 'Im Rampenlicht', sr: 'U centru pažnje' },
  tapAnOrb: {
    ro: 'Atinge o sferă de lumină pentru a asculta o mărturie',
    en: 'Tap an orb of light to hear a testimony',
    hu: 'Érints meg egy fénygömböt, hogy meghallgass egy tanúságot',
    de: 'Tippe auf eine Lichtkugel, um ein Zeugnis zu hören',
    sr: 'Dodirni svetlosnu kuglu da čuješ svedočanstvo',
  },
  symbols: {
    candle: { ro: 'Lumânare', en: 'Candle', hu: 'Gyertya', de: 'Kerze', sr: 'Sveća' },
    flower: { ro: 'Floare', en: 'Flower', hu: 'Virág', de: 'Blume', sr: 'Cvet' },
    musical_note: { ro: 'Notă muzicală', en: 'Musical note', hu: 'Hangjegy', de: 'Musiknote', sr: 'Nota' },
  },
});

export function ui(key, lang) {
  const entry = UI[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}
