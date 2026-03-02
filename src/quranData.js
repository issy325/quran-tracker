// Complete Quran Surah data: [name, ayahCount, juzStart]
export const SURAH_DATA = [
  ["Al-Fatiha", 7, 1],["Al-Baqarah", 286, 1],["Aal-E-Imran", 200, 3],["An-Nisa", 176, 4],
  ["Al-Ma'idah", 120, 6],["Al-An'am", 165, 7],["Al-A'raf", 206, 8],["Al-Anfal", 75, 9],
  ["At-Tawbah", 129, 10],["Yunus", 109, 11],["Hud", 123, 11],["Yusuf", 111, 12],
  ["Ar-Ra'd", 43, 13],["Ibrahim", 52, 13],["Al-Hijr", 99, 14],["An-Nahl", 128, 14],
  ["Al-Isra", 111, 15],["Al-Kahf", 110, 15],["Maryam", 98, 16],["Ta-Ha", 135, 16],
  ["Al-Anbiya", 112, 17],["Al-Hajj", 78, 17],["Al-Mu'minun", 118, 18],["An-Nur", 64, 18],
  ["Al-Furqan", 77, 18],["Ash-Shu'ara", 227, 19],["An-Naml", 93, 19],["Al-Qasas", 88, 20],
  ["Al-Ankabut", 69, 20],["Ar-Rum", 60, 21],["Luqman", 34, 21],["As-Sajdah", 30, 21],
  ["Al-Ahzab", 73, 21],["Saba", 54, 22],["Fatir", 45, 22],["Ya-Sin", 83, 22],
  ["As-Saffat", 182, 23],["Sad", 88, 23],["Az-Zumar", 75, 23],["Ghafir", 85, 24],
  ["Fussilat", 54, 24],["Ash-Shura", 53, 25],["Az-Zukhruf", 89, 25],["Ad-Dukhan", 59, 25],
  ["Al-Jathiyah", 37, 25],["Al-Ahqaf", 35, 26],["Muhammad", 38, 26],["Al-Fath", 29, 26],
  ["Al-Hujurat", 18, 26],["Qaf", 45, 26],["Adh-Dhariyat", 60, 26],["At-Tur", 49, 27],
  ["An-Najm", 62, 27],["Al-Qamar", 55, 27],["Ar-Rahman", 78, 27],["Al-Waqi'ah", 96, 27],
  ["Al-Hadid", 29, 27],["Al-Mujadila", 22, 28],["Al-Hashr", 24, 28],["Al-Mumtahina", 13, 28],
  ["As-Saff", 14, 28],["Al-Jumu'ah", 11, 28],["Al-Munafiqun", 11, 28],["At-Taghabun", 18, 28],
  ["At-Talaq", 12, 28],["At-Tahrim", 12, 28],["Al-Mulk", 30, 29],["Al-Qalam", 52, 29],
  ["Al-Haqqah", 52, 29],["Al-Ma'arij", 44, 29],["Nuh", 28, 29],["Al-Jinn", 28, 29],
  ["Al-Muzzammil", 20, 29],["Al-Muddathir", 56, 29],["Al-Qiyamah", 40, 29],["Al-Insan", 31, 29],
  ["Al-Mursalat", 50, 29],["An-Naba", 40, 30],["An-Nazi'at", 46, 30],["Abasa", 42, 30],
  ["At-Takwir", 29, 30],["Al-Infitar", 19, 30],["Al-Mutaffifin", 36, 30],["Al-Inshiqaq", 25, 30],
  ["Al-Buruj", 22, 30],["At-Tariq", 17, 30],["Al-A'la", 19, 30],["Al-Ghashiyah", 26, 30],
  ["Al-Fajr", 30, 30],["Al-Balad", 20, 30],["Ash-Shams", 15, 30],["Al-Layl", 21, 30],
  ["Ad-Duha", 11, 30],["Ash-Sharh", 8, 30],["At-Tin", 8, 30],["Al-Alaq", 19, 30],
  ["Al-Qadr", 5, 30],["Al-Bayyinah", 8, 30],["Az-Zalzalah", 8, 30],["Al-Adiyat", 11, 30],
  ["Al-Qari'ah", 11, 30],["At-Takathur", 8, 30],["Al-Asr", 3, 30],["Al-Humazah", 9, 30],
  ["Al-Fil", 5, 30],["Quraysh", 4, 30],["Al-Ma'un", 7, 30],["Al-Kawthar", 3, 30],
  ["Al-Kafirun", 6, 30],["An-Nasr", 3, 30],["Al-Masad", 5, 30],["Al-Ikhlas", 4, 30],
  ["Al-Falaq", 5, 30],["An-Nas", 6, 30]
];

export const SURAHS = SURAH_DATA.map(s => s[0]);
export const AYAH_COUNTS = SURAH_DATA.map(s => s[1]);
