import React, { useState, useEffect } from 'react';
import { X, Printer, Maximize2, Minimize2, Edit3, Check, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { ModalPortal } from './ModalPortal';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';
import { DanantaraLogo } from './DanantaraLogo';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { isValidSignature } from '../utils/signatureHelper';

export const SuratPengantarPrintModal = ({ isOpen, onClose, data }) => {
  const { adminSettings, getCompanyAddress, saveCompanyAddress } = useData();
  const { usersList } = useAuth();

  const [withSignature, setWithSignature] = useState(true);
  const [mobileFit, setMobileFit] = useState(true);
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  // Editable overrides
  const [customNomorSurat, setCustomNomorSurat] = useState('');
  const [customAlamat, setCustomAlamat] = useState('');
  const [customTelepon, setCustomTelepon] = useState('');
  const [customKota, setCustomKota] = useState('PONTIANAK');
  const [customNoResi, setCustomNoResi] = useState('');

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync / load defaults when data changes
  useEffect(() => {
    if (data) {
      setCustomNomorSurat(data.nomorSurat || 'B.00661/KU.403/PK/KI-26');
      setCustomAlamat(data.alamat || '');
      setCustomTelepon(data.telepon || '');
      setCustomKota(data.kota || 'PONTIANAK');
      setCustomNoResi(data.noResi || '');
      setIsEditingCustom(false);
    }
  }, [data, isOpen]);

  if (!isOpen || !data) return null;

  const handleSaveCustom = () => {
    const companyKey = (data.namaPerusahaan || data.penggunaJasa || '').trim().toUpperCase();
    if (companyKey && saveCompanyAddress) {
      saveCompanyAddress(companyKey, {
        alamat: customAlamat,
        telepon: customTelepon,
        kota: customKota,
      });
    }
    setIsEditingCustom(false);
    toast.success('Pengaturan alamat & nomor surat berhasil disimpan!');
  };

  const isMobileScreen = windowWidth <= 768;
  const targetDocWidth = 794; // Standard A4 portrait width
  const fitScale = isMobileScreen ? Math.min(Math.max((windowWidth - 24) / targetDocWidth, 0.35), 1) : 1;

  // Tanggal Surat
  const tglSuratFormatted = data.tanggalSurat
    ? formatDateIndo(data.tanggalSurat)
    : (data.tanggalND ? formatDateIndo(data.tanggalND) : formatDateIndo(new Date()));

  // Kepala Cabang details
  const kepalaCabang = adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT';
  const kepalaCabangDisplay = kepalaCabang.toUpperCase().includes('MUHSON') ? 'Muhson Nurrochmat S' : kepalaCabang;
  const nup = adminSettings?.nup || '48199-KI';

  const kacabUser = usersList?.find((u) => u.name === kepalaCabang || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';

  // Format Rupiah
  const formatRupiah = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('id-ID');
  };

  // Standardize items array
  const items = Array.isArray(data.items) && data.items.length > 0
    ? data.items
    : [
        {
          id: 'item-single',
          nomorInvoice: data.nomorInvoice || '00735-PK/B1/0726',
          namaKapal: data.namaKapal || data.namaObyekProduksi || 'PRIMA SAMUDRA I',
          noSeri: data.noSeri || data.noSeriFormND || '13759',
          nominal: Number(data.nominal ?? data.totalSetelahPPN ?? data.totalNominal) || 0,
          banyaknya: '1 (satu) set',
          keterangan: 'Copy'
        }
      ];

  const namaPerusahaan = (data.namaPerusahaan || data.penggunaJasa || 'PT. PRIMA SAMUDRA PERKASA').toUpperCase();

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanCompany = namaPerusahaan.replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = `Surat_Pengantar_${cleanCompany}_${customNomorSurat.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  // Export Excel Resmi Format Surat Pengantar
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'PT. Biro Klasifikasi Indonesia (Persero) Pontianak';
      const worksheet = workbook.addWorksheet('Surat Pengantar', {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 }
        }
      });

      // Set Column Widths
      worksheet.columns = [
        { width: 6 },   // Col A: No
        { width: 38 },  // Col B: Dokumen / Barang
        { width: 16 },  // Col C: Banyaknya
        { width: 22 }   // Col D: Keterangan
      ];

      // Header Text
      worksheet.addRow([]);
      worksheet.addRow(['', '', '', `Pontianak, ${tglSuratFormatted}`]);
      worksheet.getCell('D2').alignment = { horizontal: 'right' };
      worksheet.getCell('D2').font = { name: 'Calibri', size: 10 };

      worksheet.addRow(['', '', '', 'Kepada']);
      worksheet.getCell('D3').font = { name: 'Calibri', size: 10 };
      worksheet.addRow(['', '', '', `Yth. ${namaPerusahaan}`]);
      worksheet.getCell('D4').font = { name: 'Calibri', size: 10, bold: true };
      if (customAlamat) {
        worksheet.addRow(['', '', '', customAlamat]);
        worksheet.getCell('D5').font = { name: 'Calibri', size: 9 };
      }
      if (customTelepon) {
        worksheet.addRow(['', '', '', `Telp. ${customTelepon}`]);
        worksheet.getCell(`D${worksheet.rowCount}`).font = { name: 'Calibri', size: 9 };
      }

      worksheet.addRow([]);
      // Title
      const titleRow = worksheet.addRow(['', 'SURAT PENGANTAR']);
      titleRow.font = { name: 'Calibri', size: 12, bold: true, underline: true };
      worksheet.mergeCells(`B${titleRow.number}:C${titleRow.number}`);
      worksheet.getCell(`B${titleRow.number}`).alignment = { horizontal: 'center' };

      const noRow = worksheet.addRow(['', `Nomor: ${customNomorSurat}`]);
      noRow.font = { name: 'Calibri', size: 10 };
      worksheet.mergeCells(`B${noRow.number}:C${noRow.number}`);
      worksheet.getCell(`B${noRow.number}`).alignment = { horizontal: 'center' };

      worksheet.addRow([]);
      worksheet.addRow(['Bersama ini dikirim:']);
      worksheet.getCell(`A${worksheet.rowCount}`).font = { name: 'Calibri', size: 10 };

      // Table Headers
      const tblHeader = worksheet.addRow(['No', 'Dokumen / Barang', 'Banyaknya', 'Keterangan']);
      tblHeader.font = { name: 'Calibri', size: 10, bold: true };
      tblHeader.alignment = { horizontal: 'center', vertical: 'middle' };
      tblHeader.height = 24;

      const thinBorder = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      const verticalBorder = {
        left: { style: 'thin' },
        right: { style: 'thin' }
      };

      for (let c = 1; c <= 4; c++) {
        tblHeader.getCell(c).border = thinBorder;
        tblHeader.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      }

      // Items Rows (Tanpa garis melintang / horizontal antar item)
      items.forEach((it, idx) => {
        const itemRow = worksheet.addRow([
          `${idx + 1}.`,
          `NOTA DEBET NO. ${it.nomorInvoice || '-'}\n${(it.namaKapal || '').toUpperCase()}\nRp ${formatRupiah(it.nominal)},-`,
          it.banyaknya || '1 (satu) set',
          `Copy\nNo Seri ${it.noSeri || '-'}${customNoResi ? `\nNo Resi ${customNoResi}` : ''}`
        ]);
        itemRow.height = 50;
        itemRow.alignment = { vertical: 'top', wrapText: true };
        itemRow.getCell(1).alignment = { horizontal: 'center', vertical: 'top' };
        itemRow.getCell(3).alignment = { horizontal: 'center', vertical: 'top' };

        for (let c = 1; c <= 4; c++) {
          itemRow.getCell(c).border = verticalBorder;
          itemRow.getCell(c).font = { name: 'Calibri', size: 9.5 };
        }
      });

      // Bottom note inside table (Hanya garis vertikal dan garis penutup bawah tabel)
      const bottomBorder = {
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' }
      };

      const noteRow = worksheet.addRow([
        '',
        'Mohon Pelunasan Agar Ditransfer ke Virtual Account Pada Masing-masing Invoice\n\nCatatan: Jatuh tempo pelunasan diharapkan sebelum 30 hari setelah diterima dokumen ini.',
        '',
        ''
      ]);
      noteRow.height = 54;
      noteRow.alignment = { vertical: 'top', wrapText: true };
      for (let c = 1; c <= 4; c++) {
        noteRow.getCell(c).border = bottomBorder;
        noteRow.getCell(c).font = { name: 'Calibri', size: 8.5 };
      }

      worksheet.addRow([]);
      const emailNotice = worksheet.addRow([
        'Setelah dokumen / barang ini diterima, harap tanda terima ini 1 (satu) lembar dikirim kembali kepada kami melalui email pk@bki.co.id'
      ]);
      emailNotice.font = { name: 'Calibri', size: 8.5, italic: true };

      worksheet.addRow([]);
      worksheet.addRow([]);

      // Signatures
      const sigH = worksheet.addRow(['', 'Yang Menerima,', '', 'Kepala Cabang Madya Klas']);
      sigH.font = { name: 'Calibri', size: 10 };
      sigH.getCell(2).alignment = { horizontal: 'center' };
      sigH.getCell(4).alignment = { horizontal: 'center' };

      for (let i = 0; i < 3; i++) worksheet.addRow([]);

      const sigN = worksheet.addRow(['', '(...................................)', '', `(${kepalaCabangDisplay})`]);
      sigN.font = { name: 'Calibri', size: 10, bold: true };
      sigN.getCell(2).alignment = { horizontal: 'center' };
      sigN.getCell(4).alignment = { horizontal: 'center' };

      const sigSub = worksheet.addRow(['', 'Nama Jelas & Cap Perusahaan', '', `NUP. ${nup}`]);
      sigSub.font = { name: 'Calibri', size: 8.5 };
      sigSub.getCell(2).alignment = { horizontal: 'center' };
      sigSub.getCell(4).alignment = { horizontal: 'center' };

      // Write Buffer & Save
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Surat_Pengantar_${namaPerusahaan.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('File Excel Surat Pengantar berhasil diunduh!');
    } catch (err) {
      console.error('Error export excel Surat Pengantar:', err);
      toast.error('Gagal mengekspor file Excel.');
    }
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
                ✉️ Surat Pengantar Nota Debit
              </h3>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {namaPerusahaan} • {items.length} Nota Debet • Total: Rp {formatRupiah(data.totalNominal || items.reduce((acc, it) => acc + (Number(it.nominal) || 0), 0))}
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
                  cursor: 'pointer'
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
                  cursor: 'pointer'
                }}
              >
                {withSignature ? '✓ TTD & Cap' : 'Tanpa TTD'}
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={handleExportExcel}
                style={{
                  background: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Ekspor Surat Pengantar ke File Excel (.xlsx)"
              >
                <FileSpreadsheet size={13} />
                <span>Excel</span>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.65rem',
                alignItems: 'end',
              }}
            >
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.2rem', fontSize: '0.72rem' }}>
                  Nomor Surat Pengantar:
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
                  placeholder="JL. WR. SUPRATMAN BLOK A-7"
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
                  placeholder="0561-721846"
                  style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.2rem', fontSize: '0.72rem' }}>
                  No. Resi Pengiriman:
                </label>
                <input
                  type="text"
                  value={customNoResi}
                  onChange={(e) => setCustomNoResi(e.target.value)}
                  placeholder="Contoh: JNE / POS / Kurir"
                  style={{ width: '100%', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.4rem 0.75rem',
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
                  minHeight: '1123px',
                  padding: '16mm 20mm 20mm 20mm',
                  fontFamily: "'Segoe UI', Arial, sans-serif",
                  fontSize: '9.5pt',
                  lineHeight: '1.35',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  zoom: isMobileScreen && mobileFit ? fitScale : 1,
                }}
              >
                {/* 1. KOP LOGO */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      paddingBottom: '0.25rem',
                    }}
                  >
                    <IDSurveyLogo height={40} />
                    <BKILogo height={38} />
                  </div>

                  {/* 2. TANGGAL & TUJUAN SURAT (KANAN ATAS) */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.85rem' }}>
                    <div style={{ minWidth: '270px', fontSize: '9.5pt', lineHeight: '1.35' }}>
                      <div style={{ marginBottom: '0.35rem', color: '#111827' }}>
                        Pontianak, {tglSuratFormatted}
                      </div>
                      <div style={{ color: '#111827', display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ width: '38px', fontWeight: 600 }}>Yth.</span>
                        <div>
                          <div>Kepada</div>
                          <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#000000', marginTop: '0.05rem' }}>
                            {namaPerusahaan}
                          </div>
                          {customAlamat && (
                            <div style={{ color: '#1f2937', textTransform: 'uppercase', fontSize: '8.8pt', marginTop: '0.05rem' }}>
                              {customAlamat}
                            </div>
                          )}
                          {customTelepon && (
                            <div style={{ color: '#1f2937', fontSize: '8.8pt' }}>
                              Telp. {customTelepon}
                            </div>
                          )}
                          {customKota && !customAlamat.toUpperCase().includes(customKota.toUpperCase()) && (
                            <div style={{ color: '#1f2937', textTransform: 'uppercase', fontSize: '8.8pt' }}>
                              {customKota}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. JUDUL & NOMOR SURAT */}
                  <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
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
                      SURAT PENGANTAR
                    </h2>
                    <div style={{ fontSize: '9.5pt', marginTop: '0.15rem', color: '#111827', fontWeight: 600 }}>
                      Nomor: {customNomorSurat}
                    </div>
                  </div>

                  {/* 5. PEMBUKA */}
                  <div style={{ fontSize: '9.5pt', marginBottom: '0.35rem', color: '#111827' }}>
                    Bersama ini dikirim:
                  </div>

                  {/* 6. TABEL DOKUMEN / BARANG */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1.5px solid #000000',
                      fontSize: '9pt',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#ffffff', textAlign: 'center', fontWeight: 800 }}>
                        <th style={{ border: '1.5px solid #000000', padding: '5px 4px', width: '38px' }}>No</th>
                        <th style={{ border: '1.5px solid #000000', padding: '5px 10px' }}>Dokumen / Barang</th>
                        <th style={{ border: '1.5px solid #000000', padding: '5px 8px', width: '120px' }}>Banyaknya</th>
                        <th style={{ border: '1.5px solid #000000', padding: '5px 10px', width: '140px' }}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          {/* NO */}
                          <td
                            style={{
                              borderLeft: '1.5px solid #000000',
                              borderRight: '1.5px solid #000000',
                              borderTop: 'none',
                              borderBottom: 'none',
                              padding: '8px 4px',
                              textAlign: 'center',
                              verticalAlign: 'top',
                              fontWeight: 700,
                            }}
                          >
                            {idx + 1}.
                          </td>

                          {/* DOKUMEN / BARANG */}
                          <td
                            style={{
                              borderLeft: '1.5px solid #000000',
                              borderRight: '1.5px solid #000000',
                              borderTop: 'none',
                              borderBottom: 'none',
                              padding: '8px 10px',
                              verticalAlign: 'top',
                              lineHeight: '1.35',
                            }}
                          >
                            <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#000000' }}>
                              NOTA DEBET NO. {it.nomorInvoice || '-'}
                            </div>
                            <div style={{ fontWeight: 900, textTransform: 'uppercase', color: '#000000', marginTop: '0.1rem' }}>
                              {it.namaKapal || '-'}
                            </div>
                            <div style={{ fontWeight: 900, color: '#000000', marginTop: '0.15rem', fontSize: '9.2pt' }}>
                              Rp &nbsp;{formatRupiah(it.nominal)},-
                            </div>
                          </td>

                          {/* BANYAKNYA */}
                          <td
                            style={{
                              borderLeft: '1.5px solid #000000',
                              borderRight: '1.5px solid #000000',
                              borderTop: 'none',
                              borderBottom: 'none',
                              padding: '8px 6px',
                              textAlign: 'center',
                              verticalAlign: 'top',
                              color: '#111827',
                            }}
                          >
                            {it.banyaknya || '1 (satu) set'}
                          </td>

                          {/* KETERANGAN */}
                          <td
                            style={{
                              borderLeft: '1.5px solid #000000',
                              borderRight: '1.5px solid #000000',
                              borderTop: 'none',
                              borderBottom: 'none',
                              padding: '8px 10px',
                              verticalAlign: 'top',
                              lineHeight: '1.3',
                              color: '#111827',
                            }}
                          >
                            <div>{it.keterangan || 'Copy'}</div>
                            <div style={{ marginTop: '0.1rem' }}>
                              No Seri {it.noSeri || '-'}
                            </div>
                            {customNoResi && (
                              <div style={{ marginTop: '0.15rem', fontWeight: 700, color: '#0369a1' }}>
                                No Resi {customNoResi}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* CATATAN TRANSFER VA & JATUH TEMPO DI BAWAH ITEM (DALAM KOLOM DOKUMEN / BARANG TANPA GARIS MELINTANG) */}
                      <tr>
                        {/* Kolom 1: No */}
                        <td
                          style={{
                            borderLeft: '1.5px solid #000000',
                            borderRight: '1.5px solid #000000',
                            borderTop: 'none',
                            borderBottom: '1.5px solid #000000',
                            padding: '8px 4px',
                          }}
                        ></td>

                        {/* Kolom 2: Dokumen / Barang */}
                        <td
                          style={{
                            borderLeft: '1.5px solid #000000',
                            borderRight: '1.5px solid #000000',
                            borderTop: 'none',
                            borderBottom: '1.5px solid #000000',
                            padding: '12px 10px 10px 10px',
                            lineHeight: '1.4',
                            fontSize: '8.8pt',
                            verticalAlign: 'top',
                          }}
                        >
                          <div style={{ color: '#111827' }}>
                            Mohon Pelunasan Agar Ditransfer ke Virtual Account Pada Masing-masing Invoice
                          </div>
                          <div style={{ marginTop: '0.65rem', color: '#000000', fontWeight: 800 }}>
                            Catatan: Jatuh tempo pelunasan diharapkan sebelum 30 hari setelah diterima dokumen ini.
                          </div>
                        </td>

                        {/* Kolom 3: Banyaknya */}
                        <td
                          style={{
                            borderLeft: '1.5px solid #000000',
                            borderRight: '1.5px solid #000000',
                            borderTop: 'none',
                            borderBottom: '1.5px solid #000000',
                            padding: '8px 6px',
                          }}
                        ></td>

                        {/* Kolom 4: Keterangan */}
                        <td
                          style={{
                            borderLeft: '1.5px solid #000000',
                            borderRight: '1.5px solid #000000',
                            borderTop: 'none',
                            borderBottom: '1.5px solid #000000',
                            padding: '8px 10px',
                          }}
                        ></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 7. CATATAN PENGEMBALIAN */}
                  <div style={{ fontSize: '8.5pt', lineHeight: '1.3', color: '#111827', marginBottom: '1rem' }}>
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
                      marginTop: '0.5rem',
                      fontSize: '9.5pt',
                      breakInside: 'avoid',
                    }}
                  >
                    {/* Penerima */}
                    <div style={{ textAlign: 'center', width: '230px' }}>
                      <div style={{ marginBottom: '3.25rem' }}>Yang Menerima,</div>
                      <div style={{ fontWeight: 600 }}>( ............................ )</div>
                      <div style={{ fontSize: '8.5pt', color: '#374151', marginTop: '0.1rem' }}>
                        Nama Jelas & Cap Perusahaan
                      </div>
                    </div>

                    {/* Kepala Cabang */}
                    <div style={{ textAlign: 'center', width: '230px', position: 'relative' }}>
                      <div>Kepala Cabang Madya Klas</div>

                      <div
                        style={{
                          position: 'relative',
                          height: '62px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0.1rem 0',
                        }}
                      >
                        {withSignature && isValidSignature(kacabSignature) && (
                          <img
                            src={kacabSignature}
                            alt="TTD Kepala Cabang"
                            style={{
                              height: '56px',
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
                      <div style={{ fontSize: '8.5pt', color: '#111827', marginTop: '0.05rem', zIndex: 3, position: 'relative' }}>
                        NUP. {nup}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 9. FOOTER RESMI BKI */}
                <div
                  style={{
                    paddingTop: '0.5rem',
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    fontSize: '7.5pt',
                    color: '#334155',
                    lineHeight: '1.25',
                    breakInside: 'avoid',
                  }}
                >
                  {/* Left: Alamat Kantor */}
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>PT. Biro Klasifikasi Indonesia (Persero)</div>
                    <div>Pontianak Class Middle Branch</div>
                    <div>Jl. Gusti Hamzah No. 211</div>
                    <div>PONTIANAK - 78116</div>
                    <div>INDONESIA</div>
                  </div>

                  {/* Center: Kontak */}
                  <div>
                    <div>📞 Phone : (0561) 739579</div>
                    <div>📠 Fax : -</div>
                    <div>✉️ Email : pk@bki.co.id</div>
                  </div>

                  {/* Right: Web */}
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    www.idsurvey.id
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @media screen and (max-width: 768px) {
              .print-only-modal-overlay {
                padding: 0 !important;
                align-items: stretch !important;
              }
              .print-only-modal-overlay .modal-content {
                max-width: 100vw !important;
                width: 100vw !important;
                height: 100dvh !important;
                max-height: 100dvh !important;
                border-radius: 0 !important;
                margin: 0 !important;
                display: flex !important;
                flex-direction: column !important;
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
                min-height: 0 !important; 
                overflow: visible !important; 
              }
              .no-print, header, nav, aside, .modal-header { display: none !important; }
              .modal-overlay { 
                position: static !important; 
                background: transparent !important; 
                padding: 0 !important; 
                margin: 0 !important; 
                display: block !important; 
                height: auto !important; 
                min-height: 0 !important; 
                overflow: visible !important; 
              }
              .modal-content { 
                max-width: 100% !important; 
                width: 100% !important; 
                height: auto !important; 
                min-height: 0 !important; 
                max-height: none !important; 
                border: none !important; 
                box-shadow: none !important; 
                background: #ffffff !important; 
                margin: 0 !important; 
                padding: 0 !important; 
              }
              .modal-body {
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                background: #ffffff !important;
                height: auto !important;
                max-height: none !important;
              }
              .printable-sheet-wrapper {
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .printable-sheet {
                box-shadow: none !important;
                border: none !important;
                width: 210mm !important;
                max-width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                padding: 16mm 20mm 20mm 20mm !important;
                box-sizing: border-box !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
              }
            }
          `}</style>
        </div>
      </div>
    </ModalPortal>
  );
};
