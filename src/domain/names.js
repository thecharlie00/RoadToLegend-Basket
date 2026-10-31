(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);

  // Política: solo se generan/alteran nombres de JUGADORES.
  // Los nombres de equipos/clubes/competiciones vienen de paquetes de datos y no se modifican aquí.
  let inspiredPack = null;
  function defaultPack() {
    if (root.CAA_DATA && root.CAA_DATA['inspired-names']) return root.CAA_DATA['inspired-names'];
    if (typeof require === 'function') { try { return require('../../data/players/inspired-names.json'); } catch (_) {} }
    return null;
  }
  function configure(pack) { inspiredPack = pack || null; return getPack(); }
  function getPack() { return inspiredPack || defaultPack(); }
  function normalize(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
  function inspiredName(seed, opts = {}) {
    const pack = getPack();
    if (!pack || !Array.isArray(pack.names) || !pack.names.length) return null;
    const rng = RNG.create(seed);
    let pool = pack.names.slice();
    if (opts.scope) pool = pool.filter(n => n.scope === opts.scope || n.scope === 'world');
    if (opts.nationality && rng.float() < 0.65) { const nat = pool.filter(n => n.nationality === opts.nationality); if (nat.length) pool = nat; }
    if (opts.pos && rng.float() < 0.55) { const pos = pool.filter(n => n.pos === opts.pos); if (pos.length) pool = pos; }
    if (opts.maxTier) pool = pool.filter(n => n.tier <= opts.maxTier);
    if (opts.exclude && opts.exclude.length) { const ex = new Set(opts.exclude.map(normalize)); pool = pool.filter(n => !ex.has(normalize(n.name))); }
    if (!pool.length) return null;
    const pick = rng.pick(pool);
    return { first: pick.name.split(' ')[0], last: pick.name.split(' ').slice(1).join(' '), full: pick.name, inspiredId: pick.id, nationality: pick.nationality, pos: pick.pos, archetype: pick.archetype, tier: pick.tier };
  }
  function assignInspiredToClubs(clubs, seed, scope, offset) {
    const pack = getPack();
    if (!pack) return clubs;
    const rng = RNG.create(seed);
    const pool = rng.shuffle(pack.names.filter(n => n.scope === scope || n.scope === 'world'));
    let cursor = offset || 0;
    const used = new Set();
    for (const club of clubs) {
      const stars = club.roster.slice().sort((a, b) => b.ovr - a.ovr).slice(0, scope === 'na' ? 2 : 1);
      for (const p of stars) {
        let entry = null;
        for (let i = 0; i < pool.length; i++) {
          const candidate = pool[(cursor + i) % pool.length];
          if (!used.has(candidate.id)) { entry = candidate; cursor = (cursor + i + 1) % pool.length; break; }
        }
        if (!entry) continue;
        used.add(entry.id);
        p.name = entry.name;
        p.nameInspirationId = entry.id;
        p.nationality = entry.nationality;
      }
    }
    return clubs;
  }
  const POOLS = {
    ES: { first: ['Álvaro','Bruno','Carlos','Dani','Enzo','Fran','Gonzalo','Hugo','Iker','Javi','Luis','Marcos','Nico','Óscar','Pablo','Quique','Raúl','Sergi','Tomás','Unai','Víctor','Xavi','Yeray','Adrián'], last: ['Alcores','Barragán','Cuesta','Delgado','Espinosa','Fuentes','Gallardo','Herrero','Ibáñez','Jurado','Llorente','Montoro','Navarro','Olmedo','Paredes','Quintana','Roldán','Salcedo','Tovar','Ureña','Valcárcel','Zambrano'] },
    US: { first: ['Aaron','Blake','Cameron','Darius','Elijah','Grant','Isaiah','Jalen','Kendall','Logan','Malik','Noah','Owen','Peyton','Quinn','Reese','Trey','Vaughn','Wesley','Xavier','Zane','Cole'], last: ['Ashford','Bridges','Callahan','Drummond','Ellison','Foster','Granger','Hastings','Irving','Jennings','Kessler','Lawson','Mercer','Northcutt','Osborne','Prescott','Quigley','Radcliffe','Sutton','Thatcher','Underwood','Whitlock'] },
    FR: { first: ['Amadou','Bastien','Cédric','Dimitri','Étienne','Fabien','Gaël','Hugo','Idriss','Jules','Kylian','Lucas','Mathis','Noé','Olivier','Pierre','Quentin','Rémi','Théo','Yanis'], last: ['Arnaud','Beaumont','Chastain','Dufour','Évrard','Fontaine','Girard','Hébert','Lefèvre','Marchand','Noyer','Perrin','Rousseau','Sauvage','Thibault','Vasseur'] },
    DE: { first: ['Lukas','Finn','Jonas','Maximilian','Niklas','Paul','Leon','Tim','Moritz','Jan','Erik','Felix','Tobias','Florian','Sebastian','David'], last: ['Adler','Bauer','Dorn','Eichmann','Fischer','Gerber','Hoffmann','Keller','Lang','Möller','Neumann','Otto','Peters','Richter','Schäfer','Vogel','Weber','Zimmermann'] },
    IT: { first: ['Alessandro','Andrea','Davide','Federico','Giacomo','Lorenzo','Matteo','Nicolò','Pietro','Riccardo','Simone','Tommaso','Vincenzo','Elia','Filippo','Marco'], last: ['Amato','Bellini','Costa','De Luca','Esposito','Ferrari','Gallo','Lombardi','Moretti','Neri','Orlando','Pellegrini','Rizzo','Sartori','Testa','Villa'] },
    TR: { first: ['Alperen','Berk','Cedi','Doruk','Efe','Furkan','Gökhan','Hakan','İsmail','Kerem','Mert','Onur','Polat','Rüzgar','Sarp','Tolga','Umut','Yiğit'], last: ['Acar','Balcı','Çelik','Demir','Erdem','Fırat','Güneş','Haktan','Işık','Kara','Lale','Mert','Nalbant','Orhan','Pekkan','Soylu','Turan','Yıldız'] },
    GR: { first: ['Alexandros','Dimitrios','Efthymios','Georgios','Ioannis','Konstantinos','Leonidas','Marios','Nikolaos','Panagiotis','Stefanos','Theodoros','Vasilis','Christos','Andreas','Spyros'], last: ['Alexiou','Dimitriou','Economou','Fotiadis','Georgiou','Ioannidis','Karamanlis','Lazos','Michailidis','Nikolaou','Papadakis','Stefanidis','Theodorou','Vlachos'] },
    AR: { first: ['Agustín','Bautista','Facundo','Franco','Gaspar','Ignacio','Joaquín','Lautaro','Mateo','Nicolás','Octavio','Pedro','Ramiro','Santiago','Tomás','Valentín'], last: ['Acosta','Benítez','Cabrera','Domínguez','Escobar','Figueroa','Giménez','Heredia','Ibarra','Juárez','Ledesma','Moyano','Núñez','Ojeda','Peralta','Quiroga','Ríos','Sosa'] },
    BR: { first: ['André','Bruno','Caio','Davi','Enzo','Felipe','Gustavo','Heitor','Igor','João','Kauã','Lucas','Matheus','Nicolas','Otávio','Pedro','Rafael','Thiago','Vinícius','Yuri'], last: ['Almeida','Barbosa','Cardoso','Duarte','Esteves','Farias','Gonçalves','Henriques','Lopes','Macedo','Nascimento','Oliveira','Pacheco','Queiroz','Ribeiro','Sales','Teixeira','Vieira'] },
    AU: { first: ['Archie','Banjo','Cooper','Darcy','Finn','Hamish','Jack','Lachlan','Mitchell','Noah','Oliver','Patrick','Riley','Samuel','Thomas','William'], last: ['Anderson','Bennett','Clarke','Dawson','Edwards','Fletcher','Griffiths','Harrison','Jenkins','Kelly','Lawson','Morrison','Newton','Patterson','Reid','Sutherland'] },
    CA: { first: ['Aiden','Bennett','Carter','Declan','Emmett','Félix','Grady','Hudson','Jasper','Kieran','Liam','Mason','Nolan','Olivier','Parker','Quinn','Rowan','Tristan'], last: ['Arsenault','Bouchard','Cameron','Doucet','Émond','Fraser','Gagnon','Haché','Irvine','Johnston','Keating','LeBlanc','MacNeil','Ouellet','Poirier','Saulnier'] },
    LT: { first: ['Arvydas','Domas','Eimantas','Gytis','Ignas','Jonas','Kęstutis','Laurynas','Mantas','Nerijus','Paulius','Rokas','Šarūnas','Tadas','Ugnius','Vaidas','Žydrūnas'], last: ['Antanaitis','Balčiūnas','Čepukas','Daukša','Eidukas','Gudaitis','Ivanauskas','Jankūnas','Kuzminskas','Lukauskis','Mačiulis','Navickas','Petrauskas','Radvila','Šulskis','Vaitkus'] },
    RS: { first: ['Aleksa','Bogdan','Danilo','Filip','Goran','Ilija','Jovan','Kosta','Luka','Miloš','Nemanja','Ognjen','Petar','Rastko','Stefan','Uroš','Vuk','Žarko'], last: ['Arsić','Bojović','Vuković','Gajić','Đorđević','Erić','Živković','Ilić','Jovanović','Krstić','Lukić','Marković','Nikolić','Obradović','Pavlović','Ristić'] },
    CN: { first: ['An','Bo','Cheng','Dong','Feng','Gang','Hao','Jian','Kun','Lei','Ming','Ning','Peng','Qiang','Rui','Sheng','Tao','Wei','Xiang','Yang','Zhe'], last: ['Bai','Chen','Deng','Fang','Guo','Han','Huang','Jiang','Kong','Li','Liu','Luo','Ma','Qian','Sun','Wang','Xu','Yang','Zhang','Zhao'] },
    JP: { first: ['Akira','Daichi','Haruto','Kaito','Ren','Sora','Takumi','Yamato','Yuki','Riku','Hiro','Kenji','Sho','Taiga','Kenta','Ryo'], last: ['Abe','Chiba','Fujii','Goto','Hasegawa','Ishida','Kato','Mori','Nakamura','Ogawa','Saito','Takahashi','Ueda','Watanabe','Yamada','Zenkichi'] },
    KR: { first: ['Min-jun','Seo-jun','Do-yun','Ha-jun','Ji-ho','Eun-woo','Si-woo','Yu-jun','Ju-won','Ga-on','Hyun-woo','Seung-min','Tae-yang','Jin-woo','Dong-hyun','Sung-ho'], last: ['Gang','Namgung','Do','Bae','Seo','Sunwoo','An','Yeo','Hwangbo','Jegal','Hwang','Son','Yu','Hong','Jeon','Go'] },
    PH: { first: ['Adrian','Benjie','Carlo','Dante','Emilio','Franco','Gio','Hector','Iñigo','Jomar','Kiko','Lorenzo','Miguel','Nico','Paolo','Rafael','Sandro','Tonio'], last: ['Agbayani','Bautista','Castillo','Dizon','Espino','Fajardo','Gatchalian','Hizon','Ilagan','Javier','Katigbak','Lacson','Manalo','Navarro','Ocampo','Panganiban'] },
    ZA: { first: ['Bandile','Chumani','Dumisani','Enzokuhle','Fanele','Gcobani','Hlumelo','Inathi','Jabulani','Kagiso','Lwazi','Mandla','Nkosinathi','Onke','Phakamile','Siyabonga','Thabo','Unathi'], last: ['Arendse','Baloyi','Cele','Dlamini','Ebrahim','Fani','Gumede','Hadebe','Jacobs','Khumalo','Luthuli','Mabaso','Nkosi','Oosthuizen','Pillay','Radebe','Sithole','Zulu'] },
    DEFAULT: { first: ['Alex','Blair','Casey','Drew','Emery','Finley','Gray','Harper','Indigo','Jules','Kai','Lane','Morgan','Noel','Oakley','Parker','Reese','Sage'], last: ['Arden','Brook','Cedar','Dale','Ember','Field','Glen','Hollow','Ives','Jordan','Keel','Lark','Marsh','North','Orchard','Pike','Quill','Rowan'] }
  };

  function pool(nationality) { return POOLS[nationality] || POOLS.DEFAULT; }
  function generateName(seed, nationality) {
    const rng = RNG.create(seed);
    const p = pool(nationality);
    const first = rng.pick(p.first);
    const last = rng.pick(p.last);
    return { first, last, full: first + ' ' + last };
  }
  function generateRosterNames(seed, nationality, count) {
    const out = [];
    const seen = new Set();
    let i = 0;
    while (out.length < count && i < count * 20) {
      const n = generateName(seed + ':name:' + i, nationality);
      if (!seen.has(n.full)) { seen.add(n.full); out.push(n); }
      i++;
    }
    return out;
  }

  CAA.Names = { POOLS, configure, getPack, inspiredName, assignInspiredToClubs, generateName, generateRosterNames };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Names;
})(typeof globalThis !== 'undefined' ? globalThis : this);
