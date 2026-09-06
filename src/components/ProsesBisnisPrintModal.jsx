import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';
import {
  KATEGORI_PROSES_BISNIS,
  PROSES_BISNIS_META,
  MONTH_NAMES
} from '../data/prosesBisnisConstants';
import { formatDateIndo } from '../utils/formatters';

// Helper format angka ribuan dengan titik
const formatNumberId = (val) => {
  if (!val || isNaN(val) || val === 0) return '-';
  return Number(val).toLocaleString('id-ID');
};

export const ProsesBisnisPrintModal = ({
  isOpen,
  onClose,
  selectedYear,
  summary,
  metricType = 'biayaSebelumPPN',
  initialMode = 'ALL' // 'ALL' | 'REVENUE' | 'VOLUME'
}) => {
  const { adminSettings } = useData();
  const { usersList } = useAuth();

  const [printMode, setPrintMode] = useState(initialMode); // 'ALL' | 'REVENUE' | 'VOLUME'
  const [withSignature, setWithSignature] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setPrintMode(initialMode || 'ALL');
    }
  }, [isOpen, initialMode]);

  if (!isOpen || !summary) return null;

  // Nama & NUP Pejabat
  const kepalaCabangName = (adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT').toUpperCase();
  const kepalaCabangNup = adminSettings?.nup || '48199-KI';

  const financeUser = (usersList || []).find((u) => u.role === 'keuangan' || u.username === 'finance' || (u.name && u.name.toUpperCase().includes('FITRIAN'))) || {};
  const pembuatDaftarName = (adminSettings?.pembuatDaftarNotaDebit || (financeUser.name && !financeUser.name.toUpperCase().includes('RENZA') ? financeUser.name : 'Fitrian A,Md')).toUpperCase();
  const pembuatDaftarNup = adminSettings?.nupPembuatDaftarNotaDebit || (financeUser.nup && financeUser.nup !== '50382-KI' ? financeUser.nup : '');

  // TTD Images
  const kacabUser = (usersList || []).find((u) => u.name === kepalaCabangName || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';
  // Fitri belum ada TTD
  const pembuatSignature = adminSettings?.pembuatSignatureNotaDebitUrl || (financeUser.signatureUrl && !financeUser.signatureUrl.includes('pembuat_renza') ? financeUser.signatureUrl : '');

  const todayFormatted = formatDateIndo(new Date().toISOString().split('T')[0]);

  const metricLabel = metricType === 'biayaSebelumPPN'
    ? 'Biaya Sebelum PPN'
    : metricType === 'totalSetelahPPN'
      ? 'Total Setelah PPN'
      : 'Fee Survey Saja';

  const handlePrint = () => {
    const originalTitle = document.title;
    const modeName = printMode === 'REVENUE'
      ? 'Nilai_Pendapatan'
      : printMode === 'VOLUME'
        ? 'Volume_Produksi'
        : 'Lengkap';

    document.title = `Laporan_Proses_Bisnis_${modeName}_${selectedYear}_BKI_Pontianak`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 600);
  };

  const renderTableRevenue = () => (
    <div style={{ marginBottom: printMode === 'ALL' ? '1.5rem' : '0' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1.5px solid #000000',
          fontSize: '7.8pt',
          lineHeight: '1.25',
          fontFamily: "'Segoe UI', Arial, sans-serif"
        }}
      >
        <thead>
          {/* Judul Utama Tabel */}
          <tr style={{ background: '#f8fafc' }}>
            <th
              colSpan={14}
              style={{
                border: '1px solid #000000',
                padding: '5px 8px',
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '8.8pt',
                color: '#000000',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}
            >
              PROSES BISNIS / POTENSI PRODUKSI {selectedYear} (NILAI PENDAPATAN RUPIAH)
            </th>
          </tr>
          {/* Header Bulan */}
          <tr style={{ background: '#e2e8f0', textAlign: 'center', fontWeight: 800 }}>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'left', width: '22%' }}>
              KATEGORI
            </th>
            {MONTH_NAMES.map((m) => (
              <th key={m} style={{ border: '1px solid #000000', padding: '5px 2px', width: '5.8%', textAlign: 'center' }}>
                {m}
              </th>
            ))}
            <th style={{ border: '1px solid #000000', padding: '5px 4px', width: '8.4%', textAlign: 'right', background: '#cbd5e1' }}>
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {KATEGORI_PROSES_BISNIS.map((kat) => {
            const meta = PROSES_BISNIS_META[kat];
            const katTotal = summary.yearlyRevenueByCategory[kat] || 0;

            return (
              <tr key={kat} style={{ pageBreakInside: 'avoid' }}>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    fontWeight: 700,
                    background: meta.bg,
                    color: meta.textColor,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {kat}
                </td>
                {MONTH_NAMES.map((_, mIdx) => {
                  const val = summary.revenueMatrix[kat]?.[mIdx] || 0;
                  return (
                    <td
                      key={mIdx}
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 3px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        fontSize: '7.4pt'
                      }}
                    >
                      {formatNumberId(val)}
                    </td>
                  );
                })}
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 5px',
                    textAlign: 'right',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    fontSize: '7.6pt',
                    background: '#f8fafc'
                  }}
                >
                  {formatNumberId(katTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 900, background: '#f1f5f9', pageBreakInside: 'avoid' }}>
            <td
              style={{
                border: '1px solid #000000',
                borderBottom: '2.5px double #000000',
                padding: '5px 6px',
                textAlign: 'left',
                fontSize: '8pt',
                letterSpacing: '0.02em'
              }}
            >
              PENDAPATAN {selectedYear}
            </td>
            {MONTH_NAMES.map((_, mIdx) => {
              const mTotal = summary.monthlyRevenueTotals[mIdx] || 0;
              return (
                <td
                  key={mIdx}
                  style={{
                    border: '1px solid #000000',
                    borderBottom: '2.5px double #000000',
                    padding: '5px 3px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '7.6pt'
                  }}
                >
                  {formatNumberId(mTotal)}
                </td>
              );
            })}
            <td
              style={{
                border: '1px solid #000000',
                borderBottom: '2.5px double #000000',
                padding: '5px 5px',
                textAlign: 'right',
                fontFamily: 'monospace',
                fontSize: '8pt',
                background: '#e2e8f0',
                color: '#000000'
              }}
            >
              {formatNumberId(summary.grandTotalRevenue)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderTableVolume = () => (
    <div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1.5px solid #000000',
          fontSize: '7.8pt',
          lineHeight: '1.25',
          fontFamily: "'Segoe UI', Arial, sans-serif"
        }}
      >
        <thead>
          {/* Judul Utama Tabel */}
          <tr style={{ background: '#f8fafc' }}>
            <th
              colSpan={14}
              style={{
                border: '1px solid #000000',
                padding: '5px 8px',
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '8.8pt',
                color: '#000000',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}
            >
              PROSES BISNIS / POTENSI PRODUKSI {selectedYear} (VOLUME / TRANSAKSI)
            </th>
          </tr>
          {/* Header Bulan */}
          <tr style={{ background: '#e2e8f0', textAlign: 'center', fontWeight: 800 }}>
            <th style={{ border: '1px solid #000000', padding: '5px 6px', textAlign: 'left', width: '22%' }}>
              KATEGORI
            </th>
            {MONTH_NAMES.map((m) => (
              <th key={m} style={{ border: '1px solid #000000', padding: '5px 2px', width: '5.8%', textAlign: 'center' }}>
                {m}
              </th>
            ))}
            <th style={{ border: '1px solid #000000', padding: '5px 4px', width: '8.4%', textAlign: 'center', background: '#cbd5e1' }}>
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {KATEGORI_PROSES_BISNIS.map((kat) => {
            const meta = PROSES_BISNIS_META[kat];
            const katVolTotal = summary.yearlyVolumeByCategory[kat] || 0;

            return (
              <tr key={kat} style={{ pageBreakInside: 'avoid' }}>
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 6px',
                    fontWeight: 700,
                    background: meta.bg,
                    color: meta.textColor,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {kat}
                </td>
                {MONTH_NAMES.map((_, mIdx) => {
                  const val = summary.volumeMatrix[kat]?.[mIdx] || 0;
                  return (
                    <td
                      key={mIdx}
                      style={{
                        border: '1px solid #000000',
                        padding: '4px 3px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: '7.6pt'
                      }}
                    >
                      {val > 0 ? val : '-'}
                    </td>
                  );
                })}
                <td
                  style={{
                    border: '1px solid #000000',
                    padding: '4px 5px',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    fontSize: '7.6pt',
                    background: '#f8fafc'
                  }}
                >
                  {katVolTotal > 0 ? katVolTotal : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 900, background: '#f1f5f9', pageBreakInside: 'avoid' }}>
            <td
              style={{
                border: '1px solid #000000',
                borderBottom: '2.5px double #000000',
                padding: '5px 6px',
                textAlign: 'left',
                fontSize: '8pt',
                letterSpacing: '0.02em'
              }}
            >
              TOTAL PRODUKSI {selectedYear}
            </td>
            {MONTH_NAMES.map((_, mIdx) => {
              const mVolTotal = summary.monthlyVolumeTotals[mIdx] || 0;
              return (
                <td
                  key={mIdx}
                  style={{
                    border: '1px solid #000000',
                    borderBottom: '2.5px double #000000',
                    padding: '5px 3px',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: '7.6pt'
                  }}
                >
                  {mVolTotal > 0 ? mVolTotal : '-'}
                </td>
              );
            })}
            <td
              style={{
                border: '1px solid #000000',
                borderBottom: '2.5px double #000000',
                padding: '5px 5px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: '8pt',
                background: '#e2e8f0',
                color: '#000000'
              }}
            >
              {summary.grandTotalVolume}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: '1200px',
            width: '98vw',
            maxHeight: '94vh',
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── TOOLBAR HEADER MODAL ── */}
          <div
            className="modal-header"
            style={{
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '8px',
                background: 'rgba(2,132,199,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={18} color="#0284c7" />
              </div>
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                  Preview & Cetak PDF Proses Bisnis {selectedYear}
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Format Resmi Landscape A4 • Siap Cetak / Save to PDF
                </div>
              </div>
            </div>

            {/* Switcher Mode Cetak & TTD */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Opsi Tampilan Tabel */}
              <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => setPrintMode('ALL')}
                  style={{
                    border: 'none',
                    background: printMode === 'ALL' ? '#003366' : 'transparent',
                    color: printMode === 'ALL' ? '#ffffff' : '#334155',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Semua (2 Tabel)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('REVENUE')}
                  style={{
                    border: 'none',
                    background: printMode === 'REVENUE' ? '#003366' : 'transparent',
                    color: printMode === 'REVENUE' ? '#ffffff' : '#334155',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Tabel 1 (Nilai Rp)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('VOLUME')}
                  style={{
                    border: 'none',
                    background: printMode === 'VOLUME' ? '#003366' : 'transparent',
                    color: printMode === 'VOLUME' ? '#ffffff' : '#334155',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Tabel 2 (Volume)
                </button>
              </div>

              {/* Toggle Versi TTD */}
              <button
                type="button"
                className={`btn btn-sm ${withSignature ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setWithSignature(!withSignature)}
                style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.75rem' }}
              >
                {withSignature ? '✍️ Dgn TTD' : '📄 Tanpa TTD'}
              </button>

              <button className="btn btn-secondary btn-sm" onClick={onClose} title="Tutup">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── DOCUMENT BODY (PRINTABLE SHEET) ── */}
          <div
            className="modal-body"
            style={{
              padding: '1.25rem 1.75rem',
              overflowY: 'auto',
              flex: '1 1 auto',
              minHeight: 0,
              background: '#f8fafc'
            }}
          >
            <div
              className="printable-sheet"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '1.25rem 1.5rem',
                margin: '0 auto',
                maxWidth: '1120px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                color: '#000000',
                boxSizing: 'border-box'
              }}
            >
              {/* ====== KOP LOGOS RESMI BKI ====== */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #003366'
                }}
              >
                <DanantaraLogo height={32} />
                <IDSurveyLogo height={34} />
                <BKILogo height={32} />
              </div>

              {/* ====== JUDUL DOKUMEN RESMI ====== */}
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '11pt', fontWeight: 900, textTransform: 'uppercase', color: '#003366', letterSpacing: '0.04em' }}>
                  PT. BIRO KLASIFIKASI INDONESIA (PERSERO)
                </div>
                <div style={{ fontSize: '10pt', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginTop: '0.15rem' }}>
                  CABANG MADYA KLAS PONTIANAK
                </div>
                <div style={{ fontSize: '11.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.04em', marginTop: '0.5rem' }}>
                  LAPORAN REKAPITULASI PROSES BISNIS / POTENSI PRODUKSI TAHUN {selectedYear}
                </div>
                <div style={{ fontSize: '8.5pt', fontWeight: 600, color: '#334155', marginTop: '0.2rem' }}>
                  {printMode === 'REVENUE' && `(NILAI PENDAPATAN RUPIAH - ${metricLabel.toUpperCase()})`}
                  {printMode === 'VOLUME' && `(VOLUME / JUMLAH TRANSAKSI UNIT PRODUKSI)`}
                  {printMode === 'ALL' && `(NILAI PENDAPATAN RUPIAH & VOLUME UNIT PRODUKSI • ${metricLabel.toUpperCase()})`}
                </div>
              </div>

              {/* ====== TABEL SESUAI MODE ====== */}
              {(printMode === 'ALL' || printMode === 'REVENUE') && renderTableRevenue()}
              {(printMode === 'ALL' || printMode === 'VOLUME') && renderTableVolume()}

              {/* ====== BLOK TANDA TANGAN RESMI ====== */}
              <div
                className="print-signature-block"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginTop: '1.75rem',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid'
                }}
              >
                {/* TTD KIRI: MENGETAHUI KEPALA CABANG */}
                <div style={{ textAlign: 'center', minWidth: '260px' }}>
                  <div style={{ fontSize: '8.5pt', color: '#334155' }}>
                    Mengetahui,
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '9pt', color: '#000000' }}>
                    Kepala Cabang
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '8.5pt', color: '#000000', marginBottom: '0.5rem' }}>
                    PT. Biro Klasifikasi Indonesia (Persero)
                  </div>

                  {withSignature ? (
                    <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.2rem 0' }}>
                      <img
                        src={kacabSignature}
                        alt="TTD Kepala Cabang"
                        style={{ maxHeight: '55px', maxWidth: '180px', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '60px' }} />
                  )}

                  <div style={{ fontWeight: 900, textDecoration: 'underline', fontSize: '9.5pt', color: '#000000' }}>
                    {kepalaCabangName}
                  </div>
                  <div style={{ fontSize: '8pt', color: '#334155' }}>
                    NUP: {kepalaCabangNup}
                  </div>
                </div>

                {/* TTD KANAN: PEMBUAT DAFTAR / KEUANGAN */}
                <div style={{ textAlign: 'center', minWidth: '260px' }}>
                  <div style={{ fontSize: '8.5pt', color: '#334155' }}>
                    Pontianak, {todayFormatted}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '9pt', color: '#000000' }}>
                    Bagian Keuangan / Pembuat Laporan
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '8.5pt', color: '#000000', marginBottom: '0.5rem' }}>
                    PT. Biro Klasifikasi Indonesia (Persero)
                  </div>

                  {withSignature && pembuatSignature ? (
                    <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.2rem 0' }}>
                      <img
                        src={pembuatSignature}
                        alt="TTD Pembuat Daftar"
                        style={{ maxHeight: '55px', maxWidth: '180px', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '60px' }} />
                  )}

                  <div style={{ fontWeight: 900, textDecoration: 'underline', fontSize: '9.5pt', color: '#000000' }}>
                    {pembuatDaftarName}
                  </div>
                  <div style={{ fontSize: '8pt', color: '#334155', minHeight: '14px' }}>
                    {pembuatDaftarNup ? `NUP: ${pembuatDaftarNup}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CSS KHUSUS MEDIA PRINT (A4 LANDSCAPE) ── */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape !important;
                margin: 7mm 7mm !important;
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .modal-overlay {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
              }
              .modal-content {
                max-width: 100% !important;
                width: 100% !important;
                border: none !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                max-height: none !important;
                height: auto !important;
              }
              .modal-header, .modal-footer {
                display: none !important;
              }
              .modal-body {
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
                background: #ffffff !important;
              }
              .printable-sheet {
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                margin: 0 !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
              th, td {
                border: 1px solid #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-signature-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin-top: 1.25rem !important;
              }
            }
          `}</style>

          {/* ── MODAL FOOTER ── */}
          <div
            className="modal-footer"
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Pilih <strong>Save as PDF</strong> pada dialog print browser untuk menyimpan sebagai file PDF.
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#0284c7',
                  borderColor: '#0284c7',
                  fontWeight: 700
                }}
              >
                <Printer size={16} />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
