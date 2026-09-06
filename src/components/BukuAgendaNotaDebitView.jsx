import React, { useState, useMemo } from 'react';
import {
  BookOpen, Plus, Search, Edit2, Trash2, FileSpreadsheet, Printer, Filter, X, Ship, Building2, Calendar, Hash, Truck, DollarSign, CheckCircle2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, formatRupiah } from '../utils/formatters';
import { BukuAgendaNotaDebitPrintModal } from './BukuAgendaNotaDebitPrintModal';

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

export const BukuAgendaNotaDebitView = ({ onOpenCreate, onOpenEdit, onOpenPrint }) => {
  const { agendaNotaDebit = [], deleteAgendaNotaDebit } = useData();
  const { role } = useAuth();

  const isAdmin = role === 'admin' || role === 'developer';
  const canEdit = isAdmin || role === 'keuangan' || role === 'finance';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPrintRegisterOpen, setIsPrintRegisterOpen] = useState(false);

  // Available Years
  const availableYears = useMemo(() => {
    const yearSet = new Set([2024, 2025, 2026, new Date().getFullYear()]);
    (agendaNotaDebit || []).forEach((ag) => {
      if (ag.tanggalSurat) {
        const y = new Date(ag.tanggalSurat).getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [agendaNotaDebit]);

  // Filtered Agenda List
  const filteredData = useMemo(() => {
    return (agendaNotaDebit || []).filter((item) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const noSurat = (item.nomorSurat || '').toLowerCase();
        const perush = (item.namaPerusahaan || '').toLowerCase();
        const resi = (item.noResi || '').toLowerCase();
        const alamat = (item.alamat || '').toLowerCase();
        const ships = (item.items || [])
          .map((it) => `${it.namaKapal || ''} ${it.nomorInvoice || ''} ${it.noSeri || ''}`)
          .join(' ')
          .toLowerCase();

        if (!noSurat.includes(q) && !perush.includes(q) && !resi.includes(q) && !alamat.includes(q) && !ships.includes(q)) {
          return false;
        }
      }

      // 2. Filter Multi Hari / Rentang Tanggal (YYYY-MM-DD)
      if (startDate || endDate) {
        const itemDate = item.tanggalSurat ? String(item.tanggalSurat).split('T')[0] : '';
        if (startDate && (!itemDate || itemDate < startDate)) return false;
        if (endDate && (!itemDate || itemDate > endDate)) return false;
      } else {
        // 3. Year filter
        if (selectedYear !== 'ALL') {
          const y = item.tanggalSurat ? new Date(item.tanggalSurat).getFullYear() : null;
          if (String(y) !== String(selectedYear)) return false;
        }

        // 4. Month filter
        if (selectedMonth !== 'ALL') {
          const m = item.tanggalSurat ? (new Date(item.tanggalSurat).getMonth() + 1).toString().padStart(2, '0') : null;
          if (m !== selectedMonth) return false;
        }
      }

      return true;
    });
  }, [agendaNotaDebit, searchTerm, selectedYear, selectedMonth, startDate, endDate]);

  // Label filter periode
  const filterPeriodText = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return `Tanggal ${formatDateIndo(startDate)}`;
      }
      return `Tanggal ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;
    }
    if (startDate) {
      return `Mulai Tanggal ${formatDateIndo(startDate)}`;
    }
    if (endDate) {
      return `Sampai Tanggal ${formatDateIndo(endDate)}`;
    }
    if (selectedMonth !== 'ALL' && selectedYear !== 'ALL') {
      const monthObj = MONTH_OPTIONS.find((m) => m.value === selectedMonth);
      return `Bulan ${monthObj ? monthObj.label : selectedMonth} ${selectedYear}`;
    }
    if (selectedYear !== 'ALL') {
      return `Tahun ${selectedYear}`;
    }
    if (selectedMonth !== 'ALL') {
      const monthObj = MONTH_OPTIONS.find((m) => m.value === selectedMonth);
      return `Bulan ${monthObj ? monthObj.label : selectedMonth}`;
    }
    return 'Semua Periode';
  }, [startDate, endDate, selectedMonth, selectedYear]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalNominal = 0;
    let totalItems = 0;
    filteredData.forEach((ag) => {
      totalNominal += Number(ag.totalNominal || 0);
      totalItems += Array.isArray(ag.items) ? ag.items.length : 1;
    });
    return {
      totalSurat: filteredData.length,
      totalDokumen: totalItems,
      totalNominal
    };
  }, [filteredData]);

  const hasActiveFilter = Boolean(searchTerm.trim() || selectedYear !== 'ALL' || selectedMonth !== 'ALL' || startDate || endDate);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setStartDate('');
    setEndDate('');
  };

  const handleDelete = (id, nomorSurat) => {
    if (window.confirm(`Yakin ingin menghapus Surat Pengantar ${nomorSurat || id} dari Buku Agenda?`)) {
      deleteAgendaNotaDebit(id);
      toast.success('Surat Pengantar berhasil dihapus dari Buku Agenda');
    }
  };

  // Export Excel Register Buku Agenda
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'PT. Biro Klasifikasi Indonesia (Persero) Pontianak';
      const ws = wb.addWorksheet('BUKU AGENDA NOTA DEBIT', {
        views: [{ showGridLines: true }],
        pageSetup: {
          orientation: 'landscape',
          paperSize: 9, // A4
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0
        }
      });

      ws.columns = [
        { width: 6 },   // No
        { width: 14 },  // Tanggal Surat
        { width: 26 },  // Nomor Surat
        { width: 32 },  // Nama Perusahaan
        { width: 32 },  // Alamat
        { width: 42 },  // Daftar Kapal / Invoice
        { width: 20 },  // Total Nominal (Rp)
        { width: 20 },  // No. Resi
      ];

      // Title
      ws.addRow([]);
      const title = ws.addRow(['BUKU AGENDA SURAT PENGANTAR NOTA DEBIT']);
      title.font = { name: 'Calibri', size: 14, bold: true };
      ws.mergeCells(`A${title.number}:H${title.number}`);
      ws.getCell(`A${title.number}`).alignment = { horizontal: 'center' };

      const sub = ws.addRow([`BKI Cabang Pontianak — Periode: ${filterPeriodText} — Total ${filteredData.length} Surat Pengantar`]);
      sub.font = { name: 'Calibri', size: 10, italic: true };
      ws.mergeCells(`A${sub.number}:H${sub.number}`);
      ws.getCell(`A${sub.number}`).alignment = { horizontal: 'center' };
      ws.addRow([]);

      // Headers
      const header = ws.addRow([
        'No', 'Tanggal Surat', 'Nomor Surat', 'Nama Perusahaan', 'Alamat', 'Daftar Kapal / Invoice', 'Total Nominal (Rp)', 'No. Resi'
      ]);
      header.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      header.height = 24;

      const thinBorder = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      for (let c = 1; c <= 8; c++) {
        const cell = header.getCell(c);
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Rows
      filteredData.forEach((ag, idx) => {
        const shipList = (ag.items || [])
          .map((it) => `${it.namaKapal || '-'} (Inv: ${it.nomorInvoice || '-'}) : Rp ${Number(it.nominal || 0).toLocaleString('id-ID')}`)
          .join('\n');

        const row = ws.addRow([
          idx + 1,
          ag.tanggalSurat ? formatDateIndo(ag.tanggalSurat) : '-',
          ag.nomorSurat || '-',
          ag.namaPerusahaan || '-',
          ag.alamat || '-',
          shipList || '-',
          Number(ag.totalNominal) || 0,
          ag.noResi || '-'
        ]);
        row.alignment = { vertical: 'middle', wrapText: true };
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).numFmt = '#,##0';
        row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

        for (let c = 1; c <= 8; c++) {
          row.getCell(c).border = thinBorder;
          row.getCell(c).font = { name: 'Calibri', size: 9.5 };
        }
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileDateSuffix = startDate ? `${startDate}_sd_${endDate || 'akhir'}` : new Date().toISOString().split('T')[0];
      a.download = `Buku_Agenda_Nota_Debit_${fileDateSuffix}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Buku Agenda Nota Debit berhasil diexport ke Excel!');
    } catch (err) {
      console.error('Error export agenda excel:', err);
      toast.error('Gagal mengexport Buku Agenda ke Excel');
    }
  };

  return (
    <div className="card">
      {/* ── HEADER ── */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="card-title-group">
          <div className="card-icon" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h2 className="card-title">Buku Agenda Nota Debit</h2>
            <div className="card-subtitle">
              Register Surat Pengantar & Pengiriman Dokumen Nota Debet ke Pelanggan
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportExcel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700 }}
            title="Export Buku Agenda ke Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} color="#15803d" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsPrintRegisterOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, background: '#0284c7', borderColor: '#0284c7' }}
            title="Cetak PDF Register Buku Agenda Nota Debit"
          >
            <Printer size={15} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS ── */}
      <div style={{ padding: '0.85rem 1.25rem 0 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Total Surat Pengantar</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
              {summaryMetrics.totalSurat} Surat
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.74rem', color: '#1e40af', fontWeight: 600 }}>Total Dokumen Terkirim</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1d4ed8', marginTop: '0.15rem' }}>
              {summaryMetrics.totalDokumen} Nota Debet
            </div>
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.74rem', color: '#166534', fontWeight: 600 }}>Total Akumulasi Nominal</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', marginTop: '0.15rem' }}>
              Rp {formatRupiah(summaryMetrics.totalNominal)}
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div style={{ padding: '1rem 1.25rem 0.5rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari No. Surat, Perusahaan, Kapal, No. Resi..."
              style={{ paddingLeft: '2.1rem', fontSize: '0.82rem' }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Year Filter */}
          <div style={{ minWidth: '120px' }}>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                if (startDate || endDate) { setStartDate(''); setEndDate(''); }
              }}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (startDate || endDate) { setStartDate(''); setEndDate(''); }
              }}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem' }}
            >
              <option value="ALL">Semua Bulan</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Multi Hari / Rentang Tanggal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.2rem 0.5rem' }}>
            <Calendar size={14} color="#0284c7" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>Tgl:</span>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value) {
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                }
              }}
              style={{ height: '30px', fontSize: '0.78rem', padding: '0.1rem 0.35rem', width: '125px' }}
              title="Tanggal Mulai"
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>s/d</span>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (e.target.value) {
                  setSelectedYear('ALL');
                  setSelectedMonth('ALL');
                }
              }}
              style={{ height: '30px', fontSize: '0.78rem', padding: '0.1rem 0.35rem', width: '125px' }}
              title="Tanggal Akhir"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#94a3b8'
                }}
                title="Hapus Filter Tanggal"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Reset Filter Button */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
            >
              <X size={13} />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* ── AGENDA TABLE ── */}
      <div className="card-body" style={{ padding: '0.75rem 1.25rem 1.5rem 1.25rem' }}>
        {filteredData.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px dashed #cbd5e1'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <BookOpen size={24} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
              {hasActiveFilter ? 'Tidak ada data sesuai filter pencarian' : 'Belum Ada Surat Pengantar di Buku Agenda'}
            </h4>
            <p style={{ margin: '0.35rem 0 1rem 0', fontSize: '0.82rem', color: '#64748b' }}>
              {hasActiveFilter
                ? 'Coba ganti kata kunci atau reset filter untuk melihat data lainnya.'
                : 'Buat Surat Pengantar Nota Debit pertama Anda untuk mengirimkan invoice ke pelanggan.'}
            </p>
            {canEdit && !hasActiveFilter && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onOpenCreate}
                style={{ fontWeight: 800, fontSize: '0.84rem' }}
              >
                + Buat Surat Pengantar Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.6rem', width: '38px', textAlign: 'center' }}>No</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '120px' }}>Tanggal</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '180px' }}>Nomor Surat</th>
                  <th style={{ padding: '0.65rem 0.75rem', minWidth: '180px' }}>Perusahaan & Alamat</th>
                  <th style={{ padding: '0.65rem 0.75rem', minWidth: '220px' }}>Dokumen / Kapal</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '130px', textAlign: 'right' }}>Total Nominal</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '120px' }}>No. Resi</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '110px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    {/* No */}
                    <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                      {idx + 1}
                    </td>

                    {/* Tanggal Surat */}
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                      {item.tanggalSurat ? formatDateIndo(item.tanggalSurat) : '-'}
                    </td>

                    {/* Nomor Surat */}
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.84rem' }}>
                        {item.nomorSurat}
                      </div>
                    </td>

                    {/* Perusahaan & Alamat */}
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                        {item.namaPerusahaan}
                      </div>
                      {item.alamat && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {item.alamat}
                        </div>
                      )}
                      {item.telepon && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Telp. {item.telepon}
                        </div>
                      )}
                    </td>

                    {/* Dokumen / Kapal */}
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {(item.items || []).map((it, iIdx) => (
                          <div
                            key={it.id || iIdx}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '0.3rem 0.5rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>
                              {it.namaKapal || '-'}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                              Inv: {it.nomorInvoice || '-'} {it.noSeri ? `• Seri: ${it.noSeri}` : ''} • Rp {formatRupiah(it.nominal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Total Nominal */}
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 900, color: '#15803d', fontSize: '0.86rem' }}>
                      Rp {formatRupiah(item.totalNominal)}
                    </td>

                    {/* No Resi */}
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem' }}>
                      {item.noResi ? (
                        <span style={{ background: '#f0f9ff', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700, border: '1px solid #bae6fd' }}>
                          {item.noResi}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm btn-icon"
                          onClick={() => onOpenPrint(item)}
                          title="Cetak Surat Pengantar (PDF)"
                          style={{ padding: '0.25rem 0.45rem', background: '#0284c7', borderColor: '#0284c7', color: '#ffffff' }}
                        >
                          <Printer size={13} />
                        </button>

                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm btn-icon"
                              onClick={() => onOpenEdit(item)}
                              title="Edit Surat Pengantar"
                              style={{ padding: '0.25rem 0.45rem' }}
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              className="btn btn-danger btn-sm btn-icon"
                              onClick={() => handleDelete(item.id, item.nomorSurat)}
                              title="Hapus dari Buku Agenda"
                              style={{ padding: '0.25rem 0.45rem' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL CETAK PDF REGISTER BUKU AGENDA ── */}
      <BukuAgendaNotaDebitPrintModal
        isOpen={isPrintRegisterOpen}
        onClose={() => setIsPrintRegisterOpen(false)}
        data={filteredData}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        startDate={startDate}
        endDate={endDate}
        filterPeriodLabel={filterPeriodText}
      />
    </div>
  );
};
