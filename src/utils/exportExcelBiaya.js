import * as ExcelJS from 'exceljs/dist/exceljs.min.js';
import { formatDateIndo } from './formatters';
import { countHolidaysAndWeekendsInRange } from './holidays';
import { findSurveyorUser } from './filterData';

export const exportBiayaPerjalananDinas = async (item, usersList = [], gradeTariffs = []) => {
  try {
    const isLuarKota = (item.kategoriPerjalanan || 'Luar Kota') === 'Luar Kota';

    // Calculate Days and Nights
    const startDate = new Date(item.tglMulai);
    const endDate = new Date(item.tglSelesai);
    const timeDiff = endDate.getTime() - startDate.getTime();
    let hr = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    if (hr < 1) hr = 1;
    let mlm = hr - 1;
    if (mlm < 0) mlm = 0;

    // Calculate Weekends & National Holidays (Hari Libur) automatically
    let hrLbr = 0;
    if (item.jumlahHariLibur !== undefined && item.jumlahHariLibur !== '' && !isNaN(Number(item.jumlahHariLibur))) {
      hrLbr = Number(item.jumlahHariLibur);
    } else {
      const { count } = countHolidaysAndWeekendsInRange(item.tglMulai, item.tglSelesai);
      hrLbr = count;
    }

    // Get Surveyor Data
    const surveyor = findSurveyorUser(usersList, item.petugas) || {};
    const surveyorGrade = surveyor.grade || 'GRADE 6 A';
    const gradeData = gradeTariffs.find(g => g.grade === surveyorGrade) || {};

    // Calculations
    let sisaHariUangHarian = hr;
    if (item.tanpaUangHarian) {
      const deduct = item.hariTanpaUangHarian !== undefined ? Number(item.hariTanpaUangHarian) : hr;
      const validDeduct = Math.max(0, Math.min(deduct, hr));
      sisaHariUangHarian = hr - validDeduct;
    }

    const uangHarianRate = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (Number(gradeData.uangHarian) || 300000);
    const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
    const uangHotelTotal = (Array.isArray(item.rincianHotel) && item.rincianHotel.length > 0)
      ? item.rincianHotel.reduce((sum, h) => sum + (Number(h.totalBiaya) || ((Number(h.jumlahMalam) || 1) * (Number(h.tarifPerMalam) || 0)) || (Number(h.nominal) || 0)), 0)
      : (Number(item.totalBiayaHotel) || (Number(item.tiketHotel) || 0) * mlm);
    const uangHotelRate = mlm > 0 ? Math.round(uangHotelTotal / mlm) : (Number(item.tiketHotel) || 0);
    const hrLbrTotal = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (hrLbr * uangHarianRate * 0.5);
    const tiketPesawatTaxi = (Array.isArray(item.rincianTiket) && item.rincianTiket.length > 0)
      ? item.rincianTiket.reduce((sum, t) => sum + (Number(t.nominal) || 0), 0)
      : (Number(item.tiketPesawatTaxi) || Number(item.biayaTiket) || 0);
    const biayaTAT = item.tanpaTAT ? 0 : (Number(item.biayaTAT) || 0);
    const rateSK = Number(item.tarifDasar) || 0;

    let jumlah;
    if (isLuarKota) {
      jumlah = tiketPesawatTaxi + biayaTAT + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    } else {
      jumlah = rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    }

    const kacabUser = usersList.find(u => u.role === 'kacab') || {};
    const kacabName = (kacabUser.name || 'MUHSON NURROCHMAT').toUpperCase();
    const kacabDesc = kacabUser.nup || 'NUP.48199-KI';
    const pembuatUser = usersList.find(u => u.role === 'keuangan' || u.username === 'finance') || usersList.find(u => u.role === 'admin') || {};
    const pembuatName = (pembuatUser.name || 'Fitrian A,Md').toUpperCase();
    const pembuatDesc = pembuatUser.nup || 'NUP.50382-KI';

    const tglMulaiStr = formatDateIndo(item.tglMulai).toUpperCase();
    const tglSelesaiStr = formatDateIndo(item.tglSelesai).toUpperCase();
    const lokasiStr = (item.lokasi || '').toUpperCase();
    const kapalStr = (item.namaKapal || '').toUpperCase();
    const petugasStr = (item.petugas || '').toUpperCase();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daftar Biaya Perjalanan', {
      views: [{ showGridLines: true }],
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: {
          left: 0.35, right: 0.35, top: 0.4, bottom: 0.4,
          header: 0.2, footer: 0.2
        }
      }
    });

    // Column widths
    sheet.columns = [
      { width: 7 },  // A: NO
      { width: 28 }, // B: NAMA SURVEYOR
      { width: 6 },  // C: HR
      { width: 6 },  // D: MLM
      { width: 8 },  // E: HR LBR
      { width: 18 }, // F: TGL BERANGKAT
      { width: 18 }, // G: TGL KEMBALI
      { width: 16 }, // H: TRANSPORT
      { width: 16 }, // I: ASAL TUJUAN
      { width: 16 }, // J: RATE SK / LAIN
      { width: 12 }, // K: 11
      { width: 14 }, // L: 12=11*3
      { width: 12 }, // M: 13
      { width: 14 }, // N: 14=13*4
      { width: 14 }, // O: 15
      { width: 16 }, // P: 16
      { width: 16 }, // Q: 17=16
      { width: 18 }  // R: 18 TANDA TERIMA
    ];

    const thinBorder = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // Row 1-5: Header info
    const cleanNomor = cleanDocNumber(item.nomor || '').trim();
    const slashIdx = cleanNomor.indexOf('/');
    const prefix = slashIdx !== -1 ? cleanNomor.substring(0, slashIdx).trim() : cleanNomor;
    const suffix = slashIdx !== -1 ? cleanNomor.substring(slashIdx).trim() : '/SV.201/PK/KI-26';

    sheet.mergeCells('A1:E1');
    sheet.getCell('A1').value = `LAMPIRAN SURAT TUGAS No. ${prefix || 'A 0'}    ${suffix}`;
    sheet.getCell('A1').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('F1:H1');
    sheet.getCell('F1').value = tglMulaiStr;
    sheet.getCell('F1').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('F1').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A2:B2');
    sheet.getCell('A2').value = 'DAFTAR BIAYA PERJALANAN DINAS KE';
    sheet.getCell('A2').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getCell('C2').value = ':';
    sheet.getCell('C2').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('C2').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('D2:H2');
    sheet.getCell('D2').value = lokasiStr;
    sheet.getCell('D2').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('D2').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A3:B3');
    sheet.getCell('A3').value = 'DALAM RANGKA SURVEY KLAS';
    sheet.getCell('A3').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getCell('C3').value = ':';
    sheet.getCell('C3').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('C3').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('D3:H3');
    sheet.getCell('D3').value = kapalStr;
    sheet.getCell('D3').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('D3').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A4:H4');
    sheet.getCell('A4').value = 'SESUAI DAFTAR DAN KUITANSI TERLAMPIR';
    sheet.getCell('A4').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getRow(5).height = 10;

    // Row 6-7: Table headers
    const headerFont = { name: 'Calibri', bold: true, size: 9 };
    const headerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const setHeaderCell = (cell, value) => {
      const c = sheet.getCell(cell);
      c.value = value;
      c.font = headerFont;
      c.alignment = headerAlign;
      c.border = thinBorder;
    };

    // Row 6 merges
    sheet.mergeCells('A6:A7'); setHeaderCell('A6', 'NO.');
    sheet.mergeCells('B6:B7'); setHeaderCell('B6', 'NAMA');
    sheet.mergeCells('C6:E6'); setHeaderCell('C6', 'JUMLAH');
    sheet.mergeCells('F6:G6'); setHeaderCell('F6', 'TANGGAL');
    sheet.mergeCells('H6:J6'); setHeaderCell('H6', 'TRANSPORT');
    sheet.mergeCells('K6:L6'); setHeaderCell('K6', 'UANG HARIAN');
    sheet.mergeCells('M6:N6'); setHeaderCell('M6', 'UANG HOTEL');
    sheet.mergeCells('O6:O7'); setHeaderCell('O6', 'HR LBR\n50%*U.HR');
    sheet.mergeCells('P6:P7'); setHeaderCell('P6', 'JUMLAH');
    sheet.mergeCells('Q6:Q7'); setHeaderCell('Q6', 'JUMLAH\nTERIMA');
    sheet.mergeCells('R6:R7'); setHeaderCell('R6', 'TANDA\nTERIMA');

    // Row 7 sub-headers
    setHeaderCell('C7', 'HR');
    setHeaderCell('D7', 'MLM');
    setHeaderCell('E7', 'HR LBR');
    setHeaderCell('F7', 'BERANGKAT');
    setHeaderCell('G7', 'KEMBALI');

    if (isLuarKota) {
      setHeaderCell('H7', 'TIKET PESAWAT,\nTAXI.DLL');
      setHeaderCell('I7', 'ASAL\nTUJUAN');
      setHeaderCell('J7', 'SESUAI SK\nDIREKSI');
    } else {
      setHeaderCell('H7', 'SESUAI DENGAN\nSK DIREKSI');
      setHeaderCell('I7', 'ASAL\nTUJUAN');
      setHeaderCell('J7', 'DALAM\nTUGAS');
    }
    setHeaderCell('K7', '11');
    setHeaderCell('L7', '12=11*3');
    setHeaderCell('M7', '13');
    setHeaderCell('N7', '14=13*4');

    // Row heights for header
    sheet.getRow(6).height = 30;
    sheet.getRow(7).height = 30;

    // Row 8: Column indices (angka numerik murni sebagai integer agar bebas warning hijau Excel)
    const idxLabels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, '12=11*3', 13, '14=13*4', '15=5*11/50%', 16, '17=16', 18];
    idxLabels.forEach((lbl, i) => {
      const cell = sheet.getRow(8).getCell(i + 1);
      cell.value = lbl;
      cell.font = { name: 'Calibri', bold: true, italic: true, size: 8 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Row 9: Data
    const dataAlign = { horizontal: 'center', vertical: 'middle' };
    const numAlign = { horizontal: 'right', vertical: 'middle' };
    const dataFont = { name: 'Calibri', size: 9 };

    const setDataCell = (row, col, value, align = dataAlign) => {
      const cell = sheet.getRow(row).getCell(col);
      cell.value = value;
      cell.font = dataFont;
      cell.alignment = align;
      cell.border = thinBorder;
      if (typeof value === 'number') cell.numFmt = '#,##0';
    };

    setDataCell(9, 1, 1);
    setDataCell(9, 2, petugasStr, { horizontal: 'left', vertical: 'middle' });
    setDataCell(9, 3, hr);
    setDataCell(9, 4, mlm);
    setDataCell(9, 5, hrLbr > 0 ? hrLbr : '-');
    setDataCell(9, 6, tglMulaiStr);
    setDataCell(9, 7, tglSelesaiStr);

    if (isLuarKota) {
      setDataCell(9, 8, tiketPesawatTaxi > 0 ? tiketPesawatTaxi : '-', numAlign);
      setDataCell(9, 9, biayaTAT > 0 ? biayaTAT : '-', numAlign);
      setDataCell(9, 10, rateSK > 0 ? rateSK : '-', numAlign);
    } else {
      setDataCell(9, 8, rateSK > 0 ? rateSK : '-', numAlign);
      setDataCell(9, 9, '-');
      setDataCell(9, 10, '-');
    }

    setDataCell(9, 11, uangHarianRate > 0 ? uangHarianRate : '-', numAlign);
    setDataCell(9, 12, uangHarianTotal > 0 ? uangHarianTotal : '-', numAlign);
    setDataCell(9, 13, uangHotelRate > 0 ? uangHotelRate : '-', numAlign);
    setDataCell(9, 14, uangHotelTotal > 0 ? uangHotelTotal : '-', numAlign);
    setDataCell(9, 15, hrLbrTotal > 0 ? hrLbrTotal : '-', numAlign);
    setDataCell(9, 16, jumlah, numAlign);
    setDataCell(9, 17, jumlah, numAlign);
    setDataCell(9, 18, '');

    // Rows 10-12: Empty with borders
    for (let r = 10; r <= 12; r++) {
      for (let c = 1; c <= 18; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.border = thinBorder;
      }
    }

    // Row 13: Jumlah Total
    sheet.mergeCells('A13:K13');
    const jCell = sheet.getCell('A13');
    jCell.value = 'Jumlah';
    jCell.font = { name: 'Calibri', bold: true, size: 9 };
    jCell.alignment = { horizontal: 'right', vertical: 'middle' };
    jCell.border = thinBorder;

    sheet.getCell('L13').border = thinBorder;
    sheet.mergeCells('M13:O13');
    sheet.getCell('M13').value = 'Rp.';
    sheet.getCell('M13').font = { name: 'Calibri', bold: true, size: 9 };
    sheet.getCell('M13').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('M13').border = thinBorder;

    const pCell = sheet.getCell('P13');
    pCell.value = jumlah;
    pCell.font = { name: 'Calibri', bold: true, size: 9 };
    pCell.numFmt = '#,##0';
    pCell.alignment = numAlign;
    pCell.border = thinBorder;

    const qCell = sheet.getCell('Q13');
    qCell.value = jumlah;
    qCell.font = { name: 'Calibri', bold: true, size: 9 };
    qCell.numFmt = '#,##0';
    qCell.alignment = numAlign;
    qCell.border = thinBorder;

    sheet.getCell('R13').border = thinBorder;

    // Signatures
    sheet.mergeCells('B18:F18');
    sheet.getCell('B18').value = 'Mengetahui';
    sheet.getCell('B18').font = { name: 'Calibri', size: 9.5, bold: true };
    sheet.getCell('B18').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('B19:F19');
    sheet.getCell('B19').value = 'Kepala Cabang Madya Klas Pontianak';
    sheet.getCell('B19').font = { name: 'Calibri', bold: true, size: 9.5 };
    sheet.getCell('B19').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M18:R18');
    sheet.getCell('M18').value = `PONTIANAK, ${tglMulaiStr}`;
    sheet.getCell('M18').font = { name: 'Calibri', size: 9.5, bold: true };
    sheet.getCell('M18').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M19:R19');
    sheet.getCell('M19').value = 'Pembuat Daftar';
    sheet.getCell('M19').font = { name: 'Calibri', size: 9.5, bold: true };
    sheet.getCell('M19').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('B23:F23');
    sheet.getCell('B23').value = kacabName;
    sheet.getCell('B23').font = { name: 'Calibri', bold: true, underline: true, size: 10 };
    sheet.getCell('B23').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('B24:F24');
    sheet.getCell('B24').value = kacabDesc;
    sheet.getCell('B24').font = { name: 'Calibri', size: 9 };
    sheet.getCell('B24').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M23:R23');
    sheet.getCell('M23').value = pembuatName;
    sheet.getCell('M23').font = { name: 'Calibri', bold: true, underline: true, size: 10 };
    sheet.getCell('M23').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M24:R24');
    sheet.getCell('M24').value = pembuatDesc;
    sheet.getCell('M24').font = { name: 'Calibri', size: 9 };
    sheet.getCell('M24').alignment = { horizontal: 'center', vertical: 'middle' };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const dateObj = new Date(item.tglMulai);
    const dateStr = !isNaN(dateObj) ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : 'Tanggal';
    const surveyorStr = item.petugas || 'Surveyor';
    const fileName = `${dateStr} - ${surveyorStr} - Daftar Biaya Perjalanan Dinas.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);

  } catch (error) {
    console.error('Error exporting Excel:', error);
    alert('Gagal membuat file Excel: ' + error.message);
  }
};
