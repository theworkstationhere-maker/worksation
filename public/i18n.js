// Interface translations. Place and town names stay as they are.
// To add a language: copy the `en` block, translate the values, add it to LANGS.
export const LANGS = { en: 'English', hi: 'हिन्दी', es: 'Español', pt: 'Português', ar: 'العربية', id: 'Bahasa Indonesia' };
const RTL = new Set(['ar']);

const D = {
  en: {
    free2: 'Free forever. No money needed.', alreadyT2: 'Already have a house?', alreadyS2: 'Log in with your email', regSub: 'Free. No money. Built right away.',
    dayN: 'DAY {n}', population: 'Population {n}', freePlot: 'Free plot', festBtn: '✨ See {x} lights',
    register: 'Register your house', walk: 'Walk', ideas: 'Ideas', towns: 'Towns', visit: 'Visit', today: 'Today', race: 'Race',
    night: 'Night', day: 'Day', search: 'Find your house, a town or a place', seeEarth: 'See the whole Earth', myHouse: 'My house',
    welcome: 'Welcome to', welcomeText: 'The whole Earth is empty. Every person gets the same house, in their own town, with their Instagram ID on it.',
    alreadyT: 'Already commented or followed?', alreadyS: 'Type your ID to find your house', newT: 'New here?', newS: 'Register. Your house is built right away.',
    justLook: 'Just look around', free: 'Free. No password. No money.',
    regTitle: 'Register for a house', regSub: 'Free. No password. No money. Built right away.', idPh: 'Your Instagram ID', townPh: 'Your town or village',
    regBtn: 'Register', checkHouse: 'Already registered? Check my house',
    privacy: 'Only your public Instagram ID and your town show on the map, never your address. Please register only your own ID.',
    house: 'house', houses: 'houses', mayor: 'Mayor', moreFor: '{n} more people for {x}', fullyBuilt: 'Fully built town!',
    watchGrow: '▶ Watch it grow', walkHere: '🚶 Walk here', invite: '📣 Invite', customise: '🎨 Customise my house & character', homes: 'Homes & buildings',
    growNote: 'Every house grows: cottage on day 1, fence and chimney by day 3, garden by day 7, then two storeys.',
    back: '← Back outside', person: 'person here now', people: 'people here now', photo: '📷 Photo', walkHint: 'Arrow keys or WASD to walk · Shift to run',
    tour1t: 'Find your town', tour1: 'Type your ID, your town or a famous place in the bar at the top.',
    tour2t: 'Get your house', tour2: 'Register free. Your house is built in 5 minutes and grows bigger every few days.',
    tour3t: 'Walk around', tour3: 'Tap Walk to stroll your town or visit the Taj Mahal, Eiffel Tower and 7,000 more places.',
    skip: 'Skip', next: 'Next', done: 'Done', hideLights: '✨ Hide lights', readMore: 'Read about it',
    'Corner shop': 'corner shop', 'Café': 'café', 'Community garden': 'community garden', 'Town square': 'town square', Park: 'park', 'Bus stop': 'bus stop', School: 'school', Hospital: 'hospital', 'Railway station': 'railway station', Market: 'market', Stadium: 'stadium', Airport: 'airport',
  },
  hi: {
    free2: 'हमेशा मुफ़्त। कोई पैसा नहीं।', alreadyT2: 'पहले से घर है?', alreadyS2: 'अपने ईमेल से लॉग इन करें', regSub: 'मुफ़्त। कोई पैसा नहीं। तुरंत तैयार।',
    dayN: 'दिन {n}', population: 'आबादी {n}', freePlot: 'खाली प्लॉट', festBtn: '✨ {x} की रोशनी देखें',
    register: 'अपना घर रजिस्टर करें', walk: 'घूमें', ideas: 'आइडिया', towns: 'शहर', visit: 'घूमने चलें', today: 'आज', race: 'रेस',
    night: 'रात', day: 'दिन', search: 'अपना घर, शहर या कोई जगह खोजें', seeEarth: 'पूरी धरती देखें', myHouse: 'मेरा घर',
    welcome: 'स्वागत है', welcomeText: 'पूरी धरती खाली है। हर किसी को उसके अपने शहर में एक जैसा घर मिलता है, जिस पर उसका Instagram ID लिखा होता है।',
    alreadyT: 'पहले ही कमेंट या फ़ॉलो किया?', alreadyS: 'अपना घर देखने के लिए ID लिखें', newT: 'नए हैं?', newS: 'रजिस्टर करें। आपका घर तुरंत बन जाएगा।',
    justLook: 'बस देखना है', free: 'मुफ़्त। कोई पासवर्ड नहीं। कोई पैसा नहीं।',
    regTitle: 'घर के लिए रजिस्टर करें', regSub: 'मुफ़्त। कोई पासवर्ड नहीं। कोई पैसा नहीं। तुरंत तैयार।', idPh: 'आपका Instagram ID', townPh: 'आपका शहर या गाँव',
    regBtn: 'रजिस्टर करें', checkHouse: 'पहले से रजिस्टर हैं? मेरा घर देखें',
    privacy: 'मैप पर सिर्फ़ आपका पब्लिक Instagram ID और शहर दिखता है, पता कभी नहीं। कृपया सिर्फ़ अपना ID रजिस्टर करें।',
    house: 'घर', houses: 'घर', mayor: 'मेयर', moreFor: '{x} के लिए {n} और लोग चाहिए', fullyBuilt: 'शहर पूरा बन गया!',
    watchGrow: '▶ बढ़ते हुए देखें', walkHere: '🚶 यहाँ घूमें', invite: '📣 बुलाएँ', customise: '🎨 मेरा घर और किरदार सजाएँ', homes: 'घर और इमारतें',
    growNote: 'हर घर बढ़ता है: पहले दिन कॉटेज, तीसरे दिन तक बाड़ और चिमनी, सातवें दिन तक बगीचा, फिर दो मंज़िल।',
    back: '← बाहर जाएँ', person: 'व्यक्ति अभी यहाँ', people: 'लोग अभी यहाँ', photo: '📷 फ़ोटो', walkHint: 'चलने के लिए Arrow keys या WASD · दौड़ने के लिए Shift',
    tour1t: 'अपना शहर खोजें', tour1: 'ऊपर के बार में अपना ID, शहर या कोई मशहूर जगह लिखें।',
    tour2t: 'अपना घर पाएँ', tour2: 'मुफ़्त रजिस्टर करें। 5 मिनट में घर बनता है और हर कुछ दिनों में बड़ा होता है।',
    tour3t: 'घूमिए', tour3: 'अपने शहर में घूमने या ताजमहल, एफ़िल टॉवर और 7,000 जगहें देखने के लिए "घूमें" दबाएँ।',
    skip: 'छोड़ें', next: 'आगे', done: 'हो गया', hideLights: '✨ लाइट बंद करें', readMore: 'इसके बारे में पढ़ें',
    'Corner shop': 'दुकान', 'Café': 'कैफ़े', 'Community garden': 'सामुदायिक बगीचा', 'Town square': 'चौक', Park: 'पार्क', 'Bus stop': 'बस स्टॉप', School: 'स्कूल', Hospital: 'अस्पताल', 'Railway station': 'रेलवे स्टेशन', Market: 'बाज़ार', Stadium: 'स्टेडियम', Airport: 'एयरपोर्ट',
  },
  es: {
    free2: 'Gratis para siempre. Sin pagar nada.', alreadyT2: '¿Ya tienes casa?', alreadyS2: 'Entra con tu email', regSub: 'Gratis. Sin pagar. Lista al instante.',
    dayN: 'DÍA {n}', population: 'Población {n}', freePlot: 'Terreno libre', festBtn: '✨ Ver luces de {x}',
    register: 'Registra tu casa', walk: 'Pasear', ideas: 'Ideas', towns: 'Ciudades', visit: 'Visitar', today: 'Hoy', race: 'Carrera',
    night: 'Noche', day: 'Día', search: 'Busca tu casa, una ciudad o un lugar', seeEarth: 'Ver toda la Tierra', myHouse: 'Mi casa',
    welcome: 'Bienvenido a', welcomeText: 'Toda la Tierra está vacía. Cada persona recibe la misma casa, en su propia ciudad, con su ID de Instagram.',
    alreadyT: '¿Ya comentaste o nos sigues?', alreadyS: 'Escribe tu ID para encontrar tu casa', newT: '¿Eres nuevo?', newS: 'Regístrate. Tu casa se construye al instante.',
    justLook: 'Solo mirar', free: 'Gratis. Sin contraseña. Sin dinero.',
    regTitle: 'Regístrate para una casa', regSub: 'Gratis. Sin contraseña. Sin dinero. Lista al instante.', idPh: 'Tu ID de Instagram', townPh: 'Tu ciudad o pueblo',
    regBtn: 'Registrar', checkHouse: '¿Ya te registraste? Ver mi casa',
    privacy: 'En el mapa solo aparecen tu ID público de Instagram y tu ciudad, nunca tu dirección. Registra solo tu propio ID.',
    house: 'casa', houses: 'casas', mayor: 'Alcalde', moreFor: 'Faltan {n} personas para {x}', fullyBuilt: '¡Ciudad completa!',
    watchGrow: '▶ Verla crecer', walkHere: '🚶 Pasear aquí', invite: '📣 Invitar', customise: '🎨 Personalizar mi casa y personaje', homes: 'Casas y edificios',
    growNote: 'Cada casa crece: cabaña el día 1, valla y chimenea el día 3, jardín el día 7 y luego dos pisos.',
    back: '← Salir', person: 'persona aquí ahora', people: 'personas aquí ahora', photo: '📷 Foto', walkHint: 'Flechas o WASD para caminar · Shift para correr',
    tour1t: 'Encuentra tu ciudad', tour1: 'Escribe tu ID, tu ciudad o un lugar famoso en la barra de arriba.',
    tour2t: 'Consigue tu casa', tour2: 'Regístrate gratis. Tu casa se construye en 5 minutos y crece cada pocos días.',
    tour3t: 'Pasea', tour3: 'Toca Pasear para recorrer tu ciudad o visitar el Taj Mahal, la Torre Eiffel y 7.000 lugares más.',
    skip: 'Saltar', next: 'Siguiente', done: 'Listo', hideLights: '✨ Ocultar luces', readMore: 'Leer más',
    'Corner shop': 'una tienda', 'Café': 'una cafetería', 'Community garden': 'un huerto comunitario', 'Town square': 'una plaza', Park: 'un parque', 'Bus stop': 'una parada de autobús', School: 'una escuela', Hospital: 'un hospital', 'Railway station': 'una estación de tren', Market: 'un mercado', Stadium: 'un estadio', Airport: 'un aeropuerto',
  },
  pt: {
    free2: 'Grátis para sempre. Sem pagar nada.', alreadyT2: 'Já tem uma casa?', alreadyS2: 'Entre com seu email', regSub: 'Grátis. Sem pagar. Pronta na hora.',
    dayN: 'DIA {n}', population: 'População {n}', freePlot: 'Terreno livre', festBtn: '✨ Ver luzes de {x}',
    register: 'Registre sua casa', walk: 'Passear', ideas: 'Ideias', towns: 'Cidades', visit: 'Visitar', today: 'Hoje', race: 'Corrida',
    night: 'Noite', day: 'Dia', search: 'Encontre sua casa, uma cidade ou um lugar', seeEarth: 'Ver a Terra inteira', myHouse: 'Minha casa',
    welcome: 'Bem-vindo ao', welcomeText: 'A Terra inteira está vazia. Cada pessoa ganha a mesma casa, na sua própria cidade, com seu ID do Instagram.',
    alreadyT: 'Já comentou ou segue?', alreadyS: 'Digite seu ID para achar sua casa', newT: 'Novo por aqui?', newS: 'Registre-se. Sua casa fica pronta na hora.',
    justLook: 'Só olhar', free: 'Grátis. Sem senha. Sem dinheiro.',
    regTitle: 'Registre-se para uma casa', regSub: 'Grátis. Sem senha. Sem dinheiro. Pronta na hora.', idPh: 'Seu ID do Instagram', townPh: 'Sua cidade ou vila',
    regBtn: 'Registrar', checkHouse: 'Já registrado? Ver minha casa',
    privacy: 'No mapa aparecem só seu ID público do Instagram e sua cidade, nunca seu endereço. Registre apenas o seu próprio ID.',
    house: 'casa', houses: 'casas', mayor: 'Prefeito', moreFor: 'Faltam {n} pessoas para {x}', fullyBuilt: 'Cidade completa!',
    watchGrow: '▶ Ver crescer', walkHere: '🚶 Passear aqui', invite: '📣 Convidar', customise: '🎨 Personalizar casa e personagem', homes: 'Casas e prédios',
    growNote: 'Cada casa cresce: chalé no dia 1, cerca e chaminé no dia 3, jardim no dia 7 e depois dois andares.',
    back: '← Sair', person: 'pessoa aqui agora', people: 'pessoas aqui agora', photo: '📷 Foto', walkHint: 'Setas ou WASD para andar · Shift para correr',
    tour1t: 'Encontre sua cidade', tour1: 'Digite seu ID, sua cidade ou um lugar famoso na barra de cima.',
    tour2t: 'Ganhe sua casa', tour2: 'Registre-se grátis. Sua casa fica pronta em 5 minutos e cresce a cada poucos dias.',
    tour3t: 'Passeie', tour3: 'Toque em Passear para andar pela cidade ou visitar o Taj Mahal, a Torre Eiffel e mais 7.000 lugares.',
    skip: 'Pular', next: 'Próximo', done: 'Pronto', hideLights: '✨ Esconder luzes', readMore: 'Saiba mais',
    'Corner shop': 'uma loja', 'Café': 'um café', 'Community garden': 'uma horta comunitária', 'Town square': 'uma praça', Park: 'um parque', 'Bus stop': 'um ponto de ônibus', School: 'uma escola', Hospital: 'um hospital', 'Railway station': 'uma estação de trem', Market: 'um mercado', Stadium: 'um estádio', Airport: 'um aeroporto',
  },
  ar: {
    free2: 'مجاني دائمًا. بلا مال.', alreadyT2: 'لديك بيت بالفعل؟', alreadyS2: 'سجّل الدخول ببريدك', regSub: 'مجانًا. بلا مال. جاهز فورًا.',
    dayN: 'اليوم {n}', population: 'السكان {n}', freePlot: 'قطعة فارغة', festBtn: '✨ شاهد أضواء {x}',
    register: 'سجّل بيتك', walk: 'تجوّل', ideas: 'أفكار', towns: 'المدن', visit: 'زيارة', today: 'اليوم', race: 'السباق',
    night: 'ليل', day: 'نهار', search: 'ابحث عن بيتك أو مدينة أو مكان', seeEarth: 'شاهد الأرض كلها', myHouse: 'بيتي',
    welcome: 'مرحبًا بك في', welcomeText: 'الأرض كلها فارغة. يحصل كل شخص على البيت نفسه في مدينته، وعليه اسم حسابه على إنستغرام.',
    alreadyT: 'علّقت أو تابعت من قبل؟', alreadyS: 'اكتب معرّفك لتجد بيتك', newT: 'جديد هنا؟', newS: 'سجّل الآن. يُبنى بيتك فورًا.',
    justLook: 'أريد التفرّج فقط', free: 'مجانًا. بلا كلمة مرور. بلا مال.',
    regTitle: 'سجّل للحصول على بيت', regSub: 'مجانًا. بلا كلمة مرور. بلا مال. جاهز فورًا.', idPh: 'معرّفك على إنستغرام', townPh: 'مدينتك أو قريتك',
    regBtn: 'تسجيل', checkHouse: 'مسجّل من قبل؟ اعرض بيتي',
    privacy: 'يظهر على الخريطة معرّفك العام ومدينتك فقط، ولا يظهر عنوانك أبدًا. سجّل معرّفك أنت فقط.',
    house: 'بيت', houses: 'بيوت', mayor: 'العمدة', moreFor: 'نحتاج {n} أشخاص آخرين من أجل {x}', fullyBuilt: 'اكتمل بناء المدينة!',
    watchGrow: '▶ شاهدها تكبر', walkHere: '🚶 تجوّل هنا', invite: '📣 ادعُ أصدقاءك', customise: '🎨 خصّص بيتي وشخصيتي', homes: 'البيوت والمباني',
    growNote: 'كل بيت يكبر: كوخ في اليوم الأول، سور ومدخنة بحلول اليوم الثالث، حديقة بحلول اليوم السابع، ثم طابقان.',
    back: '← اخرج', person: 'شخص هنا الآن', people: 'أشخاص هنا الآن', photo: '📷 صورة', walkHint: 'الأسهم أو WASD للمشي · Shift للجري',
    tour1t: 'ابحث عن مدينتك', tour1: 'اكتب معرّفك أو مدينتك أو مكانًا مشهورًا في الشريط بالأعلى.',
    tour2t: 'احصل على بيتك', tour2: 'سجّل مجانًا. يُبنى بيتك في 5 دقائق ويكبر كل بضعة أيام.',
    tour3t: 'تجوّل', tour3: 'اضغط "تجوّل" لتمشي في مدينتك أو تزور تاج محل وبرج إيفل و7000 مكان آخر.',
    skip: 'تخطٍّ', next: 'التالي', done: 'تم', hideLights: '✨ إخفاء الأضواء', readMore: 'اقرأ عنه',
    'Corner shop': 'متجر', 'Café': 'مقهى', 'Community garden': 'حديقة مجتمعية', 'Town square': 'ساحة البلدة', Park: 'حديقة عامة', 'Bus stop': 'موقف حافلات', School: 'مدرسة', Hospital: 'مستشفى', 'Railway station': 'محطة قطار', Market: 'سوق', Stadium: 'ملعب', Airport: 'مطار',
  },
  id: {
    free2: 'Gratis selamanya. Tanpa uang.', alreadyT2: 'Sudah punya rumah?', alreadyS2: 'Masuk dengan emailmu', regSub: 'Gratis. Tanpa uang. Langsung jadi.',
    dayN: 'HARI {n}', population: 'Populasi {n}', freePlot: 'Kavling kosong', festBtn: '✨ Lihat lampu {x}',
    register: 'Daftarkan rumahmu', walk: 'Jalan-jalan', ideas: 'Ide', towns: 'Kota', visit: 'Kunjungi', today: 'Hari ini', race: 'Balapan',
    night: 'Malam', day: 'Siang', search: 'Cari rumahmu, kota, atau tempat', seeEarth: 'Lihat seluruh Bumi', myHouse: 'Rumahku',
    welcome: 'Selamat datang di', welcomeText: 'Seluruh Bumi masih kosong. Setiap orang dapat rumah yang sama di kotanya sendiri, dengan ID Instagram-nya.',
    alreadyT: 'Sudah komentar atau follow?', alreadyS: 'Ketik ID-mu untuk menemukan rumahmu', newT: 'Baru di sini?', newS: 'Daftar. Rumahmu langsung dibangun.',
    justLook: 'Lihat-lihat saja', free: 'Gratis. Tanpa kata sandi. Tanpa uang.',
    regTitle: 'Daftar untuk rumah', regSub: 'Gratis. Tanpa kata sandi. Tanpa uang. Langsung jadi.', idPh: 'ID Instagram-mu', townPh: 'Kota atau desamu',
    regBtn: 'Daftar', checkHouse: 'Sudah terdaftar? Lihat rumahku',
    privacy: 'Hanya ID Instagram publik dan kotamu yang tampil di peta, tidak pernah alamatmu. Daftarkan hanya ID milikmu.',
    house: 'rumah', houses: 'rumah', mayor: 'Wali kota', moreFor: 'Butuh {n} orang lagi untuk {x}', fullyBuilt: 'Kota sudah lengkap!',
    watchGrow: '▶ Lihat tumbuhnya', walkHere: '🚶 Jalan di sini', invite: '📣 Ajak teman', customise: '🎨 Hias rumah & karakterku', homes: 'Rumah & bangunan',
    growNote: 'Setiap rumah tumbuh: pondok di hari 1, pagar dan cerobong di hari 3, taman di hari 7, lalu dua lantai.',
    back: '← Keluar', person: 'orang di sini sekarang', people: 'orang di sini sekarang', photo: '📷 Foto', walkHint: 'Tombol panah atau WASD untuk berjalan · Shift untuk lari',
    tour1t: 'Temukan kotamu', tour1: 'Ketik ID, kota, atau tempat terkenal di kolom atas.',
    tour2t: 'Dapatkan rumahmu', tour2: 'Daftar gratis. Rumahmu jadi dalam 5 menit dan makin besar setiap beberapa hari.',
    tour3t: 'Jalan-jalan', tour3: 'Ketuk Jalan-jalan untuk keliling kotamu atau mengunjungi Taj Mahal, Menara Eiffel, dan 7.000 tempat lain.',
    skip: 'Lewati', next: 'Lanjut', done: 'Selesai', hideLights: '✨ Matikan lampu', readMore: 'Baca selengkapnya',
    'Corner shop': 'toko', 'Café': 'kafe', 'Community garden': 'kebun warga', 'Town square': 'alun-alun', Park: 'taman', 'Bus stop': 'halte bus', School: 'sekolah', Hospital: 'rumah sakit', 'Railway station': 'stasiun kereta', Market: 'pasar', Stadium: 'stadion', Airport: 'bandara',
  },
};

const pick = () => {
  try { const s = localStorage.getItem('wa-lang'); if (s && D[s]) return s; } catch { /* private mode */ }
  const n = (navigator.language || 'en').slice(0, 2);
  return D[n] ? n : 'en';
};
export let lang = pick();
export function t(key, vars) {
  let s = (D[lang] && D[lang][key]) ?? D.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
export function setLang(l) {
  if (!D[l]) return;
  lang = l;
  try { localStorage.setItem('wa-lang', l); } catch { /* private mode */ }
  applyStatic();
}
// Translate everything marked with data-i18n / data-i18n-ph in the page.
export function applyStatic() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  for (const el of document.querySelectorAll('.sheet, .towncard, .modal, .tour, .toast')) el.dir = RTL.has(lang) ? 'rtl' : 'ltr';
}
