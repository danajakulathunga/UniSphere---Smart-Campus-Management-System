import i18n from "../i18n";

const monthNames = {
  en: {
    long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  },
  si: {
    long: ["ජනවාරි", "පෙබරවාරි", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝස්තු", "සැප්තැම්බර්", "ඔක්තෝබර්", "නොවැම්බර්", "දෙසැම්බර්"],
    short: ["ජන", "පෙබ", "මාර්තු", "අප්‍රේල්", "මැයි", "ජූනි", "ජූලි", "අගෝ", "සැප්", "ඔක්", "නොවැ", "දෙසැ"]
  },
  ta: {
    long: ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
    short: ["ஜன", "பிப்", "மார்", "ஏப்", "மே", "ஜூன்", "ஜூலை", "ஆக", "செப்", "அக்", "நவ", "டிச"]
  }
};

const dayNames = {
  en: {
    long: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  },
  si: {
    long: ["ඉරිදා", "සඳුදා", "අඟහරුවාදා", "බදාදා", "බ්‍රහස්පතින්දා", "සිකුරාදා", "සෙනසුරාදා"],
    short: ["ඉරිදා", "සඳුදා", "අඟහ", "බදාදා", "බ්‍රහස්", "සිකු", "සෙන"]
  },
  ta: {
    long: ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
    short: ["ஞாயி", "திங்", "செவ்", "புதன்", "வியா", "வெள்", "சனி"]
  }
};

const amPmText = {
  en: { am: "AM", pm: "PM" },
  si: { am: "පෙ.ව.", pm: "ප.ව." },
  ta: { am: "மு.ப", pm: "பி.ப" }
};

const originalToLocaleDateString = Date.prototype.toLocaleDateString;
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
const originalToLocaleString = Date.prototype.toLocaleString;

Date.prototype.toLocaleDateString = function (locale, options) {
  const currentLang = locale || i18n.language || "en";
  const lang = (typeof currentLang === 'string' && currentLang.startsWith('si')) ? 'si' : 
               (typeof currentLang === 'string' && currentLang.startsWith('ta')) ? 'ta' : 'en';

  if (!options) {
    return `${this.getDate().toString().padStart(2, "0")} ${monthNames[lang].short[this.getMonth()]} ${this.getFullYear()}`;
  }

  const { weekday, month, day, year } = options;

  const dayNameShort = dayNames[lang].short[this.getDay()];
  const dayNameLong = dayNames[lang].long[this.getDay()];
  const monthNameShort = monthNames[lang].short[this.getMonth()];
  const monthNameLong = monthNames[lang].long[this.getMonth()];
  const dayNum = this.getDate();
  const yearNum = this.getFullYear();

  // Match common layout options:
  // 1. weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  if (weekday === 'short' && month === 'short' && day === 'numeric' && year === 'numeric') {
    if (lang === 'si') {
      return `${dayNameShort}, ${yearNum} ${monthNameShort} ${dayNum}`;
    } else if (lang === 'ta') {
      return `${dayNameShort}, ${dayNum} ${monthNameShort} ${yearNum}`;
    }
    return `${dayNameShort}, ${monthNameShort} ${dayNum}, ${yearNum}`;
  }

  // 2. month: 'long', year: 'numeric'
  if (month === 'long' && year === 'numeric') {
    return `${monthNameLong} ${yearNum}`;
  }

  // 3. month: 'short', day: 'numeric', weekday: 'short'
  if (month === 'short' && day === 'numeric' && weekday === 'short') {
    if (lang === 'si') {
      return `${dayNameShort}, ${monthNameShort} ${dayNum}`;
    } else if (lang === 'ta') {
      return `${dayNameShort}, ${dayNum} ${monthNameShort}`;
    }
    return `${dayNameShort}, ${monthNameShort} ${dayNum}`;
  }

  // 4. month: 'long'
  if (month === 'long' && !year && !weekday && !day) {
    return monthNameLong;
  }

  // 5. month: 'short'
  if (month === 'short' && !year && !weekday && !day) {
    return monthNameShort;
  }

  // 6. weekday: 'short'
  if (weekday === 'short' && !month && !day && !year) {
    return dayNameShort;
  }

  // 7. weekday: 'long'
  if (weekday === 'long' && !month && !day && !year) {
    return dayNameLong;
  }

  // Fallback to original
  return originalToLocaleDateString.call(this, locale, options);
};

Date.prototype.toLocaleTimeString = function (locale, options) {
  const currentLang = locale || i18n.language || "en";
  const lang = (typeof currentLang === 'string' && currentLang.startsWith('si')) ? 'si' : 
               (typeof currentLang === 'string' && currentLang.startsWith('ta')) ? 'ta' : 'en';

  let hours = this.getHours();
  const minutes = this.getMinutes().toString().padStart(2, "0");
  const seconds = this.getSeconds().toString().padStart(2, "0");
  
  const hour12 = options?.hour12 !== false;
  
  if (hour12) {
    const period = hours >= 12 ? amPmText[lang].pm : amPmText[lang].am;
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, "0");
    
    if (options?.second) {
      if (lang === 'si') {
        return `${period} ${hoursStr}:${minutes}:${seconds}`;
      } else if (lang === 'ta') {
        return `${hoursStr}:${minutes}:${seconds} ${period}`;
      }
      return `${hoursStr}:${minutes}:${seconds} ${period}`;
    } else {
      if (lang === 'si') {
        return `${period} ${hoursStr}:${minutes}`;
      } else if (lang === 'ta') {
        return `${hoursStr}:${minutes} ${period}`;
      }
      return `${hoursStr}:${minutes} ${period}`;
    }
  }

  const hoursStr = hours.toString().padStart(2, "0");
  if (options?.second) {
    return `${hoursStr}:${minutes}:${seconds}`;
  }
  return `${hoursStr}:${minutes}`;
};

Date.prototype.toLocaleString = function (locale, options) {
  const currentLang = locale || i18n.language || "en";
  const lang = (typeof currentLang === 'string' && currentLang.startsWith('si')) ? 'si' : 
               (typeof currentLang === 'string' && currentLang.startsWith('ta')) ? 'ta' : 'en';

  if (options && options.month && Object.keys(options).length === 1) {
    if (options.month === 'short') {
      return monthNames[lang].short[this.getMonth()];
    }
    return monthNames[lang].long[this.getMonth()];
  }

  if (options && options.weekday && Object.keys(options).length === 1) {
    if (options.weekday === 'short') {
      return dayNames[lang].short[this.getDay()];
    }
    return dayNames[lang].long[this.getDay()];
  }

  return originalToLocaleString.call(this, locale, options);
};
