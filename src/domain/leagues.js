(function (root) {
  'use strict';
  // Catálogo mundial de ligas (masculinas y femeninas). Todo es ficticio: nombres de liga y apodos de club
  // inventados sobre ciudades reales, sin marcas, logotipos ni competiciones con licencia.
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
    af: ['Leones del Delta', 'Baobabs', 'Rinocerontes', 'Nilo', 'Kwanza', 'Laguna Ébrié', 'Gacelas', 'Mil Colinas', 'Medina', 'Cartago', 'Montes Mandara', 'Mambas']
  };

  // n = país (ciudades), pool = nacionalidades de la plantilla (la primera es la local), share = % de locales.
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
    // Femeninas
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
      out[d.id] = { id: d.id, name: d.name, ruleSet: 'FIBA-2026', teams: d.teams, games: gamesFor(d.teams), region: d.country === 'US' ? 'NA' : 'EU', level: 1, gender: d.gender, country: d.country, continent: c.continent,
        strength: d.strength, budget: d.budget, pool: d.pool, share: d.share, spread: 8,
        clubs: c.cities.slice(0, d.teams).map((city, i) => city + ' ' + NICK[d.nick][i]) };
    }
    return out;
  }
  const LEAGUES = build();
  CAA.LeagueCatalog = { COUNTRIES, LEAGUES, CONTINENT_OF, gamesFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.LeagueCatalog;
})(typeof globalThis !== 'undefined' ? globalThis : this);
