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
    NG: { first: ['Chinedu','Emeka','Ikenna','Kelechi','Obinna','Olumide','Tunde','Uche','Yusuf','Femi','Ade','Chuka'], last: ['Adeyemi','Balogun','Eze','Nwosu','Okafor','Okeke','Oladipo','Onuoha','Uzoma','Ibekwe'] },
    SN: { first: ['Abdou','Cheikh','Gorgui','Ibrahima','Mamadou','Moustapha','Ousmane','Pape','Serigne','Tacko','Youssou','Babacar'], last: ['Ba','Cissé','Diallo','Diop','Fall','Faye','Gueye','Ndiaye','Sarr','Seck','Sow','Thiam'] },
    MX: { first: ['Alejandro','Diego','Emiliano','Gael','Iván','Jorge','Leonardo','Manuel','Rodrigo','Santiago','Uriel','Ximeno'], last: ['Aguilar','Castañeda','Domínguez','Escobedo','Garza','Hernández','Ibarra','Mendoza','Ramírez','Sandoval','Treviño','Villalobos'] },
    PL: { first: ['Adam', 'Bartosz', 'Damian', 'Filip', 'Igor', 'Jakub', 'Kacper', 'Mateusz', 'Michał', 'Piotr', 'Szymon', 'Tomasz'], last: ['Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Dąbrowski', 'Kozłowski', 'Mazur', 'Krawczyk'] },
    HR: { first: ['Ante', 'Dario', 'Ivan', 'Josip', 'Luka', 'Marko', 'Mario', 'Nikola', 'Roko', 'Toni', 'Zvonimir', 'Bojan'], last: ['Babić', 'Barić', 'Jurić', 'Knežević', 'Kovačić', 'Marić', 'Novak', 'Pavić', 'Perić', 'Radić', 'Šimić', 'Vuković'] },
    CZ: { first: ['Adam', 'David', 'Filip', 'Jakub', 'Jan', 'Lukáš', 'Martin', 'Ondřej', 'Petr', 'Tomáš', 'Vojtěch', 'Matěj'], last: ['Novák', 'Svoboda', 'Dvořák', 'Černý', 'Procházka', 'Kučera', 'Veselý', 'Horák', 'Němec', 'Pokorný', 'Marek', 'Pospíšil'] },
    BE: { first: ['Arne', 'Bram', 'Cédric', 'Dries', 'Emiel', 'Florent', 'Jonas', 'Loïc', 'Maxime', 'Pieter', 'Thibault', 'Wout'], last: ['Claes', 'Dubois', 'Janssens', 'Lambert', 'Maes', 'Mertens', 'Peeters', 'Renard', 'Simon', 'Vermeulen', 'Willems', 'Wouters'] },
    NL: { first: ['Bas', 'Daan', 'Jesse', 'Joost', 'Lars', 'Luuk', 'Milan', 'Niels', 'Ruben', 'Sem', 'Stijn', 'Thijs'], last: ['Bakker', 'de Boer', 'de Jong', 'de Vries', 'Jansen', 'Kok', 'Meijer', 'Mulder', 'Smit', 'van Dijk', 'Visser', 'Vos'] },
    PT: { first: ['André', 'Bernardo', 'Diogo', 'Duarte', 'Gonçalo', 'João', 'Miguel', 'Nuno', 'Rafael', 'Rodrigo', 'Rui', 'Tiago'], last: ['Almeida', 'Carvalho', 'Costa', 'Ferreira', 'Gomes', 'Lopes', 'Martins', 'Pereira', 'Ribeiro', 'Rodrigues', 'Santos', 'Silva'] },
    HU: { first: ['Ádám', 'Balázs', 'Bence', 'Dániel', 'Gergő', 'Levente', 'Márk', 'Máté', 'Norbert', 'Péter', 'Tamás', 'Zoltán'], last: ['Balogh', 'Farkas', 'Horváth', 'Kiss', 'Kovács', 'Molnár', 'Nagy', 'Németh', 'Szabó', 'Takács', 'Tóth', 'Varga'] },
    UY: { first: ['Agustín', 'Bruno', 'Diego', 'Emiliano', 'Facundo', 'Gastón', 'Joaquín', 'Martín', 'Nicolás', 'Rodrigo', 'Santiago', 'Sebastián'], last: ['Acosta', 'Cabrera', 'Fernández', 'García', 'González', 'Martínez', 'Olivera', 'Pereira', 'Rodríguez', 'Silva', 'Sosa', 'Suárez'] },
    VE: { first: ['Andrés', 'Carlos', 'Daniel', 'Gregory', 'Héctor', 'Jesús', 'José', 'Luis', 'Néstor', 'Óscar', 'Ricardo', 'Yohan'], last: ['Blanco', 'Díaz', 'Flores', 'García', 'Hernández', 'López', 'Marcano', 'Mendoza', 'Pérez', 'Rojas', 'Torres', 'Vásquez'] },
    PR: { first: ['Ángel', 'Carlos', 'Christian', 'Eddie', 'Gabriel', 'Ismael', 'Javier', 'José', 'Luis', 'Ramón', 'Ricky', 'Yaniel'], last: ['Ayala', 'Colón', 'Cruz', 'Díaz', 'Figueroa', 'López', 'Morales', 'Ortiz', 'Rivera', 'Rodríguez', 'Santiago', 'Vega'] },
    NZ: { first: ['Blake', 'Corey', 'Finn', 'Hamish', 'Isaac', 'Kahu', 'Liam', 'Mika', 'Nikau', 'Reuben', 'Tama', 'Wiremu'], last: ['Anderson', 'Brown', 'Clarke', 'Harris', 'Henare', 'Ngata', 'Parata', 'Smith', 'Taylor', 'Tipene', 'Walker', 'Wilson'] },
    EG: { first: ['Ahmed', 'Amr', 'Hassan', 'Karim', 'Khaled', 'Mahmoud', 'Mohamed', 'Mostafa', 'Omar', 'Tarek', 'Youssef', 'Ziad'], last: ['Abdelrahman', 'Farouk', 'Gamal', 'Hamdy', 'Hassan', 'Ibrahim', 'Mansour', 'Mostafa', 'Saad', 'Salah', 'Shaker', 'Zaki'] },
    MA: { first: ['Adam', 'Amine', 'Anas', 'Ayoub', 'Hamza', 'Ilyas', 'Karim', 'Mehdi', 'Othmane', 'Rayan', 'Yassine', 'Zakaria'], last: ['Alaoui', 'Amrani', 'Benali', 'Bennani', 'Berrada', 'Chraibi', 'El Idrissi', 'Fassi', 'Lahlou', 'Mansouri', 'Tazi', 'Ziani'] },
    ID: { first: ['Abraham', 'Agus', 'Arki', 'Bagas', 'Dimas', 'Fajar', 'Hardianus', 'Kevin', 'Rizky', 'Surliyadin', 'Widi', 'Yudha'], last: ['Aditya', 'Dwi', 'Halim', 'Kurniawan', 'Nugroho', 'Pratama', 'Putra', 'Santoso', 'Saputra', 'Setiawan', 'Susanto', 'Wijaya'] },
    TW: { first: ['Chen-yu', 'Chih-hao', 'Chun-chieh', 'Hsin-yi', 'Jia-hao', 'Kai-wen', 'Po-han', 'Tzu-yang', 'Wei-lun', 'Yu-ting', 'Zhi-wei', 'Cheng-en'], last: ['Chang', 'Chen', 'Huang', 'Hsu', 'Kuo', 'Lai', 'Lin', 'Liu', 'Tsai', 'Wang', 'Wu', 'Yang'] },
    LB: { first: ['Ali', 'Elie', 'Fadi', 'Georges', 'Hadi', 'Jad', 'Karim', 'Marc', 'Nadim', 'Rami', 'Wael', 'Ziad'], last: ['Abboud', 'Fakhoury', 'Haddad', 'Khalil', 'Khoury', 'Mansour', 'Nasr', 'Rizk', 'Saad', 'Saliba', 'Tannous', 'Zein'] },
    DEFAULT: { first: ['Alex','Blair','Casey','Drew','Emery','Finley','Gray','Harper','Indigo','Jules','Kai','Lane','Morgan','Noel','Oakley','Parker','Reese','Sage'], last: ['Arden','Brook','Cedar','Dale','Ember','Field','Glen','Hollow','Ives','Jordan','Keel','Lark','Marsh','North','Orchard','Pike','Quill','Rowan'] }
  };

  // Nombres femeninos por nacionalidad (los apellidos se comparten salvo formas propias de LT y GR).
  const FEMALE = {
    ES: ['Alba','Lucía','Carla','Paula','Marta','Laura','Noa','Irene','Claudia','Sara','Elena','Nerea','Aitana','Leire','Queralt','Raquel','Ainhoa','Cristina','Iris','Vega'],
    US: ['Aaliyah','Brianna','Caitlin','Destiny','Erica','Gabrielle','Imani','Jasmine','Kelsey','Maya','Natalie','Paige','Riley','Skylar','Taylor','Zoe'],
    FR: ['Amandine','Camille','Chloé','Élodie','Fatou','Inès','Juliette','Léa','Manon','Marine','Océane','Pauline','Sarah','Yasmine'],
    DE: ['Anna','Emma','Hannah','Johanna','Laura','Lea','Lena','Marie','Mia','Nina','Sophie','Svenja'],
    IT: ['Alessia','Beatrice','Chiara','Elisa','Francesca','Giulia','Ilaria','Martina','Sara','Sofia','Valentina','Cecilia'],
    TR: ['Ayşe','Buse','Cansu','Defne','Ece','Elif','Gizem','Merve','Nilay','Selin','Tuğba','Zeynep'],
    GR: ['Anastasia','Christina','Eleni','Georgia','Ioanna','Katerina','Maria','Sofia','Vasiliki','Zoi'],
    AR: ['Agustina','Camila','Delfina','Florencia','Julieta','Lucía','Martina','Micaela','Sol','Valentina'],
    BR: ['Ana','Beatriz','Camila','Damiris','Fernanda','Isabela','Júlia','Larissa','Mariana','Tainá','Yasmin'],
    AU: ['Abbey','Chloe','Ezi','Georgia','Isla','Jade','Lauren','Matilda','Sami','Tahlia'],
    CA: ['Ava','Bridget','Kia','Laeticia','Maddie','Natalie','Nirra','Shay','Syla','Yvonne'],
    LT: ['Aistė','Eglė','Gintarė','Ieva','Justė','Kotryna','Laura','Milda','Rūta','Urtė'],
    RS: ['Ana','Dragana','Jelena','Milica','Nevena','Sonja','Tamara','Teodora','Vanja','Yvonne'],
    CN: ['Fang','Hui','Jing','Lan','Li','Mei','Ning','Qing','Xia','Xue','Yan','Yu'],
    JP: ['Aiko','Haruka','Hina','Maki','Moeko','Nanako','Rui','Saki','Yuki','Yuna'],
    KR: ['Ji-su','Min-ji','Seo-yeon','Ha-eun','Ye-jin','Su-bin','Da-eun','Ji-woo'],
    PH: ['Afril','Andrea','Camille','Clare','Janine','Kristine','Mikaela','Sofia'],
    ZA: ['Ayanda','Lerato','Naledi','Nomvula','Thandeka','Zanele','Zodwa'],
    NG: ['Adaora','Amarachi','Chioma','Ezinne','Ifeoma','Ngozi','Oluchi','Temitope'],
    SN: ['Aminata','Astou','Awa','Fatou','Khady','Mame','Ndèye','Yacine'],
    MX: ['Ana','Daniela','Fernanda','Guadalupe','Itzel','Jimena','Mariana','Regina','Valeria','Ximena'],
    PL: ['Agata', 'Aleksandra', 'Julia', 'Karolina', 'Magdalena', 'Natalia', 'Weronika', 'Zuzanna'],
    HR: ['Ana', 'Ema', 'Ivana', 'Lana', 'Lucija', 'Marija', 'Petra', 'Sara'],
    CZ: ['Adéla', 'Eliška', 'Kateřina', 'Lucie', 'Markéta', 'Petra', 'Tereza', 'Veronika'],
    BE: ['Ann', 'Elise', 'Emma', 'Julie', 'Kim', 'Laura', 'Marjorie', 'Sara'],
    NL: ['Anouk', 'Emma', 'Fleur', 'Lotte', 'Noor', 'Sanne', 'Sophie', 'Zoë'],
    PT: ['Ana', 'Beatriz', 'Carolina', 'Inês', 'Joana', 'Leonor', 'Mariana', 'Sofia'],
    HU: ['Anna', 'Dóra', 'Eszter', 'Fanni', 'Kitti', 'Lilla', 'Petra', 'Zsófia'],
    UY: ['Camila', 'Florencia', 'Lucía', 'Mariana', 'Martina', 'Sofía', 'Valentina', 'Victoria'],
    VE: ['Andrea', 'Daniela', 'Gabriela', 'Isabel', 'María', 'Mariana', 'Valentina', 'Yulimar'],
    PR: ['Adriana', 'Arella', 'Isalys', 'Jennifer', 'Pamela', 'Tayra', 'Yolanda', 'Zuleika'],
    NZ: ['Aroha', 'Charlotte', 'Kalani', 'Mia', 'Ruby', 'Stella', 'Tia', 'Toni'],
    EG: ['Aya', 'Farida', 'Hana', 'Malak', 'Mariam', 'Nour', 'Salma', 'Yasmine'],
    MA: ['Amina', 'Hiba', 'Imane', 'Khadija', 'Meryem', 'Nadia', 'Salma', 'Yasmina'],
    ID: ['Dewi', 'Indah', 'Kadek', 'Maya', 'Putri', 'Rani', 'Sari', 'Wulan'],
    TW: ['Hsin-yi', 'Mei-ling', 'Pei-shan', 'Shu-fen', 'Ya-ting', 'Yi-chen', 'Yu-chen', 'Wan-ting'],
    LB: ['Joelle', 'Lara', 'Maya', 'Nour', 'Rana', 'Rita', 'Sara', 'Yara'],
    DEFAULT: ['Alex','Blair','Casey','Drew','Emery','Harper','Jules','Morgan','Reese','Sage']
  };
  function femaleLast(last, nationality) {
    if (nationality === 'LT') return last.replace(/(as|is|ys|us)$/, m => ({ as: 'aitė', is: 'ytė', ys: 'ytė', us: 'utė' })[m]);
    if (nationality === 'PL') return last.replace(/(ski|cki|dzki)$/, m => m.slice(0, -1) + 'a');
    if (nationality === 'CZ') return /ý$/.test(last) ? last.replace(/ý$/, 'á') : /ek$/.test(last) ? last.replace(/ek$/, 'ková') : /ec$/.test(last) ? last.replace(/ec$/, 'cová') : last + 'ová';
    if (nationality === 'GR') return last.replace(/(os|as|is)$/, m => ({ os: 'ou', as: 'a', is: 'i' })[m]);
    return last;
  }

  function pool(nationality) { return POOLS[nationality] || POOLS.DEFAULT; }
  function generateName(seed, nationality, gender) {
    const rng = RNG.create(seed);
    const p = pool(nationality);
    let first = rng.pick(p.first);
    let last = rng.pick(p.last);
    if (gender === 'f') { first = rng.pick(FEMALE[nationality] || FEMALE.DEFAULT); last = femaleLast(last, nationality); }
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

  CAA.Names = { POOLS, FEMALE, configure, getPack, inspiredName, assignInspiredToClubs, generateName, generateRosterNames };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Names;
})(typeof globalThis !== 'undefined' ? globalThis : this);
