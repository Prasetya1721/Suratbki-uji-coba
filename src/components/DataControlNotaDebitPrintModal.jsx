import React, { useState } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';
import { PROSES_BISNIS_META, determineKategoriBisnis } from '../data/prosesBisnisConstants';
import { formatDateIndo } from '../utils/formatters';

export const DataControlNotaDebitPrintModal = ({
  isOpen,
  onClose,
  data = [],
  filterLabel = ''
}) => {
  const { adminSettings } = useData();
  const { usersList } = useAuth();
  const [withSignature, setWithSignature] = useState(true);

  if (!isOpen) return null;

  // Pejabat TTD
  const kepalaCabangName = (adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT').toUpperCase();
  const kepalaCabangNup = adminSettings?.nup || '48199-KI';

  const financeUser = (usersList || []).find((u) => u.role === 'keuangan' || u.username === 'finance' || (u.name && u.name.toUpperCase().includes('FITRIAN'))) || {};
  const pembuatDaftarName = (adminSettings?.pembuatDaftarNotaDebit || (financeUser.name && !financeUser.name.toUpperCase().includes('RENZA') ? financeUser.name : 'Fitrian A,Md')).toUpperCase();
  const pembuatDaftarNup = adminSettings?.nupPembuatDaftarNotaDebit || (financeUser.nup && financeUser.nup !== '50382-KI' ? financeUser.nup : '');

  // Gambar TTD
  const kacabUser = (usersList || []).find((u) => u.name === kepalaCabangName || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';
  // Fitri belum ada TTD
  const pembuatSignature = adminSettings?.pembuatSignatureNotaDebitUrl || (financeUser.signatureUrl && !financeUser.signatureUrl.includes('pembuat_renza') ? financeUser.signatureUrl : '');

  const todayFormatted = formatDateIndo(new Date().toISOString().split('T')[0]);

  const defaultPpnRate = adminSettings?.ppnRate !== undefined ? Number(adminSettings.ppnRate) : 11;

  // Hitung total akumulasi
  const totalBiayaSebelumPPN = data.reduce((s, i) => s + (Number(i.feeSurvey) || 0) + (Number(i.biayaSurvey) || 0), 0);
  const totalPPN = data.reduce((s, i) => {
    if (i.ppnAmount !== undefined && i.ppnAmount !== null) return s + Number(i.ppnAmount);
    const sub = (Number(i.feeSurvey) || 0) + (Number(i.biayaSurvey) || 0);
    const rate = i.ppnRate !== undefined ? Number(i.ppnRate) : defaultPpnRate;
    return s + Math.round(sub * (rate / 100));
  }, 0);
  const totalSetelahPPN = totalBiayaSebelumPPN + totalPPN;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Data_Control_Nota_Debit_BKI_Pontianak_${todayFormatted.replace(/[\s,/-]+/g, '_')}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 600);
  };

  const thStyle = {
    border: '1px solid #000000',
    padding: '4px 3px',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: '6.8pt',
    color: '#000000',
    verticalAlign: 'middle',
    background: '#e2e8f0',
    lineHeight: '1.2'
  };

  const tdStyle = (center = false) => ({
    border: '1px solid #000000',
    padding: '3px 4px',
    fontSize: '6.8pt',
    textAlign: center ? 'center' : 'left',
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
                background: 'rgba(3,105,161,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileText size={18} color="#0369a1" />
              </div>
              <div>
                <h3 className="modal-title" style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                  Preview & Cetak PDF Data Control Nota Debit
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Format Resmi Landscape A4 • {data.length} Nota Debit Terdaftar {filterLabel ? `(${filterLabel})` : ''}
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
                  DATA CONTROL PENGGUNAAN FORM NOTA DEBIT
                </div>
                <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#334155', marginTop: '0.15rem' }}>
                  SEGMEN KLASIFIKASI {filterLabel ? `• FILTER: ${filterLabel.toUpperCase()}` : ''}
                </div>
              </div>

              {/* ====== TABEL DATA CONTROL ====== */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000000',
                  fontSize: '6.8pt',
                  lineHeight: '1.2',
                  fontFamily: "'Segoe UI', Arial, sans-serif"
                }}
              >
                <thead>
                  <tr style={{ background: '#e2e8f0' }}>
                    <th rowSpan={2} style={{ ...thStyle, width: '2.5%' }}>NO</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '5.5%' }}>NO. SERI FORM ND</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '6%' }}>NO BILLING</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '6.5%' }}>TANGGAL ND</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '7%' }}>NO INVOICE</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '10%' }}>NAMA OBYEK PRODUKSI</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '6.5%' }}>AGENDA PERMOHONAN</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '8%' }}>LAPORAN SURVEY</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '8.5%' }}>NAMA SURVEYOR</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '9%' }}>PENGGUNA JASA</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '5.5%' }}>JENIS SURVEY</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '7%' }}>PROSES BISNIS</th>
                    <th colSpan={2} style={{ ...thStyle, width: '12%' }}>BIAYA</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '4%' }}>TTD PENERIMA</th>
                    <th rowSpan={2} style={{ ...thStyle, width: '5.5%' }}>KET</th>
                  </tr>
                  <tr style={{ background: '#cbd5e1' }}>
                    <th style={{ ...thStyle, fontSize: '6.5pt', width: '6.5%' }}>KETERANGAN</th>
                    <th style={{ ...thStyle, fontSize: '6.5pt', width: '5.5%' }}>JUMLAH RP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={15} style={{ border: '1px solid #000000', padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada data Nota Debit yang tersedia untuk dicetak.
                      </td>
                    </tr>
                  ) : (
                    data.map((item, idx) => {
                      const itemPpnRate = item.ppnRate !== undefined ? Number(item.ppnRate) : defaultPpnRate;
                      const biayaSebelumPPN = (Number(item.feeSurvey) || 0) + (Number(item.biayaSurvey) || 0);
                      const ppnAmount = item.ppnAmount !== undefined ? Number(item.ppnAmount) : Math.round(biayaSebelumPPN * (itemPpnRate / 100));
                      const totalSetelahPPN = item.totalSetelahPPN !== undefined ? Number(item.totalSetelahPPN) : (biayaSebelumPPN + ppnAmount);
                      const kat = item.kategoriBisnis || determineKategoriBisnis(item.jenisSurvey || '');
                      const meta = PROSES_BISNIS_META[kat] || { bg: '#f8fafc', textColor: '#0f172a', name: kat };

                      const computedBiaya = [
                        { label: 'Fee Survey', value: Number(item.feeSurvey) || 0 },
                        { label: 'Biaya Survey', value: Number(item.biayaSurvey) || 0 },
                        { label: 'Biaya Sblm PPN', value: biayaSebelumPPN },
                        { label: `PPN ${itemPpnRate}%`, value: ppnAmount, italic: true },
                        { label: 'Total Stlh PPN', value: totalSetelahPPN, bold: true, bg: '#f1f5f9' },
                      ];

                      const rowSpan = computedBiaya.length;

                      return computedBiaya.map((biaya, bIdx) => (
                        <tr key={`${item.id || idx}-${bIdx}`} style={{ pageBreakInside: 'avoid', background: biaya.bg || '#ffffff' }}>
                          {bIdx === 0 && (
                            <>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontWeight: 700 }}>{idx + 1}</td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontWeight: 800, color: '#0369a1', fontFamily: 'monospace' }}>
                                {item.noSeriFormND || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontSize: '6.5pt' }}>
                                {item.noBilling || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), whiteSpace: 'nowrap', fontSize: '6.5pt' }}>
                                {item.tanggalND ? formatDateIndo(item.tanggalND) : '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(), fontSize: '6.5pt' }}>
                                {item.nomorInvoice || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(), fontWeight: 800, textTransform: 'uppercase' }}>
                                {item.namaObyekProduksi || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontSize: '6.5pt' }}>
                                {item.nomorAgendaPermohonan || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(), fontSize: '6.5pt' }}>
                                {item.nomorLaporanSurvey || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(), fontWeight: 700 }}>
                                {item.namaSurveyor || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(), fontWeight: 600, textTransform: 'uppercase', fontSize: '6.5pt' }}>
                                {item.penggunaJasa || '-'}
                              </td>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontWeight: 700, fontSize: '6.5pt' }}>
                                {item.jenisSurvey || '-'}
                              </td>
                              <td
                                rowSpan={rowSpan}
                                style={{
                                  ...tdStyle(true),
                                  background: meta.bg,
                                  color: meta.textColor,
                                  fontWeight: 800,
                                  fontSize: '6.2pt',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {meta.name || kat}
                              </td>
                            </>
                          )}

                          {/* KETERANGAN BIAYA & JUMLAH */}
                          <td
                            style={{
                              ...tdStyle(),
                              fontSize: '6.4pt',
                              fontWeight: biaya.bold ? 800 : 500,
                              fontStyle: biaya.italic ? 'italic' : 'normal',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {biaya.label}
                          </td>
                          <td
                            style={{
                              ...tdStyle(true),
                              textAlign: 'right',
                              fontFamily: 'monospace',
                              fontWeight: biaya.bold ? 800 : 600,
                              fontSize: '6.5pt',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {Number(biaya.value).toLocaleString('id-ID')}
                          </td>

                          {bIdx === 0 && (
                            <>
                              <td rowSpan={rowSpan} style={{ ...tdStyle(true), fontSize: '6.5pt' }}>
                                {(item.tandaTanganPenerima && item.tandaTanganPenerima !== '-' && item.tandaTanganPenerima.toLowerCase() !== 'aada') ? item.tandaTanganPenerima : 'Fitrian A,Md'}
                              </td>
                              <td rowSpan={rowSpan} style={{
                                ...tdStyle(true),
                                fontSize: '6.5pt',
                                fontWeight: (item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik') ? 800 : 500,
                                color: (item.keterangan === 'Tercetak' || item.keterangan === 'Tercetak Baik') ? '#047857' : '#000000',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.keterangan || 'Belum Dicetak'}
                              </td>
                            </>
                          )}
                        </tr>
                      ));
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 900, background: '#e2e8f0', pageBreakInside: 'avoid' }}>
                    <td colSpan={12} style={{ border: '1px solid #000000', borderBottom: '2.5px double #000000', padding: '5px 8px', textAlign: 'center', fontSize: '7.5pt' }}>
                      TOTAL REKAPITULASI ({data.length} NOTA DEBIT)
                    </td>
                    <td style={{ border: '1px solid #000000', borderBottom: '2.5px double #000000', padding: '5px 4px', textAlign: 'left', fontSize: '7pt' }}>
                      TOTAL SETELAH PPN
                    </td>
                    <td style={{ border: '1px solid #000000', borderBottom: '2.5px double #000000', padding: '5px 4px', textAlign: 'right', fontFamily: 'monospace', fontSize: '7.5pt', whiteSpace: 'nowrap' }}>
                      Rp {totalSetelahPPN.toLocaleString('id-ID')}
                    </td>
                    <td colSpan={2} style={{ border: '1px solid #000000', borderBottom: '2.5px double #000000' }}></td>
                  </tr>
                </tfoot>
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

                  {withSignature && pembuatSignature ? (
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
                  <div style={{ fontSize: '7.8pt', color: '#334155', minHeight: '14px' }}>
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
