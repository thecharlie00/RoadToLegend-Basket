(function (root) {
  'use strict';
  // Catálogo mundial de ligas (masculinas y femeninas): estructura, ciudades y fuerza. Los nombres visibles de ligas,
  // copas y clubes los pone real-world.js (reales, como en el juego de fútbol; sin escudos ni logotipos).
  const CAA = root.CAA = root.CAA || {};

  // País → ciudades (ordenadas de mayor a menor peso deportivo) y continente.
  const COUNTRIES = {
    FR: { continent: 'europe', cities: ['París', 'Lyon', 'Marsella', 'Villeurbanne', 'Burdeos', 'Lille', 'Nantes', 'Estrasburgo', 'Mónaco', 'Limoges', 'Le Mans', 'Pau', 'Dijon', 'Cholet', 'Nancy', 'Gravelinas'] },
    IT: { continent: 'europe', cities: ['Milán', 'Bolonia', 'Roma', 'Venecia', 'Turín', 'Sassari', 'Brescia', 'Trento', 'Nápoles', 'Pesaro', 'Varese', 'Reggio Emilia', 'Cremona', 'Tortona', 'Treviso', 'Florencia'] },
    DE: { continent: 'europe', cities: ['Berlín', 'Múnich', 'Bamberg', 'Ulm', 'Ludwigsburg', 'Oldemburgo', 'Bonn', 'Hamburgo', 'Fráncfort', 'Würzburg', 'Brunswick', 'Chemnitz', 'Gotinga', 'Rostock', 'Heidelberg', 'Bremerhaven'] },
    TR: { continent: 'europe', cities: ['Estambul', 'Ankara', 'Esmirna', 'Bursa', 'Antalya', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri', 'Eskişehir', 'Trabzon', 'Samsun', 'Adana', 'Manisa', 'Bodrum', 'Sakarya'] },
    GR: { continent: 'europe', cities: ['Atenas', 'El Pireo', 'Salónica', 'Patras', 'Heraclión', 'Larisa', 'Volos', 'Ioánina', 'Kavala', 'Rodas', 'Lamia', 'Corfú'] },
    LT: { continent: 'europe', cities: ['Kaunas', 'Vilna', 'Klaipėda', 'Šiauliai', 'Panevėžys', 'Alytus', 'Utena', 'Marijampolė', 'Jonava', 'Kėdainiai'] },
    RS: { continent: 'europe', cities: ['Belgrado', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin', 'Čačak', 'Kraljevo', 'Valjevo', 'Šabac', 'Smederevo', 'Novi Pazar', 'Leskovac', 'Vršac'] },
    ES: { continent: 'europe', cities: ['Madrid', 'Barcelona', 'Valencia', 'Vitoria', 'Málaga', 'Badalona', 'Gran Canaria', 'Bilbao', 'Zaragoza', 'Salamanca', 'Girona', 'Ferrol', 'Lugo', 'Burgos', 'Tenerife', 'Sevilla'] },
    AR: { continent: 'americas', cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mar del Plata', 'Bahía Blanca', 'Santa Fe', 'Mendoza', 'Tucumán', 'La Plata', 'Comodoro Rivadavia', 'Paraná', 'Neuquén', 'Salta', 'San Juan', 'Corrientes', 'Olavarría'] },
    BR: { continent: 'americas', cities: ['São Paulo', 'Río de Janeiro', 'Franca', 'Brasilia', 'Bauru', 'Belo Horizonte', 'Fortaleza', 'Curitiba', 'Porto Alegre', 'Recife', 'Salvador', 'Campinas', 'Mogi das Cruzes', 'Joinville', 'Goiânia', 'Manaos'] },
    MX: { continent: 'americas', cities: ['Ciudad de México', 'Monterrey', 'Guadalajara', 'Puebla', 'Tijuana', 'Mérida', 'Chihuahua', 'Hermosillo', 'Querétaro', 'Veracruz', 'Mazatlán', 'Oaxaca', 'León', 'Cancún'] },
    US: { continent: 'americas', cities: ['Nueva York', 'Las Vegas', 'Seattle', 'Chicago', 'Minneapolis', 'Phoenix', 'Atlanta', 'Indianápolis', 'Connecticut', 'Washington', 'Dallas', 'Los Ángeles'] },
    CN: { continent: 'asia', cities: ['Pekín', 'Shanghái', 'Cantón', 'Shenzhen', 'Liaoning', 'Zhejiang', 'Xinjiang', 'Shandong', 'Tianjin', 'Nankín', 'Qingdao', 'Shanxi', 'Fujian', 'Jilin', 'Sichuan', 'Chongqing', 'Wuhan', 'Ningbo', 'Xiamen', 'Changsha'] },
    JP: { continent: 'asia', cities: ['Tokio', 'Osaka', 'Nagoya', 'Yokohama', 'Chiba', 'Utsunomiya', 'Ryūkyū', 'Hiroshima', 'Sendai', 'Kobe', 'Kioto', 'Niigata', 'Fukuoka', 'Sapporo', 'Shimane', 'Toyama'] },
    KR: { continent: 'asia', cities: ['Seúl', 'Busan', 'Incheon', 'Daegu', 'Suwon', 'Ulsan', 'Changwon', 'Anyang', 'Goyang', 'Wonju'] },
    PH: { continent: 'asia', cities: ['Manila', 'Cebú', 'Davao', 'Quezón', 'Pásig', 'Iloílo', 'Bacólod', 'Zamboanga', 'Batangas', 'Pampanga', 'Baguio', 'Taguig'] },
    AU: { continent: 'oceania', cities: ['Melbourne', 'Sídney', 'Perth', 'Brisbane', 'Adelaida', 'Cairns', 'Townsville', 'Auckland', 'Wollongong', 'Bendigo'] },
    PL: { continent: 'europe', cities: ['Varsovia', 'Cracovia', 'Gdansk', 'Breslavia', 'Poznan', 'Lodz', 'Szczecin', 'Lublin', 'Torun', 'Zielona Góra', 'Slupsk', 'Wloclawek'] },
    HR: { continent: 'europe', cities: ['Zagreb', 'Split', 'Rijeka', 'Zadar', 'Osijek', 'Šibenik', 'Dubrovnik', 'Pula', 'Varaždin', 'Karlovac'] },
    CZ: { continent: 'europe', cities: ['Praga', 'Brno', 'Ostrava', 'Pilsen', 'Olomouc', 'Pardubice', 'Hradec Králové', 'Liberec', 'Opava', 'Kolín'] },
    BE: { continent: 'europe', cities: ['Amberes', 'Bruselas', 'Ámsterdam', 'Róterdam', 'Lieja', 'Gante', 'La Haya', 'Utrecht', 'Ostende', 'Groninga', 'Charleroi', 'Leiden'] },
    PT: { continent: 'europe', cities: ['Lisboa', 'Oporto', 'Braga', 'Coímbra', 'Funchal', 'Faro', 'Aveiro', 'Guimarães', 'Setúbal', 'Ponta Delgada'] },
    HU: { continent: 'europe', cities: ['Budapest', 'Sopron', 'Pécs', 'Szeged', 'Győr', 'Debrecen', 'Miskolc', 'Szekszárd', 'Kecskemét', 'Zalaegerszeg'] },
    UY: { continent: 'americas', cities: ['Montevideo', 'Salto', 'Paysandú', 'Maldonado', 'Rivera', 'Colonia', 'Mercedes', 'Tacuarembó', 'Florida', 'Durazno'] },
    VE: { continent: 'americas', cities: ['Caracas', 'Maracaibo', 'Valencia de Venezuela', 'Barquisimeto', 'Maracay', 'Mérida de Venezuela', 'Puerto La Cruz', 'Ciudad Guayana', 'San Cristóbal', 'Cumaná'] },
    PR: { continent: 'americas', cities: ['San Juan', 'Bayamón', 'Ponce', 'Mayagüez', 'Caguas', 'Arecibo', 'Carolina', 'Guaynabo', 'Humacao', 'Aguadilla'] },
    CA: { continent: 'americas', cities: ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Halifax', 'Quebec', 'Hamilton'] },
    NZ: { continent: 'oceania', cities: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton de NZ', 'Dunedin', 'Tauranga', 'Nelson', 'Napier', 'Palmerston North', 'Invercargill'] },
    EG: { continent: 'africa', cities: ['El Cairo', 'Alejandría', 'Guiza', 'Port Said', 'Suez', 'Luxor', 'Asuán', 'Mansura', 'Tanta', 'Ismailía'] },
    MA: { continent: 'africa', cities: ['Casablanca', 'Rabat', 'Marrakech', 'Fez', 'Tánger', 'Agadir', 'Mequinez', 'Oujda', 'Tetuán', 'El Yadida'] },
    ID: { continent: 'asia', cities: ['Yakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Bali', 'Yogyakarta', 'Makassar', 'Palembang', 'Malang'] },
    TW: { continent: 'asia', cities: ['Taipéi', 'Kaohsiung', 'Taichung', 'Tainan', 'Hsinchu', 'Taoyuan', 'Keelung', 'Chiayi', 'Hualien', 'Yilan'] },
    LB: { continent: 'asia', cities: ['Beirut', 'Trípoli', 'Sidón', 'Biblos', 'Tiro', 'Jounieh', 'Zahle', 'Baalbek'] },
    AF: { continent: 'africa', cities: ['Lagos', 'Dakar', 'Johannesburgo', 'El Cairo', 'Luanda', 'Abiyán', 'Nairobi', 'Kigali', 'Casablanca', 'Túnez', 'Yaundé', 'Maputo'] }
  };

  // Apodos inventados (masculino / femenino) por liga.
  const NICK = {
    fr: ['Lumière', 'Lions du Rhône', 'Phocéens', 'Astres', 'Girondins du Parquet', 'Beffrois', 'Hermines', 'Cigognes', 'Rochers', 'Porcelaine', 'Bolides', 'Béarnais', 'Moutarde', 'Mauges', 'Chardons', 'Dunes'],
    frW: ['Étoiles', 'Lyonnaises', 'Calanques', 'Libellules', 'Vignes', 'Flandres', 'Mouettes', 'Rosaces', 'Riviera', 'Émaux', 'Comètes', 'Pyrénées'],
    it: ['Meneghini', 'Torri', 'Lupi', 'Gondole', 'Mole', 'Nuraghi', 'Leonessa', 'Castello', 'Vesuvio', 'Adriatici', 'Laghi', 'Tricolore', 'Violini', 'Leoni Bianchi', 'Sile', 'Gigli'],
    itW: ['Stelle', 'Due Torri', 'Lupe', 'Laguna', 'Regine', 'Sarde', 'Leonesse', 'Dolomiti', 'Sirene', 'Rossini', 'Prealpi', 'Fenici'],
    de: ['Spree', 'Isar', 'Domreiter', 'Münster', 'Barock', 'Hunte', 'Beethoven', 'Hafen', 'Paulskirche', 'Residenz', 'Burglöwen', 'Erzgebirge', 'Gänseliesel', 'Hanse', 'Neckar', 'Fischerei'],
    tr: ['Boğaz', 'Başkent', 'Ege Rüzgarı', 'Uludağ', 'Akdeniz', 'Mevlana', 'Antep', 'Liman', 'Erciyes', 'Porsuk', 'Karadeniz', 'Kuzey', 'Seyhan', 'Lale', 'Mavi Koy', 'Kartalkaya'],
    trW: ['Sultanlar', 'Yıldızlar', 'Martılar', 'Kelebekler', 'Güneş', 'Güller', 'Dalgalar', 'Kartallar', 'Aylar', 'Fırtına', 'Laleler', 'Narlar'],
    gr: ['Partenón', 'Trirremes', 'Torre Blanca', 'Aqueos', 'Minotauros', 'Tesalios', 'Argonautas', 'Epirotas', 'Faros', 'Colosos', 'Espartanos', 'Feacios'],
    lt: ['Ąžuolai', 'Vilkai', 'Kopos', 'Saulė', 'Lūšys', 'Nemunas', 'Aukštaičiai', 'Šešupė', 'Neris', 'Dotnuva'],
    rs: ['Kalemegdan', 'Dunav', 'Nišava', 'Šumadija', 'Palić', 'Begej', 'Ovčar', 'Ibar', 'Kolubara', 'Cer', 'Tvrđava', 'Raška', 'Morava', 'Vinogradi'],
    esW: ['Reinas', 'Brisas', 'Azahar', 'Alavesas', 'Biznagas', 'Gaviotas', 'Alisios', 'Sirimiri', 'Pilaricas', 'Charras', 'Dones del Ter', 'Meigas', 'Murallas', 'Castellanas', 'Teide', 'Giraldillas'],
    ar: ['Porteños', 'Docta', 'Canallas', 'Lobos de Mar', 'Bahienses', 'Litoraleños', 'Andinos', 'Jardín', 'Platenses', 'Petroleros', 'Entrerrianos', 'Patagónicos', 'Gauchos', 'Sanjuaninos', 'Correntinos', 'Fortineros'],
    br: ['Paulistanos', 'Cariocas', 'Francanos', 'Cerrado', 'Bauruenses', 'Mineiros', 'Jangadas', 'Araucárias', 'Gaúchos', 'Frevo', 'Baianos', 'Bandeirantes', 'Mogianos', 'Jaraguá', 'Goianos', 'Amazônia'],
    brW: ['Garoas', 'Sereias', 'Sertanejas', 'Ipês', 'Estrelas', 'Lírios', 'Araras', 'Pinhões', 'Pampeiras', 'Tucanas'],
    mx: ['Capitalinos', 'Cerro de la Silla', 'Tapatíos', 'Talavera', 'Fronterizos', 'Mayas', 'Barrancas', 'Sonorenses', 'Arcángeles', 'Jarochos', 'Malecón', 'Guelaguetza', 'Zapateros', 'Caribes'],
    usW: ['Skyline Queens', 'Neon Jacks', 'Rain Herons', 'Lakeshore Gales', 'Twin Lakes Polaris', 'Saguaro Blaze', 'Magnolia Rise', 'Brickyard Pulse', 'Nutmeg Tide', 'Potomac Monarchs', 'Prairie Comets', 'Golden Coast Palms'],
    cn: ['Muralla', 'Perla del Bund', 'Linternas del Sur', 'Puerto Fragante', 'Acero del Norte', 'Lago del Oeste', 'Ruta de la Seda', 'Monte Tai', 'Bahía Bohai', 'Ciudad Púrpura', 'Faro Amarillo', 'Pagodas', 'Té Oolong', 'Nieve Blanca', 'Pandas', 'Gigantes del Río', 'Grullas', 'Cerros Rojos', 'Delfines Blancos', 'Naranjos'],
    cnW: ['Fénix', 'Orquídeas', 'Ciruelos', 'Golondrinas', 'Mariposas', 'Grullas Rojas', 'Peonías', 'Lotos', 'Jazmines', 'Garzas Blancas', 'Bambúes', 'Linternas', 'Sauces', 'Camelias'],
    jp: ['Raijin', 'Mercaderes', 'Delfines', 'Oleaje', 'Cometas', 'Lanceros', 'Shisa', 'Grullas de Papel', 'Árboles', 'Puerto Viejo', 'Templos', 'Arrozales', 'Torres', 'Osos Polares', 'Magos', 'Pescadores'],
    jpW: ['Sakura', 'Hanabi', 'Momiji', 'Tsubaki', 'Kaze', 'Umi', 'Hoshi', 'Yuki', 'Sora', 'Nami', 'Hikari', 'Kumo'],
    kr: ['Río Han', 'Puerto Sur', 'Mar Amarillo', 'Manzanos', 'Fortaleza Hwaseong', 'Ballenas', 'Cerezos del Sur', 'Monte Gwanak', 'Lago Ilsan', 'Montaña Chiak'],
    ph: ['Jeepneys', 'Islas Visayas', 'Durián', 'Tarsieres', 'Ilog', 'Dinagyang', 'MassKara', 'Ciudad Latina', 'Volcanes', 'Kapampangan', 'Pinares', 'Manglares'],
    au: ['Tranvías', 'Ópera', 'Cisnes Negros', 'Puente Story', 'Viñedos del Sur', 'Arrecife', 'Mareas Tropicales', 'Kiwis del Norte', 'Acantilados', 'Buscadores de Oro'],
    auW: ['Bahía Austral', 'Jacarandás', 'Atardecer Rojo', 'Koalas', 'Viñedos', 'Mangles', 'Tormenta Tropical', 'Eucaliptos'],
    fr2: ['Normands', 'Pucelle', 'Azur', 'Eure', 'Châteaux', 'Bretons', 'Sources', 'Loire', 'Côte d’Opale', 'Basilique', 'Corons', 'Futuroscope', 'Golfe', 'Sainte-Victoire', 'Tapisserie', 'Champenois'],
    it2: ['Friulani', 'Romagna', 'Brianza', 'Arena', 'Sabina', 'Pistolesi', 'Estensi', 'Granata del Sud', 'Sarno', 'Superga', 'Etruschi', 'Riviera', 'Ducali', 'Templi', 'Labronici', 'Farnese'],
    de2: ['Lahn', 'Neckarufer', 'Saale', 'Teck', 'Römer', 'Volme', 'Fächer', 'Wupper', 'Rheinkönige', 'Domstadt', 'Burg', 'Hasetal', 'Schwarzwald', 'Ruhr', 'Veste', 'Moor'],
    tr2: ['Kocatepe', 'Pamukkale', 'Kayısı', 'Selimiye', 'Truva', 'Kazdağı', 'Trakya', 'Efe', 'Harput', 'Kızılırmak', 'Körfez', 'Batı Karadeniz', 'Gül Bahçesi', 'Ege Mavisi', 'Çay', 'Fındık'],
    ar2: ['Pampeanos', 'Rurales', 'Cremeros', 'Puntanos', 'Santiagueños', 'Formoseños', 'Misioneros', 'Chaqueños', 'Imperiales', 'Villamarienses', 'Citrus', 'Ribereños', 'Serranos', 'Chivilcoyanos', 'Maragatos', 'Galeses'],
    esW2: ['Choqueras', 'Leonesas', 'Cacereñas', 'Riojanas', 'Palentinas', 'Almerienses', 'Albinegras', 'Imperiales', 'Burgas', 'Oscenses', 'Lagartas', 'Murallas Bajas', 'Casas Colgadas', 'Toledanas', 'Ilerdenses', 'Playeras'],
    pl: ['Sirenas', 'Dragones del Wawel', 'Astilleros', 'Enanos', 'Cabritos', 'Telares', 'Grifos', 'Fortaleza', 'Copérnico', 'Viñas', 'Bálticos', 'Anclas'],
    plW: ['Wisła', 'Ámbar', 'Grullas', 'Perlas', 'Golondrinas', 'Alondras', 'Gaviotas', 'Brisas', 'Estrellas', 'Rosas'],
    hr: ['Catedral', 'Palacio', 'Puerto', 'Órgano del Mar', 'Drava', 'Krka', 'Murallas', 'Anfiteatro', 'Barroco', 'Cuatro Ríos'],
    cz: ['Puente de Carlos', 'Moravos', 'Acereros', 'Cerveceros', 'Reloj', 'Caballos', 'Fortaleza', 'Jeschken', 'Silesios', 'Colinas'],
    czW: ['Moldava', 'Gotas de Rocío', 'Vltava', 'Golondrinas', 'Sirenas del Río', 'Alondras', 'Lirios', 'Estrellas', 'Mariposas', 'Brisas'],
    be: ['Diamantes', 'Atomium', 'Canales', 'Puerto', 'Perrón', 'Torres', 'Cigüeñas', 'Catedral', 'Costa', 'Hanze', 'Hornos', 'Llaves'],
    pt: ['Tranvías', 'Ribeira', 'Arzobispos', 'Estudiantes', 'Islas', 'Algarve', 'Moliceiros', 'Cuna', 'Sado', 'Azores'],
    hu: ['Danubio', 'Leales', 'Mezquita', 'Tisza', 'Barroco', 'Grandes Llanuras', 'Castillo', 'Viñedos', 'Albaricoques', 'Ruedas'],
    huW: ['Puentes', 'Torre de Fuego', 'Zsolnay', 'Pimientos', 'Rába', 'Flores', 'Avasi', 'Gemenc', 'Hírös', 'Göcsej'],
    uy: ['Cerro', 'Termas', 'Sandú', 'Punta', 'Frontera', 'Colonial', 'Río Negro', 'Gauchos', 'Florida Blanca', 'Yí'],
    ve: ['Ávila', 'Relámpagos', 'Naranjos', 'Crepusculares', 'Jardín', 'Montañeros', 'Mar Caribe', 'Orinoco', 'Andinos', 'Primogénita'],
    pr: ['Morro', 'Río Bayamón', 'Perla del Sur', 'Bahía Oeste', 'Valle Turabo', 'Faro', 'Pinos del Este', 'Montes Guaynabo', 'Yunque', 'Dunas del Oeste'],
    ca: ['Lago Ontario', 'Hielo', 'Montañas', 'Rodeo', 'Auroras', 'Parlamento', 'Praderas', 'Mareas', 'Ciudadela', 'Acero'],
    nz: ['Velas', 'Vientos', 'Jardines', 'Cascadas', 'Albatros', 'Bahía', 'Sol', 'Art Déco', 'Llanuras', 'Faro del Sur'],
    eg: ['Nilo', 'Faro', 'Pirámides', 'Canal', 'Golfo', 'Templos', 'Presa', 'Delta', 'Algodón', 'Lagos Amargos'],
    ma: ['Corniche', 'Kasbah', 'Ocre', 'Medina', 'Estrecho', 'Souss', 'Imperiales', 'Oriental', 'Azul', 'Doukkala'],
    id: ['Monas', 'Héroes', 'Flores de Java', 'Toba', 'Lumpia', 'Dioses', 'Sultanes', 'Pinisi', 'Ampera', 'Manzanas'],
    tw: ['Rascacielos', 'Puerto Rojo', 'Lunas', 'Templos Antiguos', 'Viento', 'Nubes', 'Lluvia', 'Alishan', 'Mármol', 'Llanura'],
    lb: ['Cedros', 'Castillo', 'Pescadores', 'Fenicios', 'Púrpura', 'Bahía', 'Viñas', 'Templo del Sol'],
    krW: ['Magnolias', 'Camelias', 'Cerezas', 'Azaleas', 'Lirios', 'Orquídeas', 'Peonías', 'Glicinias'],
    deW: ['Spreewald', 'Wiesn', 'Domspatzen', 'Donau', 'Barock', 'Hunte', 'Rhein', 'Elbe', 'Main', 'Residenz'],
    arW: ['Porteñas', 'Docta', 'Canallas', 'Lobas de Mar', 'Bahienses', 'Litoraleñas', 'Andinas', 'Jardín', 'Platenses', 'Patagónicas'],
    af: ['Leones del Delta', 'Baobabs', 'Rinocerontes', 'Nilo', 'Kwanza', 'Laguna Ébrié', 'Gacelas', 'Mil Colinas', 'Medina', 'Cartago', 'Montes Mandara', 'Mambas']
  };

  // n = país (ciudades), pool = nacionalidades de la plantilla (la primera es la local), share = % de locales.
  // Ciudades de segunda división (no repiten las de la primera).
  const CITIES2 = {
    FR: ['Rouen', 'Orleans', 'Antibes', 'Évreux', 'Blois', 'Quimper', 'Vichy', 'Roanne', 'Boulogne', 'Saint-Quentin', 'Denain', 'Poitiers', 'Fos', 'Aix', 'Caen', 'Châlons'],
    IT: ['Udine', 'Forlì', 'Cantù', 'Verona', 'Rieti', 'Pistoia', 'Ferrara', 'Trapani', 'Scafati', 'Torino Sud', 'Chiusi', 'Rimini', 'Cividale', 'Agrigento', 'Livorno', 'Piacenza'],
    DE: ['Gießen', 'Tubinga', 'Jena', 'Kirchheim', 'Trier', 'Hagen', 'Karlsruhe', 'Leverkusen', 'Düsseldorf', 'Paderborn', 'Nuremberg', 'Quakenbrück', 'Schwenningen', 'Bochum', 'Coburgo', 'Vechta'],
    TR: ['Afyon', 'Denizli', 'Malatya', 'Edirne', 'Çanakkale', 'Balıkesir', 'Tekirdağ', 'Aydın', 'Elazığ', 'Sivas', 'Kocaeli', 'Düzce', 'Isparta', 'Muğla', 'Rize', 'Ordu'],
    AR: ['Junín', 'Pergamino', 'Rafaela', 'San Luis', 'Santiago del Estero', 'Formosa', 'Posadas', 'Resistencia', 'Río Cuarto', 'Villa María', 'Concordia', 'Zárate', 'Tandil', 'Chivilcoy', 'Viedma', 'Trelew'],
    ES: ['Huelva', 'León', 'Cáceres', 'Logroño', 'Palencia', 'Almería', 'Castellón', 'Tarragona', 'Ourense', 'Huesca', 'Jaén', 'Ávila', 'Cuenca', 'Toledo', 'Lleida', 'Gijón']
  };
  const DEFS = [
    // Masculinas
    { id: 'fr-hexagone-men', name: 'Ligue Hexagone', country: 'FR', nick: 'fr', gender: 'm', teams: 16, strength: 58, budget: 9000000, pool: ['FR', 'US', 'SN', 'BR', 'DE'], share: 0.6 },
    { id: 'it-penisola-men', name: 'Lega Penisola', country: 'IT', nick: 'it', gender: 'm', teams: 16, strength: 57, budget: 8500000, pool: ['IT', 'US', 'AR', 'RS', 'FR'], share: 0.55 },
    { id: 'de-rhein-men', name: 'Rhein Liga', country: 'DE', nick: 'de', gender: 'm', teams: 16, strength: 56, budget: 8000000, pool: ['DE', 'US', 'LT', 'CA', 'FR'], share: 0.55 },
    { id: 'tr-bosforo-men', name: 'Liga del Bósforo', country: 'TR', nick: 'tr', gender: 'm', teams: 16, strength: 60, budget: 14000000, pool: ['TR', 'US', 'RS', 'GR', 'LT'], share: 0.55 },
    { id: 'gr-egeo-men', name: 'Liga Egea', country: 'GR', nick: 'gr', gender: 'm', teams: 12, strength: 57, budget: 7000000, pool: ['GR', 'US', 'RS', 'LT', 'AR'], share: 0.6 },
    { id: 'lt-baltica-men', name: 'Liga Báltica', country: 'LT', nick: 'lt', gender: 'm', teams: 10, strength: 56, budget: 5000000, pool: ['LT', 'US', 'RS', 'DE'], share: 0.7 },
    { id: 'rs-adriatica-men', name: 'Liga Adriática', country: 'RS', nick: 'rs', gender: 'm', teams: 14, strength: 57, budget: 6000000, pool: ['RS', 'US', 'GR', 'LT', 'TR'], share: 0.65 },
    { id: 'ar-pampa-men', name: 'Liga Pampa', country: 'AR', nick: 'ar', gender: 'm', teams: 16, strength: 51, budget: 1500000, pool: ['AR', 'US', 'BR', 'MX'], share: 0.8 },
    { id: 'br-atlantica-men', name: 'Liga Atlântica', country: 'BR', nick: 'br', gender: 'm', teams: 16, strength: 52, budget: 2000000, pool: ['BR', 'US', 'AR'], share: 0.8 },
    { id: 'mx-sol-men', name: 'Liga del Sol', country: 'MX', nick: 'mx', gender: 'm', teams: 14, strength: 49, budget: 1200000, pool: ['MX', 'US', 'AR', 'BR'], share: 0.75 },
    { id: 'cn-dragon-men', name: 'Liga del Dragón', country: 'CN', nick: 'cn', gender: 'm', teams: 20, strength: 53, budget: 10000000, pool: ['CN', 'US', 'AU'], share: 0.85 },
    { id: 'jp-sakura-men', name: 'Liga Sakura', country: 'JP', nick: 'jp', gender: 'm', teams: 16, strength: 54, budget: 6000000, pool: ['JP', 'US', 'PH', 'AU'], share: 0.75 },
    { id: 'kr-han-men', name: 'Liga Han', country: 'KR', nick: 'kr', gender: 'm', teams: 10, strength: 50, budget: 3000000, pool: ['KR', 'US', 'PH'], share: 0.85 },
    { id: 'ph-archipielago-men', name: 'Liga Archipiélago', country: 'PH', nick: 'ph', gender: 'm', teams: 12, strength: 50, budget: 1500000, pool: ['PH', 'US'], share: 0.85 },
    { id: 'au-austral-men', name: 'Liga Austral', country: 'AU', nick: 'au', gender: 'm', teams: 10, strength: 56, budget: 5000000, pool: ['AU', 'US', 'CA'], share: 0.7 },
    { id: 'af-sabana-men', name: 'Liga Sabana', country: 'AF', nick: 'af', gender: 'm', teams: 12, strength: 47, budget: 1000000, pool: ['NG', 'SN', 'ZA', 'US'], share: 0.9 },
    // Segundas divisiones (ascenso y descenso con la primera)
    { id: 'fr-hexagone2-men', name: 'Ligue Hexagone 2', country: 'FR', nick: 'fr2', city2: true, level: 2, pair: 'fr-hexagone-men', gender: 'm', teams: 16, strength: 50, budget: 2500000, pool: ['FR', 'US', 'SN'], share: 0.7 },
    { id: 'it-penisola2-men', name: 'Lega Penisola 2', country: 'IT', nick: 'it2', city2: true, level: 2, pair: 'it-penisola-men', gender: 'm', teams: 16, strength: 49, budget: 2200000, pool: ['IT', 'US', 'AR'], share: 0.7 },
    { id: 'de-rhein2-men', name: 'Rhein Liga 2', country: 'DE', nick: 'de2', city2: true, level: 2, pair: 'de-rhein-men', gender: 'm', teams: 16, strength: 48, budget: 2000000, pool: ['DE', 'US', 'CA'], share: 0.7 },
    { id: 'tr-bosforo2-men', name: 'Liga del Bósforo 2', country: 'TR', nick: 'tr2', city2: true, level: 2, pair: 'tr-bosforo-men', gender: 'm', teams: 16, strength: 51, budget: 3000000, pool: ['TR', 'US', 'RS'], share: 0.7 },
    { id: 'ar-pampa2-men', name: 'Liga Pampa Ascenso', country: 'AR', nick: 'ar2', city2: true, level: 2, pair: 'ar-pampa-men', gender: 'm', teams: 16, strength: 44, budget: 500000, pool: ['AR', 'UY', 'US'], share: 0.9 },
    // Nuevos países
    { id: 'pl-vistula-men', name: 'Liga del Vístula', country: 'PL', nick: 'pl', gender: 'm', teams: 12, strength: 53, budget: 3500000, pool: ['PL', 'US', 'HR', 'CZ'], share: 0.6 },
    { id: 'hr-dalmata-men', name: 'Liga Dálmata', country: 'HR', nick: 'hr', gender: 'm', teams: 10, strength: 53, budget: 2500000, pool: ['HR', 'RS', 'US'], share: 0.75 },
    { id: 'cz-moldava-men', name: 'Liga del Moldava', country: 'CZ', nick: 'cz', gender: 'm', teams: 10, strength: 50, budget: 2000000, pool: ['CZ', 'US', 'PL'], share: 0.7 },
    { id: 'be-mosa-men', name: 'Liga del Mosa', country: 'BE', nick: 'be', gender: 'm', teams: 12, strength: 52, budget: 3000000, pool: ['BE', 'NL', 'US', 'FR'], share: 0.6 },
    { id: 'pt-lusa-men', name: 'Liga Lusa', country: 'PT', nick: 'pt', gender: 'm', teams: 10, strength: 48, budget: 1500000, pool: ['PT', 'US', 'BR'], share: 0.65 },
    { id: 'hu-danubio-men', name: 'Liga del Danubio', country: 'HU', nick: 'hu', gender: 'm', teams: 10, strength: 49, budget: 1800000, pool: ['HU', 'US', 'RS'], share: 0.7 },
    { id: 'uy-plata-men', name: 'Liga del Plata', country: 'UY', nick: 'uy', gender: 'm', teams: 10, strength: 47, budget: 700000, pool: ['UY', 'AR', 'US'], share: 0.8 },
    { id: 've-caribe-men', name: 'Liga Caribe', country: 'VE', nick: 've', gender: 'm', teams: 10, strength: 47, budget: 800000, pool: ['VE', 'US', 'PR'], share: 0.8 },
    { id: 'pr-borinquen-men', name: 'Liga Borinquen', country: 'PR', nick: 'pr', gender: 'm', teams: 10, strength: 50, budget: 1200000, pool: ['PR', 'US'], share: 0.75 },
    { id: 'ca-arce-men', name: 'Liga del Arce', country: 'CA', nick: 'ca', gender: 'm', teams: 10, strength: 48, budget: 1500000, pool: ['CA', 'US'], share: 0.75 },
    { id: 'nz-islas-men', name: 'Liga de las Dos Islas', country: 'NZ', nick: 'nz', gender: 'm', teams: 10, strength: 47, budget: 800000, pool: ['NZ', 'AU', 'US'], share: 0.75 },
    { id: 'eg-nilo-men', name: 'Liga del Nilo', country: 'EG', nick: 'eg', gender: 'm', teams: 10, strength: 46, budget: 900000, pool: ['EG', 'US', 'NG'], share: 0.85 },
    { id: 'ma-atlas-men', name: 'Liga del Atlas', country: 'MA', nick: 'ma', gender: 'm', teams: 10, strength: 44, budget: 600000, pool: ['MA', 'SN', 'US'], share: 0.85 },
    { id: 'id-nusantara-men', name: 'Liga Nusantara', country: 'ID', nick: 'id', gender: 'm', teams: 10, strength: 44, budget: 700000, pool: ['ID', 'US', 'PH'], share: 0.85 },
    { id: 'tw-jade-men', name: 'Liga Jade', country: 'TW', nick: 'tw', gender: 'm', teams: 10, strength: 48, budget: 1500000, pool: ['TW', 'US', 'PH'], share: 0.8 },
    { id: 'lb-cedro-men', name: 'Liga del Cedro', country: 'LB', nick: 'lb', gender: 'm', teams: 8, strength: 47, budget: 1000000, pool: ['LB', 'US'], share: 0.75 },
    // Femeninas
    { id: 'es-ascenso-women', name: 'Ascenso Ibérico Femenino', country: 'ES', nick: 'esW2', city2: true, level: 2, pair: 'es-iberica-women', gender: 'f', teams: 16, strength: 50, budget: 600000, pool: ['ES', 'US', 'PT'], share: 0.8 },
    { id: 'de-rhein-women', name: 'Rhein Liga Frauen', country: 'DE', nick: 'deW', gender: 'f', teams: 10, strength: 52, budget: 700000, pool: ['DE', 'US', 'NL'], share: 0.7 },
    { id: 'pl-vistula-women', name: 'Liga del Vístula Femenina', country: 'PL', nick: 'plW', gender: 'f', teams: 10, strength: 54, budget: 900000, pool: ['PL', 'US', 'CZ'], share: 0.65 },
    { id: 'cz-moldava-women', name: 'Liga del Moldava Femenina', country: 'CZ', nick: 'czW', gender: 'f', teams: 10, strength: 55, budget: 900000, pool: ['CZ', 'US', 'HU'], share: 0.7 },
    { id: 'hu-danubio-women', name: 'Liga del Danubio Femenina', country: 'HU', nick: 'huW', gender: 'f', teams: 10, strength: 54, budget: 900000, pool: ['HU', 'US', 'RS'], share: 0.7 },
    { id: 'kr-han-women', name: 'Liga Han Femenina', country: 'KR', nick: 'krW', gender: 'f', teams: 8, strength: 52, budget: 800000, pool: ['KR'], share: 1 },
    { id: 'ar-pampa-women', name: 'Liga Pampa Femenina', country: 'AR', nick: 'arW', gender: 'f', teams: 10, strength: 46, budget: 200000, pool: ['AR', 'UY', 'BR'], share: 0.85 },
    { id: 'es-iberica-women', name: 'Liga Ibérica Femenina', country: 'ES', nick: 'esW', gender: 'f', teams: 16, strength: 58, budget: 2500000, pool: ['ES', 'US', 'FR', 'BR', 'SN'], share: 0.6 },
    { id: 'na-boreal-women', name: 'Liga Boreal Femenina', country: 'US', nick: 'usW', gender: 'f', teams: 12, strength: 61, budget: 1600000, pool: ['US', 'CA', 'AU', 'FR'], share: 0.8 },
    { id: 'fr-hexagone-women', name: 'Ligue Hexagone Féminine', country: 'FR', nick: 'frW', gender: 'f', teams: 12, strength: 57, budget: 1500000, pool: ['FR', 'US', 'SN', 'BR'], share: 0.65 },
    { id: 'it-penisola-women', name: 'Lega Penisola Femminile', country: 'IT', nick: 'itW', gender: 'f', teams: 12, strength: 55, budget: 1200000, pool: ['IT', 'US', 'FR', 'AR'], share: 0.65 },
    { id: 'tr-bosforo-women', name: 'Liga del Bósforo Femenina', country: 'TR', nick: 'trW', gender: 'f', teams: 12, strength: 59, budget: 3000000, pool: ['TR', 'US', 'RS', 'AU'], share: 0.55 },
    { id: 'br-atlantica-women', name: 'Liga Atlântica Feminina', country: 'BR', nick: 'brW', gender: 'f', teams: 10, strength: 50, budget: 600000, pool: ['BR', 'AR', 'US'], share: 0.85 },
    { id: 'cn-dragon-women', name: 'Liga del Dragón Femenina', country: 'CN', nick: 'cnW', gender: 'f', teams: 14, strength: 54, budget: 2000000, pool: ['CN', 'US'], share: 0.9 },
    { id: 'jp-sakura-women', name: 'Liga Sakura Femenina', country: 'JP', nick: 'jpW', gender: 'f', teams: 12, strength: 53, budget: 1000000, pool: ['JP', 'US'], share: 0.9 },
    { id: 'au-austral-women', name: 'Liga Austral Femenina', country: 'AU', nick: 'auW', gender: 'f', teams: 8, strength: 57, budget: 900000, pool: ['AU', 'US', 'CA'], share: 0.75 }
  ];
  const CONTINENT_OF = { NA: 'americas', EU: 'europe' };

  function gamesFor(teams) { let g = 2 * (teams - 1); while (g < 26) g += teams - 1; return g; }
  function build() {
    const out = {};
    for (const d of DEFS) {
      const c = COUNTRIES[d.country];
      const cities = d.city2 ? CITIES2[d.country] : c.cities;
      out[d.id] = { id: d.id, name: d.name, ruleSet: 'FIBA-2026', teams: d.teams, games: gamesFor(d.teams), region: d.country === 'US' || d.country === 'CA' ? 'NA' : 'EU', level: d.level || 1, pair: d.pair || null, gender: d.gender, country: d.country, continent: c.continent,
        strength: d.strength, budget: d.budget, pool: d.pool, share: d.share, spread: 8,
        clubs: cities.slice(0, d.teams).map((city, i) => city + ' ' + NICK[d.nick][i]) };
    }
    return out;
  }
  const LEAGUES = build();
  // Las primeras divisiones con segunda enlazada conocen a su pareja.
  for (const l of Object.values(LEAGUES)) if (l.pair && LEAGUES[l.pair] && l.level === 2) LEAGUES[l.pair].pair = l.id;
  CAA.LeagueCatalog = { COUNTRIES, LEAGUES, CONTINENT_OF, gamesFor };
  if (typeof module !== 'undefined' && module.exports) { module.exports = CAA.LeagueCatalog; require('./leagues-world.js'); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
