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

  // Komponen Transit IDR
  const tiketDlmIdr = Number(suratTugas.tiketDalamNegeri) || 0;
  const asalTujuanDlmIdr = suratTugas.asalTujuanDlm !== undefined ? Number(suratTugas.asalTujuanDlm) : 750000;
  const totalTransitIdr = Number(suratTugas.totalTransitIdr) || (tiketDlmIdr + asalTujuanDlmIdr);

  // Kurs & Konversi
  const kurs = Number(suratTugas.kursUsd) || 16640;
  const konversiUsdKeIdr = Number(suratTugas.konversiUsdKeIdr) || Math.round(totalUsd * kurs);
  const grandTotalIdr = Number(suratTugas.totalIdrTerima) || Number(suratTugas.jumlahEstimasi) || (konversiUsdKeIdr + totalTransitIdr);

  const keteranganKhusus = suratTugas.keteranganLain || 'TIKET, HOTEL DAN TAT DI LUAR NEGERI DITANGGUNG PEMOHON';

  // Penandatangan
  const kepalaCabang = suratTugas.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT';
  const nup = suratTugas.nup || adminSettings?.nup || '48199-KI';

  const pembuatUser = usersList?.find(u => (adminSettings?.pembuatDaftar && u.name === adminSettings.pembuatDaftar) || u.role === 'admin' || u.role === 'keuangan') || {};
  const pembuatName = (adminSettings?.pembuatDaftar || pembuatUser.name || 'RENZA MUHARAM').toUpperCase();
  const pembuatDesc = adminSettings?.nupPembuatDaftar ? `NUP.${adminSettings.nupPembuatDaftar}` : (pembuatUser.nup ? `NUP.${pembuatUser.nup}` : 'NUP.50382-KI');

  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';
  const pembuatSignature = adminSettings?.pembuatSignatureUrl || pembuatUser.signatureUrl || '/signatures/pembuat_renza_signature.png';

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
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('PDS Luar Negeri', {
        pageSetup: { orientation: 'landscape', paperSize: 9 }
      });

      // Set lebar kolom
      worksheet.columns = [
        { key: 'col1', width: 5 },   // NO
        { key: 'col2', width: 22 },  // NAMA
        { key: 'col3', width: 5 },   // HR
        { key: 'col4', width: 5 },   // MLM
        { key: 'col5', width: 6 },   // HR LBR
        { key: 'col6', width: 14 },  // TGL BERANGKAT
        { key: 'col7', width: 14 },  // TGL KEMBALI
        { key: 'col8', width: 15 },  // TIKET PESAWAT
        { key: 'col9', width: 14 },  // ASAL TUJUAN DLM
        { key: 'col10', width: 14 }, // ASAL TUJUAN LUAR
        { key: 'col11', width: 10 }, // U.HR 11
        { key: 'col12', width: 12 }, // TOTAL U.HR 12
        { key: 'col13', width: 10 }, // HOTEL 13
        { key: 'col14', width: 12 }, // TOTAL HOTEL 14
        { key: 'col15', width: 12 }, // HR LBR 15
        { key: 'col16', width: 11 }, // PAKAIAN DINGIN 16
        { key: 'col17', width: 14 }, // JUMLAH USD 17
        { key: 'col18', width: 16 }, // JUMLAH TERIMA 18
        { key: 'col19', width: 16 }  // TANDA TERIMA 19
      ];

      // Header Lampiran Surat Tugas (Rows 1-5)
      worksheet.addRow([`LAMPIRAN SURAT TUGAS No. ${nomorPrefix || 'A 0'}    ${nomorSuffix}`, '', '', '', '', tglMulaiStr]);
      worksheet.addRow([`DAFTAR BIAYA PERJALANAN DINAS KE`, ':', negaraTujuan]);
      worksheet.addRow([`DALAM RANGKA SURVEY KLAS`, ':', namaKapal]);
      worksheet.addRow([`SESUAI DAFTAR DAN KUITANSI TERLAMPIR`]);
      worksheet.addRow([]);

      worksheet.getCell('A1').font = { name: 'Calibri', size: 10, bold: true };
      worksheet.getCell('F1').font = { name: 'Calibri', size: 10, bold: true };
      worksheet.getCell('A2').font = { name: 'Calibri', size: 10, bold: true };
      worksheet.getCell('C2').font = { name: 'Calibri', size: 10, bold: true };
      worksheet.getCell('A3').font = { name: 'Calibri', size: 10, bold: true };
      worksheet.getCell('C3').font = { name: 'Calibri', size: 10, bold: true };
      worksheet.getCell('A4').font = { name: 'Calibri', size: 10, bold: true };

      // Header Table (Row 6 & 7)
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

      const h2 = worksheet.addRow([
        '', '',
        'HR', 'MLM', 'HR\nLBR',
        'BERANGKAT', 'KEMBALI',
        'TIKET\nPESAWAT.TAXI.DLL', 'ASAL\nTUJUAN\nDLM', 'ASAL\nTUJUAN\nLUAR',
        '11', '12=11*3',
        '13', '14=13*4',
        '', '', '', '', ''
      ]);

      // Row 8: Formula Index Numbers
      const h3 = worksheet.addRow([
        '1', '2', '3', '4', '5', '6', '7',
        '8', '9', '10', '11', '12=11*3', '13', '14=13*4',
        '15=5*11/50%', '16', '17=8+10+12+14+15+16', '18=16', '19'
      ]);

      // Merge header cells
      worksheet.mergeCells('A6:A7');
      worksheet.mergeCells('B6:B7');
      worksheet.mergeCells('C6:E6');
      worksheet.mergeCells('F6:G6');
      worksheet.mergeCells('H6:J6');
      worksheet.mergeCells('K6:L6');
      worksheet.mergeCells('M6:N6');
      worksheet.mergeCells('O6:O7');
      worksheet.mergeCells('P6:P7');
      worksheet.mergeCells('Q6:Q7');
      worksheet.mergeCells('R6:R7');
      worksheet.mergeCells('S6:S7');

      [h1, h2, h3].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.font = { name: 'Calibri', size: 9, bold: true };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      });

      // Row 9: Data Luar Negeri
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

      // Row 10: Banner DALAM NEGERI
      const rowBanner = worksheet.addRow([
        '', '', '', '', '', '', '',
        'DALAM NEGERI', '', '', '', '', '', '', '', '', '', '', ''
      ]);
      worksheet.mergeCells(`H10:Q10`);
      worksheet.mergeCells(`R9:R11`); // Merge Jumlah Terima across data rows
      worksheet.mergeCells(`A9:A11`); // Merge No
      worksheet.mergeCells(`B9:B11`); // Merge Nama
      worksheet.mergeCells(`S9:S11`); // Merge Tanda Terima

      // Row 11: Data Transit Dalam Negeri
      const rowDN = worksheet.addRow([
        '', '', '', '', '',
        tglTransitMulaiStr,
        tglTransitSelesaiStr,
        tiketDlmIdr > 0 ? tiketDlmIdr : '-',
        asalTujuanDlmIdr,
        '-',
        '-', '-', '-', '-', '-', '-',
        asalTujuanDlmIdr + tiketDlmIdr,
        '', ''
      ]);

      [rowLN, rowBanner, rowDN].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9 };
        });
      });

      // Style khusus baris banner hijau
      const bannerCell = worksheet.getCell('H10');
      bannerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF98C044' }
      };
      bannerCell.font = { name: 'Calibri', size: 10, bold: true };
      bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Number formats
      rowLN.getCell(11).numFmt = '$#,##0';
      rowLN.getCell(12).numFmt = '$#,##0';
      rowLN.getCell(17).numFmt = '$#,##0';
      rowLN.getCell(18).numFmt = '#,##0';
      rowLN.getCell(18).font = { name: 'Calibri', size: 10, bold: true };

      rowDN.getCell(9).numFmt = '#,##0';
      rowDN.getCell(17).numFmt = '#,##0';

      // Footer: Keterangan & Breakdown Konversi
      worksheet.addRow([]);
      const f1 = worksheet.addRow(['KET :', keteranganKhusus, '', '', '', '', '', '', '', 'USD', `$${totalUsd}`]);
      f1.getCell(10).font = { name: 'Calibri', size: 9, bold: true };
      f1.getCell(11).font = { name: 'Calibri', size: 9, bold: true };

      const f2 = worksheet.addRow(['', '', '', '', '', '', '', '', '', 'KURS', kurs]);
      f2.getCell(10).font = { name: 'Calibri', size: 9, bold: true };
      f2.getCell(11).font = { name: 'Calibri', size: 9, bold: true };
      f2.getCell(11).numFmt = '#,##0';

      const f3 = worksheet.addRow(['', '', '', '', '', '', '', '', '', '', konversiUsdKeIdr]);
      f3.getCell(11).font = { name: 'Calibri', size: 9, bold: true };
      f3.getCell(11).numFmt = '#,##0';

      const f4 = worksheet.addRow(['', '', '', '', '', '', '', 'Jumlah', '', '', 'Rp', grandTotalIdr]);
      worksheet.mergeCells(`H${worksheet.rowCount}:J${worksheet.rowCount}`);
      const jCell = worksheet.getCell(`H${worksheet.rowCount}`);
      jCell.font = { name: 'Calibri', size: 11, bold: true };
      jCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const totCell = worksheet.getCell(`L${worksheet.rowCount}`);
      totCell.font = { name: 'Calibri', size: 11, bold: true };
      totCell.numFmt = '#,##0.00';

      // Tanda Tangan
      worksheet.addRow([]);
      worksheet.addRow([]);
      const s1 = worksheet.addRow(['', 'Mengetahui', '', '', '', '', '', '', '', '', '', '', '', '', '', `PONTIANAK, ${tglMulaiStr}`]);
      const s2 = worksheet.addRow(['', 'Kepala Cabang Madya Klas Pontianak', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Pembuat Daftar']);
      s1.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
      s1.getCell(16).font = { name: 'Calibri', size: 9, bold: true };
      s2.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
      s2.getCell(16).font = { name: 'Calibri', size: 9, bold: true };

      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      const s3 = worksheet.addRow(['', kepalaCabang, '', '', '', '', '', '', '', '', '', '', '', '', '', pembuatName]);
      s3.getCell(2).font = { name: 'Calibri', size: 10, bold: true, underline: true };
      s3.getCell(16).font = { name: 'Calibri', size: 10, bold: true, underline: true };

      const s4 = worksheet.addRow(['', `NUP.${nup}`, '', '', '', '', '', '', '', '', '', '', '', '', '', `NUP.${pembuatDesc.replace('NUP.', '')}`]);
      s4.getCell(2).font = { name: 'Calibri', size: 9 };
      s4.getCell(16).font = { name: 'Calibri', size: 9 };

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
                          <td colSpan={3} style={{ whiteSpace: 'nowrap', paddingBottom: '0.15rem' }}>
                            LAMPIRAN SURAT TUGAS No. {nomorPrefix || 'A 0'} &nbsp;&nbsp; {nomorSuffix}
                          </td>
                          <td style={{ textAlign: 'right', paddingLeft: '3rem' }}>
                            {tglMulaiStr}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>DAFTAR BIAYA PERJALANAN DINAS KE</td>
                          <td style={{ textAlign: 'center', width: '15px' }}>:</td>
                          <td colSpan={2} style={{ fontWeight: 'bold' }}>{negaraTujuan}</td>
                        </tr>
                        <tr>
                          <td style={{ whiteSpace: 'nowrap', paddingRight: '0.75rem' }}>DALAM RANGKA SURVEY KLAS</td>
                          <td style={{ textAlign: 'center' }}>:</td>
                          <td colSpan={2} style={{ fontWeight: 'bold' }}>{namaKapal}</td>
                        </tr>
                        <tr>
                          <td colSpan={4} style={{ paddingTop: '0.35rem', letterSpacing: '0.01em' }}>SESUAI DAFTAR DAN KUITANSI TERLAMPIR</td>
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
                      <td rowSpan={3} style={{ border: '1px solid black', padding: '6px 2px', fontWeight: 'bold' }}>1</td>
                      <td rowSpan={3} style={{ border: '1px solid black', padding: '6px 3px', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', lineHeight: '1.25' }}>
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
                      <td rowSpan={3} style={{ border: '1px solid black', padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', fontSize: '9pt' }}>
                        {fmtNum(grandTotalIdr)}
                      </td>
                      <td rowSpan={3} style={{ border: '1px solid black', padding: '6px 2px' }}></td>
                    </tr>

                    {/* BARIS 2: BANNER DALAM NEGERI (WARNA HIJAU) */}
                    <tr>
                      <td colSpan={15} style={{ border: '1px solid black', background: '#98c044', color: '#000000', fontWeight: 'bold', letterSpacing: '0.05em', padding: '3px' }}>
                        DALAM NEGERI
                      </td>
                    </tr>

                    {/* BARIS 3: DATA TRANSIT DALAM NEGERI (IDR) */}
                    <tr>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', fontSize: '7.5pt' }}>{tglTransitMulaiStr}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', fontSize: '7.5pt' }}>{tglTransitSelesaiStr}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>{tiketDlmIdr > 0 ? fmtNum(tiketDlmIdr) : '-'}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'right' }}>{fmtNum(asalTujuanDlmIdr)}</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px' }}>-</td>
                      <td style={{ border: '1px solid black', padding: '5px 2px', textAlign: 'right', fontWeight: 'bold' }}>
                        {fmtNum(totalTransitIdr)}
                      </td>
                    </tr>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '2.5rem', breakInside: 'avoid', fontSize: '9.5pt' }}>
                  <div style={{ textAlign: 'center', width: '320px', position: 'relative' }}>
                    <div style={{ marginBottom: '0.2rem' }}>Mengetahui</div>
                    <div style={{ fontWeight: 'bold' }}>
                      Kepala Cabang Madya Klas Pontianak
                    </div>
                    <div style={{ position: 'relative', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                      {withSignature && isValidSignature(kacabSignature) ? (
                        <img
                          src={kacabSignature}
                          alt="TTD Kepala Cabang"
                          style={{
                            height: '90px',
                            maxHeight: '90px',
                            maxWidth: '250px',
                            width: 'auto',
                            objectFit: 'contain',
                            transform: 'scale(1.15)',
                            transformOrigin: 'center'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                    </div>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                      {kepalaCabang}
                    </div>
                    <div style={{ fontSize: '9pt' }}>
                      NUP.{nup}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', width: '320px', marginLeft: 'auto', position: 'relative' }}>
                    <div style={{ marginBottom: '0.2rem' }}>
                      PONTIANAK, {tglMulaiStr}
                    </div>
                    <div style={{ fontWeight: 'bold' }}>
                      Pembuat Daftar
                    </div>
                    <div style={{ position: 'relative', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                      {withSignature && isValidSignature(pembuatSignature) ? (
                        <img
                          src={pembuatSignature}
                          alt="TTD Pembuat Daftar"
                          style={{
                            height: '85px',
                            maxHeight: '90px',
                            maxWidth: '220px',
                            width: 'auto',
                            objectFit: 'contain'
                          }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                    </div>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline' }}>
                      {pembuatName}
                    </div>
                    <div style={{ fontSize: '9pt' }}>
                      {pembuatDesc}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
