/**
 * prosesBisnisConstants.js
 * Master Definisi Kategori Proses Bisnis / Potensi Produksi BKI Cabang Pontianak
 * Sesuai format laporan bulanan keuangan & produksi
 */

export const KATEGORI_PROSES_BISNIS = [
  'PENERIMAAN KLAS',
  'SERTIFIKASI MAT-KOM',
  'STATUTORY',
  'AUDIT SMC/ISPS/DOC',
  'STATUTORY HUBDAT',
  'SURVEY PERIODIK',
];

export const PROSES_BISNIS_META = {
  'PENERIMAAN KLAS': {
    name: 'PENERIMAAN KLAS',
    shortName: 'PENERIMAAN KLAS',
    color: '#1d4ed8',
    bg: '#93c5fd', // user Excel header blue
    lightBg: '#eff6ff',
    border: '#60a5fa',
    textColor: '#1e3a8a',
    excelColor: '93C5FD',
    order: 1,
  },
  'SERTIFIKASI MAT-KOM': {
    name: 'SERTIFIKASI MAT-KOM',
    shortName: 'MAT-KOM',
    color: '#15803d',
    bg: '#86efac', // user Excel header green
    lightBg: '#f0fdf4',
    border: '#4ade80',
    textColor: '#14532d',
    excelColor: '86EFAC',
    order: 2,
  },
  'STATUTORY': {
    name: 'STATUTORY',
    shortName: 'STATUTORY',
    color: '#7e22ce',
    bg: '#d8b4fe', // user Excel header purple
    lightBg: '#faf5ff',
    border: '#c084fc',
    textColor: '#581c87',
    excelColor: 'D8B4FE',
    order: 3,
  },
  'AUDIT SMC/ISPS/DOC': {
    name: 'AUDIT SMC/ISPS/DOC',
    shortName: 'AUDIT SMC/ISPS',
    color: '#0369a1',
    bg: '#7dd3fc', // user Excel header cyan/sky
    lightBg: '#f0f9ff',
    border: '#38bdf8',
    textColor: '#0c4a6e',
    excelColor: '7DD3FC',
    order: 4,
  },
  'STATUTORY HUBDAT': {
    name: 'STATUTORY HUBDAT',
    shortName: 'STATUTORY HUBDAT',
    color: '#c2410c',
    bg: '#fed7aa', // user Excel header peach/orange
    lightBg: '#fff7ed',
    border: '#fb923c',
    textColor: '#7c2d12',
    excelColor: 'FED7AA',
    order: 5,
  },
  'SURVEY PERIODIK': {
    name: 'SURVEY PERIODIK',
    shortName: 'SURVEY PERIODIK',
    color: '#be123c',
    bg: '#fca5a5', // user Excel header pink/salmon
    lightBg: '#fff1f2',
    border: '#f87171',
    textColor: '#881337',
    excelColor: 'FCA5A5',
    order: 6,
  },
};

export const MONTH_NAMES = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEP',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
];

/**
 * Deteksi otomatis Kategori Proses Bisnis berdasarkan teks jenisSurvey
 */
export const determineKategoriBisnis = (jenisSurvey = '') => {
  if (!jenisSurvey) return 'SURVEY PERIODIK';
  const upper = jenisSurvey.toUpperCase();

  // 1. Audit SMC / ISPS / DOC
  if (
    upper.includes('AUDIT') ||
    upper.includes('SMC') ||
    upper.includes('ISPS') ||
    upper.includes('DOC') ||
    upper.includes('ISM CODE')
  ) {
    return 'AUDIT SMC/ISPS/DOC';
  }

  // 2. Statutory Hubdat (Perhubungan Darat / SDP / Danau)
  if (
    upper.includes('HUBDAT') ||
    upper.includes('PERHUBUNGAN DARAT') ||
    upper.includes('SUNGAI') ||
    upper.includes('DANAU') ||
    upper.includes('SDP')
  ) {
    return 'STATUTORY HUBDAT';
  }

  // 3. Statutory (Statutoria, Garis Muat / LL, Radio, Marpol, Solas, Safety)
  if (
    upper.includes('STATUTOR') ||
    upper.includes('LOAD LINE') ||
    upper.includes('GARIS MUAT') ||
    upper.includes(' LL') ||
    upper.startsWith('LL') ||
    upper.includes('RADIO') ||
    upper.includes('MARPOL') ||
    upper.includes('SOLAS') ||
    upper.includes('KESELAMATAN') ||
    upper.includes('SNPP') ||
    upper.includes('SEEE')
  ) {
    return 'STATUTORY';
  }

  // 4. Sertifikasi Material & Komponen
  if (
    upper.includes('MAT-KOM') ||
    upper.includes('MATERIAL') ||
    upper.includes('KOMPONEN') ||
    upper.includes('PROPELLER') ||
    upper.includes('POROS') ||
    upper.includes('WELDING') ||
    upper.includes('JANGKAR') ||
    upper.includes('RANTAI') ||
    upper.includes('PELAT') ||
    upper.includes('PIPA') ||
    upper.includes('BKI-MK')
  ) {
    return 'SERTIFIKASI MAT-KOM';
  }

  // 5. Penerimaan Klas (Kapal Bangunan Baru, Masuk Klas Baru, TOC)
  if (
    upper.includes('PENERIMAAN') ||
    upper.includes('KLASIFIKASI BARU') ||
    upper.includes('BANGUNAN BARU') ||
    upper.includes('TOC') ||
    upper.includes('PENDAFTARAN') ||
    upper.includes('MASUK KLAS')
  ) {
    return 'PENERIMAAN KLAS';
  }

  // 6. Default: Survey Periodik (Tahunan, Antara, Pembaharuan, Pengedokan, dll)
  return 'SURVEY PERIODIK';
};

/**
 * Data Baseline Riwayat 2023 persis sesuai tabel spreadsheet dari BKI Pontianak
 */
export const HISTORICAL_PROSES_BISNIS_2023 = {
  // Nilai Pendapatan (Rupiah)
  revenue: {
    'PENERIMAAN KLAS': [
      228754000, 48455000, 127414000, 329750000, 255293750, 341500000,
      514910000, 0, 115575000, 307220000, 164220000, 379255000
    ],
    'SERTIFIKASI MAT-KOM': [
      32375000, 0, 59500000, 5625000, 0, 17500000,
      4000000, 27000000, 0, 7400000, 76000000, 150000000
    ],
    'STATUTORY': [
      0, 0, 163848510, 8100000, 13800000, 17955000,
      31065000, 21255000, 134308950, 69625000, 50805000, 41234414
    ],
    'AUDIT SMC/ISPS/DOC': [
      0, 30818750, 22229000, 0, 0, 70097675,
      121968650, 27060200, 43133600, 21380000, 55757118, 70396465
    ],
    'STATUTORY HUBDAT': [
      0, 0, 23900000, 810000, 13800000, 17955000,
      31065000, 21255000, 134308950, 69625000, 50805000, 41234414
    ],
    'SURVEY PERIODIK': [
      872175000, 1530825750, 1624865750, 1021043750, 1644234286, 1274539750,
      1447574750, 1575816000, 1536516500, 1610818000, 1657638250, 3018214750
    ]
  },
  // Jumlah Transaksi / Volume
  volume: {
    'PENERIMAAN KLAS': [2, 1, 2, 2, 2, 2, 4, 0, 2, 3, 2, 4],
    'SERTIFIKASI MAT-KOM': [7, 0, 1, 1, 0, 1, 1, 1, 0, 2, 4, 5],
    'STATUTORY': [0, 0, 8, 1, 2, 3, 2, 2, 7, 3, 4, 3],
    'AUDIT SMC/ISPS/DOC': [0, 1, 2, 0, 0, 3, 4, 2, 4, 1, 2, 2],
    'STATUTORY HUBDAT': [0, 0, 1, 1, 2, 3, 2, 2, 7, 3, 4, 3],
    'SURVEY PERIODIK': [44, 91, 80, 47, 77, 76, 74, 80, 84, 84, 80, 158]
  },
  totalPendapatan: 23425605982
};

/**
 * Kalkulasi ringkasan bulanan untuk tahun tertentu dari array notaDebit
 * @param {Array} notaDebitList - Daftar nota debit
 * @param {number|string} targetYear - Tahun target (contoh: 2023, 2026)
 * @param {string} metricType - 'biayaSebelumPPN' | 'totalSetelahPPN' | 'feeSurvey'
 */
export const calculateProsesBisnisSummary = (
  notaDebitList = [],
  targetYear = new Date().getFullYear(),
  metricType = 'biayaSebelumPPN'
) => {
  const yearNum = Number(targetYear);

  // Inisialisasi matriks 12 bulan (indeks 0 - 11)
  const revenueMatrix = {};
  const volumeMatrix = {};
  const itemsByCell = {}; // { 'KATEGORI-MONTH': [items] }

  KATEGORI_PROSES_BISNIS.forEach((kat) => {
    revenueMatrix[kat] = new Array(12).fill(0);
    volumeMatrix[kat] = new Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      itemsByCell[`${kat}-${m}`] = [];
    }
  });

  // Jika tahun 2023 dipilih dan belum ada data live 2023, kita muat baseline historis
  const hasLive2023 = (notaDebitList || []).some((item) => {
    if (!item.tanggalND) return false;
    return new Date(item.tanggalND).getFullYear() === 2023;
  });

  if (yearNum === 2023 && !hasLive2023) {
    KATEGORI_PROSES_BISNIS.forEach((kat) => {
      if (HISTORICAL_PROSES_BISNIS_2023.revenue[kat]) {
        revenueMatrix[kat] = [...HISTORICAL_PROSES_BISNIS_2023.revenue[kat]];
      }
      if (HISTORICAL_PROSES_BISNIS_2023.volume[kat]) {
        volumeMatrix[kat] = [...HISTORICAL_PROSES_BISNIS_2023.volume[kat]];
      }
    });
  }

  // Agregasi transaksi live dari notaDebitList
  (notaDebitList || []).forEach((item) => {
    if (!item.tanggalND) return;
    const d = new Date(item.tanggalND);
    if (isNaN(d.getTime()) || d.getFullYear() !== yearNum) return;

    const monthIdx = d.getMonth(); // 0 - 11
    const kat = item.kategoriBisnis || determineKategoriBisnis(item.jenisSurvey);

    if (!revenueMatrix[kat]) {
      revenueMatrix[kat] = new Array(12).fill(0);
      volumeMatrix[kat] = new Array(12).fill(0);
    }

    let val = Number(item[metricType]) || 0;
    if (!val && metricType === 'biayaSebelumPPN') {
      val = (Number(item.feeSurvey) || 0) + (Number(item.biayaSurvey) || 0);
    }

    revenueMatrix[kat][monthIdx] += val;
    volumeMatrix[kat][monthIdx] += 1;

    const cellKey = `${kat}-${monthIdx}`;
    if (!itemsByCell[cellKey]) itemsByCell[cellKey] = [];
    itemsByCell[cellKey].push(item);
  });

  // Hitung total per bulan
  const monthlyRevenueTotals = new Array(12).fill(0);
  const monthlyVolumeTotals = new Array(12).fill(0);

  for (let m = 0; m < 12; m++) {
    KATEGORI_PROSES_BISNIS.forEach((kat) => {
      monthlyRevenueTotals[m] += revenueMatrix[kat]?.[m] || 0;
      monthlyVolumeTotals[m] += volumeMatrix[kat]?.[m] || 0;
    });
  }

  // Hitung total tahunan per kategori
  const yearlyRevenueByCategory = {};
  const yearlyVolumeByCategory = {};

  KATEGORI_PROSES_BISNIS.forEach((kat) => {
    yearlyRevenueByCategory[kat] = (revenueMatrix[kat] || []).reduce((a, b) => a + b, 0);
    yearlyVolumeByCategory[kat] = (volumeMatrix[kat] || []).reduce((a, b) => a + b, 0);
  });

  const grandTotalRevenue = monthlyRevenueTotals.reduce((a, b) => a + b, 0);
  const grandTotalVolume = monthlyVolumeTotals.reduce((a, b) => a + b, 0);

  return {
    year: yearNum,
    revenueMatrix,
    volumeMatrix,
    itemsByCell,
    monthlyRevenueTotals,
    monthlyVolumeTotals,
    yearlyRevenueByCategory,
    yearlyVolumeByCategory,
    grandTotalRevenue,
    grandTotalVolume,
  };
};
