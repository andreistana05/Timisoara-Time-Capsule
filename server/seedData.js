/**
 * Seed memories for the Time Capsule archive.
 *
 * IMPORTANT (honesty note for the jury): these are COMPOSITE, illustrative
 * testimonies. Names are fictional; places, dates and events are grounded in
 * the documented history of Timișoara (Dec 16–20, 1989) and its communities.
 * Every seed carries `composite: true` so the UI can label them.
 *
 * Shape: see CLAUDE.md → "Memory object".
 */

const p = (angleDeg, radius, y) => {
  const a = (angleDeg * Math.PI) / 180;
  return { x: +(Math.cos(a) * radius).toFixed(3), y, z: +(Math.sin(a) * radius).toFixed(3) };
};

export const SEED_MEMORIES = [
  // ───────────────────────── 1989_piata_maria ─────────────────────────
  {
    id: 'seed-maria-tram',
    chapter: '1989_piata_maria',
    author: 'Ioan M.',
    role: { ro: 'vatman, linia 4', en: 'tram driver, line 4', hu: 'villamosvezető, 4-es vonal', de: 'Straßenbahnfahrer, Linie 4', sr: 'vozač tramvaja, linija 4' },
    year: 1989,
    symbol: 'candle',
    position: p(10, 1.8, 0.35),
    title: {
      ro: 'Tramvaiul care s-a oprit',
      en: 'The Tram That Stopped',
      hu: 'A villamos, amely megállt',
      de: 'Die Straßenbahn, die stehen blieb',
      sr: 'Tramvaj koji je stao',
    },
    text: {
      ro: 'Am oprit tramvaiul în Piața Maria pentru că nu mai puteam înainta — oamenii erau pe șine. Pasagerii au coborât unul câte unul și nu s-au mai urcat la loc. Am lăsat ușile deschise și am rămas cu ei. Atunci am înțeles că nu mai conduc eu, ci orașul.',
      en: "I stopped my tram in Piața Maria because I couldn't move — people were standing on the rails. The passengers stepped down one by one and never got back on. I left the doors open and stayed with them. That was when I understood I was no longer the one driving; the city was.",
      hu: 'Megállítottam a villamost a Mária téren, mert nem tudtam továbbmenni — emberek álltak a síneken. Az utasok egyenként leszálltak, és nem ültek vissza. Nyitva hagytam az ajtókat, és velük maradtam. Akkor értettem meg, hogy már nem én vezetek, hanem a város.',
      de: 'Ich hielt meine Straßenbahn am Maria-Platz an, weil es nicht weiterging — Menschen standen auf den Schienen. Die Fahrgäste stiegen einer nach dem anderen aus und nie wieder ein. Ich ließ die Türen offen und blieb bei ihnen. Da verstand ich: Nicht mehr ich fuhr, sondern die Stadt.',
      sr: 'Zaustavio sam tramvaj na Trgu Marije jer nisam mogao dalje — ljudi su stajali na šinama. Putnici su izlazili jedan po jedan i nisu se vratili. Ostavio sam vrata otvorena i ostao sa njima. Tada sam shvatio da više ne vozim ja, već grad.',
    },
  },
  {
    id: 'seed-maria-tea',
    chapter: '1989_piata_maria',
    author: 'Erzsébet K.',
    role: { ro: 'vecină din strada Timotei Cipariu', en: 'neighbour on Timotei Cipariu Street', hu: 'szomszéd a Timotei Cipariu utcából', de: 'Nachbarin aus der Timotei-Cipariu-Straße', sr: 'komšinica iz ulice Timotei Ćipariu' },
    year: 1989,
    symbol: 'flower',
    position: p(130, 1.6, 0.8),
    title: {
      ro: 'Ceai fierbinte pentru lanțul uman',
      en: 'Hot Tea for the Human Chain',
      hu: 'Forró tea az élőláncnak',
      de: 'Heißer Tee für die Menschenkette',
      sr: 'Topli čaj za ljudski lanac',
    },
    text: {
      ro: 'Era frig și oamenii stăteau de dimineață în fața casei parohiale. Am fiert tot ceaiul pe care îl aveam și l-am cărat în borcane. Mi-au mulțumit în română, în maghiară, în germană. Nimeni nu întreba cine ce limbă vorbește.',
      en: 'It was freezing, and people had stood in front of the parish house since morning. I boiled all the tea I had and carried it out in jars. They thanked me in Romanian, in Hungarian, in German. Nobody asked who spoke which language.',
      hu: 'Hideg volt, és az emberek reggel óta álltak a parókia előtt. Megfőztem az összes teát, ami volt, és befőttesüvegekben vittem ki. Románul, magyarul, németül köszönték meg. Senki sem kérdezte, ki milyen nyelven beszél.',
      de: 'Es war eiskalt, und die Menschen standen seit dem Morgen vor dem Pfarrhaus. Ich kochte allen Tee, den ich hatte, und trug ihn in Einmachgläsern hinaus. Man dankte mir auf Rumänisch, Ungarisch, Deutsch. Niemand fragte, wer welche Sprache spricht.',
      sr: 'Bilo je hladno, a ljudi su od jutra stajali ispred parohijskog doma. Skuvala sam sav čaj koji sam imala i iznela ga u teglama. Zahvaljivali su mi na rumunskom, mađarskom, nemačkom. Niko nije pitao ko kojim jezikom govori.',
    },
  },
  {
    id: 'seed-maria-chant',
    chapter: '1989_piata_maria',
    author: 'Radu P.',
    role: { ro: 'student la Politehnică', en: 'Polytechnic student', hu: 'műegyetemi hallgató', de: 'Student am Polytechnikum', sr: 'student Politehnike' },
    year: 1989,
    symbol: 'candle',
    position: p(250, 1.9, 0.15),
    title: {
      ro: 'Primul strigăt',
      en: 'The First Chant',
      hu: 'Az első kiáltás',
      de: 'Der erste Ruf',
      sr: 'Prvi poklič',
    },
    text: {
      ro: 'Cineva din mulțime a strigat „Libertate!”, iar vocea i-a tremurat. A doua oară am strigat zece. A treia oară, o piață întreagă. Îmi amintesc liniștea de după — ca și cum orașul își asculta propria voce pentru prima dată.',
      en: 'Someone in the crowd shouted "Freedom!" and their voice trembled. The second time, ten of us shouted. The third time, the whole square. I remember the silence afterwards — as if the city were hearing its own voice for the first time.',
      hu: 'Valaki a tömegben elkiáltotta: „Szabadság!”, és remegett a hangja. Másodszor már tízen kiáltottuk. Harmadszor az egész tér. Emlékszem az utána következő csendre — mintha a város először hallotta volna a saját hangját.',
      de: 'Jemand in der Menge rief „Freiheit!“, und seine Stimme zitterte. Beim zweiten Mal riefen wir zu zehnt. Beim dritten Mal der ganze Platz. Ich erinnere mich an die Stille danach — als hörte die Stadt zum ersten Mal ihre eigene Stimme.',
      sr: 'Neko iz mase je uzviknuo „Sloboda!” i glas mu je drhtao. Drugi put nas je vikalo desetoro. Treći put, ceo trg. Sećam se tišine posle toga — kao da je grad prvi put čuo sopstveni glas.',
    },
  },

  // ───────────────────────── 1989_opera ─────────────────────────
  {
    id: 'seed-opera-balcony',
    chapter: '1989_opera',
    author: 'Ana D.',
    role: { ro: 'studentă la Litere', en: 'literature student', hu: 'bölcsészhallgató', de: 'Literaturstudentin', sr: 'studentkinja književnosti' },
    year: 1989,
    symbol: 'candle',
    position: p(40, 1.7, 0.6),
    title: {
      ro: 'Sub balcon',
      en: 'Beneath the Balcony',
      hu: 'Az erkély alatt',
      de: 'Unter dem Balkon',
      sr: 'Ispod balkona',
    },
    text: {
      ro: 'Nu vedeam cine vorbea de pe balconul Operei, auzeam doar difuzorul și ecoul de pe clădiri. Când s-a spus „Timișoara este oraș liber”, străinul de lângă mine m-a îmbrățișat și a plâns. Până azi nu-i știu numele.',
      en: 'I could not see who was speaking from the Opera balcony — I only heard the loudspeaker and its echo off the buildings. When they said "Timișoara is a free city", the stranger next to me hugged me and wept. To this day I do not know his name.',
      hu: 'Nem láttam, ki beszél az Opera erkélyéről, csak a hangszórót és a házfalakról visszaverődő visszhangot hallottam. Amikor elhangzott, hogy „Temesvár szabad város”, a mellettem álló idegen átölelt és sírt. A nevét máig sem tudom.',
      de: 'Ich konnte nicht sehen, wer vom Opernbalkon sprach — ich hörte nur den Lautsprecher und das Echo von den Fassaden. Als es hieß „Temeswar ist eine freie Stadt“, umarmte mich der Fremde neben mir und weinte. Seinen Namen kenne ich bis heute nicht.',
      sr: 'Nisam videla ko govori sa balkona Opere, čula sam samo zvučnik i odjek od zgrada. Kada je rečeno „Temišvar je slobodan grad”, stranac pored mene me je zagrlio i zaplakao. Ni danas ne znam kako se zove.',
    },
  },
  {
    id: 'seed-opera-siren',
    chapter: '1989_opera',
    author: 'Gheorghe T.',
    role: { ro: 'muncitor într-o fabrică de pe Calea Buziașului', en: 'factory worker, Calea Buziașului', hu: 'gyári munkás, Calea Buziașului', de: 'Fabrikarbeiter, Calea Buziașului', sr: 'fabrički radnik, Kalea Buzijašului' },
    year: 1989,
    symbol: 'flower',
    position: p(165, 1.9, 0.25),
    title: {
      ro: 'Sirena fabricii',
      en: 'The Factory Siren',
      hu: 'A gyári sziréna',
      de: 'Die Fabriksirene',
      sr: 'Fabrička sirena',
    },
    text: {
      ro: 'Dimineața, în loc să pornim mașinile, am ieșit pe poartă cu toții, în salopete. Pe drum ni s-au alăturat alte fabrici, apoi oameni de la geamuri. Când am ajuns în Piața Operei, nu mai era o grevă — era tot orașul.',
      en: 'That morning, instead of starting the machines, we all walked out through the gate in our overalls. On the way, other factories joined us, then people from their windows. By the time we reached Opera Square it was no longer a strike — it was the whole city.',
      hu: 'Aznap reggel a gépek beindítása helyett mindannyian kisétáltunk a kapun, munkaruhában. Útközben más gyárak is csatlakoztak, aztán az ablakokból is jöttek az emberek. Mire az Opera térre értünk, az már nem sztrájk volt — hanem az egész város.',
      de: 'An jenem Morgen schalteten wir die Maschinen nicht ein, sondern gingen alle im Blaumann durch das Tor. Unterwegs schlossen sich andere Fabriken an, dann Menschen aus ihren Fenstern. Als wir den Opernplatz erreichten, war es kein Streik mehr — es war die ganze Stadt.',
      sr: 'Tog jutra, umesto da pokrenemo mašine, svi smo izašli kroz kapiju u radnim kombinezonima. Usput su nam se pridružile druge fabrike, pa ljudi sa prozora. Kada smo stigli na Trg Opere, to više nije bio štrajk — bio je to ceo grad.',
    },
  },
  {
    id: 'seed-opera-song',
    chapter: '1989_opera',
    author: 'Maria & Ilinca S.',
    role: { ro: 'mamă și fiică, 7 ani', en: 'mother and daughter, aged 7', hu: 'anya és hétéves lánya', de: 'Mutter und Tochter, 7 Jahre', sr: 'majka i ćerka, 7 godina' },
    year: 1989,
    symbol: 'musical_note',
    position: p(285, 1.6, 0.95),
    title: {
      ro: 'Cântecul cu lumânări',
      en: 'The Candlelit Song',
      hu: 'A gyertyafényes dal',
      de: 'Das Lied im Kerzenlicht',
      sr: 'Pesma uz sveće',
    },
    text: {
      ro: 'Fiica mea ținea o lumânare mai mare decât mâna ei. Nu știa versurile, dar cânta odată cu toată piața. Seara, acasă, m-a întrebat dacă de acum putem vorbi tare. I-am spus că da.',
      en: 'My daughter held a candle bigger than her hand. She did not know the words, but she sang along with the whole square. That evening, at home, she asked me if we were allowed to speak out loud now. I told her yes.',
      hu: 'A lányom a kezénél nagyobb gyertyát tartott. Nem tudta a szöveget, mégis együtt énekelt az egész térrel. Este otthon megkérdezte, hogy mostantól hangosan is beszélhetünk-e. Azt mondtam neki: igen.',
      de: 'Meine Tochter hielt eine Kerze, größer als ihre Hand. Sie kannte den Text nicht, sang aber mit dem ganzen Platz. Am Abend fragte sie mich zu Hause, ob wir jetzt laut sprechen dürften. Ich sagte ja.',
      sr: 'Moja ćerka je držala sveću veću od svoje ruke. Nije znala reči, ali je pevala zajedno sa celim trgom. Uveče, kod kuće, pitala me je da li sada smemo da pričamo naglas. Rekla sam joj da smemo.',
    },
  },

  // ───────────────────────── multicultural_mosaic ─────────────────────────
  {
    id: 'seed-mosaic-baker',
    chapter: 'multicultural_mosaic',
    author: 'Josef W.',
    role: { ro: 'brutar șvab din Iosefin', en: 'Swabian baker from Iosefin', hu: 'sváb pék Józsefvárosból', de: 'Banater Bäcker aus der Josefstadt', sr: 'švapski pekar iz Josefina' },
    year: 1962,
    symbol: 'flower',
    position: p(0, 1.7, 0.5),
    title: {
      ro: 'Pâinea cu trei nume',
      en: 'The Bread With Three Names',
      hu: 'A háromnevű kenyér',
      de: 'Das Brot mit drei Namen',
      sr: 'Hleb sa tri imena',
    },
    text: {
      ro: 'Bunicul meu cocea Kipfel, clienții îi spuneau cornuri, iar vecina sârboaică le spunea kifle. Era aceeași pâine, din același cuptor, la aceeași oră a dimineții. Așa am învățat că un oraș poate avea mai multe limbi și o singură masă.',
      en: 'My grandfather baked Kipfel; the customers called them cornuri, and our Serbian neighbour called them kifle. The same bread, from the same oven, at the same hour of the morning. That is how I learned a city can have many languages and one table.',
      hu: 'A nagyapám Kipfelt sütött, a vevők cornurinak hívták, a szerb szomszédasszony kiflinek. Ugyanaz a kenyér, ugyanabból a kemencéből, ugyanabban a hajnali órában. Így tanultam meg, hogy egy városnak lehet sok nyelve és egyetlen asztala.',
      de: 'Mein Großvater backte Kipfel, die Kunden sagten cornuri, und die serbische Nachbarin sagte kifle. Dasselbe Brot, aus demselben Ofen, zur selben Morgenstunde. So lernte ich, dass eine Stadt viele Sprachen und einen einzigen Tisch haben kann.',
      sr: 'Moj deda je pekao Kipfel, mušterije su ih zvale cornuri, a naša komšinica Srpkinja — kifle. Isti hleb, iz iste peći, u isti jutarnji sat. Tako sam naučio da grad može imati mnogo jezika i jedan sto.',
    },
  },
  {
    id: 'seed-mosaic-tamburica',
    chapter: 'multicultural_mosaic',
    author: 'Dragan J.',
    role: { ro: 'muzician de tamburică, Fabric', en: 'tamburica musician, Fabric', hu: 'tamburazenész, Gyárváros', de: 'Tamburica-Musiker, Fabrikstadt', sr: 'tamburaš, Fabrik' },
    year: 1978,
    symbol: 'musical_note',
    position: p(120, 1.85, 0.2),
    title: {
      ro: 'Nunta la care a cântat tot cartierul',
      en: 'The Wedding the Whole District Played',
      hu: 'A lakodalom, ahol az egész negyed zenélt',
      de: 'Die Hochzeit, bei der das ganze Viertel spielte',
      sr: 'Svadba na kojoj je svirala cela četvrt',
    },
    text: {
      ro: 'Am cântat la o nuntă în Fabric unde mirele era sârb și mireasa maghiară. Noi am început cu tamburica, ei au continuat cu ceardașul, iar spre dimineață un vecin român a adus un taragot. Până la urmă, nimeni nu mai știa al cui e cântecul — și asta era frumusețea.',
      en: 'I played at a wedding in Fabric where the groom was Serbian and the bride Hungarian. We started on the tamburica, they answered with a csárdás, and towards dawn a Romanian neighbour brought out a taragot. In the end nobody knew whose song it was — and that was the beauty of it.',
      hu: 'Egy gyárvárosi lakodalomban zenéltem, ahol a vőlegény szerb, a menyasszony magyar volt. Mi tamburával kezdtünk, ők csárdással feleltek, hajnal felé pedig egy román szomszéd tárogatót hozott. Végül senki sem tudta, kinek a dala — és ebben volt a szépsége.',
      de: 'Ich spielte auf einer Hochzeit in der Fabrikstadt — der Bräutigam Serbe, die Braut Ungarin. Wir begannen mit der Tamburica, sie antworteten mit einem Csárdás, und gegen Morgen holte ein rumänischer Nachbar ein Taragot hervor. Am Ende wusste niemand mehr, wessen Lied es war — und genau das war das Schöne.',
      sr: 'Svirao sam na svadbi u Fabriku gde je mladoženja bio Srbin, a mlada Mađarica. Mi smo počeli tamburicom, oni su odgovorili čardašem, a pred zoru je komšija Rumun izneo tarogat. Na kraju niko nije znao čija je pesma — i u tome je bila lepota.',
    },
  },
  {
    id: 'seed-mosaic-courtyard',
    chapter: 'multicultural_mosaic',
    author: 'Judit R.',
    role: { ro: 'locatară a unei curți comune din Fabric', en: 'resident of a shared courtyard in Fabric', hu: 'egy gyárvárosi közös udvar lakója', de: 'Bewohnerin eines gemeinsamen Hofes in der Fabrikstadt', sr: 'stanarka zajedničkog dvorišta u Fabriku' },
    year: 1955,
    symbol: 'candle',
    position: p(240, 1.65, 0.85),
    title: {
      ro: 'Curtea cu cinci sărbători',
      en: 'The Courtyard of Five Holidays',
      hu: 'Az öt ünnep udvara',
      de: 'Der Hof der fünf Feiertage',
      sr: 'Dvorište pet praznika',
    },
    text: {
      ro: 'În curtea noastră de sub fațada Secession locuiau o familie evreiască, două maghiare, una română și una bulgară. Am crescut sărbătorind de cinci ori pe an: Hanuka, Crăciunul catolic, Crăciunul ortodox și toate celelalte. Copiii nu numărau religiile, numărau prăjiturile.',
      en: 'Behind our Secession façade, the courtyard held a Jewish family, two Hungarian ones, a Romanian one and a Bulgarian one. I grew up celebrating five times a year: Hanukkah, Catholic Christmas, Orthodox Christmas and all the rest. We children never counted religions — we counted cakes.',
      hu: 'A szecessziós homlokzat mögötti udvarunkban egy zsidó, két magyar, egy román és egy bolgár család lakott. Évente ötször ünnepeltünk: Hanukát, katolikus karácsonyt, ortodox karácsonyt és a többit. Mi, gyerekek, nem a vallásokat számoltuk, hanem a süteményeket.',
      de: 'Hinter unserer Jugendstilfassade lebten im Hof eine jüdische Familie, zwei ungarische, eine rumänische und eine bulgarische. Ich wuchs mit fünf Festen im Jahr auf: Chanukka, katholische Weihnacht, orthodoxe Weihnacht und alle anderen. Wir Kinder zählten keine Religionen — wir zählten Kuchen.',
      sr: 'Iza naše secesijske fasade, u dvorištu su živele jedna jevrejska porodica, dve mađarske, jedna rumunska i jedna bugarska. Odrasla sam slaveći pet puta godišnje: Hanuku, katolički Božić, pravoslavni Božić i sve ostalo. Mi deca nismo brojali vere — brojali smo kolače.',
    },
  },
];

export function buildSeedMemories() {
  const base = Date.parse('2026-01-01T00:00:00Z');
  return SEED_MEMORIES.map((m, i) => ({
    ...m,
    originalLanguage: 'ro',
    composite: true,
    isSeed: true,
    createdAt: new Date(base + i * 60_000).toISOString(),
  }));
}
