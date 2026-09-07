import React, { useState, useEffect } from 'react';
import { X, Printer, Globe, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, formatRupiah, cleanDocNumber } from '../utils/formatters';
import { isValidSignature } from '../utils/signatureHelper';
import { ModalPortal } from './ModalPortal';
import { BKILogo } from './BKILogo';

export const BiayaPdsLuarNegeriPrintModal = ({
  isOpen,
  onClose,
  suratTugas = null
}) => {
  const { adminSettings } = useData();
  const { usersList, role } = useAuth();
  const [withSignature, setWithSignature] = useState(true);
  const [isFitToScreen, setIsFitToScreen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [printMode, setPrintMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return (window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) ? 'mobile' : 'windows';
    }
    return 'windows';
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen || !suratTugas) return null;

  const isSurveyor = role === 'surveyor';
  const canPrint = !isSurveyor;
  const isMobileScreen = windowWidth <= 768;
  const targetDocWidth = 980;
  const availableWidth = isMobileScreen ? (windowWidth - 20) : Math.min(windowWidth * 0.94, 1150) - 30;
  const fitScale = isFitToScreen ? Math.min(Math.max(availableWidth / targetDocWidth, 0.28), 1) : 1;

  // Data & Kalkulasi
  const hr = Number(suratTugas.hariLuarNegeri) || 3;
  const mlm = Number(suratTugas.malamLuarNegeri) || 2;
  const hrLbr = Number(suratTugas.hariLiburLuarNegeri) || Number(suratTugas.jumlahHariLibur) || 0;

  const tglMulaiStr = suratTugas.tglMulai ? formatDateIndo(suratTugas.tglMulai).toUpperCase() : '24 NOPEMBER 2025';
  const tglSelesaiStr = suratTugas.tglSelesai ? formatDateIndo(suratTugas.tglSelesai).toUpperCase() : '26 NOPEMBER 2025';

  const tglTransitMulaiStr = suratTugas.tglMulaiTransit ? formatDateIndo(suratTugas.tglMulaiTransit).toUpperCase() : (suratTugas.tglMulai ? formatDateIndo(suratTugas.tglMulai).toUpperCase() : '09 NOPEMBER 2025');
  const tglTransitSelesaiStr = suratTugas.tglSelesaiTransit ? formatDateIndo(suratTugas.tglSelesaiTransit).toUpperCase() : (suratTugas.tglSelesai ? formatDateIndo(suratTugas.tglSelesai).toUpperCase() : '11 NOPEMBER 2025');

  const negaraTujuan = (suratTugas.negaraTujuan || suratTugas.tempatSurvey || suratTugas.lokasi || 'CHINA').toUpperCase();
  const namaKapal = (suratTugas.namaKapal || 'LCT SHUN JUN 7').toUpperCase();
  const namaSurveyor = (suratTugas.petugas || 'TRI LAKSONO JOENIAWAN').toUpperCase();

  // Komponen USD
  const rateUangHarianUsd = Number(suratTugas.uangHarianUsdRate) || Number(suratTugas.uangHarianUsd) || 150;
  const totalUangHarianUsd = Number(suratTugas.uangHarianUsdTotal) || (hr * rateUangHarianUsd);

  const rateUangHotelUsd = Number(suratTugas.uangHotelUsdRate) || Number(suratTugas.uangHotelUsd) || 0;
  const totalUangHotelUsd = Number(suratTugas.uangHotelUsdTotal) || (mlm * rateUangHotelUsd);

  const totalHariLiburUsd = Number(suratTugas.hariLiburUsdTotal) || (hrLbr * rateUangHarianUsd * 0.5);
  const pakaianDinginUsd = Number(suratTugas.pakaianDinginUsd) || 0;
  const tiketLuarUsd = Number(suratTugas.tiketLuarNegeriUsd) || 0;
  const asalTujuanLuarUsd = Number(suratTugas.asalTujuanLuarUsd) || 0;

  const totalUsd = Number(suratTugas.totalUsd) || (tiketLuarUsd + asalTujuanLuarUsd + totalUangHarianUsd + totalUangHotelUsd + totalHariLiburUsd + pakaianDinginUsd);

  // Status Dengan / Tanpa Dalam Negeri
  const denganDalamNegeri = suratTugas.denganDalamNegeri !== undefined
    ? !!suratTugas.denganDalamNegeri
    : (Number(suratTugas.totalTransitIdr || suratTugas.asalTujuanDlm || suratTugas.tiketDalamNegeri) > 0 || !!suratTugas.tglMulaiTransit);

  // Komponen Transit IDR (Lengkap Sesuai PDS Dalam Negeri)
  const hrTransit = denganDalamNegeri ? (Number(suratTugas.hrTransit) || 0) : 0;
  const mlmTransit = denganDalamNegeri ? (Number(suratTugas.mlmTransit) || 0) : 0;
  const hrLbrTransit = denganDalamNegeri ? (Number(suratTugas.jumlahHariLiburTransit) || 0) : 0;
  const rateUangHarianDlm = denganDalamNegeri ? (Number(suratTugas.uangHarianDlmRate) || 0) : 0;
  const totalUangHarianDlm = denganDalamNegeri ? (Number(suratTugas.totalUangHarianDlm) || (hrTransit * rateUangHarianDlm)) : 0;
  const rateHotelDlm = denganDalamNegeri ? (Number(suratTugas.uangHotelDlmRate) || 0) : 0;
  const totalHotelDlm = denganDalamNegeri ? (Number(suratTugas.totalUangHotelDlm) || (mlmTransit * rateHotelDlm)) : 0;
  const totalHrLiburDlm = denganDalamNegeri ? (Number(suratTugas.totalHrLiburDlm) || (hrLbrTransit * rateUangHarianDlm * 0.5)) : 0;

  const tiketDlmIdr = denganDalamNegeri ? (Number(suratTugas.tiketDalamNegeri) || 0) : 0;
  const asalTujuanDlmIdr = denganDalamNegeri ? (suratTugas.asalTujuanDlm !== undefined ? Number(suratTugas.asalTujuanDlm) : 750000) : 0;

  const totalTransitIdr = denganDalamNegeri
    ? (suratTugas.totalTransitIdr !== undefined
        ? Number(suratTugas.totalTransitIdr)
        : (totalUangHarianDlm + totalHotelDlm + totalHrLiburDlm + tiketDlmIdr + asalTujuanDlmIdr))
    : 0;

  // Kurs & Konversi
  const kurs = Number(suratTugas.kursUsd) || 16640;
  const konversiUsdKeIdr = Number(suratTugas.konversiUsdKeIdr) || Math.round(totalUsd * kurs);
  const grandTotalIdr = denganDalamNegeri
    ? (Number(suratTugas.totalIdrTerima) || Number(suratTugas.jumlahEstimasi) || (konversiUsdKeIdr + totalTransitIdr))
    : konversiUsdKeIdr;

  const keteranganKhusus = suratTugas.keteranganLain || 'TIKET, HOTEL DAN TAT DI LUAR NEGERI DITANGGUNG PEMOHON';

  // Penandatangan
  const kepalaCabang = suratTugas.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = suratTugas.nup || adminSettings?.nup || '48199-KI';

  const renzaUser = usersList?.find(u => u.username === 'renza' || u.name?.toUpperCase().includes('RENZA') || u.id === 'usr-renza') || {};
  const pembuatName = (adminSettings?.pembuatDaftarPds || (adminSettings?.pembuatDaftar !== 'Fitrian A,Md' ? adminSettings?.pembuatDaftar : null) || renzaUser.name || 'RENZA MUHARAM').toUpperCase();
  const pembuatNup = adminSettings?.nupPembuatDaftarPds || (adminSettings?.nupPembuatDaftar && adminSettings?.pembuatDaftar !== 'Fitrian A,Md' ? adminSettings.nupPembuatDaftar : null) || renzaUser.nup || '50382-KI';
  const pembuatDesc = `NUP.${pembuatNup}`;

  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';
  const pembuatSignature = adminSettings?.pembuatSignaturePdsUrl || adminSettings?.pembuatSignatureUrl || renzaUser.signatureUrl || '/signatures/pembuat_renza_signature.png';

  const fmtNum = (n) => {
    if (n === undefined || n === null || n === 0) return '-';
    return Number(n).toLocaleString('id-ID');
  };

  const fmtUsd = (n) => {
    if (n === undefined || n === null || n === 0) return '-';
    return Number(n).toLocaleString('en-US');
  };

  // Parsing nomor surat
  const cleanNomor = cleanDocNumber(suratTugas.nomor || '').trim();
  const slashIdx = cleanNomor.indexOf('/');
  const nomorPrefix = slashIdx !== -1 ? cleanNomor.substring(0, slashIdx).trim() : cleanNomor;
  const rawSuffix = slashIdx !== -1 ? cleanNomor.substring(slashIdx).trim() : '/SV.201/PK/KI-26';
  const nomorSuffix = rawSuffix.startsWith('/') ? rawSuffix : '/' + rawSuffix;
  const isDefaultA0 = !nomorPrefix || /^A[\s.]*0*$/i.test(nomorPrefix) || nomorPrefix === '-';

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Biaya_PDS_Luar_Negeri_${negaraTujuan}_${namaKapal.replace(/[\s,/-]+/g, '_')}_${namaSurveyor.replace(/[\s,/-]+/g, '_')}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Ekspor Excel Sesuai Persis dengan Gambar Spesimen
  // Ekspor Excel Sesuai Persis dengan Format & Spesimen Resmi (Rapi & Tidak Terpotong)
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'BKI Cabang Pontianak';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('PDS Luar Negeri', {
        views: [{ showGridLines: true }],
        pageSetup: {
          orientation: 'landscape',
          paperSize: 9, // A4
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: {
            left: 0.35, right: 0.35, top: 0.4, bottom: 0.4,
            header: 0.2, footer: 0.2
          }
        }
      });

      // Set lebar kolom yang proporsional & cukup luas agar tidak ada teks terpotong
      worksheet.columns = [
        { key: 'col1',  width: 7  },  // A:  NO
        { key: 'col2',  width: 22 },  // B:  NAMA SURVEYOR
        { key: 'col3',  width: 6  },  // C:  HR
        { key: 'col4',  width: 6  },  // D:  MLM
        { key: 'col5',  width: 8  },  // E:  HR LBR
        { key: 'col6',  width: 16 },  // F:  TGL BERANGKAT
        { key: 'col7',  width: 16 },  // G:  TGL KEMBALI
        { key: 'col8',  width: 14 },  // H:  TIKET PESAWAT
        { key: 'col9',  width: 14 },  // I:  ASAL TUJUAN DLM
        { key: 'col10', width: 14 },  // J:  ASAL TUJUAN LUAR
        { key: 'col11', width: 10 },  // K:  U.HR 11
        { key: 'col12', width: 13 },  // L:  TOTAL U.HR 12
        { key: 'col13', width: 10 },  // M:  HOTEL 13
        { key: 'col14', width: 13 },  // N:  TOTAL HOTEL 14
        { key: 'col15', width: 13 },  // O:  HR LBR 15
        { key: 'col16', width: 11 },  // P:  PAKAIAN DINGIN 16
        { key: 'col17', width: 14 },  // Q:  JUMLAH USD 17
        { key: 'col18', width: 16 },  // R:  JUMLAH TERIMA 18
        { key: 'col19', width: 14 }   // S:  TANDA TERIMA 19
      ];

      // ====== 1. HEADER DOKUMEN (Rows 1-5) ======
      // Row 1: LAMPIRAN SURAT TUGAS
      const r1 = worksheet.addRow([]);
      r1.height = 20;
      r1.getCell(1).value = 'LAMPIRAN SURAT TUGAS';
      r1.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`A${r1.number}:B${r1.number}`);

      // Row 2: No. A 0   /SV.201/PK/KI-26 : [TANGGAL MULAI]
      const r2 = worksheet.addRow([]);
      r2.height = 19;
      const noLabel = nomorPrefix ? (nomorPrefix.toLowerCase().startsWith('no') ? nomorPrefix : `No. ${nomorPrefix}`) : 'No. A 0';
      r2.getCell(1).value = `${noLabel}   ${nomorSuffix}`;
      r2.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`A${r2.number}:B${r2.number}`);

      r2.getCell(3).value = ':';
      r2.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
      r2.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

      r2.getCell(4).value = (tglMulaiStr || '').toUpperCase();
      r2.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
      r2.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`D${r2.number}:E${r2.number}`);

      // Row 3: DAFTAR BIAYA PERJALANAN DINAS KE : [NEGARA]
      const r3 = worksheet.addRow([]);
      r3.height = 19;
      r3.getCell(1).value = 'DAFTAR BIAYA PERJALANAN DINAS KE';
      r3.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`A${r3.number}:B${r3.number}`);

      r3.getCell(3).value = ':';
      r3.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
      r3.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

      r3.getCell(4).value = (negaraTujuan || '').toUpperCase();
      r3.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
      r3.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`D${r3.number}:H${r3.number}`);

      // Row 4: DALAM RANGKA SURVEY KLAS : [KAPAL]
      const r4 = worksheet.addRow([]);
      r4.height = 19;
      r4.getCell(1).value = 'DALAM RANGKA SURVEY KLAS';
      r4.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      r4.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`A${r4.number}:B${r4.number}`);

      r4.getCell(3).value = ':';
      r4.getCell(3).font = { name: 'Calibri', size: 10, bold: true };
      r4.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

      r4.getCell(4).value = (namaKapal || '').toUpperCase();
      r4.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
      r4.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`D${r4.number}:H${r4.number}`);

      // Row 5: SESUAI DAFTAR DAN KUITANSI TERLAMPIR
      const r5 = worksheet.addRow([]);
      r5.height = 19;
      r5.getCell(1).value = 'SESUAI DAFTAR DAN KUITANSI TERLAMPIR';
      r5.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      r5.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(`A${r5.number}:H${r5.number}`);

      // Row 6: Spacing Row
      const r6 = worksheet.addRow([]);
      r6.height = 10;

      // ====== 2. HEADER TABEL UTAMA (Rows 6, 7, 8) ======
      const h1 = worksheet.addRow([
        'NO.',
        'NAMA',
        'JUMLAH', '', '',
        'TANGGAL', '',
        'TRANSPORT', '', '',
        'UANG HARIAN (USD)', '',
        'UANG HOTEL (USD)', '',
        'HR LBR\n50%*U.HR\nUSD',
        'PAKAIAN\nDINGIN\n(USD)',
        'JUMLAH',
        'JUMLAH TERIMA',
        'TANDA TERIMA'
      ]);
      h1.height = 26;

      const h2 = worksheet.addRow([
        '', '',
        'HR', 'MLM', 'HR\nLBR',
        'BERANGKAT', 'KEMBALI',
        'TIKET\nPESAWAT.TAXI.DLL', 'ASAL\nTUJUAN\nDLM', 'ASAL\nTUJUAN\nLUAR',
        '11', '12=11*3',
        '13', '14=13*4',
        '', '', '', '', ''
      ]);
      h2.height = 26;

      // Row 8: Formula Index Numbers (gunakan integer agar tidak muncul peringatan "Number stored as text")
      const h3 = worksheet.addRow([
        1, 2, 3, 4, 5, 6, 7,
        8, 9, 10, 11, '12=11*3', 13, '14=13*4',
        '15=5*11/50%', 16, '17=8+10+12+14+15+16', '18=16', 19
      ]);
      h3.height = 19;

      // Merge header cells
      worksheet.mergeCells(`A${h1.number}:A${h2.number}`);
      worksheet.mergeCells(`B${h1.number}:B${h2.number}`);
      worksheet.mergeCells(`C${h1.number}:E${h1.number}`);
      worksheet.mergeCells(`F${h1.number}:G${h1.number}`);
      worksheet.mergeCells(`H${h1.number}:J${h1.number}`);
      worksheet.mergeCells(`K${h1.number}:L${h1.number}`);
      worksheet.mergeCells(`M${h1.number}:N${h1.number}`);
      worksheet.mergeCells(`O${h1.number}:O${h2.number}`);
      worksheet.mergeCells(`P${h1.number}:P${h2.number}`);
      worksheet.mergeCells(`Q${h1.number}:Q${h2.number}`);
      worksheet.mergeCells(`R${h1.number}:R${h2.number}`);
      worksheet.mergeCells(`S${h1.number}:S${h2.number}`);

      const thinBorder = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      [h1, h2].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.font = { name: 'Calibri', size: 9, bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.border = thinBorder;
        });
      });

      h3.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 8, italic: true, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = thinBorder;
      });

      // ====== 3. DATA ROWS ======
      if (denganDalamNegeri) {
        // Row 9: Data Komponen Luar Negeri (USD)
        const rowLN = worksheet.addRow([
          1,
          namaSurveyor,
          hr,
          mlm,
          hrLbr > 0 ? hrLbr : '-',
          tglMulaiStr,
          tglSelesaiStr,
          tiketLuarUsd > 0 ? tiketLuarUsd : '-',
          '-',
          asalTujuanLuarUsd > 0 ? asalTujuanLuarUsd : 0,
          rateUangHarianUsd,
          totalUangHarianUsd,
          rateUangHotelUsd > 0 ? rateUangHotelUsd : '-',
          totalUangHotelUsd > 0 ? totalUangHotelUsd : '-',
          totalHariLiburUsd > 0 ? totalHariLiburUsd : '-',
          pakaianDinginUsd > 0 ? pakaianDinginUsd : '-',
          totalUsd,
          grandTotalIdr,
          ''
        ]);
        rowLN.height = 24;

        // Row 10: Banner DALAM NEGERI (Hijau Penuh Kolom C sampai Q)
        const rowBanner = worksheet.addRow([]);
        rowBanner.height = 20;
        rowBanner.getCell(3).value = 'DALAM NEGERI';

        // Row 11: Data Transit Dalam Negeri (IDR)
        const rowDN = worksheet.addRow([
          '', '',
          hrTransit > 0 ? hrTransit : '-',
          mlmTransit > 0 ? mlmTransit : '-',
          hrLbrTransit > 0 ? hrLbrTransit : '-',
          tglTransitMulaiStr,
          tglTransitSelesaiStr,
          tiketDlmIdr > 0 ? tiketDlmIdr : '-',
          asalTujuanDlmIdr > 0 ? asalTujuanDlmIdr : '-',
          '-',
          rateUangHarianDlm > 0 ? rateUangHarianDlm : '-',
          totalUangHarianDlm > 0 ? totalUangHarianDlm : '-',
          rateHotelDlm > 0 ? rateHotelDlm : '-',
          totalHotelDlm > 0 ? totalHotelDlm : '-',
          totalHrLiburDlm > 0 ? totalHrLiburDlm : '-',
          '-',
          totalTransitIdr,
          '', ''
        ]);
        rowDN.height = 24;

        // Merging data rows persis seperti dokumen cetak fisik
        worksheet.mergeCells(`A${rowLN.number}:A${rowDN.number}`); // No. (1)
        worksheet.mergeCells(`B${rowLN.number}:B${rowDN.number}`); // Nama Surveyor
        worksheet.mergeCells(`C${rowBanner.number}:Q${rowBanner.number}`); // Banner hijau DALAM NEGERI sepanjang kolom C-Q
        worksheet.mergeCells(`R${rowLN.number}:R${rowDN.number}`); // Grand Total Terima
        worksheet.mergeCells(`S${rowLN.number}:S${rowDN.number}`); // Tanda Terima

        // Berikan style, font, dan border pada semua cell data
        for (let r = rowLN.number; r <= rowDN.number; r++) {
          const rowObj = worksheet.getRow(r);
          for (let c = 1; c <= 19; c++) {
            const cell = rowObj.getCell(c);
            cell.border = thinBorder;
            cell.font = { name: 'Calibri', size: 9 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        }

        // Format khusus banner DALAM NEGERI
        const cellBanner = worksheet.getCell(`C${rowBanner.number}`);
        cellBanner.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF98C044' }
        };
        cellBanner.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
        cellBanner.alignment = { horizontal: 'center', vertical: 'middle' };

        // Number formatting & font bold
        rowLN.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
        rowLN.getCell(11).numFmt = '$#,##0';
        rowLN.getCell(12).numFmt = '$#,##0';
        rowLN.getCell(17).numFmt = '$#,##0';
        rowLN.getCell(17).font = { name: 'Calibri', size: 9.5, bold: true };

        const grandCell = worksheet.getCell(`R${rowLN.number}`);
        grandCell.numFmt = '#,##0';
        grandCell.font = { name: 'Calibri', size: 10, bold: true };
        grandCell.alignment = { horizontal: 'right', vertical: 'middle' };

        if (tiketDlmIdr > 0) {
          rowDN.getCell(8).numFmt = '#,##0';
          rowDN.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (asalTujuanDlmIdr > 0) {
          rowDN.getCell(9).numFmt = '#,##0';
          rowDN.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (rateUangHarianDlm > 0) {
          rowDN.getCell(11).numFmt = '#,##0';
          rowDN.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (totalUangHarianDlm > 0) {
          rowDN.getCell(12).numFmt = '#,##0';
          rowDN.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (rateHotelDlm > 0) {
          rowDN.getCell(13).numFmt = '#,##0';
          rowDN.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (totalHotelDlm > 0) {
          rowDN.getCell(14).numFmt = '#,##0';
          rowDN.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        if (totalHrLiburDlm > 0) {
          rowDN.getCell(15).numFmt = '#,##0';
          rowDN.getCell(15).alignment = { horizontal: 'right', vertical: 'middle' };
        }
        rowDN.getCell(17).numFmt = '#,##0';
        rowDN.getCell(17).font = { name: 'Calibri', size: 9.5, bold: true };
        rowDN.getCell(17).alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        // Tanpa Dalam Negeri: Hanya Row LN
        const rowLN = worksheet.addRow([
          1,
          namaSurveyor,
          hr,
          mlm,
          hrLbr > 0 ? hrLbr : '-',
          tglMulaiStr,
          tglSelesaiStr,
          tiketLuarUsd > 0 ? tiketLuarUsd : '-',
          '-',
          asalTujuanLuarUsd > 0 ? asalTujuanLuarUsd : 0,
          rateUangHarianUsd,
          totalUangHarianUsd,
          rateUangHotelUsd > 0 ? rateUangHotelUsd : '-',
          totalUangHotelUsd > 0 ? totalUangHotelUsd : '-',
          totalHariLiburUsd > 0 ? totalHariLiburUsd : '-',
          pakaianDinginUsd > 0 ? pakaianDinginUsd : '-',
          totalUsd,
          grandTotalIdr,
          ''
        ]);
        rowLN.height = 24;

        for (let c = 1; c <= 19; c++) {
          const cell = rowLN.getCell(c);
          cell.border = thinBorder;
          cell.font = { name: 'Calibri', size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        rowLN.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
        rowLN.getCell(11).numFmt = '$#,##0';
        rowLN.getCell(12).numFmt = '$#,##0';
        rowLN.getCell(17).numFmt = '$#,##0';
        rowLN.getCell(17).font = { name: 'Calibri', size: 9.5, bold: true };

        const grandCell = rowLN.getCell(18);
        grandCell.numFmt = '#,##0';
        grandCell.font = { name: 'Calibri', size: 10, bold: true };
        grandCell.alignment = { horizontal: 'right', vertical: 'middle' };
      }

      // ====== 4. FOOTER: KETERANGAN & BREAKDOWN KURS ======
      const rSpacing = worksheet.addRow([]);
      rSpacing.height = 12;

      // Row f1: KET & USD
      const f1 = worksheet.addRow([]);
      f1.height = 20;
      f1.getCell(1).value = 'KET :';
      f1.getCell(1).font = { name: 'Calibri', size: 9, bold: true };
      f1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      f1.getCell(2).value = keteranganKhusus;
      f1.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
      f1.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      worksheet.mergeCells(`B${f1.number}:L${f1.number}`);

      f1.getCell(13).value = 'USD :';
      f1.getCell(13).font = { name: 'Calibri', size: 9.5, bold: true };
      f1.getCell(13).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(`M${f1.number}:N${f1.number}`);

      f1.getCell(15).value = totalUsd;
      f1.getCell(15).font = { name: 'Calibri', size: 9.5, bold: true };
      f1.getCell(15).numFmt = '$#,##0';
      f1.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(`O${f1.number}:R${f1.number}`);

      // Row f2: KURS : [NILAI KURS]
      const f2 = worksheet.addRow([]);
      f2.height = 20;
      f2.getCell(13).value = 'KURS :';
      f2.getCell(13).font = { name: 'Calibri', size: 9.5, bold: true };
      f2.getCell(13).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(`M${f2.number}:N${f2.number}`);

      f2.getCell(15).value = kurs;
      f2.getCell(15).font = { name: 'Calibri', size: 9.5, bold: true };
      f2.getCell(15).numFmt = '#,##0';
      f2.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(`O${f2.number}:R${f2.number}`);

      // Row f3: Hasil Konversi USD ke IDR (dengan garis bawah pembatas)
      const f3 = worksheet.addRow([]);
      f3.height = 20;
      f3.getCell(15).value = konversiUsdKeIdr;
      f3.getCell(15).font = { name: 'Calibri', size: 9.5, bold: true };
      f3.getCell(15).numFmt = '#,##0';
      f3.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };
      f3.getCell(15).border = { bottom: { style: 'thin' } };
      worksheet.mergeCells(`O${f3.number}:R${f3.number}`);

      // Row f4: Jumlah Rp [GRAND TOTAL IDR]
      const f4 = worksheet.addRow([]);
      f4.height = 24;
      f4.getCell(12).value = 'Jumlah';
      f4.getCell(12).font = { name: 'Calibri', size: 11, bold: true };
      f4.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(`L${f4.number}:M${f4.number}`);

      f4.getCell(14).value = 'Rp';
      f4.getCell(14).font = { name: 'Calibri', size: 11, bold: true };
      f4.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };

      f4.getCell(15).value = grandTotalIdr;
      f4.getCell(15).font = { name: 'Calibri', size: 11, bold: true };
      f4.getCell(15).numFmt = '#,##0.00';
      f4.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.mergeCells(`O${f4.number}:R${f4.number}`);

      // ====== 5. TANDA TANGAN ======
      const rSigSpacing = worksheet.addRow([]);
      rSigSpacing.height = 14;

      // Row s1: Header kiri "Mengetahui" & kanan tanggal
      const s1 = worksheet.addRow([]);
      s1.height = 18;
      s1.getCell(2).value = 'Mengetahui';
      s1.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
      s1.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`B${s1.number}:G${s1.number}`);

      s1.getCell(15).value = `PONTIANAK, ${tglMulaiStr}`;
      s1.getCell(15).font = { name: 'Calibri', size: 9, bold: true };
      s1.getCell(15).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`O${s1.number}:S${s1.number}`);

      // Row s2: Jabatan kiri & kanan
      const s2 = worksheet.addRow([]);
      s2.height = 18;
      s2.getCell(2).value = 'Kepala Cabang Madya Klas Pontianak';
      s2.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
      s2.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`B${s2.number}:G${s2.number}`);

      s2.getCell(15).value = 'Pembuat Daftar';
      s2.getCell(15).font = { name: 'Calibri', size: 9, bold: true };
      s2.getCell(15).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`O${s2.number}:S${s2.number}`);

      // 4 baris kosong ruang tanda tangan
      for (let i = 0; i < 4; i++) {
        const gap = worksheet.addRow([]);
        gap.height = 16;
      }

      // Row s3: Nama penandatangan
      const s3 = worksheet.addRow([]);
      s3.height = 18;
      s3.getCell(2).value = kepalaCabang;
      s3.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true, underline: true };
      s3.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`B${s3.number}:G${s3.number}`);

      s3.getCell(15).value = pembuatName;
      s3.getCell(15).font = { name: 'Calibri', size: 9.5, bold: true, underline: true };
      s3.getCell(15).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`O${s3.number}:S${s3.number}`);

      // Row s4: NUP
      const s4 = worksheet.addRow([]);
      s4.height = 16;
      s4.getCell(2).value = `NUP.${nup}`;
      s4.getCell(2).font = { name: 'Calibri', size: 8.5 };
      s4.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`B${s4.number}:G${s4.number}`);

      s4.getCell(15).value = `NUP.${pembuatDesc.replace(/^NUP\.?\s*/i, '')}`;
      s4.getCell(15).font = { name: 'Calibri', size: 8.5 };
      s4.getCell(15).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells(`O${s4.number}:S${s4.number}`);

      // Render dan download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Biaya_PDS_Luar_Negeri_${negaraTujuan}_${namaKapal.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('File Excel PDS Luar Negeri berhasil diunduh!');
    } catch (err) {
      console.error('Error exporting Excel PDS Luar Negeri:', err);
      toast.error('Gagal mengekspor file Excel.');
    }
  };

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: isMobileScreen ? '100vw' : '1150px',
            width: isMobileScreen ? '100vw' : '98vw',
            maxHeight: isMobileScreen ? '100dvh' : '92vh',
            height: isMobileScreen ? '100dvh' : 'auto',
            background: '#ffffff',
            color: '#000000',
            borderRadius: isMobileScreen ? '0' : '12px',
            margin: isMobileScreen ? '0' : 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Toolbar */}
          <div
            className="modal-header"
            style={{
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              padding: isMobileScreen ? '0.65rem 0.75rem' : '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Globe size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: isMobileScreen ? '0.85rem' : '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                  Cetak Rincian Biaya PDS Luar Negeri (USD)
                </h4>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Tujuan: {negaraTujuan} | Kapal: {namaKapal} | Grand Total: {formatRupiah(grandTotalIdr)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0.6rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px'
                }}
              >
                <input
                  type="checkbox"
                  checked={withSignature}
                  onChange={(e) => setWithSignature(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>Tanda Tangan</span>
              </label>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExportExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
                title="Ekspor ke format Excel persis spesimen"
              >
                <FileSpreadsheet size={15} />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#0284c7', borderColor: '#0284c7' }}
              >
                <Printer size={15} />
                <span>Cetak / PDF</span>
              </button>

              <button className="btn btn-secondary btn-icon" onClick={onClose} type="button">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Sheet */}
          <div
            className="modal-body"
            style={{
              padding: isMobileScreen ? '0.75rem' : '1.5rem',
              overflowY: 'auto',
              flex: 1,
              background: '#f8fafc'
            }}
          >
            <div
              className="printable-sheet-wrapper"
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isFitToScreen ? 'center' : 'flex-start',
                overflowX: !isFitToScreen ? 'auto' : 'visible'
              }}
            >
              <div
                className="printable-sheet"
                style={{
                  border: isMobileScreen ? '1px solid #cbd5e1' : 'none',
                  padding: isMobileScreen ? '1.5rem 1rem' : '2.5rem 2rem',
                  borderRadius: '4px',
                  fontFamily: "'Arial', 'Segoe UI', sans-serif",
                  lineHeight: '1.35',
                  fontSize: '9pt',
                  background: '#ffffff',
                  color: '#000000',
                  boxSizing: 'border-box',
                  width: `${targetDocWidth}px`,
                  minWidth: `${targetDocWidth}px`,
                  zoom: isFitToScreen ? fitScale : 1
                }}
              >
                {/* Header Dokumen Lampiran Surat Tugas */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>
                    <table style={{ width: 'auto', borderCollapse: 'collapse', lineHeight: '1.5' }}>
                      <tbody>
                        <tr>
                          <td colSpan={3} style={{ whiteSpace: 'nowrap', paddingBottom: '0.15rem', fontWeight: 'bold' }}>
                            LAMPIRAN SURAT TUGAS
                          </td>
                        </tr>
                        <tr>
                          <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <span>No.&nbsp;</span>
                              <span style={{ display: 'inline-block', textAlign: 'left', minWidth: isDefaultA0 ? '50px' : 'auto' }}>
                                {nomorPrefix || (isDefaultA0 ? 'A 0' : <span>&nbsp;</span>)}
                              </span>
                              <span style={{ paddingLeft: isDefaultA0 ? '1.5rem' : '0.35rem' }}>{nomorSuffix}</span>
                            </span>
                          </td>
                          <td style={{ width: '15px', textAlign: 'center' }}>:</td>
                          <td style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{tglMulaiStr}</td>
                        </tr>
                        <tr>
                          <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>DAFTAR BIAYA PERJALANAN DINAS KE</td>
                          <td style={{ textAlign: 'center', width: '15px' }}>:</td>
                          <td style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{negaraTujuan}</td>
                        </tr>
                        <tr>
                          <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>DALAM RANGKA SURVEY KLAS</td>
                          <td style={{ textAlign: 'center', width: '15px' }}>:</td>
                          <td style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{namaKapal}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} style={{ paddingTop: '0.35rem', letterSpacing: '0.01em', fontWeight: 'bold' }}>
                            SESUAI DAFTAR DAN KUITANSI TERLAMPIR
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '0.5rem' }}>
                    <BKILogo height={46} />
                  </div>
                </div>

                {/* TABEL 19 KOLOM PERSIS EXCEL SPESIMEN */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1.5px solid black',
                    fontSize: '8.2pt',
                    textAlign: 'center'
                  }}
                >
                  <thead>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '5px 2px', width: '3%' }}>NO.</th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '5px 3px', width: '10%' }}>NAMA</th>
                      <th colSpan={3} style={{ border: '1px solid black', padding: '5px' }}>JUMLAH</th>
                      <th colSpan={2} style={{ border: '1px solid black', padding: '5px' }}>TANGGAL</th>
                      <th colSpan={3} style={{ border: '1px solid black', padding: '5px' }}>TRANSPORT</th>
                      <th colSpan={2} style={{ border: '1px solid black', padding: '5px' }}>UANG HARIAN (USD)</th>
                      <th colSpan={2} style={{ border: '1px solid black', padding: '5px' }}>UANG HOTEL (USD)</th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '5px 2px', width: '5.5%' }}>
                        HR LBR<br />50%*U.HR<br />USD
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '5px 2px', width: '5.5%' }}>
                        PAKAIAN<br />DINGIN<br />(USD)
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '5px 2px', width: '6.5%' }}>
                        JUMLAH
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '5px 2px', width: '8.5%' }}>
                        JUMLAH TERIMA
                      </th>
                      <th rowSpan={2} style={{ border: '1px solid black', padding: '5px 2px', width: '10%' }}>
                        TANDA TERIMA
                      </th>
                    </tr>
                    <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      {/* JUMLAH */}
                      <th style={{ border: '1px solid black', padding: '3px', width: '2.5%' }}>HR</th>
                      <th style={{ border: '1px solid black', padding: '3px', width: '2.5%' }}>MLM</th>
                      <th style={{ border: '1px solid black', padding: '3px', width: '3.5%' }}>HR LBR</th>
                      {/* TANGGAL */}
                      <th style={{ border: '1px solid black', padding: '3px', width: '6.5%' }}>BERANGKAT</th>
                      <th style={{ border: '1px solid black', padding: '3px', width: '6.5%' }}>KEMBALI</th>
                      {/* TRANSPORT */}
                      <th style={{ border: '1px solid black', padding: '3px', width: '6.5%' }}>TIKET PESAWAT.TAXI.DLL</th>
                      <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>ASAL TUJUAN DLM</th>
                      <th style={{ border: '1px solid black', padding: '3px', width: '6%' }}>ASAL TUJUAN LUAR</th>
                      {/* UANG HARIAN */}
                      <th style={{ border: '1px solid black', padding: '3px', width: '4%' }}>11</th>
                      <th style={{ border: '1px solid black', padding: '3px', width: '5%' }}>12=11*3</th>
                      {/* UANG HOTEL */}
                      <th style={{ border: '1px solid black', padding: '3px', width: '4%' }}>13</th>
                      <th style={{ border: '1px solid black', padding: '3px', width: '5%' }}>14=13*4</th>
                    </tr>
                    {/* INDICES ROW */}
                    <tr style={{ background: '#f1f5f9', fontSize: '7pt', fontStyle: 'italic', fontWeight: 'bold' }}>
                      <th style={{ border: '1px solid black', padding: '2px' }}>1</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>2</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>3</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>4</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>5</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>6</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>7</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>8</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>9</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>10</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>11</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>12=11*3</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>13</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>14=13*4</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>15=5*11/50%</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>16</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>17=8+10+12+14+15+16</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>18=16</th>
                      <th style={{ border: '1px solid black', padding: '2px' }}>19</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* BARIS 1: DATA LUAR NEGERI (USD) */}
                    <tr>
                      <td rowSpan={denganDalamNegeri ? 3 : 1} style={{ border: '1px solid black', padding: '6px 2px', fontWeight: 'bold' }}>1</td>
                      <td rowSpan={denganDalamNegeri ? 3 : 1} style={{ border: '1px solid black', padding: '6px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', lineHeight: '1.25' }}>
                        {namaSurveyor}
                      </td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{hr}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{mlm}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{hrLbr > 0 ? hrLbr : '-'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', fontSize: '7.5pt' }}>{tglMulaiStr}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', fontSize: '7.5pt' }}>{tglSelesaiStr}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{tiketLuarUsd > 0 ? fmtUsd(tiketLuarUsd) : '-'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{asalTujuanLuarUsd > 0 ? fmtUsd(asalTujuanLuarUsd) : '0'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'right' }}>{fmtUsd(rateUangHarianUsd)}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'right' }}>{fmtUsd(totalUangHarianUsd)}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{rateUangHotelUsd > 0 ? fmtUsd(rateUangHotelUsd) : '-'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{totalUangHotelUsd > 0 ? fmtUsd(totalUangHotelUsd) : '-'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{totalHariLiburUsd > 0 ? fmtUsd(totalHariLiburUsd) : '-'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{pakaianDinginUsd > 0 ? fmtUsd(pakaianDinginUsd) : '-'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                        ${fmtUsd(totalUsd)}
                      </td>
                      <td rowSpan={denganDalamNegeri ? 3 : 1} style={{ border: '1px solid black', padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                        {fmtNum(grandTotalIdr)}
                      </td>
                      <td rowSpan={denganDalamNegeri ? 3 : 1} style={{ border: '1px solid black', padding: '6px 2px' }}></td>
                    </tr>

                    {/* JIKA DENGAN DALAM NEGERI: RENDER BARIS 2 (BANNER) & BARIS 3 (DATA TRANSIT IDR) */}
                    {denganDalamNegeri && (
                      <>
                        {/* BARIS 2: BANNER DALAM NEGERI (WARNA HIJAU) */}
                        <tr>
                          <td colSpan={15} style={{ border: '1px solid black', background: '#98c044', color: '#000000', fontWeight: 'bold', letterSpacing: '0.05em', padding: '3px' }}>
                            DALAM NEGERI
                          </td>
                        </tr>

                        {/* BARIS 3: DATA TRANSIT DALAM NEGERI (IDR) */}
                        <tr>
                          <td style={{ border: '1px solid black', padding: '5px 2px' }}>{hrTransit > 0 ? hrTransit : '-'}</td>
                          <td style={{ border: '1px solid black', padding: '5px 2px' }}>{mlmTransit > 0 ? mlmTransit : '-'}</td>
                          <td style={{ border: '1px solid black', padding: '5px 2px' }}>{hrLbrTransit > 0 ? hrLbrTransit : '-'}</td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', fontSize: '7.5pt' }}>{tglTransitMulaiStr}</td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', fontSize: '7.5pt' }}>{tglTransitSelesaiStr}</td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: tiketDlmIdr > 0 ? 'right' : 'center' }}>
                            {tiketDlmIdr > 0 ? fmtNum(tiketDlmIdr) : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: asalTujuanDlmIdr > 0 ? 'right' : 'center' }}>
                            {asalTujuanDlmIdr > 0 ? fmtNum(asalTujuanDlmIdr) : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: rateUangHarianDlm > 0 ? 'right' : 'center' }}>
                            {rateUangHarianDlm > 0 ? fmtNum(rateUangHarianDlm) : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: totalUangHarianDlm > 0 ? 'right' : 'center' }}>
                            {totalUangHarianDlm > 0 ? fmtNum(totalUangHarianDlm) : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: rateHotelDlm > 0 ? 'right' : 'center' }}>
                            {rateHotelDlm > 0 ? fmtNum(rateHotelDlm) : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: totalHotelDlm > 0 ? 'right' : 'center' }}>
                            {totalHotelDlm > 0 ? fmtNum(totalHotelDlm) : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: totalHrLiburDlm > 0 ? 'right' : 'center' }}>
                            {totalHrLiburDlm > 0 ? fmtNum(totalHrLiburDlm) : '-'}
                          </td>
                          <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                          <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                            {fmtNum(totalTransitIdr)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                {/* FOOTER: KETERANGAN & BREAKDOWN KURS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '1.25rem', fontSize: '8.5pt' }}>
                  <div style={{ maxWidth: '48%' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', fontWeight: 'bold' }}>
                      <span>KET :</span>
                      <span>{keteranganKhusus}</span>
                    </div>
                  </div>

                  <div style={{ minWidth: '320px', textAlign: 'right' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '9pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', width: '50%' }}>USD :</td>
                          <td style={{ fontWeight: 'bold' }}>${fmtUsd(totalUsd)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>KURS :</td>
                          <td style={{ fontWeight: 'bold' }}>{fmtNum(kurs)}</td>
                        </tr>
                        <tr>
                          <td></td>
                          <td style={{ fontWeight: 'bold', borderBottom: '1px solid black' }}>{fmtNum(konversiUsdKeIdr)}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold', fontSize: '10pt', paddingTop: '0.4rem', textAlign: 'center' }}>Jumlah</td>
                          <td style={{ fontWeight: 'bold', fontSize: '10.5pt', paddingTop: '0.4rem' }}>
                            Rp {grandTotalIdr.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TANDA TANGAN */}
                {/* TANDA TANGAN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '1.75rem', breakInside: 'avoid', fontSize: '9pt' }}>
                  <div style={{ textAlign: 'center', width: '280px', position: 'relative' }}>
                    <div style={{ marginBottom: '0.15rem' }}>Mengetahui</div>
                    <div style={{ fontWeight: 'bold', fontSize: '9pt', lineHeight: '1.3' }}>
                      Kepala Cabang Madya Klas Pontianak
                    </div>
                    <div style={{ position: 'relative', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', margin: '4px 0' }}>
                      {withSignature && isValidSignature(kacabSignature) ? (
                        <img
                          src={kacabSignature}
                          alt="TTD Kepala Cabang"
                          style={{
                            height: '52px',
                            maxHeight: '55px',
                            maxWidth: '160px',
                            width: 'auto',
                            objectFit: 'contain',
                            imageRendering: '-webkit-optimize-contrast'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                    </div>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '9.5pt' }}>
                      {kepalaCabang}
                    </div>
                    <div style={{ fontSize: '8.5pt' }}>
                      NUP.{nup}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', width: '280px', marginLeft: 'auto', position: 'relative' }}>
                    <div style={{ marginBottom: '0.15rem' }}>
                      PONTIANAK, {tglMulaiStr}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '9pt', lineHeight: '1.3' }}>
                      Pembuat Daftar
                    </div>
                    <div style={{ position: 'relative', height: '62px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', margin: '4px 0' }}>
                      {withSignature && isValidSignature(pembuatSignature) ? (
                        <img
                          src={pembuatSignature}
                          alt="TTD Pembuat Daftar"
                          style={{
                            height: '50px',
                            maxHeight: '55px',
                            maxWidth: '150px',
                            width: 'auto',
                            objectFit: 'contain',
                            imageRendering: '-webkit-optimize-contrast'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                    </div>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '9.5pt' }}>
                      {pembuatName}
                    </div>
                    <div style={{ fontSize: '8.5pt', minHeight: '14px' }}>
                      {pembuatDesc}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print Style Khusus A4 Landscape */}
          <style>{`
            @media screen {
              .print-only-modal-overlay {
                display: flex !important;
              }
            }

            @media print {
              @page { 
                size: A4 landscape !important; 
                margin: 8mm 10mm 8mm 10mm !important; 
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              html, body { 
                background: #ffffff !important; 
                color: #000000 !important; 
                margin: 0 !important; 
                padding: 0 !important; 
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
              }

              /* Sembunyikan elemen background web & toolbar modal */
              #root,
              .app-container-v2,
              .sidebar,
              .sidebar-container,
              .app-header,
              .header-v2,
              .no-print,
              .guidance-banner,
              .modal-header,
              .modal-footer { 
                display: none !important; 
              }

              .modal-overlay.print-only-modal-overlay { 
                position: static !important; 
                display: block !important;
                background: transparent !important; 
                padding: 0 !important; 
                margin: 0 !important;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
              }

              .modal-content { 
                position: static !important;
                display: block !important;
                max-width: 100% !important; 
                width: 100% !important; 
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important; 
                box-shadow: none !important; 
                background: transparent !important;
              }

              .modal-body { 
                display: block !important;
                padding: 0 !important; 
                margin: 0 !important;
                background: transparent !important;
                overflow: visible !important; 
                width: 100% !important;
              }

              .printable-sheet-wrapper { 
                display: block !important; 
                width: 100% !important; 
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important; 
              }

              .printable-sheet { 
                display: block !important;
                padding: 0 !important; 
                width: 100% !important; 
                max-width: 100% !important;
                min-width: 0 !important; 
                zoom: 1 !important; 
                transform: none !important; 
                box-shadow: none !important; 
                border: none !important; 
                margin: 0 auto !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              table {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>
        </div>
      </div>
    </ModalPortal>
  );
};
