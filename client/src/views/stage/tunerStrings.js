/** Strings used only by the Time Tuner on /stage. Era titles/subtitles come from TIMELINE_ERAS (shared). */
export const T = {
  activate: {
    ro: 'Activează sistemul de sunet al muzeului',
    en: 'Activate Museum Sound System',
    hu: 'A múzeum hangrendszerének bekapcsolása',
    de: 'Museums-Soundsystem aktivieren',
    sr: 'Aktiviraj zvučni sistem muzeja',
  },
  /** Compact label for the activate button on short screens (full text stays as its tooltip). */
  activateShort: { ro: 'Pornește sunetul', en: 'Sound on', hu: 'Hang be', de: 'Ton an', sr: 'Uključi zvuk' },
  timeTuner: { ro: 'Acordorul timpului', en: 'Time Tuner', hu: 'Időhangoló', de: 'Zeit-Tuner', sr: 'Tjuner vremena' },
  searching: {
    ro: 'Între posturi · se caută semnalul…',
    en: 'Between stations · searching for a signal…',
    hu: 'Állomások között · jelkeresés…',
    de: 'Zwischen den Sendern · Signalsuche…',
    sr: 'Između stanica · traži se signal…',
  },
  searchingBody: {
    ro: 'Rotiți discul de pe tabletă pentru a acorda o epocă a Timișoarei. Zgomotul se limpezește când ajungeți pe un post istoric.',
    en: 'Turn the dial on the tablet to tune into an era of Timișoara. The static clears when you land on a historical station.',
    hu: 'Forgasd a táblagépen a tárcsát, hogy Temesvár egy korszakára hangolj. A zúgás eltűnik, amikor egy történelmi állomásra érsz.',
    de: 'Drehe am Tablet den Regler, um eine Epoche Temeswars einzustellen. Das Rauschen klärt sich, sobald du einen historischen Sender triffst.',
    sr: 'Okreni točkić na tabletu da uhvatiš jednu epohu Temišvara. Šum nestaje kada staneš na istorijsku stanicu.',
  },
  onAir: { ro: 'Pe post', en: 'On air', hu: 'Adásban', de: 'Auf Sendung', sr: 'U eteru' },
  static: { ro: 'Zgomot', en: 'Static', hu: 'Zúgás', de: 'Rauschen', sr: 'Šum' },
  signal: { ro: 'Semnal', en: 'Signal', hu: 'Jel', de: 'Signal', sr: 'Signal' },
  dragHint: {
    ro: 'Trage pe bandă pentru a acorda',
    en: 'Drag along the band to tune',
    hu: 'Húzd a sávon a hangoláshoz',
    de: 'Zum Einstellen über das Band ziehen',
    sr: 'Prevuci po traci da podesiš',
  },
  reconstruction: {
    ro: 'Reconstituire sonoră procedurală · nu este o înregistrare de arhivă',
    en: 'Procedural sound reconstruction · not an archival recording',
    hu: 'Procedurális hangrekonstrukció · nem archív felvétel',
    de: 'Prozedurale Klangrekonstruktion · keine Archivaufnahme',
    sr: 'Proceduralna zvučna rekonstrukcija · nije arhivski snimak',
  },
};

/** Archival context per station (crossfades with the dial). */
export const ERA_CONTEXT = {
  '1910_secession': {
    ro: 'Timișoara (Temesvár) face parte din Austro-Ungaria. Străzile au iluminat electric din 1884, tramvaiul electric circulă din 1899, iar palatele Secession se înalță în jurul piețelor.',
    en: 'Timișoara (Temesvár) is part of Austria-Hungary. Its streets have had electric lighting since 1884, electric trams since 1899, and Secession palaces are rising around the squares.',
    hu: 'Temesvár az Osztrák–Magyar Monarchia része. Utcáit 1884 óta villany világítja, 1899 óta villamos jár, a terek körül szecessziós paloták épülnek.',
    de: 'Temeswar gehört zu Österreich-Ungarn. Seit 1884 elektrische Straßenbeleuchtung, seit 1899 elektrische Straßenbahn — rund um die Plätze entstehen Jugendstilpaläste.',
    sr: 'Temišvar je deo Austrougarske. Ulice imaju električno osvetljenje od 1884, električni tramvaj saobraća od 1899, a oko trgova niču secesijske palate.',
  },
  '1977_phoenix': {
    ro: 'Phoenix, trupa rock fondată la Timișoara în 1962, se lovește de cenzura regimului. În 1977 membrii ei fug din țară ascunși în boxele de sunet ale trupei.',
    en: 'Phoenix, the rock band founded in Timișoara in 1962, runs up against the regime’s censors. In 1977 its members flee the country hidden inside the band’s loudspeaker cabinets.',
    hu: 'Az 1962-ben Temesváron alapított Phoenix rockegyüttes a rendszer cenzúrájába ütközik. 1977-ben tagjai a zenekar hangfaldobozaiba rejtőzve szöknek el az országból.',
    de: 'Phoenix, 1962 in Temeswar gegründet, gerät mit der Zensur des Regimes aneinander. 1977 fliehen die Musiker versteckt in den Lautsprecherboxen der Band außer Landes.',
    sr: 'Phoenix, rok grupa osnovana u Temišvaru 1962, sukobljava se sa cenzurom režima. Godine 1977. članovi beže iz zemlje skriveni u zvučnim kutijama grupe.',
  },
  '1989_opera': {
    ro: '16 decembrie: un lanț uman în jurul casei parohiale a pastorului Tőkés László, în Piața Maria. 20 decembrie: peste 100.000 de oameni în Piața Operei — primul oraș liber de comunism din România.',
    en: '16 December: a human chain around Pastor László Tőkés’s parish house at Piața Maria. 20 December: over 100,000 people in Opera Square — the first city in Romania free of communism.',
    hu: 'December 16.: élőlánc Tőkés László lelkész parókiája körül a Mária téren. December 20.: több mint 100 000 ember az Opera téren — Románia első kommunizmustól szabad városa.',
    de: '16. Dezember: eine Menschenkette um das Pfarrhaus von Pastor László Tőkés am Maria-Platz. 20. Dezember: über 100.000 Menschen auf dem Opernplatz — die erste vom Kommunismus freie Stadt Rumäniens.',
    sr: '16. decembar: ljudski lanac oko parohijskog doma pastora Lasla Tekeša na Trgu Marije. 20. decembar: preko 100.000 ljudi na Trgu Opere — prvi grad u Rumuniji slobodan od komunizma.',
  },
  '2026_modern': {
    ro: 'Capitală Europeană a Culturii în 2023, Timișoara își poartă mai departe mozaicul de comunități: tramvaie, cartiere istorice renovate și scântei de amintire lăsate de vizitatori.',
    en: 'European Capital of Culture in 2023, Timișoara carries its mosaic of communities forward: trams, restored historic districts and memory sparks left by visitors.',
    hu: 'A 2023-as Európa Kulturális Fővárosa továbbviszi közösségeinek mozaikját: villamosok, felújított történelmi negyedek és a látogatók emlékszikrái.',
    de: 'Als Kulturhauptstadt Europas 2023 trägt Temeswar sein Mosaik der Gemeinschaften weiter: Straßenbahnen, sanierte historische Viertel und Erinnerungsfunken der Besucher.',
    sr: 'Evropska prestonica kulture 2023, Temišvar nosi dalje svoj mozaik zajednica: tramvaji, obnovljene istorijske četvrti i iskre sećanja posetilaca.',
  },
};

export const t_ = (key, lang) => T[key]?.[lang] || T[key]?.en || key;
