/** Strings used only by the AR view (CLAUDE.md §2 rule 4). */
const S = {
  listen: { ro: 'Ascultă', en: 'Listen', hu: 'Meghallgatás', de: 'Anhören', sr: 'Slušaj' },
  stop: { ro: 'Oprește', en: 'Stop', hu: 'Leállítás', de: 'Stopp', sr: 'Zaustavi' },
  composite: {
    ro: 'Mărturie compozită · bazată pe relatări istorice',
    en: 'Composite testimony · based on historical accounts',
    hu: 'Összetett tanúságtétel · történelmi beszámolók alapján',
    de: 'Zusammengesetztes Zeugnis · nach historischen Berichten',
    sr: 'Sastavljeno svedočanstvo · prema istorijskim izvorima',
  },
  visitor: { ro: 'Amintire de vizitator · adăugată live', en: 'Visitor memory · added live', hu: 'Látogatói emlék · élőben hozzáadva', de: 'Besuchererinnerung · live hinzugefügt', sr: 'Sećanje posetioca · dodato uživo' },
  orbit: { ro: 'Orbită 3D', en: '3D Orbit', hu: '3D nézet', de: '3D-Orbit', sr: '3D orbita' },
  arCamera: { ro: 'Cameră AR', en: 'AR Camera', hu: 'AR kamera', de: 'AR-Kamera', sr: 'AR kamera' },
  camBlocked: {
    ro: 'Camera e blocată — vezi doar holograma.',
    en: 'Camera blocked — showing hologram only.',
    hu: 'A kamera le van tiltva — csak a hologram látható.',
    de: 'Kamera blockiert — nur Hologramm.',
    sr: 'Kamera je blokirana — prikazuje se samo hologram.',
  },
  camHttps: {
    ro: 'Camera necesită HTTPS — folosește linkul tunel.',
    en: 'Camera needs HTTPS — use the tunnel URL.',
    hu: 'A kamerához HTTPS kell — használd a tunnel URL-t.',
    de: 'Kamera braucht HTTPS — Tunnel-URL verwenden.',
    sr: 'Kamera zahteva HTTPS — koristi tunel adresu.',
  },
  recenter: { ro: 'Recentrează', en: 'Recenter', hu: 'Középre', de: 'Zentrieren', sr: 'Centriraj' },
  enableMotion: { ro: 'Ancorează holograma', en: 'Anchor hologram', hu: 'Hologram rögzítése', de: 'Hologramm verankern', sr: 'Usidri hologram' },
  soundOn: { ro: 'Sunet spațial', en: 'Spatial sound', hu: 'Térhatású hang', de: 'Raumklang', sr: 'Prostorni zvuk' },
  headphones: {
    ro: 'Cel mai bine cu căști',
    en: 'Best with headphones',
    hu: 'Fejhallgatóval a legjobb',
    de: 'Am besten mit Kopfhörern',
    sr: 'Najbolje uz slušalice',
  },
  swipe: { ro: 'glisează în jos pentru a închide', en: 'swipe down to close', hu: 'húzd le a bezáráshoz', de: 'zum Schließen nach unten wischen', sr: 'prevuci nadole da zatvoriš' },
  rising: { ro: 'se ridică din piedestal', en: 'is rising from the pedestal', hu: 'emelkedik a talapzatból', de: 'steigt aus dem Sockel auf', sr: 'se uzdiže sa postolja' },
};

export const t = (key, lang) => S[key]?.[lang] || S[key]?.en || key;
