import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Maximize2, Minimize2, Edit3, Check, RotateCcw } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';

export const TandaTerimaNotaDebitModal = ({ isOpen, onClose, data }) => {
  const { adminSettings, getCompanyAddress, saveCompanyAddress } = useData();
  const { usersList } = useAuth();

  const [withSignature, setWithSignature] = useState(true);
  const [mobileFit, setMobileFit] = useState(true);
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  // Editable overrides for recipient details & letter number
  const [customNomorSurat, setCustomNomorSurat] = useState('');
  const [customAlamat, setCustomAlamat] = useState('');
  const [customTelepon, setCustomTelepon] = useState('');
  const [customKota, setCustomKota] = useState('PONTIANAK');

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync / load defaults when data changes
  useEffect(() => {
    if (data) {
      const yearStr = data.tanggalND ? new Date(data.tanggalND).getFullYear().toString().slice(-2) : '26';
      const noSeriPadded = data.noSeriFormND ? String(data.noSeriFormND).padStart(5, '0') : '00745';
      const defaultNomor = `B.${noSeriPadded}/KU.403/PK/KI-${yearStr}`;

      // Check database / companyDirectory for company address
      const companyKey = (data.penggunaJasa || '').trim().toUpperCase();
      const dbAddr = getCompanyAddress ? getCompanyAddress(companyKey) : null;
      let savedAddr = dbAddr?.alamat || '';
      let savedTel = dbAddr?.telepon || '';
      let savedCity = dbAddr?.kota || 'PONTIANAK';

      if (!savedAddr && companyKey) {
        try {
          const stored = localStorage.getItem(`st_addr_${companyKey}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            savedAddr = parsed.alamat || '';
            savedTel = parsed.telepon || '';
            savedCity = parsed.kota || 'PONTIANAK';
          }
        } catch {}
      }

      const isSinarLaut = companyKey.includes('SINAR LAUT');
      setCustomNomorSurat(defaultNomor);
      setCustomAlamat(savedAddr || (isSinarLaut ? 'JL. BUDI KARYA NO. C.8 – C.20' : ''));
      setCustomTelepon(savedTel || (isSinarLaut ? '0561-577211' : ''));
      setCustomKota(savedCity || 'PONTIANAK');
      setIsEditingCustom(false);
    }
  }, [data, isOpen, getCompanyAddress]);

  if (!isOpen || !data) return null;

  const handleSaveCustom = () => {
    const companyKey = (data.penggunaJasa || '').trim().toUpperCase();
    if (companyKey && saveCompanyAddress) {
      saveCompanyAddress(companyKey, {
        alamat: customAlamat,
        telepon: customTelepon,
        kota: customKota,
      });
    }
    setIsEditingCustom(false);
  };

  const isMobileScreen = windowWidth <= 768;
  const targetDocWidth = 794; // standard A4 @ 96dpi is ~794px width
  const fitScale = isMobileScreen ? Math.min(Math.max((windowWidth - 24) / targetDocWidth, 0.35), 1) : 1;

  // Tanggal Nota Debit / Tanggal Surat
  const tglSuratFormatted = data.tanggalND ? formatDateIndo(data.tanggalND) : '3 September 2026';

  // Kepala Cabang details
  const kepalaCabang = adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT';
  const kepalaCabangDisplay = kepalaCabang.toUpperCase().includes('MUHSON') ? 'Muhson Nurrochmat S' : kepalaCabang;
  const nup = adminSettings?.nup || '48199-KLAS';

  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';

  // Format Rupiah
  const formatRupiah = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('id-ID');
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const obyek = (data.namaObyekProduksi || 'KAPAL').replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `Tanda_Terima_Dokumen_ND_${obyek}_${data.noSeriFormND || ''}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: isMobileScreen ? '100vw' : '880px',
            width: isMobileScreen ? '100vw' : 'auto',
            maxHeight: isMobileScreen ? '100dvh' : '95vh',
            height: isMobileScreen ? '100dvh' : 'auto',
            background: '#ffffff',
            color: '#000000',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ====== TOOLBAR HEADER ====== */}
          <div
            className="modal-header no-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 1rem',
              borderBottom: '1px solid #e2e8f0',
              background: '#0f172a',
              color: '#ffffff',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                📄 Tanda Terima Dokumen — Nota Debet
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {data.namaObyekProduksi || '-'} • No. Seri: {data.noSeriFormND || '-'} • {data.penggunaJasa || '-'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setIsEditingCustom(!isEditingCustom)}
                style={{
                  background: isEditingCustom ? '#3b82f6' : 'rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                }}
                title="Sesuaikan Nomor Surat, Alamat, atau Kontak"
              >
                <Edit3 size={13} />
                <span>{isEditingCustom ? 'Tutup Edit' : 'Edit Alamat / No.'}</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setWithSignature(!withSignature)}
                style={{
                  background: withSignature ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
                  color: withSignature ? '#34d399' : '#cbd5e1',
                  border: withSignature ? '1px solid #059669' : '1px solid rgba(255,255,255,0.2)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                }}
              >
                {withSignature ? '✓ TTD' : 'Tanpa TTD'}
              </button>

              {isMobileScreen && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setMobileFit(!mobileFit)}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.5rem',
                    borderRadius: '6px',
                  }}
                  title={mobileFit ? 'Ukuran Asli' : 'Sesuaikan Layar'}
                >
                  {mobileFit ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
              )}

              <button
                type="button"
                className="btn btn-sm"
                onClick={handlePrint}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Printer size={14} />
                <span>Cetak / PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
                title="Tutup"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ====== EDIT PANEL (OVERRIDE NO SURAT & ALAMAT) ====== */}
          {isEditingCustom && (
            <div
              className="no-print"
              style={{
                background: '#f1f5f9',
                borderBottom: '1px solid #cbd5e1',
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.65rem',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.2rem', fontSize: '0.72rem' }}>
                  Nomor Tanda Terima:
                </label>
                <input
                  type="text"
                  value={customNomorSurat}
                  onChange={(e) => setCustomNomorSurat(e.target.value)}
                  style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.2rem', fontSize: '0.72rem' }}>
                  Alamat Perusahaan:
                </label>
                <input
                  type="text"
                  value={customAlamat}
                  onChange={(e) => setCustomAlamat(e.target.value.toUpperCase())}
                  placeholder="JL. BUDI KARYA NO. C.8 – C.20"
                  style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.2rem', fontSize: '0.72rem' }}>
                  Telepon:
                </label>
                <input
                  type="text"
                  value={customTelepon}
                  onChange={(e) => setCustomTelepon(e.target.value)}
                  placeholder="0561-577211"
                  style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.2rem', fontSize: '0.72rem' }}>
                  Kota:
                </label>
                <input
                  type="text"
                  value={customKota}
                  onChange={(e) => setCustomKota(e.target.value.toUpperCase())}
                  placeholder="PONTIANAK"
                  style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.35rem 0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <Check size={13} />
                  <span>Terapkan</span>
                </button>
              </div>
            </div>
          )}

          {/* ====== DOCUMENT SHEET BODY ====== */}
          <div
            className="modal-body print-modal-body"
            style={{
              padding: isMobileScreen ? '0.5rem' : '1.5rem',
              overflow: 'auto',
              flex: '1 1 auto',
              background: '#64748b20',
            }}
          >
            <div
              className="printable-sheet-wrapper"
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <div
                className="printable-sheet"
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.12)',
                  boxSizing: 'border-box',
                  width: `${targetDocWidth}px`,
                  minHeight: '1050px',
                  padding: '24mm 24mm 18mm 24mm',
                  fontFamily: "'Segoe UI', Arial, sans-serif",
                  fontSize: '10.5pt',
                  lineHeight: '1.35',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  zoom: isMobileScreen && mobileFit ? fitScale : 1,
                }}
              >
                {/* 1. KOP TIGA LOGO */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.8rem',
                      paddingBottom: '0.4rem',
                    }}
                  >
                    <DanantaraLogo height={42} />
                    <IDSurveyLogo height={42} />
                    <BKILogo height={40} />
                  </div>

                  {/* 2. TANGGAL KANAN ATAS */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                    <div style={{ textAlign: 'left', minWidth: '240px', fontSize: '10pt', color: '#111827' }}>
                      Pontianak, {tglSuratFormatted}
                    </div>
                  </div>

                  {/* 3. TUJUAN SURAT / YTH */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.75rem' }}>
                    <div style={{ minWidth: '240px', fontSize: '10pt', lineHeight: '1.35' }}>
                      <div style={{ color: '#111827' }}>Kepada</div>
                      <div style={{ display: 'flex' }}>
                        <span style={{ width: '40px', fontWeight: 600 }}>Yth.</span>
                        <div>
                          <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#000000' }}>
                            {data.penggunaJasa || 'PT. SINAR LAUT KHATULISTIWA'}
                          </div>
                          {customAlamat && (
                            <div style={{ color: '#1f2937', textTransform: 'uppercase' }}>
                              {customAlamat}
                            </div>
                          )}
                          {customTelepon && (
                            <div style={{ color: '#1f2937' }}>
                              {customTelepon}
                            </div>
                          )}
                          {customKota && (
                            <div style={{ color: '#1f2937', textTransform: 'uppercase' }}>
                              {customKota}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. JUDUL & NOMOR SURAT */}
                  <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '12pt',
                        fontWeight: 900,
                        textDecoration: 'underline',
                        textUnderlineOffset: '3px',
                        letterSpacing: '0.04em',
                        color: '#000000',
                      }}
                    >
                      TANDA TERIMA DOKUMEN
                    </h2>
                    <div style={{ fontSize: '10pt', marginTop: '0.2rem', color: '#111827', fontWeight: 500 }}>
                      Nomor: {customNomorSurat}
                    </div>
                  </div>

                  {/* 5. PEMBUKA */}
                  <div style={{ fontSize: '10pt', marginBottom: '0.5rem', color: '#111827' }}>
                    Bersama ini dikirim:
                  </div>

                  {/* 6. TABEL DOKUMEN / BARANG */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1.5px solid #000000',
                      fontSize: '9.5pt',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#ffffff', textAlign: 'center', fontWeight: 800 }}>
                        <th style={{ border: '1.5px solid #000000', padding: '6px 4px', width: '38px' }}>No</th>
                        <th style={{ border: '1.5px solid #000000', padding: '6px 12px' }}>Dokumen / Barang</th>
                        <th style={{ border: '1.5px solid #000000', padding: '6px 8px', width: '130px' }}>Banyaknya</th>
                        <th style={{ border: '1.5px solid #000000', padding: '6px 12px', width: '150px' }}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {/* NO */}
                        <td
                          style={{
                            border: '1.5px solid #000000',
                            padding: '12px 6px',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            fontWeight: 700,
                          }}
                        >
                          1.
                        </td>

                        {/* DOKUMEN / BARANG */}
                        <td
                          style={{
                            border: '1.5px solid #000000',
                            padding: '12px 14px',
                            verticalAlign: 'top',
                            lineHeight: '1.45',
                          }}
                        >
                          <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#000000' }}>
                            NOTA DEBET NO. {data.nomorInvoice || '00870-PK/B1/0826'}
                          </div>
                          <div style={{ fontWeight: 900, textTransform: 'uppercase', color: '#000000', marginTop: '0.15rem' }}>
                            {data.namaObyekProduksi || 'ALBANY 2'}
                          </div>
                          <div style={{ fontWeight: 900, color: '#000000', marginTop: '0.2rem', fontSize: '10pt' }}>
                            Rp &nbsp; {formatRupiah(data.totalSetelahPPN)},-
                          </div>

                          <div style={{ marginTop: '1.25rem', color: '#111827', fontSize: '9pt' }}>
                            Mohon Pelunasan Agar Ditransferke Virtual Account Pada Masing-masing Invoice
                          </div>

                          <div style={{ marginTop: '1.25rem', color: '#000000', fontSize: '9pt', fontWeight: 800 }}>
                            Catatan: Jatuh tempo pelunasan diharapkan sebelum 30 hari setelah diterima dokumen ini.
                          </div>
                        </td>

                        {/* BANYAKNYA */}
                        <td
                          style={{
                            border: '1.5px solid #000000',
                            padding: '12px 8px',
                            textAlign: 'center',
                            verticalAlign: 'top',
                            color: '#111827',
                          }}
                        >
                          1 (satu) set
                        </td>

                        {/* KETERANGAN */}
                        <td
                          style={{
                            border: '1.5px solid #000000',
                            padding: '12px 12px',
                            verticalAlign: 'top',
                            lineHeight: '1.35',
                            color: '#111827',
                          }}
                        >
                          <div>Copy Asli</div>
                          <div style={{ marginTop: '0.15rem' }}>
                            No Seri {data.noSeriFormND || '13898'}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 7. CATATAN PENGEMBALIAN */}
                  <div style={{ fontSize: '8.8pt', lineHeight: '1.35', color: '#111827', marginBottom: '2rem' }}>
                    Setelah dokumen / barang ini diterima, harap tanda terima ini 1 (satu) lembar dikirim kembali kepada kami melalui email{' '}
                    <a href="mailto:pk@bki.co.id" style={{ color: '#0369a1', textDecoration: 'underline' }}>
                      pk@bki.co.id
                    </a>
                  </div>

                  {/* 8. TANDA TANGAN DUA KOLOM */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginTop: '1.25rem',
                      fontSize: '9.8pt',
                      breakInside: 'avoid',
                    }}
                  >
                    {/* Penerima */}
                    <div style={{ textAlign: 'center', width: '240px' }}>
                      <div style={{ marginBottom: '4.5rem' }}>Yang Menerima,</div>
                      <div style={{ fontWeight: 600 }}>( ............................ )</div>
                      <div style={{ fontSize: '8.8pt', color: '#374151', marginTop: '0.15rem' }}>
                        Nama Jelas & Cap Perusahaan
                      </div>
                    </div>

                    {/* Kepala Cabang */}
                    <div style={{ textAlign: 'center', width: '240px', position: 'relative' }}>
                      <div>Kepala Cabang Madya Klas</div>

                      <div
                        style={{
                          position: 'relative',
                          height: '85px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0.2rem 0',
                        }}
                      >
                        {withSignature && (
                          <img
                            src={kacabSignature}
                            alt="TTD Kepala Cabang"
                            style={{
                              height: '72px',
                              width: 'auto',
                              objectFit: 'contain',
                              position: 'relative',
                              zIndex: 2,
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                      </div>

                      <div style={{ fontWeight: 800, color: '#000000', zIndex: 3, position: 'relative' }}>
                        ({kepalaCabangDisplay})
                      </div>
                      <div style={{ fontSize: '8.8pt', color: '#111827', marginTop: '0.1rem', zIndex: 3, position: 'relative' }}>
                        NUP {nup}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 9. FOOTER RESMI BKI */}
                <div
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '0.65rem',
                    marginTop: '2.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    fontSize: '7.8pt',
                    color: '#475569',
                    lineHeight: '1.3',
                    breakInside: 'avoid',
                  }}
                >
                  {/* Left: Alamat Kantor */}
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e293b' }}>PT. Biro Klasifikasi Indonesia (Persero)</div>
                    <div>Pontianak Class Middle Branch</div>
                    <div>Jl. Gusti Hamzah No. 211</div>
                    <div>Pontianak - 78116</div>
                    <div>INDONESIA</div>
                  </div>

                  {/* Center: Kontak */}
                  <div>
                    <div>📞 Phone : (0561) 739579</div>
                    <div>📠 Fax : -</div>
                    <div>✉️ Email : pk@bki.co.id</div>
                  </div>

                  {/* Right: Web */}
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>
                    www.idsurvey.id
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ====== PRINT CSS ====== */}
          <style>{`
            @media screen and (max-width: 768px) {
              .print-only-modal-overlay {
                padding: 0 !important;
              }
              .print-only-modal-overlay .modal-content {
                max-width: 100vw !important;
                width: 100vw !important;
                height: 100dvh !important;
                max-height: 100dvh !important;
                border-radius: 0 !important;
              }
            }

            @media print {
              @page {
                size: A4 portrait !important;
                margin: 0 !important;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                overflow: visible !important;
              }
              .no-print, header, nav, aside, .modal-header {
                display: none !important;
              }
              .modal-overlay {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                display: block !important;
                inset: auto !important;
              }
              .modal-content {
                max-width: none !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-modal-body {
                padding: 0 !important;
                overflow: visible !important;
              }
              .printable-sheet-wrapper {
                display: block !important;
                width: 100% !important;
              }
              .printable-sheet {
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
                max-width: 100% !important;
                min-height: auto !important;
                margin: 0 !important;
                padding: 18mm 20mm 14mm 20mm !important;
                zoom: 1 !important;
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
