import React, { useState, useMemo } from 'react';
import {
  Receipt, Plus, Search, Edit2, Trash2, FileSpreadsheet, TrendingUp, FileText, Printer, BarChart3, Filter, CheckCircle2, Clock, Calendar, X
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { NotaDebitModal } from './NotaDebitModal';
import { TandaTerimaNotaDebitModal } from './TandaTerimaNotaDebitModal';
import { DataControlNotaDebitPrintModal } from './DataControlNotaDebitPrintModal';
import { ProsesBisnisReport } from './ProsesBisnisReport';
import {
  KATEGORI_PROSES_BISNIS,
  PROSES_BISNIS_META,
  determineKategoriBisnis
} from '../data/prosesBisnisConstants';
import { formatDateIndo } from '../utils/formatters';
import toast from 'react-hot-toast';

const MONTH_OPTIONS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const formatRp = (val) =>
  val !== undefined && val !== null && !isNaN(val)
    ? `Rp ${Number(val).toLocaleString('id-ID')}`
    : 'Rp 0';

export const NotaDebitTable = () => {
  const { notaDebit = [], addNotaDebit, updateNotaDebit, deleteNotaDebit, adminSettings } = useData();
  const { role } = useAuth();

  const defaultPpnRate = adminSettings?.ppnRate !== undefined ? Number(adminSettings.ppnRate) : 11;
  const isAdmin = role === 'admin' || role === 'developer';
  const canEdit = isAdmin || role === 'keuangan' || role === 'finance';

  // Tabs: 'data_control' | 'proses_bisnis'
  const [activeTab, setActiveTab] = useState('data_control');

  const [searchTerm, setSearchTerm] = useState('');
  const [prosesBisnisFilter, setProsesBisnisFilter] = useState('ALL');
  const [statusCetakFilter, setStatusCetakFilter] = useState('ALL'); // 'ALL' | 'TERCETAK' | 'BELUM_DICETAK'
  const [selectedYear, setSelectedYear] = useState('ALL'); // 'ALL' | 2026 ...
  const [selectedMonth, setSelectedMonth] = useState('ALL'); // 'ALL' | '01' ... '12'
  const [selectedDate, setSelectedDate] = useState(''); // '' | 'YYYY-MM-DD'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Modal Print Tanda Terima Dokumen
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printItem, setPrintItem] = useState(null);

  // Modal Print PDF Data Control Nota Debit
  const [isDataControlPrintOpen, setIsDataControlPrintOpen] = useState(false);

  // Daftar tahun yang tersedia
  const availableYears = useMemo(() => {
    const yearSet = new Set([2023, 2024, 2025, 2026, new Date().getFullYear()]);
    (notaDebit || []).forEach((item) => {
      if (item.tanggalND) {
        const y = new Date(item.tanggalND).getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [notaDebit]);

  // Cek apakah ada filter aktif
  const hasActiveFilter = Boolean(
    searchTerm.trim() ||
    prosesBisnisFilter !== 'ALL' ||
    statusCetakFilter !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedMonth !== 'ALL' ||
    selectedDate
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setProsesBisnisFilter('ALL');
    setStatusCetakFilter('ALL');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setSelectedDate('');
  };

  // Ringkasan label filter untuk header PDF & Excel
  const filterSummaryLabel = useMemo(() => {
    const parts = [];
    if (selectedDate) {
      parts.push(`Tanggal ${formatDateIndo(selectedDate)}`);
    } else {
      if (selectedMonth !== 'ALL') {
        const mLabel = MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label;
        parts.push(`Bulan ${mLabel}`);
      }
      if (selectedYear !== 'ALL') {
        parts.push(`Tahun ${selectedYear}`);
      }
    }
    if (prosesBisnisFilter !== 'ALL') {
      parts.push(prosesBisnisFilter);
    }
    if (statusCetakFilter !== 'ALL') {
      parts.push(statusCetakFilter === 'TERCETAK' ? 'Tercetak' : 'Belum Dicetak');
    }
    return parts.join(' • ');
  }, [selectedDate, selectedMonth, selectedYear, prosesBisnisFilter, statusCetakFilter]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filteredData = useMemo(() => {
    return notaDebit.filter((item) => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matches =
          (item.noSeriFormND || '').toLowerCase().includes(s) ||
          (item.noBilling || '').toLowerCase().includes(s) ||
          (item.namaObyekProduksi || '').toLowerCase().includes(s) ||
          (item.namaSurveyor || '').toLowerCase().includes(s) ||
          (item.penggunaJasa || '').toLowerCase().includes(s) ||
          (item.jenisSurvey || '').toLowerCase().includes(s) ||
          (item.nomorAgendaPermohonan || '').toLowerCase().includes(s) ||
          (item.nomorLaporanSurvey || '').toLowerCase().includes(s);
        if (!matches) return false;
      }

      // 2. Filter Proses Bisnis
      if (prosesBisnisFilter !== 'ALL') {
        const kat = item.kategoriBisnis || determineKategoriBisnis(item.jenisSurvey || '');
        if (kat !== prosesBisnisFilter) return false;
      }

      // 3. Filter Status Cetak
      if (statusCetakFilter !== 'ALL') {
        const isTercetak = item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik';
        if (statusCetakFilter === 'TERCETAK' && !isTercetak) return false;
        if (statusCetakFilter === 'BELUM_DICETAK' && isTercetak) return false;
      }

      // 4. Filter Tanggal Spesifik (YYYY-MM-DD)
      if (selectedDate) {
        if (item.tanggalND !== selectedDate) return false;
      } else {
        // 5. Filter Tahun & Bulan (jika tanggal spesifik tidak dipilih)
        if (item.tanggalND) {
          const parts = String(item.tanggalND).split('-');
          const itemYear = parts[0];
          const itemMonth = parts[1];
          if (selectedYear !== 'ALL' && itemYear !== String(selectedYear)) return false;
          if (selectedMonth !== 'ALL' && itemMonth !== selectedMonth) return false;
        } else if (selectedYear !== 'ALL' || selectedMonth !== 'ALL') {
          return false;
        }
      }

      return true;
    });
  }, [notaDebit, searchTerm, prosesBisnisFilter, statusCetakFilter, selectedYear, selectedMonth, selectedDate]);

  // Summary totals
  const totalND = filteredData.length;
  const totalFeeSurvey = filteredData.reduce((s, i) => s + (Number(i.feeSurvey) || 0), 0);
  const totalBiayaSurvey = filteredData.reduce((s, i) => s + (Number(i.biayaSurvey) || 0), 0);
  const totalSetelahPPN = filteredData.reduce((s, i) => s + (Number(i.totalSetelahPPN) || 0), 0);

  const handleSave = (data) => {
    let saved = null;
    if (editingItem) {
      updateNotaDebit(editingItem.id, data);
      saved = { ...editingItem, ...data };
    } else {
      saved = addNotaDebit(data);
    }
    setIsModalOpen(false);
    setEditingItem(null);
    toast.success('Nota Debit berhasil disimpan');

    // Otomatis buka Tanda Terima Dokumen setelah form diisi & disimpan
    setTimeout(() => {
      setPrintItem(saved || data);
      setIsPrintOpen(true);
    }, 200);
  };

  const handleDelete = (id, noSeri) => {
    if (window.confirm(`Hapus Nota Debit No. Seri "${noSeri}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteNotaDebit(id);
      toast.success('Nota Debit berhasil dihapus');
    }
  };

  // ── EXPORT EXCEL ──
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'BKI Cabang Pontianak — Finance';
      wb.created = new Date();

      const ws = wb.addWorksheet('DATA CONTROL NOTA DEBIT', {
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true },
        views: [{ showGridLines: true }]
      });

      // Lebar kolom
      ws.columns = [
        { width: 6 },   // A: NO
        { width: 12 },  // B: NO SERI
        { width: 16 },  // C: NO BILLING
        { width: 16 },  // D: TANGGAL ND
        { width: 22 },  // E: NOMOR INVOICE
        { width: 22 },  // F: NAMA OBYEK
        { width: 16 },  // G: AGENDA
        { width: 22 },  // H: NO LAPORAN
        { width: 22 },  // I: NAMA SURVEYOR
        { width: 26 },  // J: PENGGUNA JASA
        { width: 16 },  // K: JENIS SURVEY
        { width: 26 },  // L: PROSES BISNIS
        { width: 28 },  // M: BIAYA (label) - diperlebar agar label seperti TOTAL BIAYA SETELAH PPN tidak wrap atau terpotong
        { width: 18 },  // N: JUMLAH RP - diperlebar agar nominal tidak overflow
        { width: 22 },  // O: TTD PENERIMA
        { width: 18 },  // P: KET
      ];

      const NAVY = { argb: '0C2C52' };
      const WHITE = { argb: 'FFFFFF' };
      const THIN = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } },
      };
      const BOLD_BORDER = {
        top: { style: 'medium', color: { argb: '0C2C52' } },
        bottom: { style: 'medium', color: { argb: '0C2C52' } },
        left: { style: 'medium', color: { argb: '0C2C52' } },
        right: { style: 'medium', color: { argb: '0C2C52' } },
      };
      const CENTER = { horizontal: 'center', vertical: 'middle', wrapText: true };
      const LEFT = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // ── ROW 1: Judul Besar ──
      ws.mergeCells('A1:P1');
      const r1 = ws.getCell('A1');
      r1.value = 'DATA CONTROL PENGGUNAAN FORM NOTA DEBIT CABANG PONTIANAK';
      r1.font = { name: 'Arial', size: 13, bold: true, color: NAVY };
      r1.alignment = CENTER;
      ws.getRow(1).height = 22;

      // ── ROW 2: Sub-judul ──
      ws.mergeCells('A2:P2');
      const r2 = ws.getCell('A2');
      r2.value = filterSummaryLabel
        ? `SEGMEN KLASIFIKASI • ${filterSummaryLabel.toUpperCase()}`
        : 'SEGMEN KLASIFIKASI TAHUN 2026';
      r2.font = { name: 'Arial', size: 10, bold: true, color: { argb: '374151' } };
      r2.alignment = CENTER;
      ws.getRow(2).height = 16;

      ws.addRow([]); // ROW 3 kosong

      // ── ROW 4-5: HEADER TABEL ──
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: NAVY };
      const hFont = { name: 'Arial', size: 9, bold: true, color: WHITE };

      // Kolom yang digabung 2 baris
      const singleRowHeaders = [
        { col: 'A', label: 'No.\nURUT' },
        { col: 'B', label: 'No.\nSERI FORM\nNOTA DEBIT' },
        { col: 'C', label: 'NO BILLING\n(CETAK)' },
        { col: 'D', label: 'TANGGAL\nNOTA DEBIT' },
        { col: 'E', label: 'NOMOR\nINVOICE' },
        { col: 'F', label: 'NAMA OBYEK\nPRODUKSI' },
        { col: 'G', label: 'NOMOR AGENDA\nPERMOHONAN' },
        { col: 'H', label: 'NOMOR LAPORAN\nSURVEY' },
        { col: 'I', label: 'NAMA\nSURVEYOR' },
        { col: 'J', label: 'PENGGUNA\nJASA' },
        { col: 'K', label: 'JENIS\nSURVEY' },
        { col: 'L', label: 'PROSES BISNIS /\nPOTENSI PRODUKSI' },
        { col: 'O', label: 'TANDA TANGAN\nPENERIMA\nFORM ND' },
        { col: 'P', label: 'KET' },
      ];

      singleRowHeaders.forEach(({ col, label }) => {
        ws.mergeCells(`${col}4:${col}5`);
        const c = ws.getCell(`${col}4`);
        c.value = label;
        c.fill = headerFill;
        c.font = hFont;
        c.alignment = CENTER;
        c.border = THIN;
      });

      // Kolom BIAYA: merge M4:N4, lalu baris 5 split ke M5 & N5
      ws.mergeCells('M4:N4');
      const cBiaya = ws.getCell('M4');
      cBiaya.value = 'BIAYA';
      cBiaya.fill = headerFill;
      cBiaya.font = hFont;
      cBiaya.alignment = CENTER;
      cBiaya.border = THIN;

      const cBiayaLabel = ws.getCell('M5');
      cBiayaLabel.value = 'KETERANGAN BIAYA';
      cBiayaLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
      cBiayaLabel.font = { name: 'Arial', size: 8, bold: true, color: WHITE };
      cBiayaLabel.alignment = CENTER;
      cBiayaLabel.border = THIN;

      const cJumlah = ws.getCell('N5');
      cJumlah.value = 'JUMLAH RP';
      cJumlah.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
      cJumlah.font = { name: 'Arial', size: 8, bold: true, color: WHITE };
      cJumlah.alignment = CENTER;
      cJumlah.border = THIN;

      ws.getRow(4).height = 28;
      ws.getRow(5).height = 20;

      // ── DATA ROWS ──
      let currentRow = 6;
      filteredData.forEach((item, idx) => {
        const itemPpnRate = item.ppnRate !== undefined ? Number(item.ppnRate) : defaultPpnRate;
        const biayaSebelumPPN = (Number(item.feeSurvey) || 0) + (Number(item.biayaSurvey) || 0);
        const ppn = item.ppnAmount !== undefined ? Number(item.ppnAmount) : Math.round(biayaSebelumPPN * (itemPpnRate / 100));
        const total = item.totalSetelahPPN !== undefined ? Number(item.totalSetelahPPN) : (biayaSebelumPPN + ppn);
        const kat = item.kategoriBisnis || determineKategoriBisnis(item.jenisSurvey || '');

        const subRows = [
          { label: 'FEE SURVEY', value: Number(item.feeSurvey) || 0 },
          { label: 'BIAYA SURVEY', value: Number(item.biayaSurvey) || 0 },
          { label: 'BIAYA SEBELUM PPN', value: biayaSebelumPPN },
          { label: `PPN ${itemPpnRate}%`, value: ppn },
          { label: 'TOTAL BIAYA SETELAH PPN', value: total },
        ];
        const rowCount = subRows.length;
        const endRow = currentRow + rowCount - 1;

        const commonCells = [
          { col: 1, val: idx + 1 },
          { col: 2, val: item.noSeriFormND || '' },
          { col: 3, val: item.noBilling || '' },
          { col: 4, val: item.tanggalND ? formatDateIndo(item.tanggalND) : '' },
          { col: 5, val: item.nomorInvoice || '' },
          { col: 6, val: item.namaObyekProduksi || '' },
          { col: 7, val: item.nomorAgendaPermohonan || '' },
          { col: 8, val: item.nomorLaporanSurvey || '' },
          { col: 9, val: item.namaSurveyor || '' },
          { col: 10, val: item.penggunaJasa || '' },
          { col: 11, val: item.jenisSurvey || '' },
          { col: 12, val: kat },
          { col: 15, val: item.tandaTanganPenerima || '' },
          { col: 16, val: item.keterangan || '' },
        ];

        commonCells.forEach(({ col }) => {
          if (rowCount > 1) {
            ws.mergeCells(currentRow, col, endRow, col);
          }
        });

        commonCells.forEach(({ col, val }) => {
          const cell = ws.getCell(currentRow, col);
          cell.value = val;
          cell.font = { name: 'Arial', size: 8 };
          cell.alignment = col === 6 || col === 10 ? LEFT : CENTER;
          cell.border = THIN;
        });

        subRows.forEach((sub, subIdx) => {
          const rowNum = currentRow + subIdx;
          const isTotal = subIdx === 4;
          const isPpn = subIdx === 3;

          const labelCell = ws.getCell(rowNum, 13);
          labelCell.value = sub.label;
          labelCell.font = {
            name: 'Arial', size: 8.5,
            bold: isTotal,
            italic: isPpn,
            color: isTotal ? { argb: '047857' } : isPpn ? { argb: 'D97706' } : { argb: '374151' }
          };
          labelCell.fill = isTotal
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } }
            : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
          labelCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
          labelCell.border = THIN;

          const valCell = ws.getCell(rowNum, 14);
          valCell.value = sub.value;
          valCell.numFmt = '"Rp "#,##0';
          valCell.font = {
            name: 'Arial', size: 9,
            bold: isTotal || isPpn,
            color: isTotal ? { argb: '047857' } : isPpn ? { argb: 'D97706' } : { argb: '374151' }
          };
          valCell.fill = isTotal
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } }
            : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
          valCell.alignment = { horizontal: 'right', vertical: 'middle' };
          valCell.border = THIN;

          ws.getRow(rowNum).height = 20; // Dipertinggi dari 16 ke 20 agar label biaya tidak berhimpitan dan tidak terpotong
        });

        currentRow = endRow + 1;
      });

      // ── FOOTER TOTAL ──
      ws.mergeCells(currentRow, 1, currentRow, 12);
      const totalLabelCell = ws.getCell(currentRow, 1);
      totalLabelCell.value = `TOTAL (${filteredData.length} Nota Debit)`;
      totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: NAVY };
      totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
      totalLabelCell.alignment = CENTER;
      totalLabelCell.border = BOLD_BORDER;

      ws.mergeCells(currentRow, 13, currentRow, 13);
      const totalFeeCell = ws.getCell(currentRow, 13);
      totalFeeCell.value = 'TOTAL KESELURUHAN';
      totalFeeCell.font = { name: 'Arial', size: 9, bold: true, color: NAVY };
      totalFeeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
      totalFeeCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      totalFeeCell.border = BOLD_BORDER;

      const totalValCell = ws.getCell(currentRow, 14);
      totalValCell.value = totalSetelahPPN;
      totalValCell.numFmt = '"Rp "#,##0';
      totalValCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: '047857' } };
      totalValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
      totalValCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalValCell.border = BOLD_BORDER;

      ws.mergeCells(currentRow, 15, currentRow, 16);
      ws.getCell(currentRow, 15).border = BOLD_BORDER;
      ws.getRow(currentRow).height = 24;

      // ── DOWNLOAD ──
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Control_Nota_Debit_BKI_PTK_${todayStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export Excel error:', err);
      toast.error('Gagal mengekspor file Excel');
    }
  };

  // ── RENDER STYLES ──
  const thStyle = {
    background: '#0c2c52',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.72rem',
    textAlign: 'center',
    padding: '0.5rem 0.4rem',
    whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(255,255,255,0.15)',
    verticalAlign: 'middle',
  };

  const tdStyle = (center = false) => ({
    padding: '0',
    borderBottom: '1px solid var(--border-color)',
    borderRight: '1px solid var(--border-color)',
    verticalAlign: 'top',
    textAlign: center ? 'center' : 'left',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── TOP NAV TAB: DATA CONTROL vs PROSES BISNIS ── */}
      <div
        className="card"
        style={{
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'inline-flex', background: 'var(--bg-main, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('data_control')}
            style={{
              padding: '0.42rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '6px', border: 'none',
              cursor: 'pointer', transition: 'all 0.15s ease',
              background: activeTab === 'data_control' ? '#0284c7' : 'transparent',
              color: activeTab === 'data_control' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            📑 Data Control Nota Debit ({notaDebit.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('proses_bisnis')}
            style={{
              padding: '0.42rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '6px', border: 'none',
              cursor: 'pointer', transition: 'all 0.15s ease',
              background: activeTab === 'proses_bisnis' ? '#0284c7' : 'transparent',
              color: activeTab === 'proses_bisnis' ? '#ffffff' : 'var(--text-secondary)',
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            <BarChart3 size={15} />
            <span>Rekap Proses Bisnis / Potensi Produksi</span>
          </button>
        </div>

        {activeTab === 'data_control' && canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, padding: '0.45rem 1rem', fontSize: '0.84rem' }}
          >
            <Plus size={15} />
            <span>Tambah Nota Debit</span>
          </button>
        )}
      </div>

      {/* JIKA TAB PROSES BISNIS DIPILIH */}
      {activeTab === 'proses_bisnis' ? (
        <ProsesBisnisReport />
      ) : (
        <div className="card">
          {/* ── HEADER ── */}
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div className="card-title-group">
              <div className="card-icon" style={{ background: 'rgba(3, 105, 161, 0.12)', color: '#0369a1' }}>
                <Receipt size={22} />
              </div>
              <div>
                <h2 className="card-title">Data Control Nota Debit</h2>
                <div className="card-subtitle">
                  Penggunaan Form Nota Debit Cabang Pontianak — Segmen Klasifikasi
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportExcel}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#059669', borderColor: 'rgba(16,185,129,0.4)' }}
                title="Export ke Excel (.xlsx)"
              >
                <FileSpreadsheet size={16} />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsDataControlPrintOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700,
                  background: '#0284c7', borderColor: '#0284c7', color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(2,132,199,0.25)'
                }}
                title="Preview dan Cetak PDF Data Control Nota Debit"
              >
                <Printer size={16} />
                <span>Cetak PDF</span>
              </button>
            </div>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'Total Nota Debit', value: totalND, unit: 'lembar', color: '#0369a1', bg: 'rgba(3,105,161,0.08)', icon: <FileText size={18} color="#0369a1" /> },
              { label: 'Total Fee Survey', value: formatRp(totalFeeSurvey), unit: '', color: '#059669', bg: 'rgba(5,150,105,0.08)', icon: <TrendingUp size={18} color="#059669" /> },
              { label: 'Total Biaya Survey', value: formatRp(totalBiayaSurvey), unit: '', color: '#0284c7', bg: 'rgba(2,132,199,0.08)', icon: <TrendingUp size={18} color="#0284c7" /> },
              { label: 'Total Setelah PPN', value: formatRp(totalSetelahPPN), unit: '', color: '#047857', bg: 'rgba(4,120,87,0.08)', icon: <Receipt size={18} color="#047857" /> },
            ].map((card) => (
              <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.color}22`, borderRadius: '12px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: '8px', background: `${card.color}18` }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: card.color }}>{card.value}{card.unit ? ` ${card.unit}` : ''}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── SEARCH & FILTER TOOLBAR ── */}
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', padding: '0.65rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1 }}>
              <div className="search-box" style={{ flex: '1 1 240px', maxWidth: '380px' }}>
                <Search className="search-icon" size={15} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Cari no. seri, obyek, surveyor, pengguna jasa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.2rem', height: '36px', fontSize: '0.82rem' }}
                />
              </div>

              {/* FILTER KATEGORI PROSES BISNIS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Filter size={14} color="var(--text-muted)" />
                <select
                  className="form-select"
                  value={prosesBisnisFilter}
                  onChange={(e) => setProsesBisnisFilter(e.target.value)}
                  style={{ height: '36px', fontSize: '0.8rem', padding: '0.2rem 0.5rem', minWidth: '170px' }}
                >
                  <option value="ALL">📋 Semua Proses Bisnis</option>
                  {KATEGORI_PROSES_BISNIS.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTER STATUS CETAK */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <select
                  className="form-select"
                  value={statusCetakFilter}
                  onChange={(e) => setStatusCetakFilter(e.target.value)}
                  style={{ height: '36px', fontSize: '0.8rem', padding: '0.2rem 0.5rem', minWidth: '145px' }}
                >
                  <option value="ALL">🖨️ Semua Status Cetak</option>
                  <option value="BELUM_DICETAK">⏳ Belum Dicetak</option>
                  <option value="TERCETAK">✅ Tercetak</option>
                </select>
              </div>

              {/* FILTER TAHUN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <select
                  className="form-select"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    if (selectedDate) setSelectedDate('');
                  }}
                  style={{ height: '36px', fontSize: '0.8rem', padding: '0.2rem 0.5rem', minWidth: '120px' }}
                  title="Filter Tahun"
                >
                  <option value="ALL">📅 Semua Tahun</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTER BULAN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <select
                  className="form-select"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    if (selectedDate) setSelectedDate('');
                  }}
                  style={{ height: '36px', fontSize: '0.8rem', padding: '0.2rem 0.5rem', minWidth: '130px' }}
                  title="Filter Bulan"
                >
                  <option value="ALL">🗓️ Semua Bulan</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* FILTER TANGGAL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (e.target.value) {
                        setSelectedYear('ALL');
                        setSelectedMonth('ALL');
                      }
                    }}
                    style={{
                      height: '36px',
                      fontSize: '0.8rem',
                      padding: '0.2rem 0.5rem',
                      paddingRight: selectedDate ? '1.8rem' : '0.5rem',
                      minWidth: '135px'
                    }}
                    title="Pilih Tanggal Spesifik"
                  />
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate('')}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-muted)'
                      }}
                      title="Hapus filter tanggal"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* RESET FILTER */}
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-secondary btn-sm"
                  style={{
                    height: '36px',
                    fontSize: '0.78rem',
                    padding: '0.2rem 0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: '#ef4444',
                    borderColor: '#fca5a5',
                    background: '#fef2f2',
                    fontWeight: 600
                  }}
                  title="Reset semua filter"
                >
                  <X size={14} />
                  Reset Filter
                </button>
              )}
            </div>

            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Menampilkan {filteredData.length} dari {notaDebit.length} data
            </span>
          </div>

          {/* ── TABEL DATA CONTROL ── */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1500px', fontSize: '0.8rem', border: '1.5px solid #0c2c52' }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...thStyle, width: 34 }}>NO</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 70 }}>NO.<br />SERI FORM<br />NOTA DEBIT</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 100 }}>NO BILLING<br />(CETAK)</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 105 }}>TANGGAL<br />NOTA DEBIT</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 140 }}>NOMOR<br />INVOICE</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 130 }}>NAMA OBYEK<br />PRODUKSI</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 110 }}>NOMOR AGENDA<br />PERMOHONAN</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 140 }}>NOMOR<br />LAPORAN SURVEY</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 140 }}>NAMA<br />SURVEYOR</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 160 }}>PENGGUNA<br />JASA</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 80 }}>JENIS<br />SURVEY</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 140 }}>PROSES BISNIS /<br />POTENSI PRODUKSI</th>
                  <th colSpan={2} style={{ ...thStyle, minWidth: 200 }}>BIAYA</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 130 }}>TANDA TANGAN<br />PENERIMA<br />FORM ND</th>
                  <th rowSpan={2} style={{ ...thStyle, minWidth: 100 }}>KET</th>
                  {canEdit && <th rowSpan={2} style={{ ...thStyle, minWidth: 140 }}>AKSI</th>}
                </tr>
                <tr>
                  <th style={{ ...thStyle, background: '#1e3a5f', fontSize: '0.68rem', minWidth: 130 }}>KETERANGAN BIAYA</th>
                  <th style={{ ...thStyle, background: '#1e3a5f', fontSize: '0.68rem', minWidth: 100 }}>JUMLAH RP</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 18 : 17} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧾</div>
                      <p style={{ margin: 0, fontWeight: 600 }}>Belum ada data Nota Debit.</p>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                          style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <Plus size={14} /> Tambah Nota Debit Pertama
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, idx) => {
                    const itemPpnRate = item.ppnRate !== undefined ? Number(item.ppnRate) : defaultPpnRate;
                    const biayaSebelumPPN = (Number(item.feeSurvey) || 0) + (Number(item.biayaSurvey) || 0);
                    const ppnAmount = item.ppnAmount !== undefined ? Number(item.ppnAmount) : Math.round(biayaSebelumPPN * (itemPpnRate / 100));
                    const totalSetelahPPN = item.totalSetelahPPN !== undefined ? Number(item.totalSetelahPPN) : (biayaSebelumPPN + ppnAmount);
                    const kat = item.kategoriBisnis || determineKategoriBisnis(item.jenisSurvey || '');
                    const meta = PROSES_BISNIS_META[kat] || { bg: '#f1f5f9', textColor: '#334155', name: kat };

                    const computedBiaya = [
                      { label: 'FEE SURVEY', value: Number(item.feeSurvey) || 0, color: '#059669' },
                      { label: 'BIAYA SURVEY', value: Number(item.biayaSurvey) || 0, color: '#0284c7' },
                      { label: 'BIAYA SEBELUM PPN', value: biayaSebelumPPN, color: '#374151' },
                      { label: `PPN ${itemPpnRate}%`, value: ppnAmount, color: '#d97706', italic: true },
                      { label: 'TOTAL BIAYA SETELAH PPN', value: totalSetelahPPN, color: '#047857', bold: true, bg: '#f0fdf4' },
                    ];

                    const rowSpan = computedBiaya.length;

                    return computedBiaya.map((biaya, bIdx) => (
                      <tr key={`${item.id}-${bIdx}`} style={{ background: biaya.bg || (bIdx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-main)') }}>
                        {bIdx === 0 && (
                          <>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontWeight: 800, color: 'var(--text-primary)', padding: '0.4rem' }}>{idx + 1}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontWeight: 900, color: '#0369a1', padding: '0.4rem' }}>{item.noSeriFormND || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontWeight: 700, color: 'var(--text-secondary)', padding: '0.4rem', fontSize: '0.76rem' }}>{item.noBilling || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontWeight: 600, color: 'var(--text-secondary)', padding: '0.4rem', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>{item.tanggalND ? formatDateIndo(item.tanggalND) : '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(), padding: '0.4rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{item.nomorInvoice || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(), padding: '0.4rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{item.namaObyekProduksi || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), padding: '0.4rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{item.nomorAgendaPermohonan || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(), padding: '0.4rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{item.nomorLaporanSurvey || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(), padding: '0.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.namaSurveyor || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(), padding: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>{item.penggunaJasa || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), padding: '0.4rem' }}>
                              <span style={{ background: 'rgba(3,105,161,0.1)', color: '#0369a1', padding: '0.15rem 0.45rem', borderRadius: '5px', fontWeight: 800, fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                                {item.jenisSurvey || '-'}
                              </span>
                            </td>
                            {/* KOLOM PROSES BISNIS */}
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), padding: '0.4rem' }}>
                              <span style={{
                                background: meta.bg,
                                color: meta.textColor,
                                border: `1px solid ${meta.border || '#cbd5e1'}`,
                                padding: '0.18rem 0.45rem',
                                borderRadius: '5px',
                                fontWeight: 800,
                                fontSize: '0.68rem',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }}>
                                {meta.name}
                              </span>
                            </td>
                          </>
                        )}

                        {/* BIAYA */}
                        <td style={{ ...tdStyle(), padding: '0.3rem 0.6rem', fontSize: '0.74rem', fontWeight: biaya.bold ? 800 : 600, color: biaya.color, fontStyle: biaya.italic ? 'italic' : 'normal', background: biaya.bg || 'transparent', whiteSpace: 'nowrap' }}>
                          {biaya.label}
                        </td>
                        <td style={{ ...tdStyle(true), padding: '0.3rem 0.6rem', fontWeight: biaya.bold ? 900 : 700, color: biaya.color, background: biaya.bg || 'transparent', whiteSpace: 'nowrap', textAlign: 'right' }}>
                          Rp {biaya.value.toLocaleString('id-ID')}
                        </td>

                        {bIdx === 0 && (
                          <>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), padding: '0.4rem', fontWeight: 700, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{item.tandaTanganPenerima || '-'}</td>
                            <td rowSpan={rowSpan} style={{ ...tdStyle(true), padding: '0.4rem' }}>
                              {(item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik') ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <CheckCircle2 size={11} color="#059669" />
                                  Tercetak
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Clock size={11} color="#d97706" />
                                  Belum Dicetak
                                </span>
                              )}
                            </td>
                            {canEdit && (
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), padding: '0.4rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                                  {/* DROPDOWN STATUS CETAK */}
                                  <select
                                    value={(item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik') ? 'Tercetak' : 'Belum Dicetak'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      updateNotaDebit(item.id, { keterangan: val });
                                      toast.success(`Nota Debit ${item.noSeriFormND || ''}: status "${val}"`);
                                    }}
                                    style={{
                                      height: '27px',
                                      padding: '0.1rem 0.4rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      width: '100%',
                                      maxWidth: '120px',
                                      border: (item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik')
                                        ? '1px solid #10b981'
                                        : '1px solid #f59e0b',
                                      background: (item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik')
                                        ? '#ecfdf5'
                                        : '#fffbeb',
                                      color: (item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik')
                                        ? '#047857'
                                        : '#b45309'
                                    }}
                                    title="Ubah status cetak Nota Debit"
                                  >
                                    <option value="Belum Dicetak">⏳ Belum Dicetak</option>
                                    <option value="Tercetak">✅ Tercetak</option>
                                  </select>

                                  {/* TOMBOL AKSI: CETAK, EDIT, HAPUS */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm btn-icon"
                                      onClick={() => {
                                        setPrintItem(item);
                                        setIsPrintOpen(true);
                                        if (!item.keterangan || item.keterangan === 'Belum Dicetak') {
                                          updateNotaDebit(item.id, { keterangan: 'Tercetak' });
                                        }
                                      }}
                                      title="Cetak Tanda Terima Dokumen"
                                      style={{ padding: '0.25rem 0.45rem', background: '#0284c7', borderColor: '#0284c7', color: '#ffffff' }}
                                    >
                                      <Printer size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm btn-icon"
                                      onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                      title="Edit Nota Debit"
                                      style={{ padding: '0.25rem 0.45rem' }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm btn-icon"
                                      onClick={() => handleDelete(item.id, item.noSeriFormND)}
                                      title="Hapus Nota Debit"
                                      style={{ padding: '0.25rem 0.45rem' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ));
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL FORM ── */}
      <NotaDebitModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSave={handleSave}
        initialData={editingItem}
        isEdit={Boolean(editingItem)}
      />

      {/* ── MODAL PRINT TANDA TERIMA DOKUMEN ── */}
      <TandaTerimaNotaDebitModal
        isOpen={isPrintOpen}
        onClose={() => { setIsPrintOpen(false); setPrintItem(null); }}
        data={printItem}
      />

      {/* ── MODAL PRINT DATA CONTROL NOTA DEBIT ── */}
      <DataControlNotaDebitPrintModal
        isOpen={isDataControlPrintOpen}
        onClose={() => setIsDataControlPrintOpen(false)}
        data={filteredData}
        filterLabel={filterSummaryLabel}
      />
    </div>
  );
};
