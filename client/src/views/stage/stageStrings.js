/** Strings used only by /stage. Shared strings live in @shared/i18n.js. */
export const S = {
  enableSound: {
    ro: 'Activează sunetul generativ',
    en: 'Enable generative sound',
    hu: 'Generatív hang bekapcsolása',
    de: 'Generativen Klang aktivieren',
    sr: 'Uključi generativni zvuk',
  },
  resumeSound: {
    ro: 'Click oriunde pentru a relua sunetul',
    en: 'Click anywhere to resume sound',
    hu: 'Kattints bárhová a hang folytatásához',
    de: 'Irgendwo klicken, um den Klang fortzusetzen',
    sr: 'Klikni bilo gde da nastaviš zvuk',
  },
  mute: { ro: 'Oprește sunetul (M)', en: 'Mute (M)', hu: 'Némítás (M)', de: 'Stumm (M)', sr: 'Isključi zvuk (M)' },
  unmute: { ro: 'Pornește sunetul (M)', en: 'Unmute (M)', hu: 'Hang be (M)', de: 'Ton an (M)', sr: 'Uključi zvuk (M)' },
  fullscreen: { ro: 'Ecran complet (F)', en: 'Fullscreen (F)', hu: 'Teljes képernyő (F)', de: 'Vollbild (F)', sr: 'Ceo ekran (F)' },
  livingArchive: { ro: 'Arhiva vie', en: 'Living archive', hu: 'Élő archívum', de: 'Lebendiges Archiv', sr: 'Živa arhiva' },
  constellation: {
    ro: 'Constelația amintirilor',
    en: 'Constellation of memories',
    hu: 'Emlékek csillagképe',
    de: 'Sternbild der Erinnerungen',
    sr: 'Sazvežđe sećanja',
  },
  clickStar: {
    ro: 'Atinge o stea pentru a o aduce în lumină',
    en: 'Click a star to bring it into the light',
    hu: 'Kattints egy csillagra, hogy fénybe hozd',
    de: 'Klicke auf einen Stern, um ihn ins Licht zu holen',
    sr: 'Klikni na zvezdu da je izneseš na svetlo',
  },
  composite: {
    ro: 'Mărturie compozită · bazată pe relatări istorice',
    en: 'Composite testimony · based on historical accounts',
    hu: 'Összetett tanúságtétel · történelmi beszámolók alapján',
    de: 'Zusammengesetztes Zeugnis · nach historischen Berichten',
    sr: 'Kompozitno svedočanstvo · zasnovano na istorijskim izvorima',
  },
  visitor: {
    ro: 'Amintire de vizitator · adăugată live',
    en: 'Visitor memory · added live',
    hu: 'Látogatói emlék · élőben hozzáadva',
    de: 'Besuchererinnerung · live hinzugefügt',
    sr: 'Sećanje posetioca · dodato uživo',
  },
  justArrived: {
    ro: 'Tocmai a sosit în capsulă',
    en: 'Just arrived in the capsule',
    hu: 'Most érkezett a kapszulába',
    de: 'Gerade in der Kapsel angekommen',
    sr: 'Upravo stiglo u kapsulu',
  },
  sparks: { ro: 'scântei', en: 'sparks', hu: 'szikra', de: 'Funken', sr: 'iskri' },
  live: { ro: 'live', en: 'live', hu: 'élő', de: 'live', sr: 'uživo' },
  nowLit: { ro: 'Acum în lumină', en: 'Now in the light', hu: 'Most fényben', de: 'Jetzt im Licht', sr: 'Sada na svetlu' },
  reopen: { ro: 'Redeschide', en: 'Reopen', hu: 'Újranyitás', de: 'Erneut öffnen', sr: 'Ponovo otvori' },
};

export const s = (key, lang) => S[key]?.[lang] || S[key]?.en || key;
