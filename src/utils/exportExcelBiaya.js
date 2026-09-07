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

    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'LAMPIRAN SURAT TUGAS';
    sheet.getCell('A1').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A2:B2');
    const noLabel = prefix ? (prefix.toLowerCase().startsWith('no') ? prefix : `No. ${prefix}`) : 'No. A 0';
    sheet.getCell('A2').value = `${noLabel}   ${suffix}`;
    sheet.getCell('A2').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getCell('C2').value = ':';
    sheet.getCell('C2').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('C2').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('D2:E2');
    sheet.getCell('D2').value = (tglMulaiStr || '').toUpperCase();
    sheet.getCell('D2').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('D2').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A3:B3');
    sheet.getCell('A3').value = 'DAFTAR BIAYA PERJALANAN DINAS KE';
    sheet.getCell('A3').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getCell('C3').value = ':';
    sheet.getCell('C3').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('C3').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('D3:H3');
    sheet.getCell('D3').value = (lokasiStr || '').toUpperCase();
    sheet.getCell('D3').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('D3').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A4:B4');
    sheet.getCell('A4').value = 'DALAM RANGKA SURVEY KLAS';
    sheet.getCell('A4').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A4').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getCell('C4').value = ':';
    sheet.getCell('C4').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('C4').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('D4:H4');
    sheet.getCell('D4').value = (kapalStr || '').toUpperCase();
    sheet.getCell('D4').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('D4').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A5:H5');
    sheet.getCell('A5').value = 'SESUAI DAFTAR DAN KUITANSI TERLAMPIR';
    sheet.getCell('A5').font = { name: 'Calibri', size: 10, bold: true };
    sheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'left' };

    sheet.getRow(6).height = 10;

    // Row 7-8: Table headers
    const headerFont = { name: 'Calibri', bold: true, size: 9 };
    const headerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const setHeaderCell = (cell, value) => {
      const c = sheet.getCell(cell);
      c.value = value;
      c.font = headerFont;
      c.alignment = headerAlign;
      c.border = thinBorder;
    };

    // Row 7 merges
    sheet.mergeCells('A7:A8'); setHeaderCell('A7', 'NO.');
    sheet.mergeCells('B7:B8'); setHeaderCell('B7', 'NAMA');
    sheet.mergeCells('C7:E7'); setHeaderCell('C7', 'JUMLAH');
    sheet.mergeCells('F7:G7'); setHeaderCell('F7', 'TANGGAL');
    sheet.mergeCells('H7:J7'); setHeaderCell('H7', 'TRANSPORT');
    sheet.mergeCells('K7:L7'); setHeaderCell('K7', 'UANG HARIAN');
    sheet.mergeCells('M7:N7'); setHeaderCell('M7', 'UANG HOTEL');
    sheet.mergeCells('O7:O8'); setHeaderCell('O7', 'HR LBR\n50%*U.HR');
    sheet.mergeCells('P7:P8'); setHeaderCell('P7', 'JUMLAH');
    sheet.mergeCells('Q7:Q8'); setHeaderCell('Q7', 'JUMLAH\nTERIMA');
    sheet.mergeCells('R7:R8'); setHeaderCell('R7', 'TANDA\nTERIMA');

    // Row 8 sub-headers
    setHeaderCell('C8', 'HR');
    setHeaderCell('D8', 'MLM');
    setHeaderCell('E8', 'HR LBR');
    setHeaderCell('F8', 'BERANGKAT');
    setHeaderCell('G8', 'KEMBALI');

    if (isLuarKota) {
      setHeaderCell('H8', 'TIKET PESAWAT,\nTAXI.DLL');
      setHeaderCell('I8', 'ASAL\nTUJUAN');
      setHeaderCell('J8', 'SESUAI SK\nDIREKSI');
    } else {
      setHeaderCell('H8', 'SESUAI DENGAN\nSK DIREKSI');
      setHeaderCell('I8', 'ASAL\nTUJUAN');
      setHeaderCell('J8', 'DALAM\nTUGAS');
    }
    setHeaderCell('K8', '11');
    setHeaderCell('L8', '12=11*3');
    setHeaderCell('M8', '13');
    setHeaderCell('N8', '14=13*4');

    // Row heights for header
    sheet.getRow(7).height = 30;
    sheet.getRow(8).height = 30;

    // Row 9: Column indices (angka numerik murni sebagai integer agar bebas warning hijau Excel)
    const idxLabels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, '12=11*3', 13, '14=13*4', '15=5*11/50%', 16, '17=16', 18];
    idxLabels.forEach((lbl, i) => {
      const cell = sheet.getRow(9).getCell(i + 1);
      cell.value = lbl;
      cell.font = { name: 'Calibri', bold: true, italic: true, size: 8 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Row 10: Data
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

    setDataCell(10, 1, 1);
    setDataCell(10, 2, petugasStr, { horizontal: 'left', vertical: 'middle' });
    setDataCell(10, 3, hr);
    setDataCell(10, 4, mlm);
    setDataCell(10, 5, hrLbr > 0 ? hrLbr : '-');
    setDataCell(10, 6, tglMulaiStr);
    setDataCell(10, 7, tglSelesaiStr);

    if (isLuarKota) {
      setDataCell(10, 8, tiketPesawatTaxi > 0 ? tiketPesawatTaxi : '-', numAlign);
      setDataCell(10, 9, biayaTAT > 0 ? biayaTAT : '-', numAlign);
      setDataCell(10, 10, rateSK > 0 ? rateSK : '-', numAlign);
    } else {
      setDataCell(10, 8, rateSK > 0 ? rateSK : '-', numAlign);
      setDataCell(10, 9, '-');
      setDataCell(10, 10, '-');
    }

    setDataCell(10, 11, uangHarianRate > 0 ? uangHarianRate : '-', numAlign);
    setDataCell(10, 12, uangHarianTotal > 0 ? uangHarianTotal : '-', numAlign);
    setDataCell(10, 13, uangHotelRate > 0 ? uangHotelRate : '-', numAlign);
    setDataCell(10, 14, uangHotelTotal > 0 ? uangHotelTotal : '-', numAlign);
    setDataCell(10, 15, hrLbrTotal > 0 ? hrLbrTotal : '-', numAlign);
    setDataCell(10, 16, jumlah, numAlign);
    setDataCell(10, 17, jumlah, numAlign);
    setDataCell(10, 18, '');

    // Rows 11-13: Empty with borders
    for (let r = 11; r <= 13; r++) {
      for (let c = 1; c <= 18; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.border = thinBorder;
      }
    }

    // Row 14: Jumlah Total
    sheet.mergeCells('A14:K14');
    const jCell = sheet.getCell('A14');
    jCell.value = 'Jumlah';
    jCell.font = { name: 'Calibri', bold: true, size: 9 };
    jCell.alignment = { horizontal: 'right', vertical: 'middle' };
    jCell.border = thinBorder;

    sheet.getCell('L14').border = thinBorder;
    sheet.mergeCells('M14:O14');
    sheet.getCell('M14').value = 'Rp.';
    sheet.getCell('M14').font = { name: 'Calibri', bold: true, size: 9 };
    sheet.getCell('M14').alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getCell('M14').border = thinBorder;

    const pCell = sheet.getCell('P14');
    pCell.value = jumlah;
    pCell.font = { name: 'Calibri', bold: true, size: 9 };
    pCell.numFmt = '#,##0';
    pCell.alignment = numAlign;
    pCell.border = thinBorder;

    const qCell = sheet.getCell('Q14');
    qCell.value = jumlah;
    qCell.font = { name: 'Calibri', bold: true, size: 9 };
    qCell.numFmt = '#,##0';
    qCell.alignment = numAlign;
    qCell.border = thinBorder;

    sheet.getCell('R14').border = thinBorder;

    // Signatures
    sheet.mergeCells('B19:F19');
    sheet.getCell('B19').value = 'Mengetahui';
    sheet.getCell('B19').font = { name: 'Calibri', size: 9.5, bold: true };
    sheet.getCell('B19').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('B20:F20');
    sheet.getCell('B20').value = 'Kepala Cabang Madya Klas Pontianak';
    sheet.getCell('B20').font = { name: 'Calibri', bold: true, size: 9.5 };
    sheet.getCell('B20').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M19:R19');
    sheet.getCell('M19').value = `PONTIANAK, ${tglMulaiStr}`;
    sheet.getCell('M19').font = { name: 'Calibri', size: 9.5, bold: true };
    sheet.getCell('M19').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M20:R20');
    sheet.getCell('M20').value = 'Pembuat Daftar';
    sheet.getCell('M20').font = { name: 'Calibri', size: 9.5, bold: true };
    sheet.getCell('M20').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('B24:F24');
    sheet.getCell('B24').value = kacabName;
    sheet.getCell('B24').font = { name: 'Calibri', bold: true, underline: true, size: 10 };
    sheet.getCell('B24').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('B25:F25');
    sheet.getCell('B25').value = kacabDesc;
    sheet.getCell('B25').font = { name: 'Calibri', size: 9 };
    sheet.getCell('B25').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M24:R24');
    sheet.getCell('M24').value = pembuatName;
    sheet.getCell('M24').font = { name: 'Calibri', bold: true, underline: true, size: 10 };
    sheet.getCell('M24').alignment = { horizontal: 'center', vertical: 'middle' };

    sheet.mergeCells('M25:R25');
    sheet.getCell('M25').value = pembuatDesc;
    sheet.getCell('M25').font = { name: 'Calibri', size: 9 };
    sheet.getCell('M25').alignment = { horizontal: 'center', vertical: 'middle' };

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
