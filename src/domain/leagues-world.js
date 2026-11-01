(function (root) {
  'use strict';
  // Resto del mundo FIBA: una liga nacional (ficticia) por cada país con competición de baloncesto, femenina donde hay
  // liga profesional, y las ligas universitarias y de desarrollo norteamericanas. Ciudades reales, nombres de liga y
  // apodos de club inventados (sin marcas). Formato: código|continente|nombre de liga|fuerza masc.|fuerza fem. (0 = sin liga)|ciudades
  const CAA = root.CAA = root.CAA || {};
  const Cat = CAA.LeagueCatalog || (typeof require === 'function' ? require('./leagues.js') : null);
  const ROWS = [
    // Europa
    'AL|europe|Liga de las Águilas Negras|42|0|Tirana,Durrës,Vlorë,Elbasan,Shkodër,Fier,Korçë,Berat',
    'AD|europe|Liga de los Valles|38|0|Andorra la Vella,Escaldes,Encamp,La Massana,Ordino,Canillo,Sant Julià,Pas de la Casa',
    'AM|europe|Liga del Ararat|41|0|Ereván,Gyumri,Vanadzor,Vagharshapat,Abovyan,Kapan,Hrazdan,Armavir',
    'AT|europe|Liga Alpina|51|46|Viena,Graz,Linz,Salzburgo,Innsbruck,Klagenfurt,Wels,Sankt Pölten,Dornbirn,Kapfenberg',
    'AZ|europe|Liga del Caspio|43|0|Bakú,Ganja,Sumqayit,Mingachevir,Shirvan,Nakhchivan,Lankaran,Shaki',
    'BY|europe|Liga del Berezina|48|50|Minsk,Gomel,Mogilev,Vitebsk,Grodno,Brest,Bobruisk,Baranovichi',
    'BA|europe|Liga del Neretva|50|44|Sarajevo,Banja Luka,Tuzla,Mostar,Zenica,Bijeljina,Široki Brijeg,Brčko,Prijedor,Doboj',
    'BG|europe|Liga de los Balcanes|50|46|Sofía,Plovdiv,Varna,Burgas,Ruse,Stara Zagora,Pleven,Sliven,Shumen,Botevgrad',
    'CY|europe|Liga de Afrodita|45|40|Nicosia,Limasol,Lárnaca,Pafos,Famagusta,Paralimni,Kyrenia,Aradippou',
    'DK|europe|Liga Danesa del Norte|47|42|Copenhague,Aarhus,Odense,Aalborg,Esbjerg,Randers,Horsens,Svendborg,Herning,Roskilde',
    'EE|europe|Liga del Báltico Norte|49|42|Tallin,Tartu,Narva,Pärnu,Rakvere,Viljandi,Kuressaare,Haapsalu',
    'FI|europe|Liga de los Mil Lagos|51|44|Helsinki,Espoo,Tampere,Vantaa,Turku,Oulu,Kouvola,Lahti,Joensuu,Kauhajoki',
    'GE|europe|Liga del Cáucaso|47|0|Tiflis,Batumi,Kutaisi,Rustavi,Zugdidi,Gori,Poti,Telavi',
    'GB|europe|Liga de las Islas|50|46|Londres,Mánchester,Glasgow,Leicester,Sheffield,Newcastle,Bristol,Cardiff,Birmingham,Plymouth,Worcester,Surrey',
    'IS|europe|Liga de los Géiseres|43|38|Reikiavik,Kópavogur,Hafnarfjörður,Akureyri,Keflavík,Grindavík,Njarðvík,Garðabær',
    'IE|europe|Liga Esmeralda|43|40|Dublín,Cork,Limerick,Galway,Waterford,Killarney,Drogheda,Belfast',
    'IL|europe|Liga del Mar Rojo|57|48|Tel Aviv,Jerusalén,Haifa,Holon,Rishon LeZion,Beer Sheva,Ashdod,Netanya,Herzliya,Eilat,Nahariya,Galil',
    'XK|europe|Liga de Dardania|44|0|Pristina,Prizren,Peja,Gjakova,Ferizaj,Gjilan,Mitrovica,Vushtrri',
    'LV|europe|Liga del Daugava|52|46|Riga,Daugavpils,Liepāja,Jelgava,Jūrmala,Ventspils,Valmiera,Ogre,Cēsis,Rēzekne',
    'LU|europe|Liga del Gran Ducado|42|38|Luxemburgo,Esch,Differdange,Dudelange,Ettelbruck,Diekirch,Mersch,Bertrange',
    'MT|europe|Liga de La Valeta|38|0|La Valeta,Birkirkara,Mosta,Qormi,Żabbar,Sliema,Rabat,Gżira',
    'MD|europe|Liga del Dniéster|40|0|Chisináu,Bălți,Tiraspol,Bender,Cahul,Ungheni,Soroca,Orhei',
    'ME|europe|Liga de la Montaña Negra|51|42|Podgorica,Nikšić,Bar,Budva,Herceg Novi,Pljevlja,Bijelo Polje,Cetinje',
    'MK|europe|Liga del Vardar|47|40|Skopie,Bitola,Kumanovo,Prilep,Tetovo,Ohrid,Gostivar,Štip',
    'NO|europe|Liga de los Fiordos|44|40|Oslo,Bergen,Trondheim,Stavanger,Kristiansand,Tromsø,Bærum,Fredrikstad',
    'RO|europe|Liga de los Cárpatos|50|46|Bucarest,Cluj,Timișoara,Iași,Constanța,Craiova,Oradea,Sibiu,Pitești,Brașov,Ploiești,Târgu Mureș',
    'RU|europe|Liga del Volga|60|56|Moscú,San Petersburgo,Kazán,Ekaterimburgo,Novosibirsk,Krasnodar,Samara,Perm,Nizhni Nóvgorod,Oremburgo,Vladivostok,Jimki',
    'SK|europe|Liga del Tatra|46|47|Bratislava,Košice,Prešov,Žilina,Nitra,Banská Bystrica,Trnava,Levice,Lučenec,Handlová',
    'SI|europe|Liga del Triglav|53|46|Liubliana,Maribor,Celje,Koper,Kranj,Novo Mesto,Velenje,Šentjur,Domžale,Rogaška',
    'SE|europe|Liga Nórdica|48|46|Estocolmo,Gotemburgo,Malmö,Uppsala,Norrköping,Luleå,Borås,Södertälje,Jämtland,Umeå',
    'CH|europe|Liga de los Lagos Alpinos|47|42|Zúrich,Ginebra,Basilea,Lausana,Berna,Lugano,Friburgo,Neuchâtel,Monthey,Massagno',
    'UA|europe|Liga del Dniéper|53|46|Kiev,Járkov,Odesa,Dnipró,Leópolis,Zaporiyia,Kriví Rih,Mykolaiv,Cherkasy,Ternópil',
    'NL|europe|Liga de los Pólderes|48|44|Ámsterdam,Róterdam,La Haya,Utrecht,Eindhoven,Groninga,Leeuwarden,Den Bosch,Zwolle,Apeldoorn',
    // América
    'BS|americas|Liga de las Bahamas|42|0|Nasáu,Freeport,Marsh Harbour,Andros,Eleuthera,Exuma,Abaco,Bimini',
    'BB|americas|Liga Coralina|38|0|Bridgetown,Speightstown,Oistins,Holetown,Bathsheba,St. Philip,Christ Church,St. Michael',
    'BZ|americas|Liga de la Barrera|38|0|Belmopán,Ciudad de Belice,San Ignacio,Orange Walk,Dangriga,Corozal,Punta Gorda,San Pedro',
    'BO|americas|Liga del Altiplano|41|0|La Paz,Santa Cruz,Cochabamba,Sucre,Oruro,Tarija,Potosí,El Alto',
    'CL|americas|Liga de la Cordillera|46|40|Santiago,Valparaíso,Concepción,Temuco,Valdivia,Puerto Montt,Antofagasta,Osorno,Puerto Varas,Ancud',
    'CO|americas|Liga Cafetera|45|0|Bogotá,Medellín,Cali,Barranquilla,Cartagena,Bucaramanga,Cúcuta,Pereira,Manizales,Santa Marta',
    'CR|americas|Liga Pura Vida|40|0|San José,Alajuela,Heredia,Cartago,Liberia,Puntarenas,Limón,Escazú',
    'CU|americas|Liga del Caribe Norte|45|42|La Habana,Santiago de Cuba,Camagüey,Holguín,Santa Clara,Matanzas,Cienfuegos,Pinar del Río',
    'DO|americas|Liga Quisqueyana|48|0|Santo Domingo,Santiago de los Caballeros,La Romana,San Pedro de Macorís,Puerto Plata,La Vega,San Francisco de Macorís,Higüey',
    'EC|americas|Liga de la Mitad del Mundo|41|0|Quito,Guayaquil,Cuenca,Manta,Ambato,Loja,Portoviejo,Machala',
    'SV|americas|Liga de los Volcanes|39|0|San Salvador,Santa Ana,San Miguel,Soyapango,Santa Tecla,Sonsonate,Usulután,La Libertad',
    'GT|americas|Liga del Quetzal|39|0|Ciudad de Guatemala,Quetzaltenango,Escuintla,Antigua,Cobán,Huehuetenango,Mazatenango,Chiquimula',
    'HN|americas|Liga de Copán|38|0|Tegucigalpa,San Pedro Sula,La Ceiba,Choluteca,Comayagua,El Progreso,Puerto Cortés,Danlí',
    'JM|americas|Liga de las Montañas Azules|40|0|Kingston,Montego Bay,Spanish Town,Portmore,Mandeville,Ocho Ríos,Negril,May Pen',
    'NI|americas|Liga de los Lagos|38|0|Managua,León,Masaya,Granada,Matagalpa,Estelí,Chinandega,Bluefields',
    'PA|americas|Liga del Istmo|43|0|Ciudad de Panamá,Colón,David,Santiago,Chitré,La Chorrera,Penonomé,Bocas del Toro',
    'PY|americas|Liga Guaraní|42|0|Asunción,Ciudad del Este,Encarnación,Luque,San Lorenzo,Concepción,Pedro Juan Caballero,Villarrica',
    'PE|americas|Liga de los Andes|40|0|Lima,Arequipa,Trujillo,Cusco,Chiclayo,Piura,Iquitos,Huancayo',
    'TT|americas|Liga del Carnaval|39|0|Puerto España,San Fernando,Chaguanas,Arima,Scarborough,Point Fortin,Sangre Grande,Couva',
    // Asia
    'BH|asia|Liga de las Perlas|44|0|Manama,Muharraq,Riffa,Isa Town,Sitra,Hamad Town,Budaiya,Zallaq',
    'BD|asia|Liga del Delta del Ganges|36|0|Daca,Chittagong,Khulna,Rajshahi,Sylhet,Rangpur,Barisal,Comilla',
    'KH|asia|Liga de Angkor|37|0|Phnom Penh,Siem Reap,Battambang,Sihanoukville,Kampot,Kampong Cham,Kep,Takeo',
    'HK|asia|Liga del Puerto Fragante|42|38|Victoria,Kowloon,Sha Tin,Tsuen Wan,Tuen Mun,Yuen Long,Tai Po,Sai Kung',
    'IN|asia|Liga del Himalaya|41|38|Bombay,Delhi,Bangalore,Chennai,Calcuta,Hyderabad,Pune,Jaipur,Chandigarh,Kochi',
    'IR|asia|Liga Persa|50|0|Teherán,Mashhad,Isfahán,Shiraz,Tabriz,Karaj,Qom,Ahvaz,Kermanshah,Rasht',
    'IQ|asia|Liga de Mesopotamia|43|0|Bagdad,Basora,Mosul,Erbil,Najaf,Kirkuk,Karbala,Duhok',
    'JO|asia|Liga de Petra|47|0|Amán,Zarqa,Irbid,Aqaba,Salt,Madaba,Mafraq,Karak',
    'KZ|asia|Liga de la Estepa|47|42|Astaná,Almaty,Shymkent,Karagandá,Aktobe,Taraz,Pavlodar,Ust-Kamenogorsk',
    'KW|asia|Liga del Golfo|42|0|Kuwait,Hawalli,Salmiya,Jahra,Farwaniya,Ahmadi,Mubarak al-Kabeer,Fintas',
    'KG|asia|Liga del Tian Shan|36|0|Biskek,Osh,Jalal-Abad,Karakol,Tokmok,Naryn,Talas,Batken',
    'MY|asia|Liga de las Torres|40|36|Kuala Lumpur,Penang,Johor Bahru,Ipoh,Kuching,Kota Kinabalu,Malaca,Shah Alam',
    'MN|asia|Liga de la Estepa Azul|40|36|Ulán Bator,Erdenet,Darkhan,Choibalsan,Mörön,Khovd,Ölgii,Bayankhongor',
    'NP|asia|Liga del Everest|35|0|Katmandú,Pokhara,Lalitpur,Biratnagar,Bharatpur,Birgunj,Dharan,Butwal',
    'OM|asia|Liga del Incienso|38|0|Mascate,Salalah,Sohar,Nizwa,Sur,Ibri,Barka,Rustaq',
    'PK|asia|Liga del Indo|38|0|Karachi,Lahore,Islamabad,Faisalabad,Rawalpindi,Peshawar,Multan,Quetta',
    'PS|asia|Liga del Olivo|40|0|Ramala,Belén,Hebrón,Nablus,Jericó,Yenín,Gaza,Tulkarem',
    'QA|asia|Liga de las Dunas|45|0|Doha,Al Rayyan,Al Wakrah,Al Khor,Umm Salal,Lusail,Mesaieed,Al Shamal',
    'SA|asia|Liga del Desierto|45|0|Riad,Yeda,La Meca,Medina,Dammam,Taif,Tabuk,Abha',
    'SG|asia|Liga del León del Mar|39|36|Marina,Orchard,Tampines,Jurong,Woodlands,Bedok,Sentosa,Ang Mo Kio',
    'LK|asia|Liga de Ceilán|36|0|Colombo,Kandy,Galle,Jaffna,Negombo,Trincomalee,Batticaloa,Anuradhapura',
    'SY|asia|Liga del Éufrates|45|38|Damasco,Alepo,Homs,Latakia,Hama,Tartús,Deir ez-Zor,Raqqa',
    'TH|asia|Liga del Elefante Blanco|42|38|Bangkok,Chiang Mai,Phuket,Pattaya,Khon Kaen,Hat Yai,Nakhon Ratchasima,Udon Thani',
    'AE|asia|Liga de los Emiratos|43|0|Dubái,Abu Dabi,Sharjah,Ajmán,Ras al-Jaima,Fuyaira,Al Ain,Umm al-Quwain',
    'UZ|asia|Liga de la Ruta de la Seda|40|0|Taskent,Samarcanda,Bujará,Namangán,Andiyán,Nukus,Fergana,Jiva',
    'VN|asia|Liga del Mekong|40|36|Hanói,Ciudad Ho Chi Minh,Da Nang,Haiphong,Can Tho,Hue,Nha Trang,Vung Tau',
    // Oceanía
    'FJ|oceania|Liga del Pacífico|40|36|Suva,Lautoka,Port Moresby,Numea,Apia,Nukualofa,Hagåtña,Port Vila',
    // África
    'DZ|africa|Liga del Sáhara|42|38|Argel,Orán,Constantina,Annaba,Blida,Setif,Tlemcen,Béjaïa',
    'AO|africa|Liga del Kwanza|49|46|Luanda,Benguela,Huambo,Lobito,Lubango,Cabinda,Malanje,Namibe',
    'BJ|africa|Liga de Dahomey|37|0|Cotonú,Porto Novo,Parakou,Abomey,Djougou,Bohicon,Natitingou,Ouidah',
    'BF|africa|Liga del Mossi|38|0|Uagadugú,Bobo-Dioulasso,Koudougou,Ouahigouya,Banfora,Kaya,Tenkodogo,Fada',
    'BI|africa|Liga del Tanganica|36|0|Gitega,Buyumbura,Ngozi,Rumonge,Muyinga,Kayanza,Bururi,Makamba',
    'CM|africa|Liga de los Montes Camerún|43|42|Yaundé,Duala,Garoua,Bamenda,Bafoussam,Maroua,Ngaoundéré,Limbe',
    'CV|africa|Liga Morna|40|0|Praia,Mindelo,Santa Maria,Assomada,Espargos,Porto Novo de Cabo Verde,São Filipe,Tarrafal',
    'CF|africa|Liga del Ubangui|38|0|Bangui,Bimbo,Berbérati,Carnot,Bambari,Bouar,Bossangoa,Bria',
    'TD|africa|Liga del Lago Chad|37|0|Yamena,Moundou,Sarh,Abéché,Kélo,Koumra,Pala,Am Timan',
    'CG|africa|Liga del Congo Norte|38|0|Brazzaville,Pointe-Noire,Dolisie,Nkayi,Owando,Ouesso,Impfondo,Sibiti',
    'CD|africa|Liga del Gran Río|42|40|Kinsasa,Lubumbashi,Mbuji-Mayi,Kisangani,Goma,Bukavu,Kananga,Matadi',
    'CI|africa|Liga de las Lagunas|43|40|Abiyán,Yamusukro,Bouaké,San Pedro,Daloa,Korhogo,Man,Gagnoa',
    'ET|africa|Liga del Nilo Azul|37|0|Adís Abeba,Dire Dawa,Mekele,Gondar,Bahir Dar,Hawassa,Adama,Jimma',
    'GA|africa|Liga del Ogooué|39|0|Libreville,Port-Gentil,Franceville,Oyem,Moanda,Lambaréné,Mouila,Tchibanga',
    'GH|africa|Liga de la Costa de Oro|39|0|Acra,Kumasi,Tamale,Takoradi,Cape Coast,Sunyani,Tema,Ho',
    'GN|africa|Liga del Futa Yallon|39|0|Conakri,Nzérékoré,Kankan,Kindia,Labé,Mamou,Boké,Kissidougou',
    'KE|africa|Liga del Rift|41|38|Nairobi,Mombasa,Kisumu,Nakuru,Eldoret,Thika,Malindi,Nyeri',
    'LY|africa|Liga del Mediterráneo Sur|40|0|Trípoli de Libia,Bengasi,Misrata,Zawiya,Sabha,Tobruk,Sirte,Derna',
    'MG|africa|Liga de los Baobabs Rojos|39|0|Antananarivo,Toamasina,Antsirabe,Mahajanga,Fianarantsoa,Toliara,Antsiranana,Morondava',
    'ML|africa|Liga del Níger|41|44|Bamako,Sikasso,Ségou,Mopti,Kayes,Koutiala,Gao,Tombuctú',
    'MZ|africa|Liga del Índico|41|43|Maputo,Beira,Nampula,Matola,Quelimane,Tete,Pemba,Inhambane',
    'NA|africa|Liga del Namib|37|0|Windhoek,Walvis Bay,Swakopmund,Rundu,Oshakati,Katima Mulilo,Rehoboth,Otjiwarongo',
    'NE|africa|Liga del Aïr|36|0|Niamey,Zinder,Maradi,Agadez,Tahoua,Dosso,Diffa,Tillabéri',
    'NG|africa|Liga del Delta del Níger|47|46|Lagos,Abuya,Kano,Ibadán,Port Harcourt,Benin City,Kaduna,Enugu,Owerri,Calabar',
    'RW|africa|Liga de las Mil Colinas|42|38|Kigali,Butare,Gisenyi,Ruhengeri,Byumba,Kibuye,Cyangugu,Nyagatare',
    'SN|africa|Liga de la Teranga|45|46|Dakar,Thiès,Saint-Louis,Kaolack,Ziguinchor,Touba,Mbour,Rufisque',
    'ZA|africa|Liga del Cabo|42|38|Johannesburgo,Ciudad del Cabo,Durban,Pretoria,Port Elizabeth,Bloemfontein,East London,Polokwane,Soweto,Pietermaritzburgo',
    'SS|africa|Liga del Nilo Blanco|43|0|Juba,Wau,Malakal,Yei,Aweil,Bor,Rumbek,Torit',
    'SD|africa|Liga de Jartum|38|0|Jartum,Omdurmán,Puerto Sudán,Kassala,El Obeid,Nyala,Wad Madani,Atbara',
    'TZ|africa|Liga del Kilimanjaro|39|0|Dar es Salaam,Dodoma,Arusha,Mwanza,Zanzíbar,Mbeya,Morogoro,Tanga',
    'TG|africa|Liga del Mono|36|0|Lomé,Sokodé,Kara,Kpalimé,Atakpamé,Dapaong,Tsévié,Aného',
    'TN|africa|Liga de Cartago|47|40|Túnez,Sfax,Susa,Monastir,Nabeul,Bizerta,Gabès,Kairuán',
    'UG|africa|Liga del Victoria|40|38|Kampala,Entebbe,Gulu,Jinja,Mbarara,Mbale,Lira,Masaka',
    'ZM|africa|Liga del Zambeze|37|0|Lusaka,Ndola,Kitwe,Livingstone,Kabwe,Chingola,Mufulira,Kasama',
    'ZW|africa|Liga del Gran Zimbabue|37|0|Harare,Bulawayo,Chitungwiza,Mutare,Gweru,Kwekwe,Masvingo,Victoria Falls'
  ];
  // Apodos genéricos inventados (se reparten sin repetir dentro de cada liga).
  const NICK_M = ['Halcones', 'Tormenta', 'Cometas', 'Titanes', 'Lobos', 'Estrellas', 'Relámpagos', 'Gigantes', 'Faros', 'Volcanes', 'Mareas', 'Centellas', 'Huracanes', 'Truenos', 'Pioneros', 'Guardianes',
    'Navegantes', 'Cóndores', 'Jaguares', 'Panteras', 'Osos', 'Toros', 'Búfalos', 'Linces', 'Zorros', 'Águilas', 'Delfines', 'Escorpiones', 'Dragones', 'Fénix', 'Corsarios', 'Mineros', 'Forjadores', 'Marineros',
    'Leñadores', 'Arqueros', 'Centinelas', 'Meteoros', 'Galaxia', 'Cumbres', 'Montañeses', 'Ribereños', 'Llaneros', 'Isleños', 'Viajeros', 'Rayos', 'Cohetes', 'Eclipse', 'Ciclones', 'Avalanchas', 'Glaciares',
    'Pumas', 'Coyotes', 'Bisontes', 'Tigres', 'Albatros', 'Cuervos', 'Gladiadores', 'Templarios', 'Nómadas'];
  const NICK_F = ['Estrellas', 'Gacelas', 'Panteras', 'Águilas', 'Sirenas', 'Cometas', 'Brisas', 'Auroras', 'Reinas', 'Centellas', 'Valquirias', 'Amazonas', 'Libélulas', 'Golondrinas', 'Gaviotas', 'Leonas',
    'Lobas', 'Tormentas', 'Fénix', 'Perlas', 'Orquídeas', 'Mariposas', 'Linces', 'Halconas', 'Gemas', 'Musas', 'Luces', 'Olas', 'Lunas', 'Rosas'];
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function nicks(pool, seed, n) {
    const arr = pool.slice(); let h = hash(seed);
    for (let i = arr.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr.slice(0, n);
  }
  const budgetFor = s => Math.round(Math.max(250000, Math.pow(1.17, s - 36) * 400000) / 50000) * 50000;
  for (const r of ROWS) {
    const [code, continent, name, sm, sf, list] = r.split('|');
    const cities = list.split(',');
    if (!Cat.COUNTRIES[code]) Cat.COUNTRIES[code] = { continent, cities };
    const teams = Math.min(12, cities.length);
    const mk = (gender, strength) => {
      const id = code.toLowerCase() + '-nacional-' + (gender === 'f' ? 'women' : 'men');
      const nk = nicks(gender === 'f' ? NICK_F : NICK_M, id, teams);
      Cat.LEAGUES[id] = Cat.LEAGUES[id] || { id, name: gender === 'f' ? name + ' Femenina' : name, ruleSet: 'FIBA-2026', teams, games: Cat.gamesFor(teams), region: 'EU', level: 1, pair: null, gender, country: code, continent,
        strength, budget: budgetFor(strength) * (gender === 'f' ? 0.25 : 1), pool: [code, 'US'], share: 0.82, spread: 8, clubs: cities.slice(0, teams).map((c, i) => c + ' ' + nk[i]), world: true };
    };
    mk('m', Number(sm));
    if (Number(sf)) mk('f', Number(sf));
  }
  // Norteamérica: baloncesto universitario (reglas universitarias) y liga de desarrollo.
  const NA = [
    { id: 'us-universitaria-men', name: 'Liga Universitaria', gender: 'm', ruleSet: 'NCAA-M-2026-27', strength: 50, cities: ['Durham', 'Lexington', 'Chapel Hill', 'Lawrence', 'Storrs', 'Bloomington', 'Tucson', 'Ann Arbor', 'Gainesville', 'East Lansing', 'Syracuse', 'Louisville', 'Villanova', 'Spokane', 'Westwood', 'Waco'] },
    { id: 'us-universitaria-women', name: 'Liga Universitaria Femenina', gender: 'f', ruleSet: 'NCAA-W-2026-27', strength: 50, cities: ['Storrs', 'Columbia', 'Stanford', 'Knoxville', 'Baton Rouge', 'Iowa City', 'South Bend', 'Austin', 'Waco', 'Los Ángeles', 'Durham', 'Louisville', 'Norman', 'Athens', 'Starkville', 'Seattle'] },
    { id: 'us-desarrollo-men', name: 'Liga de Desarrollo Boreal', gender: 'm', ruleSet: 'NA-2026-27', strength: 50, cities: ['Sioux Falls', 'Grand Rapids', 'Santa Cruz', 'Ontario', 'Rio Grande', 'Maine', 'Delaware', 'Wisconsin', 'Iowa', 'Salt Lake', 'Stockton', 'Greensboro', 'Long Island', 'Westchester', 'Fort Wayne', 'Oklahoma'] }
  ];
  for (const d of NA) {
    const nk = nicks(d.gender === 'f' ? NICK_F : NICK_M, d.id, 16);
    Cat.LEAGUES[d.id] = { id: d.id, name: d.name, ruleSet: d.ruleSet, teams: 16, games: Cat.gamesFor(16), region: 'NA', level: 1, pair: null, gender: d.gender, country: 'US', continent: 'americas',
      strength: d.strength, budget: d.id.includes('universitaria') ? 300000 : 900000, pool: ['US', 'US', 'CA'], share: 0.9, spread: 10, clubs: d.cities.map((c, i) => c + ' ' + nk[i]), world: true };
  }
  Cat.WORLD_ROWS = ROWS.length;
  if (typeof module !== 'undefined' && module.exports) module.exports = Cat;
})(typeof globalThis !== 'undefined' ? globalThis : this);
