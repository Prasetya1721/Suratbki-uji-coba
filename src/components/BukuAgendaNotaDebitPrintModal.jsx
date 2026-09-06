import React, { useState } from 'react';
import { X, Printer, BookOpen, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';
import { formatDateIndo, formatRupiah } from '../utils/formatters';

export const BukuAgendaNotaDebitPrintModal = ({
  isOpen,
  onClose,
  data = [],
  selectedYear = 'ALL',
  selectedMonth = 'ALL'
}) => {
  const { adminSettings } = useData();
  const { usersList } = useAuth();
  const [withSignature, setWithSignature] = useState(true);

  if (!isOpen) return null;

  // Pejabat TTD
  const kepalaCabangName = (adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT').toUpperCase();
  const kepalaCabangNup = adminSettings?.nup || '48199-KI';

  const pembuatUser = (usersList || []).find((u) =>
    (adminSettings?.pembuatDaftar && u.name === adminSettings.pembuatDaftar) ||
    (u.name && u.name.toUpperCase().includes('RENZA'))
  ) || {};
  const pembuatDaftarName = (adminSettings?.pembuatDaftar || pembuatUser.name || 'RENZA MUHARAM').toUpperCase();
  const pembuatDaftarNup = adminSettings?.nupPembuatDaftar || pembuatUser.nup || '50382-KI';

  // Gambar TTD
  const kacabUser = (usersList || []).find((u) => u.name === kepalaCabangName || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';
  const pembuatSignature = adminSettings?.pembuatSignatureUrl || pembuatUser.signatureUrl || '/signatures/pembuat_renza_signature.png';

  const todayFormatted = formatDateIndo(new Date().toISOString().split('T')[0]);

  // Hitung total akumulasi
  let totalDokumen = 0;
  let totalAkumulasiNominal = 0;
  data.forEach((ag) => {
    totalAkumulasiNominal += Number(ag.totalNominal || 0);
    totalDokumen += Array.isArray(ag.items) ? ag.items.length : 1;
  });

  // Periode label
  const MONTH_NAMES = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
  };

  let filterPeriodText = 'Semua Periode';
  if (selectedMonth !== 'ALL' && selectedYear !== 'ALL') {
    filterPeriodText = `Bulan ${MONTH_NAMES[selectedMonth] || selectedMonth} ${selectedYear}`;
  } else if (selectedYear !== 'ALL') {
    filterPeriodText = `Tahun ${selectedYear}`;
  } else if (selectedMonth !== 'ALL') {
    filterPeriodText = `Bulan ${MONTH_NAMES[selectedMonth] || selectedMonth}`;
  }

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Buku_Agenda_Nota_Debit_BKI_${todayFormatted.replace(/[\s,/-]+/g, '_')}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 600);
  };

  const thStyle = {
    border: '1px solid #000000',
    padding: '5px 4px',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: '7pt',
    color: '#000000',
    verticalAlign: 'middle',
    background: '#e2e8f0',
    lineHeight: '1.2'
  };

  const tdStyle = (align = 'left') => ({
    border: '1px solid #000000',
    padding: '4px 5px',
    fontSize: '7pt',
    textAlign: align,
    verticalAlign: 'middle',
    color: '#000000'
  });

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: '1280px',
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
                background: 'rgba(2, 132, 199, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <BookOpen size={18} color="#0284c7" />
              </div>
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                  Preview & Cetak PDF Buku Agenda Nota Debit
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Format Resmi Landscape A4 • {data.length} Surat Pengantar Terdaftar ({filterPeriodText})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Toggle TTD */}
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

          {/* ── PRINTABLE SHEET BODY ── */}
          <div
            className="modal-body"
            style={{
              padding: '1rem 1.5rem',
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
                padding: '1.25rem 1.25rem',
                margin: '0 auto',
                maxWidth: '1240px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                color: '#000000',
                boxSizing: 'border-box'
              }}
            >
              {/* ====== KOP LOGOS RESMI ====== */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  paddingBottom: '0.4rem',
                  borderBottom: '2px solid #003366'
                }}
              >
                <DanantaraLogo height={30} />
                <IDSurveyLogo height={32} />
                <BKILogo height={30} />
              </div>

              {/* ====== JUDUL DOKUMEN RESMI ====== */}
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '10.5pt', fontWeight: 900, textTransform: 'uppercase', color: '#003366', letterSpacing: '0.04em' }}>
                  PT. BIRO KLASIFIKASI INDONESIA (PERSERO)
                </div>
                <div style={{ fontSize: '9.5pt', fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginTop: '0.1rem' }}>
                  CABANG MADYA KLAS PONTIANAK
                </div>
                <div style={{ fontSize: '11pt', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.04em', marginTop: '0.35rem' }}>
                  BUKU AGENDA SURAT PENGANTAR NOTA DEBIT
                </div>
                <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#334155', marginTop: '0.15rem' }}>
                  PERIODE: {filterPeriodText.toUpperCase()} • TOTAL: {data.length} SURAT ({totalDokumen} DOKUMEN / KAPAL)
                </div>
              </div>

              {/* ====== TABEL BUKU AGENDA ====== */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000000',
                  fontSize: '7pt',
                  lineHeight: '1.25',
                  fontFamily: "'Segoe UI', Arial, sans-serif"
                }}
              >
                <thead>
                  <tr style={{ background: '#e2e8f0' }}>
                    <th style={{ ...thStyle, width: '3%' }}>NO</th>
                    <th style={{ ...thStyle, width: '9%' }}>TANGGAL SURAT</th>
                    <th style={{ ...thStyle, width: '15%' }}>NOMOR SURAT</th>
                    <th style={{ ...thStyle, width: '18%' }}>NAMA PERUSAHAAN</th>
                    <th style={{ ...thStyle, width: '18%' }}>ALAMAT</th>
                    <th style={{ ...thStyle, width: '22%' }}>DAFTAR DOKUMEN / KAPAL</th>
                    <th style={{ ...thStyle, width: '10%', textAlign: 'right' }}>TOTAL NOMINAL (RP)</th>
                    <th style={{ ...thStyle, width: '8%' }}>NO. RESI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ ...tdStyle('center'), padding: '1.5rem', color: '#64748b', fontStyle: 'italic' }}>
                        Tidak ada data Surat Pengantar Nota Debit untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    data.map((ag, idx) => {
                      const items = Array.isArray(ag.items) ? ag.items : [];
                      return (
                        <tr key={ag.id || idx} style={{ background: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                          <td style={tdStyle('center')}>{idx + 1}</td>
                          <td style={tdStyle('center')}>{ag.tanggalSurat ? formatDateIndo(ag.tanggalSurat) : '-'}</td>
                          <td style={{ ...tdStyle('left'), fontWeight: 700, color: '#0369a1' }}>{ag.nomorSurat || '-'}</td>
                          <td style={{ ...tdStyle('left'), fontWeight: 700 }}>{ag.namaPerusahaan || '-'}</td>
                          <td style={tdStyle('left')}>{ag.alamat || '-'}</td>
                          <td style={tdStyle('left')}>
                            {items.length === 0 ? (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {items.map((it, itIdx) => (
                                  <div key={itIdx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: itIdx < items.length - 1 ? '1px dotted #cbd5e1' : 'none', paddingBottom: '2px' }}>
                                    <span>
                                      <strong>{it.namaKapal || '-'}</strong>{' '}
                                      <span style={{ color: '#475569', fontSize: '6.5pt' }}>
                                        (Inv: {it.nomorInvoice || '-'})
                                      </span>
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                                      {formatRupiah(it.nominal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ ...tdStyle('right'), fontWeight: 800, color: '#0f172a' }}>
                            {formatRupiah(ag.totalNominal)}
                          </td>
                          <td style={{ ...tdStyle('center'), fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                            {ag.noResi || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {data.length > 0 && (
                  <tfoot>
                    <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                      <td colSpan={5} style={{ ...tdStyle('right'), fontWeight: 800, paddingRight: '12px' }}>
                        TOTAL KESELURUHAN ({data.length} SURAT / {totalDokumen} DOKUMEN KAPAL) :
                      </td>
                      <td style={tdStyle('center')}>
                        <strong>{totalDokumen} Berkas</strong>
                      </td>
                      <td style={{ ...tdStyle('right'), fontWeight: 900, color: '#003366', fontSize: '7.5pt' }}>
                        {formatRupiah(totalAkumulasiNominal)}
                      </td>
                      <td style={tdStyle('center')}>-</td>
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* ====== BLOK TANDA TANGAN RESMI ====== */}
              <div
                className="print-signature-block"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginTop: '1.5rem',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid'
                }}
              >
                {/* TTD KIRI: MENGETAHUI KEPALA CABANG */}
                <div style={{ textAlign: 'center', minWidth: '260px' }}>
                  <div style={{ fontSize: '8pt', color: '#334155' }}>
                    Mengetahui,
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '8.5pt', color: '#000000' }}>
                    Kepala Cabang
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '8pt', color: '#000000', marginBottom: '0.4rem' }}>
                    PT. Biro Klasifikasi Indonesia (Persero)
                  </div>

                  {withSignature ? (
                    <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.2rem 0' }}>
                      <img
                        src={kacabSignature}
                        alt="TTD Kepala Cabang"
                        style={{ maxHeight: '50px', maxWidth: '170px', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '55px' }} />
                  )}

                  <div style={{ fontWeight: 900, textDecoration: 'underline', fontSize: '9pt', color: '#000000' }}>
                    {kepalaCabangName}
                  </div>
                  <div style={{ fontSize: '7.8pt', color: '#334155' }}>
                    NUP: {kepalaCabangNup}
                  </div>
                </div>

                {/* TTD KANAN: PEMBUAT DAFTAR / KEUANGAN */}
                <div style={{ textAlign: 'center', minWidth: '260px' }}>
                  <div style={{ fontSize: '8pt', color: '#334155' }}>
                    Pontianak, {todayFormatted}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '8.5pt', color: '#000000' }}>
                    Bagian Keuangan / Pembuat Daftar
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '8pt', color: '#000000', marginBottom: '0.4rem' }}>
                    PT. Biro Klasifikasi Indonesia (Persero)
                  </div>

                  {withSignature ? (
                    <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0.2rem 0' }}>
                      <img
                        src={pembuatSignature}
                        alt="TTD Pembuat Daftar"
                        style={{ maxHeight: '50px', maxWidth: '170px', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '55px' }} />
                  )}

                  <div style={{ fontWeight: 900, textDecoration: 'underline', fontSize: '9pt', color: '#000000' }}>
                    {pembuatDaftarName}
                  </div>
                  <div style={{ fontSize: '7.8pt', color: '#334155' }}>
                    NUP: {pembuatDaftarNup}
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
                margin: 6mm 6mm !important;
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
              Pilih <strong>Save as PDF</strong> pada dialog printer browser untuk menyimpan file PDF.
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
