/**
 * Arabic to English Name Transliteration Engine
 * Converts Arabic full names to accurate, culturally standard English representations.
 * Handles compound names, patronymics, prefixes, and common Saudi/Arab names.
 */

// Common Arabic names dictionary
const ARABIC_NAMES_DICT: Record<string, string> = {
  // A
  'احمد': 'Ahmed',
  'أحمد': 'Ahmed',
  'إحمد': 'Ahmed',
  'ابراهيم': 'Ibrahim',
  'إبراهيم': 'Ibrahim',
  'اسماعيل': 'Ismail',
  'إسماعيل': 'Ismail',
  'اسامه': 'Osama',
  'أسامة': 'Osama',
  'اسعد': 'Asaad',
  'أسعد': 'Asaad',
  'اشرف': 'Ashraf',
  'أشرف': 'Ashraf',
  'امجد': 'Amjad',
  'أمجد': 'Amjad',
  'ايمن': 'Ayman',
  'أيمن': 'Ayman',
  'امين': 'Amin',
  'أمين': 'Amin',
  'امير': 'Amir',
  'أمير': 'Amir',
  'انيس': 'Anis',
  'أنيس': 'Anis',
  'انس': 'Anas',
  'أنس': 'Anas',
  'اياد': 'Eyad',
  'إياد': 'Eyad',
  'ايهاب': 'Ehab',
  'إيهاب': 'Ehab',
  'اسلام': 'Islam',
  'إسلام': 'Islam',
  'ادهم': 'Adham',
  'أدهم': 'Adham',
  'اكرم': 'Akram',
  'أكرم': 'Akram',
  'انور': 'Anwar',
  'أنور': 'Anwar',
  'ايهم': 'Ayham',
  'أيهم': 'Ayham',
  'الياس': 'Elias',
  'إلياس': 'Elias',
  'اسماء': 'Asmaa',
  'أسماء': 'Asmaa',
  'اية': 'Aya',
  'آية': 'Aya',
  'ايات': 'Ayat',
  'آيات': 'Ayat',
  'اريج': 'Areej',
  'أريج': 'Areej',
  'امال': 'Amal',
  'آمال': 'Amal',
  'امل': 'Amal',
  'أمل': 'Amal',
  'اماني': 'Amani',
  'أماني': 'Amani',
  'اميرة': 'Amira',
  'أميرة': 'Amira',
  'اسيل': 'Aseel',
  'أسيل': 'Aseel',
  'الهام': 'Elham',
  'إلهام': 'Elham',
  'ايمان': 'Eman',
  'إيمان': 'Eman',
  'اسراء': 'Israa',
  'إسراء': 'Israa',
  'ابتسام': 'Ebtisam',
  'إبتسام': 'Ebtisam',

  // B
  'بدر': 'Badr',
  'بندر': 'Bandar',
  'باسل': 'Bassel',
  'باسم': 'Bassem',
  'بسام': 'Bassam',
  'بشير': 'Basheer',
  'بشار': 'Bashar',
  'بكر': 'Bakr',
  'بلال': 'Belal',
  'برهان': 'Borhan',
  'براء': 'Baraa',
  'بدور': 'Budoor',
  'بسمة': 'Basma',
  'بتول': 'Batool',
  'بيان': 'Bayan',
  'بلقيس': 'Balqees',

  // T / Th
  'تركي': 'Turki',
  'طارق': 'Tariq',
  'طلال': 'Talal',
  'تامر': 'Tamer',
  'تيم': 'Taym',
  'توفيق': 'Tawfiq',
  'ثامر': 'Thamer',
  'ثابت': 'Thabet',
  'تالين': 'Taleen',
  'تالا': 'Tala',
  'تسنيم': 'Tasneem',
  'تمارا': 'Tamara',

  // J
  'جابر': 'Jaber',
  'جمال': 'Jamal',
  'جميل': 'Jameel',
  'جعفر': 'Jaafar',
  'جاسر': 'Jaser',
  'جواد': 'Jawad',
  'جهاد': 'Jihad',
  'جلال': 'Jalal',
  'جاسم': 'Jassim',
  'جود': 'Joud',
  'جوري': 'Joury',
  'جنا': 'Jana',
  'جنى': 'Jana',
  'جمانة': 'Jumana',
  'جوهرة': 'Jawhara',

  // H / Kh
  'حسن': 'Hassan',
  'حسين': 'Hussein',
  'حسام': 'Hossam',
  'حمزة': 'Hamza',
  'حازم': 'Hazem',
  'حاتم': 'Hatem',
  'حامد': 'Hamed',
  'حمد': 'Hamad',
  'حميد': 'Humaid',
  'حيدر': 'Haider',
  'حبيب': 'Habeeb',
  'حافظ': 'Hafez',
  'حكيم': 'Hakeem',
  'خالد': 'Khaled',
  'خليل': 'Khalil',
  'خليفة': 'Khalifa',
  'خميس': 'Khamis',
  'خطاب': 'Khattab',
  'خلدون': 'Khaldoun',
  'حلا': 'Hala',
  'حنين': 'Haneen',
  'حبيبة': 'Habiba',
  'حصة': 'Hessa',
  'خديجة': 'Khadija',
  'خلود': 'Kholoud',
  'خولة': 'Khawla',

  // D / Dh
  'داود': 'Dawood',
  'داوود': 'Dawood',
  'درويش': 'Darwish',
  'دياب': 'Diab',
  'ذياب': 'Dhiab',
  'ذاكر': 'Dhaker',
  'دانية': 'Dania',
  'دانة': 'Dana',
  'دانه': 'Dana',
  'دينا': 'Dina',
  'ديمة': 'Deema',
  'دلال': 'Dalal',

  // R
  'راشد': 'Rashid',
  'رشيد': 'Rasheed',
  'ريان': 'Rayan',
  'راكان': 'Rakan',
  'ركان': 'Rakan',
  'رامي': 'Rami',
  'رمزي': 'Ramzi',
  'رضا': 'Reda',
  'رائد': 'Raed',
  'رياض': 'Riyadh',
  'رفيق': 'Rafeeq',
  'رؤوف': 'Raouf',
  'راجي': 'Raji',
  'رزق': 'Rizk',
  'رجب': 'Rajab',
  'ربيع': 'Rabee',
  'ريم': 'Reem',
  'ريما': 'Rima',
  'ريناد': 'Renad',
  'رنا': 'Rana',
  'رشا': 'Rasha',
  'روان': 'Rawan',
  'رحمة': 'Rahma',
  'رانيا': 'Rania',
  'رقية': 'Ruqayya',
  'رفيف': 'Rafeef',

  // Z
  'زياد': 'Ziyad',
  'زيد': 'Zayd',
  'زكريا': 'Zakaria',
  'زكي': 'Zaki',
  'زهير': 'Zuhair',
  'زين': 'Zain',
  'زايد': 'Zayed',
  'زاهر': 'Zaher',
  'زينب': 'Zainab',
  'زهراء': 'Zahraa',
  'زهرة': 'Zahra',
  'زينة': 'Zeina',

  // S / Sh
  'سيد': 'Sayed',
  'سعود': 'Saud',
  'سلطان': 'Sultan',
  'سلمان': 'Salman',
  'سالم': 'Salem',
  'سليم': 'Selim',
  'سليمان': 'Sulaiman',
  'سامي': 'Sami',
  'سمير': 'Samir',
  'سعد': 'Saad',
  'سعيد': 'Saeed',
  'صالح': 'Saleh',
  'صلاح': 'Salah',
  'صباح': 'Sabah',
  'صقر': 'Saqr',
  'صهيب': 'Suhaib',
  'صفوان': 'Safwan',
  'صبري': 'Sabry',
  'صبحي': 'Sobhy',
  'سيف': 'Saif',
  'سراج': 'Siraj',
  'سفيان': 'Sufyan',
  'سامر': 'Samer',
  'شريف': 'Sherif',
  'شوقي': 'Shawky',
  'شعبان': 'Shaaban',
  'شادي': 'Shady',
  'شاكر': 'Shaker',
  'شهاب': 'Shehab',
  'شمس': 'Shams',
  'شهد': 'Shahd',
  'شيماء': 'Shaimaa',
  'شروق': 'Shorouq',
  'شيرين': 'Shereen',
  'سارة': 'Sarah',
  'ساره': 'Sarah',
  'سلمى': 'Salma',
  'سلوى': 'Salwa',
  'سميرة': 'Samira',
  'سناء': 'Sanaa',
  'سهام': 'Seham',
  'سهى': 'Suha',

  // T / Z (Ta / Dha)
  'طه': 'Taha',
  'طلعت': 'Talaat',
  'ظافر': 'Dhafer',
  'ظريف': 'Dhareef',

  // A (Ain / Ghain)
  'علي': 'Ali',
  'على': 'Ali',
  'عمر': 'Omar',
  'عمرو': 'Amr',
  'عثمان': 'Othman',
  'عادل': 'Adel',
  'عامر': 'Amer',
  'عصام': 'Essam',
  'عماد': 'Emad',
  'عزت': 'Ezzat',
  'علاء': 'Alaa',
  'عيد': 'Eid',
  'عارف': 'Aref',
  'عاصم': 'Assem',
  'عاطف': 'Atef',
  'عزام': 'Azzam',
  'عزيز': 'Aziz',
  'عقيل': 'Aqeel',
  'عطية': 'Atteya',
  'عطيه': 'Atteya',
  'عيسى': 'Issa',
  'عيسي': 'Issa',
  'عباس': 'Abbas',
  'غسان': 'Ghassan',
  'غالب': 'Ghalib',
  'غازي': 'Ghazi',
  'غيث': 'Ghaith',
  'عائشة': 'Aisha',
  'عبير': 'Abeer',
  'عفاف': 'Afaf',
  'عهود': 'Ohoud',
  'غادة': 'Ghada',
  'غلا': 'Ghala',
  'غيداء': 'Ghaidaa',

  // F / Q
  'فارس': 'Faris',
  'فهد': 'Fahad',
  'فيصل': 'Faisal',
  'فؤاد': 'Fouad',
  'فراس': 'Firas',
  'فادي': 'Fadi',
  'فاروق': 'Farooq',
  'فاضل': 'Fadel',
  'فتحي': 'Fathy',
  'فوزي': 'Fawzy',
  'فياض': 'Fayyad',
  'قاسم': 'Qasim',
  'قصي': 'Qusai',
  'قيس': 'Qais',
  'قحطان': 'Qahtan',
  'فاطمة': 'Fatima',
  'فاطمه': 'Fatima',
  'فريدة': 'Farida',
  'فرح': 'Farah',
  'فداء': 'Fidaa',
  'فاتن': 'Faten',

  // K / L
  'كريم': 'Karim',
  'كمال': 'Kamal',
  'كاظم': 'Kadhim',
  'كنان': 'Kinan',
  'لؤي': 'Louay',
  'ليث': 'Laith',
  'لطفي': 'Lotfy',
  'لقمان': 'Luqman',
  'لمى': 'Lama',
  'لما': 'Lama',
  'ليان': 'Layan',
  'لين': 'Leen',
  'ليلى': 'Laila',
  'لطيفة': 'Latifa',
  'لميس': 'Lamees',
  'لجين': 'Loujain',

  // M
  'محمد': 'Mohammed',
  'محمود': 'Mahmoud',
  'مصطفى': 'Mustafa',
  'مصطفي': 'Mustafa',
  'ماجد': 'Majed',
  'مازن': 'Mazen',
  'مالك': 'Malek',
  'منصور': 'Mansour',
  'مهند': 'Mohanad',
  'معاذ': 'Moaz',
  'مروان': 'Marwan',
  'مؤيد': 'Muayyad',
  'منير': 'Mounir',
  'مبارك': 'Mubarak',
  'مختار': 'Mokhtar',
  'مراد': 'Mourad',
  'مشعل': 'Mishaal',
  'مشاري': 'Mishari',
  'مساعد': 'Mosaed',
  'مصلح': 'Musleh',
  'ممدوح': 'Mamdouh',
  'موسى': 'Moussa',
  'موسي': 'Moussa',
  'مهدي': 'Mahdi',
  'مهران': 'Mehran',
  'مجدي': 'Magdy',
  'متولي': 'Metwally',
  'مريم': 'Maryam',
  'منى': 'Mona',
  'منار': 'Manar',
  'مها': 'Maha',
  'مي': 'Mai',
  'ميس': 'Mais',
  'ميساء': 'Maysaa',
  'ملاك': 'Malak',
  'ملك': 'Malak',
  'ميار': 'Mayar',
  'مرح': 'Marah',
  'مروة': 'Marwa',

  // N
  'نايف': 'Naif',
  'ناصر': 'Nasser',
  'نواف': 'Nawaf',
  'نادر': 'Nader',
  'نبيل': 'Nabil',
  'نجيب': 'Najeeb',
  'نزار': 'Nizar',
  'نعيم': 'Naeem',
  'نور': 'Nour',
  'نشأت': 'Nashat',
  'نصر': 'Nasr',
  'نوح': 'Noah',
  'نورة': 'Noura',
  'نوره': 'Noura',
  'نجلاء': 'Najlaa',
  'ندى': 'Nada',
  'نهى': 'Nuha',
  'نرمين': 'Nermeen',
  'نسرين': 'Nesreen',
  'نهال': 'Nihal',

  // H / W / Y
  'هشام': 'Hisham',
  'هاني': 'Hani',
  'هيثم': 'Haitham',
  'هادي': 'Hadi',
  'همام': 'Homam',
  'هارون': 'Haroon',
  'هاشم': 'Hashem',
  'هند': 'Hind',
  'هدى': 'Huda',
  'هالة': 'Hala',
  'هناء': 'Hanaa',
  'وليد': 'Waleed',
  'وائل': 'Wael',
  'وسيم': 'Waseem',
  'وسام': 'Wessam',
  'وديع': 'Wadee',
  'وهيب': 'Waheeb',
  'وفاء': 'Wafaa',
  'وجدان': 'Wejdan',
  'ولاء': 'Walaa',
  'ورد': 'Ward',
  'يوسف': 'Youssef',
  'ياسر': 'Yasser',
  'يحيى': 'Yahya',
  'يحيي': 'Yahya',
  'يونس': 'Younis',
  'يعقوب': 'Yaqoub',
  'ياسين': 'Yassin',
  'يزيد': 'Yazeed',
  'يمام': 'Yamam',
  'ياسمين': 'Yasmin',
  'يسرى': 'Yosra',
  'يارا': 'Yara',

  // Surnames and compounds
  'زويل': 'Zewail',
  'شحاتة': 'Shehata',
  'شحاته': 'Shehata',
  'حجازي': 'Hegazy',
  'بدوي': 'Badawy',
  'الشمراني': 'Al-Shamrani',
  'الغامدي': 'Al-Ghamdi',
  'الزهراني': 'Al-Zahrani',
  'القحطاني': 'Al-Qahtani',
  'العتيبي': 'Al-Otaibi',
  'الحربي': 'Al-Harbi',
  'الدوسري': 'Al-Dawsari',
  'الشهري': 'Al-Shehri',
  'المطيري': 'Al-Mutairi',
  'القرني': 'Al-Qarni',
  'الشهراني': 'Al-Shahrani',
  'السبيعي': 'Al-Subaie',
  'المالكي': 'Al-Malki',
  'الخالدي': 'Al-Khalidi',
  'العنزي': 'Al-Anazi',
  'الرويلي': 'Al-Ruwaili',
  'الشمري': 'Al-Shammari',
  'السيد': 'Al-Sayed',
  'النجار': 'Al-Najjar',
  'الحداد': 'Al-Haddad',
  'الصايغ': 'Al-Sayegh',
  'البشري': 'Al-Beshri',
  'العمري': 'Al-Omari',
  'الرشيدي': 'Al-Rashidi',
  'الجهني': 'Al-Juhani',
  'العوفي': 'Al-Aufi',
  'المرواني': 'Al-Marwani',
};

// Fallback letter-by-letter phonetic map
const LETTER_MAP: Record<string, string> = {
  'ا': 'a',
  'أ': 'a',
  'إ': 'e',
  'آ': 'aa',
  'ء': '',
  'ئ': 'e',
  'ؤ': 'o',
  'ب': 'b',
  'ت': 't',
  'ث': 'th',
  'ج': 'j',
  'ح': 'h',
  'خ': 'kh',
  'د': 'd',
  'ذ': 'dh',
  'ر': 'r',
  'ز': 'z',
  'س': 's',
  'ش': 'sh',
  'ص': 's',
  'ض': 'dh',
  'ط': 't',
  'ظ': 'dh',
  'ع': 'a',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ك': 'k',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ه': 'h',
  'ة': 'a',
  'و': 'w',
  'ي': 'y',
  'ى': 'a',
};

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Phonetic transliteration fallback for arbitrary Arabic words
 */
function phoneticFallback(word: string): string {
  let clean = word
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // remove tashkeel
    .trim();

  if (!clean) return '';

  // Check prefix "الـ"
  let prefix = '';
  if (clean.startsWith('ال') && clean.length > 3) {
    prefix = 'Al-';
    clean = clean.slice(2);
  }

  // Check compound "عبد"
  if (clean.startsWith('عبد') && clean.length > 4) {
    const remainder = clean.slice(3);
    return 'Abdul' + capitalize(transliterateSingleWord(remainder));
  }

  let result = '';
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const mapped = LETTER_MAP[char] ?? '';
    result += mapped;
  }

  // Clean up duplicate vowels like 'aa' -> 'a' unless at start
  result = result.replace(/([aeiou])\1+/gi, '$1');

  return prefix + capitalize(result || word);
}

/**
 * Transliterates a single Arabic word
 */
function transliterateSingleWord(word: string): string {
  const clean = word
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .trim();

  if (!clean) return '';

  // Direct dictionary lookup
  if (ARABIC_NAMES_DICT[clean]) {
    return ARABIC_NAMES_DICT[clean];
  }

  // Check with standardized alefs / taa marbuta
  const normalized = clean
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

  if (ARABIC_NAMES_DICT[normalized]) {
    return ARABIC_NAMES_DICT[normalized];
  }

  // Handle "الـ" prefix in dictionary
  if (clean.startsWith('ال') && clean.length > 3) {
    const base = clean.slice(2);
    if (ARABIC_NAMES_DICT[base]) {
      return 'Al-' + ARABIC_NAMES_DICT[base];
    }
  }

  // Fallback to phonetic
  return phoneticFallback(clean);
}

/**
 * Main function: Transliterates an Arabic full name to English
 * e.g., "احمد ابراهيم علي سيد" -> "Ahmed Ibrahim Ali Sayed"
 */
export function transliterateArabicToEnglish(arabicName?: string | null): string {
  if (!arabicName || !arabicName.trim()) return '';

  // Strip prefixes like "طالب:" or "الطالب:"
  const cleaned = arabicName
    .replace(/^(طالب|الطالب|فصل|التلميذ)\s*[:\-–\/]?\s*/gi, '')
    .trim();

  // Handle compound words like "عبد الله" or "عبد الرحمن"
  const normalizedSpaces = cleaned
    .replace(/عبد\s+الله/g, 'عبدالله')
    .replace(/عبد\s+الرحمن/g, 'عبدالرحمن')
    .replace(/عبد\s+العزيز/g, 'عبدالعزيز')
    .replace(/عبد\s+الملك/g, 'عبدالملك')
    .replace(/عبد\s+الكريم/g, 'عبدالكريم')
    .replace(/عبد\s+المجيد/g, 'عبدالمجيد')
    .replace(/عبد\s+الفتاح/g, 'عبدالفتاح')
    .replace(/عبد\s+اللطيف/g, 'عبداللطيف')
    .replace(/عبد\s+الوهاب/g, 'عبدالوهاب')
    .replace(/عبد\s+السلام/g, 'عبدالسلام')
    .replace(/أبو\s+/g, 'Abu-')
    .replace(/ابو\s+/g, 'Abu-');

  const words = normalizedSpaces.split(/\s+/).filter(Boolean);

  const englishWords = words.map((word) => {
    // Check if word is already in English
    if (/^[A-Za-z]+$/.test(word)) {
      return capitalize(word);
    }
    return transliterateSingleWord(word);
  });

  return englishWords.filter(Boolean).join(' ');
}

/**
 * Resolves a realistic, valid default date of birth based on grade or survey age if missing.
 */
export function resolveStudentBirthDate(student?: { dateOfBirth?: string; grade?: string } | null, surveyAge?: string | number): string {
  if (student?.dateOfBirth && student.dateOfBirth.trim() && student.dateOfBirth !== '—') {
    return student.dateOfBirth.trim();
  }

  const currentYear = new Date().getFullYear(); // e.g. 2026

  // If age is specified in survey (e.g. "6 سنوات" or 6)
  if (surveyAge) {
    const ageNum = parseInt(String(surveyAge).replace(/\D/g, ''), 10);
    if (ageNum >= 3 && ageNum <= 18) {
      const birthYear = currentYear - ageNum;
      return `${birthYear}-05-15`;
    }
  }

  // Derive by grade standard (Saudi elementary enrollment age is 6 years in Grade 1)
  const g = student?.grade || '';
  if (g.includes('أول') || g.includes('الاول') || g.includes('1')) {
    return `${currentYear - 6}-01-15`;
  }
  if (g.includes('ثاني') || g.includes('الثاني') || g.includes('2')) {
    return `${currentYear - 7}-02-10`;
  }
  if (g.includes('ثالث') || g.includes('الثالث') || g.includes('3')) {
    return `${currentYear - 8}-03-12`;
  }
  if (g.includes('رابع') || g.includes('الرابع') || g.includes('4')) {
    return `${currentYear - 9}-04-18`;
  }
  if (g.includes('خامس') || g.includes('الخامس') || g.includes('5')) {
    return `${currentYear - 10}-05-22`;
  }
  if (g.includes('سادس') || g.includes('السادس') || g.includes('6')) {
    return `${currentYear - 11}-06-30`;
  }

  // General default for primary stage
  return `${currentYear - 6}-09-01`;
}
