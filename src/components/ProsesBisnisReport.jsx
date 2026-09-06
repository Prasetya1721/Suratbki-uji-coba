import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet, Printer, TrendingUp, DollarSign, Layers,
  Calendar, ArrowUpRight, BarChart3, Info, Eye, X, Download
} from 'lucide-react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import {
  KATEGORI_PROSES_BISNIS,
  PROSES_BISNIS_META,
  MONTH_NAMES,
  calculateProsesBisnisSummary
} from '../data/prosesBisnisConstants';
import { ModalPortal } from './ModalPortal';
import { ProsesBisnisPrintModal } from './ProsesBisnisPrintModal';

// Helper format angka ribuan dengan titik
const formatNumberId = (val) => {
  if (!val || isNaN(val) || val === 0) return '-';
  return Number(val).toLocaleString('id-ID');
};

const formatRupiah = (val) => {
  if (!val || isNaN(val) || val === 0) return 'Rp 0';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
};

export const ProsesBisnisReport = () => {
  const { notaDebit = [] } = useData();

  // Dapatkan daftar tahun yang tersedia dari data nota debit + default 2023, 2024, 2025, 2026
  const availableYears = useMemo(() => {
    const yearSet = new Set([2023, 2024, 2025, 2026]);
    const currentYear = new Date().getFullYear();
    yearSet.add(currentYear);

    (notaDebit || []).forEach((item) => {
      if (item.tanggalND) {
        const y = new Date(item.tanggalND).getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [notaDebit]);

  const [selectedYear, setSelectedYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    return availableYears.includes(currentYear) ? currentYear : 2023;
  });

  const [metricType, setMetricType] = useState('biayaSebelumPPN'); // 'biayaSebelumPPN' | 'totalSetelahPPN' | 'feeSurvey'

  // Modal drilldown detail transaksi
  const [drilldownModal, setDrilldownModal] = useState({
    isOpen: false,
    kategori: '',
    monthIdx: -1,
    items: [],
    amount: 0,
    count: 0
  });

  // Hitung summary matriks untuk tahun yang dipilih
  const summary = useMemo(() => {
    return calculateProsesBisnisSummary(notaDebit, selectedYear, metricType);
  }, [notaDebit, selectedYear, metricType]);

  // Handler klik sel untuk drilldown
  const handleCellClick = (kategori, monthIdx) => {
    const key = `${kategori}-${monthIdx}`;
    const items = summary.itemsByCell[key] || [];
    const amount = summary.revenueMatrix[kategori]?.[monthIdx] || 0;
    const count = summary.volumeMatrix[kategori]?.[monthIdx] || 0;

    if (count > 0 || items.length > 0) {
      setDrilldownModal({
        isOpen: true,
        kategori,
        monthIdx,
        items,
        amount,
        count
      });
    }
  };

  // Border helpers for Excel
  const THIN_BORDER = {
    top: { style: 'thin', color: { argb: '000000' } },
    bottom: { style: 'thin', color: { argb: '000000' } },
    left: { style: 'thin', color: { argb: '000000' } },
    right: { style: 'thin', color: { argb: '000000' } },
  };

  const DOUBLE_BOTTOM_BORDER = {
    top: { style: 'thin', color: { argb: '000000' } },
    bottom: { style: 'double', color: { argb: '000000' } },
    left: { style: 'thin', color: { argb: '000000' } },
    right: { style: 'thin', color: { argb: '000000' } },
  };

  // ── 1. EXPORT KHUSUS TABEL 1: NILAI PENDAPATAN / POTENSI PRODUKSI (RP) ──
  const handleExportRevenueTable = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'BKI Cabang Pontianak — Finance';
      wb.created = new Date();

      const ws = wb.addWorksheet(`PENDAPATAN ${selectedYear}`, {
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
        views: [{ showGridLines: true }]
      });

      ws.columns = [
        { width: 32 }, // A: Kategori
        { width: 16 }, // B: Januari
        { width: 16 }, // C: Februari
        { width: 16 }, // D: Maret
        { width: 16 }, // E: April
        { width: 16 }, // F: Mei
        { width: 16 }, // G: Juni
        { width: 16 }, // H: Juli
        { width: 16 }, // I: Agustus
        { width: 16 }, // J: September
        { width: 16 }, // K: Oktober
        { width: 16 }, // L: November
        { width: 16 }, // M: Desember
        { width: 20 }, // N: Total Tahunan
      ];

      // Header Judul
      ws.mergeCells('A2:N2');
      const t1Title = ws.getCell('A2');
      t1Title.value = `PROSES BISNIS / POTENSI PRODUKSI ${selectedYear} (NILAI PENDAPATAN RUPIAH)`;
      t1Title.font = { name: 'Calibri', size: 12, bold: true };
      t1Title.alignment = { horizontal: 'center', vertical: 'middle' };
      t1Title.border = THIN_BORDER;
      ws.getRow(2).height = 24;

      // Header Bulan
      const r3 = ws.getRow(3);
      r3.height = 20;
      r3.getCell(1).value = 'KATEGORI';
      r3.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      r3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r3.getCell(1).border = THIN_BORDER;

      MONTH_NAMES.forEach((m, idx) => {
        const c = r3.getCell(idx + 2);
        c.value = m;
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = THIN_BORDER;
      });

      const totalHeaderCell1 = r3.getCell(14);
      totalHeaderCell1.value = 'TOTAL TAHUNAN';
      totalHeaderCell1.font = { name: 'Calibri', size: 10, bold: true };
      totalHeaderCell1.alignment = { horizontal: 'center', vertical: 'middle' };
      totalHeaderCell1.border = THIN_BORDER;

      // Data Baris Kategori
      let rowIdx = 4;
      KATEGORI_PROSES_BISNIS.forEach((kat) => {
        const meta = PROSES_BISNIS_META[kat];
        const row = ws.getRow(rowIdx);
        row.height = 20;

        const catCell = row.getCell(1);
        catCell.value = kat;
        catCell.font = { name: 'Calibri', size: 10, bold: true };
        catCell.alignment = { horizontal: 'left', vertical: 'middle' };
        catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meta.excelColor } };
        catCell.border = THIN_BORDER;

        for (let m = 0; m < 12; m++) {
          const val = summary.revenueMatrix[kat]?.[m] || 0;
          const valCell = row.getCell(m + 2);
          if (val > 0) {
            valCell.value = val;
            valCell.numFmt = '#,##0';
          } else {
            valCell.value = '-';
          }
          valCell.font = { name: 'Calibri', size: 10 };
          valCell.alignment = { horizontal: 'right', vertical: 'middle' };
          valCell.border = THIN_BORDER;
        }

        const totalKatCell = row.getCell(14);
        const katTotal = summary.yearlyRevenueByCategory[kat] || 0;
        totalKatCell.value = katTotal > 0 ? katTotal : '-';
        if (katTotal > 0) totalKatCell.numFmt = '#,##0';
        totalKatCell.font = { name: 'Calibri', size: 10, bold: true };
        totalKatCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalKatCell.border = THIN_BORDER;

        rowIdx++;
      });

      // Row Total Pendapatan
      const totalPendapatanRow = ws.getRow(rowIdx);
      totalPendapatanRow.height = 22;
      const pendLabel = totalPendapatanRow.getCell(1);
      pendLabel.value = `PENDAPATAN ${selectedYear}`;
      pendLabel.font = { name: 'Calibri', size: 10, bold: true };
      pendLabel.alignment = { horizontal: 'left', vertical: 'middle' };
      pendLabel.border = DOUBLE_BOTTOM_BORDER;

      for (let m = 0; m < 12; m++) {
        const mTotal = summary.monthlyRevenueTotals[m] || 0;
        const c = totalPendapatanRow.getCell(m + 2);
        if (mTotal > 0) {
          c.value = mTotal;
          c.numFmt = '#,##0';
        } else {
          c.value = '-';
        }
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'right', vertical: 'middle' };
        c.border = DOUBLE_BOTTOM_BORDER;
      }

      const grandTotalCell = totalPendapatanRow.getCell(14);
      grandTotalCell.value = summary.grandTotalRevenue;
      grandTotalCell.numFmt = '#,##0';
      grandTotalCell.font = { name: 'Calibri', size: 10, bold: true };
      grandTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
      grandTotalCell.border = DOUBLE_BOTTOM_BORDER;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PROSES_BISNIS_PENDAPATAN_${selectedYear}_BKI_PONTIANAK.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Excel Tabel 1 (Nilai Pendapatan ${selectedYear}) berhasil diunduh!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengekspor Excel Tabel 1');
    }
  };

  // ── 2. EXPORT KHUSUS TABEL 2: VOLUME / JUMLAH TRANSAKSI (UNIT PRODUKSI) ──
  const handleExportVolumeTable = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'BKI Cabang Pontianak — Finance';
      wb.created = new Date();

      const ws = wb.addWorksheet(`VOLUME ${selectedYear}`, {
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
        views: [{ showGridLines: true }]
      });

      ws.columns = [
        { width: 32 }, // A: Kategori
        { width: 16 }, // B: Januari
        { width: 16 }, // C: Februari
        { width: 16 }, // D: Maret
        { width: 16 }, // E: April
        { width: 16 }, // F: Mei
        { width: 16 }, // G: Juni
        { width: 16 }, // H: Juli
        { width: 16 }, // I: Agustus
        { width: 16 }, // J: September
        { width: 16 }, // K: Oktober
        { width: 16 }, // L: November
        { width: 16 }, // M: Desember
        { width: 18 }, // N: Total Produksi
      ];

      // Header Judul
      ws.mergeCells('A2:N2');
      const t2Title = ws.getCell('A2');
      t2Title.value = `PROSES BISNIS / POTENSI PRODUKSI ${selectedYear} (VOLUME / JUMLAH TRANSAKSI)`;
      t2Title.font = { name: 'Calibri', size: 12, bold: true };
      t2Title.alignment = { horizontal: 'center', vertical: 'middle' };
      t2Title.border = THIN_BORDER;
      ws.getRow(2).height = 24;

      // Header Bulan
      const rMonths2 = ws.getRow(3);
      rMonths2.height = 20;
      rMonths2.getCell(1).value = 'KATEGORI';
      rMonths2.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      rMonths2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      rMonths2.getCell(1).border = THIN_BORDER;

      MONTH_NAMES.forEach((m, idx) => {
        const c = rMonths2.getCell(idx + 2);
        c.value = m;
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = THIN_BORDER;
      });

      const totalHeaderCell2 = rMonths2.getCell(14);
      totalHeaderCell2.value = 'TOTAL PRODUKSI';
      totalHeaderCell2.font = { name: 'Calibri', size: 10, bold: true };
      totalHeaderCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      totalHeaderCell2.border = THIN_BORDER;

      // Data Baris Kategori
      let rowIdx = 4;
      KATEGORI_PROSES_BISNIS.forEach((kat) => {
        const meta = PROSES_BISNIS_META[kat];
        const row = ws.getRow(rowIdx);
        row.height = 20;

        const catCell = row.getCell(1);
        catCell.value = kat;
        catCell.font = { name: 'Calibri', size: 10, bold: true };
        catCell.alignment = { horizontal: 'left', vertical: 'middle' };
        catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meta.excelColor } };
        catCell.border = THIN_BORDER;

        for (let m = 0; m < 12; m++) {
          const val = summary.volumeMatrix[kat]?.[m] || 0;
          const valCell = row.getCell(m + 2);
          valCell.value = val > 0 ? val : '-';
          valCell.font = { name: 'Calibri', size: 10 };
          valCell.alignment = { horizontal: 'center', vertical: 'middle' };
          valCell.border = THIN_BORDER;
        }

        const totalVolCell = row.getCell(14);
        const katVolTotal = summary.yearlyVolumeByCategory[kat] || 0;
        totalVolCell.value = katVolTotal > 0 ? katVolTotal : '-';
        totalVolCell.font = { name: 'Calibri', size: 10, bold: true };
        totalVolCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalVolCell.border = THIN_BORDER;

        rowIdx++;
      });

      // Row Total Volume
      const totalVolumeRow = ws.getRow(rowIdx);
      totalVolumeRow.height = 22;
      const volLabel = totalVolumeRow.getCell(1);
      volLabel.value = `TOTAL PRODUKSI ${selectedYear}`;
      volLabel.font = { name: 'Calibri', size: 10, bold: true };
      volLabel.alignment = { horizontal: 'left', vertical: 'middle' };
      volLabel.border = DOUBLE_BOTTOM_BORDER;

      for (let m = 0; m < 12; m++) {
        const mVolTotal = summary.monthlyVolumeTotals[m] || 0;
        const c = totalVolumeRow.getCell(m + 2);
        c.value = mVolTotal > 0 ? mVolTotal : '-';
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = DOUBLE_BOTTOM_BORDER;
      }

      const grandTotalVolCell = totalVolumeRow.getCell(14);
      grandTotalVolCell.value = summary.grandTotalVolume;
      grandTotalVolCell.font = { name: 'Calibri', size: 10, bold: true };
      grandTotalVolCell.alignment = { horizontal: 'center', vertical: 'middle' };
      grandTotalVolCell.border = DOUBLE_BOTTOM_BORDER;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PROSES_BISNIS_VOLUME_${selectedYear}_BKI_PONTIANAK.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Excel Tabel 2 (Volume Transaksi ${selectedYear}) berhasil diunduh!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengekspor Excel Tabel 2');
    }
  };

  // ── 3. EXPORT KEDUA TABEL SEKALIGUS (FORMAT EXCEL ASLI USER) ──
  const handleExportAllTables = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'BKI Cabang Pontianak — Finance';
      wb.created = new Date();

      const ws = wb.addWorksheet(`PROSES BISNIS ${selectedYear}`, {
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
        views: [{ showGridLines: true }]
      });

      ws.columns = [
        { width: 32 }, // A: Kategori
        { width: 16 }, // B: Januari
        { width: 16 }, // C: Februari
        { width: 16 }, // D: Maret
        { width: 16 }, // E: April
        { width: 16 }, // F: Mei
        { width: 16 }, // G: Juni
        { width: 16 }, // H: Juli
        { width: 16 }, // I: Agustus
        { width: 16 }, // J: September
        { width: 16 }, // K: Oktober
        { width: 16 }, // L: November
        { width: 16 }, // M: Desember
        { width: 18 }, // N: Total Tahunan
      ];

      // ==========================================
      // TABEL 1: PENDAPATAN / POTENSI PRODUKSI (RP)
      // ==========================================
      ws.mergeCells('A2:N2');
      const t1Title = ws.getCell('A2');
      t1Title.value = `PROSES BISNIS / POTENSI PRODUKSI ${selectedYear}`;
      t1Title.font = { name: 'Calibri', size: 11, bold: true };
      t1Title.alignment = { horizontal: 'center', vertical: 'middle' };
      t1Title.border = THIN_BORDER;
      ws.getRow(2).height = 22;

      const r3 = ws.getRow(3);
      r3.height = 20;
      r3.getCell(1).value = '';
      r3.getCell(1).border = THIN_BORDER;

      MONTH_NAMES.forEach((m, idx) => {
        const c = r3.getCell(idx + 2);
        c.value = m;
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = THIN_BORDER;
      });

      const totalHeaderCell1 = r3.getCell(14);
      totalHeaderCell1.value = 'TOTAL';
      totalHeaderCell1.font = { name: 'Calibri', size: 10, bold: true };
      totalHeaderCell1.alignment = { horizontal: 'center', vertical: 'middle' };
      totalHeaderCell1.border = THIN_BORDER;

      let rowIdx = 4;
      KATEGORI_PROSES_BISNIS.forEach((kat) => {
        const meta = PROSES_BISNIS_META[kat];
        const row = ws.getRow(rowIdx);
        row.height = 20;

        const catCell = row.getCell(1);
        catCell.value = kat;
        catCell.font = { name: 'Calibri', size: 10, bold: true };
        catCell.alignment = { horizontal: 'left', vertical: 'middle' };
        catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meta.excelColor } };
        catCell.border = THIN_BORDER;

        for (let m = 0; m < 12; m++) {
          const val = summary.revenueMatrix[kat]?.[m] || 0;
          const valCell = row.getCell(m + 2);
          if (val > 0) {
            valCell.value = val;
            valCell.numFmt = '#,##0';
          } else {
            valCell.value = '-';
          }
          valCell.font = { name: 'Calibri', size: 10 };
          valCell.alignment = { horizontal: 'right', vertical: 'middle' };
          valCell.border = THIN_BORDER;
        }

        const totalKatCell = row.getCell(14);
        const katTotal = summary.yearlyRevenueByCategory[kat] || 0;
        totalKatCell.value = katTotal > 0 ? katTotal : '-';
        if (katTotal > 0) totalKatCell.numFmt = '#,##0';
        totalKatCell.font = { name: 'Calibri', size: 10, bold: true };
        totalKatCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalKatCell.border = THIN_BORDER;

        rowIdx++;
      });

      const totalPendapatanRow = ws.getRow(rowIdx);
      totalPendapatanRow.height = 22;
      const pendLabel = totalPendapatanRow.getCell(1);
      pendLabel.value = `PENDAPATAN ${selectedYear}`;
      pendLabel.font = { name: 'Calibri', size: 10, bold: true };
      pendLabel.alignment = { horizontal: 'left', vertical: 'middle' };
      pendLabel.border = DOUBLE_BOTTOM_BORDER;

      for (let m = 0; m < 12; m++) {
        const mTotal = summary.monthlyRevenueTotals[m] || 0;
        const c = totalPendapatanRow.getCell(m + 2);
        if (mTotal > 0) {
          c.value = mTotal;
          c.numFmt = '#,##0';
        } else {
          c.value = '-';
        }
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'right', vertical: 'middle' };
        c.border = DOUBLE_BOTTOM_BORDER;
      }

      const grandTotalCell = totalPendapatanRow.getCell(14);
      grandTotalCell.value = summary.grandTotalRevenue;
      grandTotalCell.numFmt = '#,##0';
      grandTotalCell.font = { name: 'Calibri', size: 10, bold: true };
      grandTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
      grandTotalCell.border = DOUBLE_BOTTOM_BORDER;

      // ==========================================
      // TABEL 2: JUMLAH / VOLUME TRANSAKSI
      // ==========================================
      rowIdx += 4;

      ws.mergeCells(`A${rowIdx}:N${rowIdx}`);
      const t2Title = ws.getCell(`A${rowIdx}`);
      t2Title.value = `PROSES BISNIS / POTENSI PRODUKSI ${selectedYear}`;
      t2Title.font = { name: 'Calibri', size: 11, bold: true };
      t2Title.alignment = { horizontal: 'center', vertical: 'middle' };
      t2Title.border = THIN_BORDER;
      ws.getRow(rowIdx).height = 22;

      rowIdx++;
      const rMonths2 = ws.getRow(rowIdx);
      rMonths2.height = 20;
      rMonths2.getCell(1).value = '';
      rMonths2.getCell(1).border = THIN_BORDER;

      MONTH_NAMES.forEach((m, idx) => {
        const c = rMonths2.getCell(idx + 2);
        c.value = m;
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = THIN_BORDER;
      });

      const totalHeaderCell2 = rMonths2.getCell(14);
      totalHeaderCell2.value = 'TOTAL';
      totalHeaderCell2.font = { name: 'Calibri', size: 10, bold: true };
      totalHeaderCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      totalHeaderCell2.border = THIN_BORDER;

      rowIdx++;
      KATEGORI_PROSES_BISNIS.forEach((kat) => {
        const meta = PROSES_BISNIS_META[kat];
        const row = ws.getRow(rowIdx);
        row.height = 20;

        const catCell = row.getCell(1);
        catCell.value = kat;
        catCell.font = { name: 'Calibri', size: 10, bold: true };
        catCell.alignment = { horizontal: 'left', vertical: 'middle' };
        catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: meta.excelColor } };
        catCell.border = THIN_BORDER;

        for (let m = 0; m < 12; m++) {
          const val = summary.volumeMatrix[kat]?.[m] || 0;
          const valCell = row.getCell(m + 2);
          valCell.value = val > 0 ? val : '-';
          valCell.font = { name: 'Calibri', size: 10 };
          valCell.alignment = { horizontal: 'center', vertical: 'middle' };
          valCell.border = THIN_BORDER;
        }

        const totalVolCell = row.getCell(14);
        const katVolTotal = summary.yearlyVolumeByCategory[kat] || 0;
        totalVolCell.value = katVolTotal > 0 ? katVolTotal : '-';
        totalVolCell.font = { name: 'Calibri', size: 10, bold: true };
        totalVolCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalVolCell.border = THIN_BORDER;

        rowIdx++;
      });

      const totalVolumeRow = ws.getRow(rowIdx);
      totalVolumeRow.height = 22;
      const volLabel = totalVolumeRow.getCell(1);
      volLabel.value = `TOTAL PRODUKSI ${selectedYear}`;
      volLabel.font = { name: 'Calibri', size: 10, bold: true };
      volLabel.alignment = { horizontal: 'left', vertical: 'middle' };
      volLabel.border = DOUBLE_BOTTOM_BORDER;

      for (let m = 0; m < 12; m++) {
        const mVolTotal = summary.monthlyVolumeTotals[m] || 0;
        const c = totalVolumeRow.getCell(m + 2);
        c.value = mVolTotal > 0 ? mVolTotal : '-';
        c.font = { name: 'Calibri', size: 10, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = DOUBLE_BOTTOM_BORDER;
      }

      const grandTotalVolCell = totalVolumeRow.getCell(14);
      grandTotalVolCell.value = summary.grandTotalVolume;
      grandTotalVolCell.font = { name: 'Calibri', size: 10, bold: true };
      grandTotalVolCell.alignment = { horizontal: 'center', vertical: 'middle' };
      grandTotalVolCell.border = DOUBLE_BOTTOM_BORDER;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PROSES_BISNIS_POTENSI_PRODUKSI_${selectedYear}_BKI_PONTIANAK.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Excel Lengkap (2 Tabel ${selectedYear}) berhasil diunduh!`);
    } catch (err) {
      console.error('Gagal export excel:', err);
      toast.error('Gagal mengekspor file Excel');
    }
  };

  // State Modal Print PDF
  const [printModalConfig, setPrintModalConfig] = useState({
    isOpen: false,
    mode: 'ALL' // 'ALL' | 'REVENUE' | 'VOLUME'
  });

  const handleOpenPrintModal = (mode = 'ALL') => {
    setPrintModalConfig({
      isOpen: true,
      mode
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── TOOLBAR ATAS: KONTROL TAHUN, METRIK, & AKSI EXPORT ── */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '10px',
            background: 'rgba(56,189,248,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BarChart3 size={22} color="#38bdf8" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
              Proses Bisnis & Potensi Produksi {selectedYear}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              Realisasi Nilai Pendapatan dan Volume Transaksi per Kategori Proses Bisnis
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* PILIH TAHUN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1' }}>Tahun:</span>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid #475569',
                borderRadius: '6px',
                height: '34px',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem'
              }}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* PILIH METRIK NILAI */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1' }}>Metrik:</span>
            <select
              className="form-select"
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid #475569',
                borderRadius: '6px',
                height: '34px',
                fontSize: '0.82rem',
                padding: '0.2rem 0.6rem'
              }}
            >
              <option value="biayaSebelumPPN">Biaya Sebelum PPN (Rupiah)</option>
              <option value="totalSetelahPPN">Total Setelah PPN (Rupiah)</option>
              <option value="feeSurvey">Fee Survey Saja (Rupiah)</option>
            </select>
          </div>

          {/* TOMBOL EXPORT MASING-MASING & SEMUA */}
          <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportRevenueTable}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                height: '34px', padding: '0 0.8rem', fontSize: '0.78rem', fontWeight: 700,
                background: '#16a34a', borderColor: '#16a34a', borderRadius: '6px'
              }}
              title="Download Excel khusus Tabel 1: Nilai Pendapatan (Rupiah)"
            >
              <FileSpreadsheet size={15} />
              Export Tabel 1 (Nilai Rp)
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportVolumeTable}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                height: '34px', padding: '0 0.8rem', fontSize: '0.78rem', fontWeight: 700,
                background: '#0284c7', borderColor: '#0284c7', borderRadius: '6px'
              }}
              title="Download Excel khusus Tabel 2: Volume / Transaksi Produksi"
            >
              <FileSpreadsheet size={15} />
              Export Tabel 2 (Volume)
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExportAllTables}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                height: '34px', padding: '0 0.8rem', fontSize: '0.78rem', fontWeight: 700,
                background: '#334155', color: '#ffffff', borderColor: '#475569', borderRadius: '6px'
              }}
              title="Download file Excel berisi 2 tabel sekaligus persis spreadsheet"
            >
              <Download size={14} />
              Export Semua (2 Tabel)
            </button>
          </div>

          {/* BUTTON CETAK PDF LENGKAP */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleOpenPrintModal('ALL')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              height: '34px', padding: '0 0.85rem', fontSize: '0.78rem', fontWeight: 700,
              background: '#0369a1', color: '#ffffff', borderColor: '#0284c7', borderRadius: '6px',
              boxShadow: '0 2px 6px rgba(2,132,199,0.25)'
            }}
            title="Preview dan Cetak PDF laporan lengkap (kedua tabel)"
          >
            <Printer size={14} />
            Cetak PDF (Semua)
          </button>
        </div>
      </div>

      {/* ── KPI HIGHLIGHT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL PENDAPATAN {selectedYear}</span>
            <DollarSign size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669', marginTop: '0.4rem' }}>
            {formatRupiah(summary.grandTotalRevenue)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Akumulasi 12 bulan ({metricType === 'biayaSebelumPPN' ? 'Sebelum PPN' : metricType === 'totalSetelahPPN' ? 'Setelah PPN' : 'Fee Survey'})
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL PRODUKSI (VOLUME)</span>
            <Layers size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7', marginTop: '0.4rem' }}>
            {summary.grandTotalVolume.toLocaleString('id-ID')} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Transaksi</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Total nota debit terbit di tahun {selectedYear}
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>RATA-RATA BULANAN</span>
            <Calendar size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#8b5cf6', marginTop: '0.4rem' }}>
            {formatRupiah(Math.round(summary.grandTotalRevenue / 12))}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Rerata produksi ~{Math.round(summary.grandTotalVolume / 12)} transaksi/bulan
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABEL 1: NILAI PENDAPATAN / POTENSI PRODUKSI (RUPIAH)                    */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              1. Tabel Nilai Pendapatan / Potensi Produksi {selectedYear} (Rupiah)
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              * Klik angka pada sel untuk rincian
            </span>
            {/* TOMBOL EXPORT KHUSUS TABEL 1 */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportRevenueTable}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                height: '32px', padding: '0 0.85rem', fontSize: '0.78rem', fontWeight: 700,
                background: '#16a34a', borderColor: '#16a34a', borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(22,163,74,0.25)'
              }}
              title="Download file Excel khusus Tabel 1 (Nilai Pendapatan)"
            >
              <FileSpreadsheet size={15} />
              Export Tabel 1 (Nilai Rp)
            </button>

            {/* TOMBOL CETAK PDF KHUSUS TABEL 1 */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleOpenPrintModal('REVENUE')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                height: '32px', padding: '0 0.85rem', fontSize: '0.78rem', fontWeight: 700,
                background: '#0d9488', borderColor: '#0d9488', color: '#ffffff', borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(13,148,136,0.25)'
              }}
              title="Preview dan Cetak PDF khusus Tabel 1 (Nilai Pendapatan)"
            >
              <Printer size={14} />
              Cetak PDF Tabel 1
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              {/* Baris Judul Tabel */}
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th
                  colSpan={14}
                  style={{
                    padding: '0.6rem 1rem',
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    color: '#0f172a',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  PROSES BISNIS / POTENSI PRODUKSI {selectedYear}
                </th>
              </tr>
              {/* Baris Header Kolom Bulan */}
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '0.55rem 0.8rem', textAlign: 'left', minWidth: '180px', fontWeight: 800, color: '#334155', borderRight: '1px solid #cbd5e1' }}>
                  KATEGORI
                </th>
                {MONTH_NAMES.map((m) => (
                  <th
                    key={m}
                    style={{
                      padding: '0.55rem 0.45rem',
                      textAlign: 'center',
                      minWidth: '85px',
                      fontWeight: 800,
                      color: '#334155',
                      borderRight: '1px solid #cbd5e1'
                    }}
                  >
                    {m}
                  </th>
                ))}
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'right', minWidth: '110px', fontWeight: 900, color: '#0f172a', background: '#e2e8f0' }}>
                  TOTAL TAHUNAN
                </th>
              </tr>
            </thead>
            <tbody>
              {KATEGORI_PROSES_BISNIS.map((kat) => {
                const meta = PROSES_BISNIS_META[kat];
                const katTotal = summary.yearlyRevenueByCategory[kat] || 0;

                return (
                  <tr key={kat} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {/* Header Kategori dengan warna latar khas sesuai gambar Excel user */}
                    <td
                      style={{
                        padding: '0.55rem 0.8rem',
                        fontWeight: 800,
                        background: meta.bg,
                        color: meta.textColor,
                        borderRight: '1px solid #cbd5e1',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {meta.name}
                    </td>

                    {/* 12 Bulan */}
                    {MONTH_NAMES.map((_, mIdx) => {
                      const val = summary.revenueMatrix[kat]?.[mIdx] || 0;
                      const hasVal = val > 0;
                      return (
                        <td
                          key={mIdx}
                          onClick={() => hasVal && handleCellClick(kat, mIdx)}
                          style={{
                            padding: '0.55rem 0.45rem',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontSize: '0.76rem',
                            fontWeight: hasVal ? 700 : 500,
                            color: hasVal ? 'var(--text-primary)' : 'var(--text-muted)',
                            background: hasVal ? 'transparent' : 'var(--bg-main, #fafafa)',
                            borderRight: '1px solid #e2e8f0',
                            cursor: hasVal ? 'pointer' : 'default',
                            transition: 'background 0.1s'
                          }}
                          title={hasVal ? `Klik untuk detail ${meta.name} (${MONTH_NAMES[mIdx]}): Rp ${val.toLocaleString('id-ID')}` : ''}
                        >
                          {formatNumberId(val)}
                        </td>
                      );
                    })}

                    {/* Total Kategori */}
                    <td
                      style={{
                        padding: '0.55rem 0.6rem',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '0.78rem',
                        color: meta.color,
                        background: meta.lightBg
                      }}
                    >
                      {formatNumberId(katTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* BARIS GRAND TOTAL PENDAPATAN */}
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                <td style={{ padding: '0.65rem 0.8rem', fontWeight: 900, fontSize: '0.84rem', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>
                  PENDAPATAN {selectedYear}
                </td>
                {MONTH_NAMES.map((_, mIdx) => {
                  const mTotal = summary.monthlyRevenueTotals[mIdx] || 0;
                  return (
                    <td
                      key={mIdx}
                      style={{
                        padding: '0.65rem 0.45rem',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: '0.77rem',
                        fontWeight: 900,
                        color: mTotal > 0 ? '#059669' : 'var(--text-muted)',
                        borderRight: '1px solid #cbd5e1'
                      }}
                    >
                      {formatNumberId(mTotal)}
                    </td>
                  );
                })}
                <td style={{ padding: '0.65rem 0.6rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.84rem', fontWeight: 900, color: '#059669', background: '#ecfdf5' }}>
                  {formatNumberId(summary.grandTotalRevenue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABEL 2: JUMLAH / VOLUME TRANSAKSI                                       */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{
          padding: '0.75rem 1.25rem',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              2. Tabel Volume / Jumlah Transaksi {selectedYear} (Unit Produksi)
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              * Klik angka pada sel untuk rincian
            </span>
            {/* TOMBOL EXPORT KHUSUS TABEL 2 */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExportVolumeTable}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                height: '32px', padding: '0 0.85rem', fontSize: '0.78rem', fontWeight: 700,
                background: '#0284c7', borderColor: '#0284c7', borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(2,132,199,0.25)'
              }}
              title="Download file Excel khusus Tabel 2 (Volume / Transaksi)"
            >
              <FileSpreadsheet size={15} />
              Export Tabel 2 (Volume)
            </button>

            {/* TOMBOL CETAK PDF KHUSUS TABEL 2 */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleOpenPrintModal('VOLUME')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                height: '32px', padding: '0 0.85rem', fontSize: '0.78rem', fontWeight: 700,
                background: '#4f46e5', borderColor: '#4f46e5', color: '#ffffff', borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(79,70,229,0.25)'
              }}
              title="Preview dan Cetak PDF khusus Tabel 2 (Volume / Transaksi)"
            >
              <Printer size={14} />
              Cetak PDF Tabel 2
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              {/* Baris Judul Tabel */}
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th
                  colSpan={14}
                  style={{
                    padding: '0.6rem 1rem',
                    textAlign: 'center',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    color: '#0f172a',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderBottom: '2px solid #94a3b8'
                  }}
                >
                  PROSES BISNIS / POTENSI PRODUKSI {selectedYear}
                </th>
              </tr>
              {/* Baris Header Kolom Bulan */}
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '0.55rem 0.8rem', textAlign: 'left', minWidth: '180px', fontWeight: 800, color: '#334155', borderRight: '1px solid #cbd5e1' }}>
                  KATEGORI
                </th>
                {MONTH_NAMES.map((m) => (
                  <th
                    key={m}
                    style={{
                      padding: '0.55rem 0.45rem',
                      textAlign: 'center',
                      minWidth: '85px',
                      fontWeight: 800,
                      color: '#334155',
                      borderRight: '1px solid #cbd5e1'
                    }}
                  >
                    {m}
                  </th>
                ))}
                <th style={{ padding: '0.55rem 0.6rem', textAlign: 'center', minWidth: '110px', fontWeight: 900, color: '#0f172a', background: '#e2e8f0' }}>
                  TOTAL PRODUKSI
                </th>
              </tr>
            </thead>
            <tbody>
              {KATEGORI_PROSES_BISNIS.map((kat) => {
                const meta = PROSES_BISNIS_META[kat];
                const katVolTotal = summary.yearlyVolumeByCategory[kat] || 0;

                return (
                  <tr key={kat} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {/* Header Kategori */}
                    <td
                      style={{
                        padding: '0.55rem 0.8rem',
                        fontWeight: 800,
                        background: meta.bg,
                        color: meta.textColor,
                        borderRight: '1px solid #cbd5e1',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {meta.name}
                    </td>

                    {/* 12 Bulan */}
                    {MONTH_NAMES.map((_, mIdx) => {
                      const count = summary.volumeMatrix[kat]?.[mIdx] || 0;
                      const hasCount = count > 0;
                      return (
                        <td
                          key={mIdx}
                          onClick={() => hasCount && handleCellClick(kat, mIdx)}
                          style={{
                            padding: '0.55rem 0.45rem',
                            textAlign: 'center',
                            fontWeight: hasCount ? 800 : 500,
                            color: hasCount ? '#0f172a' : 'var(--text-muted)',
                            background: hasCount ? 'transparent' : 'var(--bg-main, #fafafa)',
                            borderRight: '1px solid #e2e8f0',
                            cursor: hasCount ? 'pointer' : 'default'
                          }}
                          title={hasCount ? `${meta.name} (${MONTH_NAMES[mIdx]}): ${count} transaksi` : ''}
                        >
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}

                    {/* Total Kategori */}
                    <td
                      style={{
                        padding: '0.55rem 0.6rem',
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        color: meta.color,
                        background: meta.lightBg
                      }}
                    >
                      {katVolTotal > 0 ? katVolTotal : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* BARIS GRAND TOTAL VOLUME */}
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a' }}>
                <td style={{ padding: '0.65rem 0.8rem', fontWeight: 900, fontSize: '0.84rem', color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>
                  TOTAL PRODUKSI {selectedYear}
                </td>
                {MONTH_NAMES.map((_, mIdx) => {
                  const mVol = summary.monthlyVolumeTotals[mIdx] || 0;
                  return (
                    <td
                      key={mIdx}
                      style={{
                        padding: '0.65rem 0.45rem',
                        textAlign: 'center',
                        fontWeight: 900,
                        color: mVol > 0 ? '#0284c7' : 'var(--text-muted)',
                        borderRight: '1px solid #cbd5e1'
                      }}
                    >
                      {mVol > 0 ? mVol : '-'}
                    </td>
                  );
                })}
                <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center', fontSize: '0.84rem', fontWeight: 900, color: '#0284c7', background: '#f0f9ff' }}>
                  {summary.grandTotalVolume}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DRILLDOWN DETAIL TRANSAKSI ── */}
      {drilldownModal.isOpen && (
        <ModalPortal>
          <div
            onClick={() => setDrilldownModal({ isOpen: false, kategori: '', monthIdx: -1, items: [], amount: 0, count: 0 })}
            style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-card,#fff)', borderRadius: '14px',
                border: '1px solid var(--border-color,#e2e8f0)',
                width: '100%', maxWidth: '780px', maxHeight: '85vh',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color,#e2e8f0)',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.2rem 0.55rem', borderRadius: '5px',
                      background: PROSES_BISNIS_META[drilldownModal.kategori]?.bg || '#38bdf8',
                      color: PROSES_BISNIS_META[drilldownModal.kategori]?.textColor || '#0f172a',
                      fontWeight: 800, fontSize: '0.74rem'
                    }}>
                      {drilldownModal.kategori}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                      Bulan {MONTH_NAMES[drilldownModal.monthIdx]} {selectedYear}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Total: <strong>{formatRupiah(drilldownModal.amount)}</strong> • {drilldownModal.count} Transaksi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrilldownModal({ isOpen: false, kategori: '', monthIdx: -1, items: [], amount: 0, count: 0 })}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', borderRadius: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
                {drilldownModal.items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <Info size={32} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Data berasal dari rekapitulasi historis spreadsheet {selectedYear}.</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
                      Untuk tahun berjalan, transaksi nota debit yang dibuat akan terdaftar secara rinci di sini.
                    </p>
                  </div>
                ) : (
                  <table className="data-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>No.</th>
                        <th>No. Seri ND</th>
                        <th>Tanggal</th>
                        <th>Nama Kapal</th>
                        <th>Pengguna Jasa</th>
                        <th>Jenis Survey</th>
                        <th style={{ textAlign: 'right' }}>Biaya</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drilldownModal.items.map((item, idx) => {
                        const val = item[metricType] || (Number(item.feeSurvey) || 0) + (Number(item.biayaSurvey) || 0);
                        return (
                          <tr key={item.id || idx}>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ fontWeight: 800, color: '#0369a1', fontFamily: 'monospace' }}>{item.noSeriFormND || '-'}</td>
                            <td style={{ fontSize: '0.74rem', whiteSpace: 'nowrap' }}>{item.tanggalND || '-'}</td>
                            <td style={{ fontWeight: 800, textTransform: 'uppercase' }}>{item.namaObyekProduksi || '-'}</td>
                            <td style={{ fontSize: '0.74rem' }}>{item.penggunaJasa || '-'}</td>
                            <td>
                              <span style={{
                                padding: '0.1rem 0.4rem', borderRadius: '4px',
                                background: 'rgba(2,132,199,0.1)', color: '#0284c7', fontWeight: 700, fontSize: '0.7rem'
                              }}>
                                {item.jenisSurvey || '-'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>
                              Rp {Number(val).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color,#e2e8f0)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-main,#f8fafc)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDrilldownModal({ isOpen: false, kategori: '', monthIdx: -1, items: [], amount: 0, count: 0 })}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ── MODAL PREVIEW & CETAK PDF PROSES BISNIS ── */}
      <ProsesBisnisPrintModal
        isOpen={printModalConfig.isOpen}
        onClose={() => setPrintModalConfig({ isOpen: false, mode: 'ALL' })}
        selectedYear={selectedYear}
        summary={summary}
        metricType={metricType}
        initialMode={printModalConfig.mode}
      />
    </div>
  );
};
