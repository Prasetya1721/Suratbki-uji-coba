import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Receipt, FileText, User, Building2, DollarSign, Hash, CalendarDays, Ship, TrendingUp, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from './ModalPortal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { MASTER_COMPANIES } from '../data/defaultMasterKapal';
import { DEFAULT_SURVEY_TYPES } from './MultiSurveySelect';
import {
  KATEGORI_PROSES_BISNIS,
  PROSES_BISNIS_META,
  determineKategoriBisnis
} from '../data/prosesBisnisConstants';

// 1. Form & Kode Nota Debit BKI
export const BKI_FORM_SURVEY_TYPES = [
  'FKOB',
  'FKK',
  'FKP',
  'FKTP',
  'SPS',
  'PDS',
];

// 2. Jenis Survei Klasifikasi & Statutoria Standar BKI
export const KLASIFIKASI_STATUTORIA_SURVEY_TYPES = [
  'PEMBAHARUAN',
  'TAHUNAN',
  'ANTARA',
  'PERPANJANGAN',
  'PENGEDOKAN',
  'UWILD',
  'TUNDA DOK',
  'POROS CABUT/TUNDA/DITEMPAT (PER POROS)',
  'KHUSUS (PER JAM)***',
  'PEMBARUAN LL',
  'TAHUNAN LL',
  'REVALIDASI LL',
  'CONVEYANCE SURVEY',
  'AUDIT SMC / STATUTORY NON KONVENSI',
  'DINAS SURVEY KLAS',
];

// 3. Survei Komponen & Spesifik
export const KOMPONEN_SURVEY_TYPES = [
  'Survei Lambung',
  'Survei Mesin',
  'Survei Listrik & Radio',
  'Survei Garis Muat (Load Line)',
  'Survei Khusus',
  'Annual Survey',
  'Intermediate Survey',
  'Docking Survey',
  'Renewal Survey',
];

const EMPTY_FORM = {
  noSeriFormND: '',
  noBilling: '',
  tanggalND: '',
  nomorInvoice: '',
  namaObyekProduksi: '',
  nomorAgendaPermohonan: '',
  noSalesOrder: '',
  nomorLaporanSurvey: '',
  namaSurveyor: '',
  penggunaJasa: '',
  jenisSurvey: 'FKOB',
  kategoriBisnis: 'SURVEY PERIODIK',
  feeSurvey: 0,
  biayaSurvey: 0,
  ppnRate: 11,
  tandaTanganPenerima: 'Fitrian A,Md',
  keterangan: 'Belum Dicetak',
};

export const NotaDebitModal = ({ isOpen, onClose, onSave, initialData = null, isEdit = false }) => {
  const { usersList } = useAuth();
  const { masterKapal = [], suratTugas = [], laporanSurvei = [], notaDebit = [], adminSettings } = useData();

  const [form, setForm] = useState(EMPTY_FORM);
  const [isCustomSurvey, setIsCustomSurvey] = useState(false);

  // List opsi kapal dari master database kapal
  const shipOptions = useMemo(() => {
    const map = new Map();
    (masterKapal || []).forEach((k) => {
      const name = (k.namaKapal || '').trim().toUpperCase();
      if (name && !map.has(name)) {
        map.set(name, k);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.namaKapal || '').localeCompare(b.namaKapal || '')
    );
  }, [masterKapal]);

  // Cek apakah obyek produksi cocok dengan kapal di database
  const matchedShip = useMemo(() => {
    if (!form.namaObyekProduksi) return null;
    const clean = form.namaObyekProduksi.trim().toUpperCase();
    return shipOptions.find((k) => (k.namaKapal || '').trim().toUpperCase() === clean) || null;
  }, [form.namaObyekProduksi, shipOptions]);

  // Kategori lengkap opsi Jenis Survey yang sudah ada di sistem
  const allSurveyCategories = useMemo(() => {
    const knownSet = new Set([
      ...BKI_FORM_SURVEY_TYPES.map((s) => s.toUpperCase()),
      ...KLASIFIKASI_STATUTORIA_SURVEY_TYPES.map((s) => s.toUpperCase()),
      ...KOMPONEN_SURVEY_TYPES.map((s) => s.toUpperCase()),
      ...(DEFAULT_SURVEY_TYPES || []).map((s) => s.toUpperCase()),
    ]);

    const dynamicSet = new Set();
    const addVal = (val) => {
      if (!val || typeof val !== 'string') return;
      val.split(',').forEach((item) => {
        const clean = item.trim();
        if (clean && !knownSet.has(clean.toUpperCase())) {
          dynamicSet.add(clean.toUpperCase());
        }
      });
    };

    (masterKapal || []).forEach((k) => addVal(k.jenisSurvey));
    (suratTugas || []).forEach((st) => {
      addVal(st.jenisSurvey);
      addVal(st.perihal);
    });
    (laporanSurvei || []).forEach((lp) => {
      addVal(lp.namaSurvey);
      addVal(lp.jenisSurvey);
    });
    (notaDebit || []).forEach((nd) => addVal(nd.jenisSurvey));

    if (form.jenisSurvey && !knownSet.has(form.jenisSurvey.toUpperCase())) {
      dynamicSet.add(form.jenisSurvey.trim().toUpperCase());
    }

    return {
      bkiForms: BKI_FORM_SURVEY_TYPES,
      klasifikasi: KLASIFIKASI_STATUTORIA_SURVEY_TYPES,
      komponen: KOMPONEN_SURVEY_TYPES,
      dariDatabase: Array.from(dynamicSet).sort(),
    };
  }, [masterKapal, suratTugas, laporanSurvei, notaDebit, form.jenisSurvey]);

  // Handler saat nama kapal dipilih/diketik
  const handleShipChange = (val) => {
    const upper = val.toUpperCase();
    const matched = shipOptions.find(
      (k) => (k.namaKapal || '').trim().toUpperCase() === upper.trim()
    );

    setForm((prev) => {
      const updates = { ...prev, namaObyekProduksi: upper };
      if (matched) {
        if (matched.pemohon) {
          updates.penggunaJasa = matched.pemohon;
        }
        if (matched.noAgenda) {
          updates.nomorAgendaPermohonan = matched.noAgenda;
        }
        if (matched.noSo || matched.noSalesOrder) {
          updates.noSalesOrder = matched.noSo || matched.noSalesOrder;
        }
        if (matched.jenisSurvey) {
          updates.jenisSurvey = matched.jenisSurvey;
          updates.kategoriBisnis = determineKategoriBisnis(matched.jenisSurvey);
        }
      }

      // Jika belum ada data dari matched kapal, cari riwayat di laporanSurvei atau suratTugas
      const lpMatch = (laporanSurvei || []).find(
        (lp) => (lp.namaKapal || '').toUpperCase().includes(upper) && (lp.noSo || lp.nomorLaporan)
      );
      if (lpMatch) {
        if (lpMatch.noSo && !updates.noSalesOrder) updates.noSalesOrder = lpMatch.noSo;
        if (lpMatch.nomorLaporan && !updates.nomorLaporanSurvey) updates.nomorLaporanSurvey = lpMatch.nomorLaporan;
      }

      if (!matched?.jenisSurvey) {
        const stMatch = (suratTugas || []).find(
          (st) => (st.namaKapal || '').toUpperCase().includes(upper) && (st.jenisSurvey || st.perihal || st.noSo)
        );
        if (stMatch) {
          if (stMatch.noSo && !updates.noSalesOrder) updates.noSalesOrder = stMatch.noSo;
          updates.jenisSurvey = stMatch.jenisSurvey || stMatch.perihal;
          updates.kategoriBisnis = determineKategoriBisnis(updates.jenisSurvey);
        }
      }

      return updates;
    });
  };

  const surveyorOptions = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  const globalPpnRate = adminSettings?.ppnRate !== undefined ? Number(adminSettings.ppnRate) : 11;
  const activePpnRate = globalPpnRate;

  // Kalkulasi otomatis biaya
  const biayaSebelumPPN = (Number(form.feeSurvey) || 0) + (Number(form.biayaSurvey) || 0);
  const ppnAmount = Math.round(biayaSebelumPPN * (activePpnRate / 100));
  const totalSetelahPPN = biayaSebelumPPN + ppnAmount;

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          ...EMPTY_FORM,
          ...initialData,
          noSalesOrder: initialData.noSalesOrder || initialData.noSo || '',
          ppnRate: globalPpnRate,
          tandaTanganPenerima: (initialData.tandaTanganPenerima && initialData.tandaTanganPenerima !== '-' && initialData.tandaTanganPenerima.toLowerCase() !== 'aada')
            ? initialData.tandaTanganPenerima
            : 'Fitrian A,Md',
          kategoriBisnis: initialData.kategoriBisnis || determineKategoriBisnis(initialData.jenisSurvey || ''),
        });
        const allKnown = [
          ...BKI_FORM_SURVEY_TYPES,
          ...KLASIFIKASI_STATUTORIA_SURVEY_TYPES,
          ...KOMPONEN_SURVEY_TYPES,
          ...(DEFAULT_SURVEY_TYPES || []),
        ];
        const isKnown = allKnown.some(
          (s) => s.toUpperCase() === (initialData.jenisSurvey || '').toUpperCase()
        );
        setIsCustomSurvey(!isKnown && Boolean(initialData.jenisSurvey));
      } else {
        const defaultSurvey = 'FKOB';
        setForm({
          ...EMPTY_FORM,
          tanggalND: getTodayStr(),
          namaSurveyor: surveyorOptions[0]?.name || '',
          jenisSurvey: defaultSurvey,
          kategoriBisnis: determineKategoriBisnis(defaultSurvey),
          ppnRate: globalPpnRate,
          tandaTanganPenerima: 'Fitrian A,Md',
        });
        setIsCustomSurvey(false);
      }
    }
  }, [isOpen, initialData, surveyorOptions, globalPpnRate]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'jenisSurvey' && value) {
        updated.kategoriBisnis = determineKategoriBisnis(value);
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.noSeriFormND.trim()) {
      toast.error('No. Seri Form Nota Debit harus diisi');
      return;
    }
    if (!form.tanggalND) {
      toast.error('Tanggal Nota Debit harus diisi');
      return;
    }
    if (!form.namaObyekProduksi.trim()) {
      toast.error('Nama Obyek Produksi harus diisi');
      return;
    }
    if (!form.penggunaJasa.trim()) {
      toast.error('Pengguna Jasa harus diisi');
      return;
    }

    const result = onSave({
      ...form,
      kategoriBisnis: form.kategoriBisnis || determineKategoriBisnis(form.jenisSurvey || ''),
      feeSurvey: Number(form.feeSurvey) || 0,
      biayaSurvey: Number(form.biayaSurvey) || 0,
      biayaSebelumPPN,
      ppnRate: activePpnRate,
      ppnAmount,
      totalSetelahPPN,
    });

    if (result !== false) {
      toast.success(isEdit ? 'Nota Debit berhasil diperbarui' : 'Nota Debit berhasil dicatat!');
      onClose();
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    border: '1.5px solid var(--border-color, #e2e8f0)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    background: 'var(--bg-main, #f8fafc)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontWeight: 700,
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.3rem',
  };

  const groupStyle = { display: 'flex', flexDirection: 'column', margin: 0 };

  const sectionTitleStyle = {
    fontWeight: 800,
    fontSize: '0.78rem',
    color: '#0369a1',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #bae6fd',
    paddingBottom: '0.3rem',
    marginBottom: '0.75rem',
  };

  const computedRowStyle = {
    background: 'var(--bg-main, #f8fafc)',
    border: '1px solid var(--border-color, #e2e8f0)',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '18px',
            border: '1px solid var(--border-color, #e2e8f0)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.4)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: '1.25rem 1.6rem',
              background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255,255,255,0.12)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              borderRadius: '18px 18px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  background: 'rgba(186, 230, 253, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Receipt size={20} color="#bae6fd" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                  {isEdit ? 'Edit Nota Debit' : 'Input Form Nota Debit'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.73rem', color: '#93c5fd' }}>
                  Data Control Penggunaan Form Nota Debit — Cabang Pontianak
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#cbd5e1',
                borderRadius: '7px',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.6rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* SEKSI 1: Identitas Form */}
            <div>
              <div style={sectionTitleStyle}>📋 Identitas Form Nota Debit</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <Hash size={13} color="#0369a1" />
                    No. Seri Form ND <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Contoh: 13624"
                    value={form.noSeriFormND}
                    onChange={(e) => handleChange('noSeriFormND', e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <FileText size={13} color="#0369a1" />
                    No. Billing (Cetak)
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Contoh: S00209597"
                    value={form.noBilling}
                    onChange={(e) => handleChange('noBilling', e.target.value)}
                  />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <CalendarDays size={13} color="#0369a1" />
                    Tanggal Nota Debit <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    type="date"
                    value={form.tanggalND}
                    onChange={(e) => handleChange('tanggalND', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 2: Invoice & Obyek */}
            <div>
              <div style={sectionTitleStyle}>📄 Data Invoice & Obyek Produksi</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <FileText size={13} color="#0369a1" />
                    Nomor Invoice
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Contoh: 00001-PK/B1/0126"
                    value={form.nomorInvoice}
                    onChange={(e) => handleChange('nomorInvoice', e.target.value)}
                  />
                </div>
                <div style={groupStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>
                      <Ship size={13} color="#0369a1" />
                      Nama Obyek Produksi <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600 }}>
                      ⚓ {shipOptions.length} Kapal Terdaftar
                    </span>
                  </div>
                  <input
                    style={{ ...inputStyle, textTransform: 'uppercase' }}
                    type="text"
                    list="nd-ship-list"
                    placeholder="Pilih dari database atau ketik nama kapal..."
                    value={form.namaObyekProduksi}
                    onChange={(e) => handleShipChange(e.target.value)}
                    required
                  />
                  <datalist id="nd-ship-list">
                    {shipOptions.map((k) => (
                      <option key={k.id || k.namaKapal} value={k.namaKapal}>
                        {k.namaKapal}{k.pemohon ? ` (${k.pemohon})` : ''}{k.noAgenda ? ` • Agenda: ${k.noAgenda}` : ''}
                      </option>
                    ))}
                  </datalist>

                  {matchedShip && (
                    <div
                      style={{
                        marginTop: '0.35rem',
                        padding: '0.35rem 0.55rem',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Check size={12} color="#0284c7" />
                      <span>
                        Tersambung: <strong>{matchedShip.namaKapal}</strong>
                        {matchedShip.pemohon ? ` • Pemilik: ${matchedShip.pemohon}` : ''}
                        {matchedShip.noAgenda ? ` • Agenda: ${matchedShip.noAgenda}` : ''}
                        {(matchedShip.noSo || matchedShip.noSalesOrder) ? ` • SO: ${matchedShip.noSo || matchedShip.noSalesOrder}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEKSI 3: Nomor Agenda, Sales Order & Laporan */}
            <div>
              <div style={sectionTitleStyle}>📌 Referensi Agenda, Sales Order & Laporan</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <Hash size={13} color="#0369a1" />
                    Nomor Agenda Permohonan
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Contoh: 00003FK25"
                    value={form.nomorAgendaPermohonan}
                    onChange={(e) => handleChange('nomorAgendaPermohonan', e.target.value)}
                  />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <Hash size={13} color="#0369a1" />
                    No. Sales Order
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Contoh: 3000255955 / RFQ..."
                    value={form.noSalesOrder}
                    onChange={(e) => handleChange('noSalesOrder', e.target.value)}
                  />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <Hash size={13} color="#0369a1" />
                    Nomor Laporan Survey
                  </label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Contoh: 00003-PK/B1/2026"
                    value={form.nomorLaporanSurvey}
                    onChange={(e) => handleChange('nomorLaporanSurvey', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 4: Personil */}
            <div>
              <div style={sectionTitleStyle}>👤 Data Personil & Jenis Survey</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <User size={13} color="#0369a1" />
                    Nama Surveyor
                  </label>
                  {surveyorOptions.length > 0 ? (
                    <select
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={form.namaSurveyor}
                      onChange={(e) => handleChange('namaSurveyor', e.target.value)}
                    >
                      <option value="">-- Pilih Surveyor --</option>
                      {surveyorOptions.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="Nama Surveyor"
                      value={form.namaSurveyor}
                      onChange={(e) => handleChange('namaSurveyor', e.target.value)}
                    />
                  )}
                </div>

                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <Building2 size={13} color="#0369a1" />
                    Pengguna Jasa <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    style={{ ...inputStyle, textTransform: 'uppercase' }}
                    type="text"
                    list="nd-company-list"
                    placeholder="Contoh: PT. XXXXXXXX"
                    value={form.penggunaJasa}
                    onChange={(e) => handleChange('penggunaJasa', e.target.value.toUpperCase())}
                    required
                  />
                  <datalist id="nd-company-list">
                    {MASTER_COMPANIES.filter((c) => c && c !== '-').map((comp, idx) => (
                      <option key={idx} value={comp} />
                    ))}
                  </datalist>
                </div>

                <div style={groupStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>
                      <FileText size={13} color="#0369a1" />
                      Jenis Survey
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSurvey(!isCustomSurvey)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '0 0.2rem',
                        textDecoration: 'underline',
                      }}
                      title="Klik untuk beralih antara pilihan daftar atau ketik manual"
                    >
                      {isCustomSurvey ? '📋 Pilih Daftar' : '✏️ Ketik Manual'}
                    </button>
                  </div>

                  {isCustomSurvey ? (
                    <>
                      <input
                        style={{ ...inputStyle, textTransform: 'uppercase' }}
                        type="text"
                        list="nd-custom-survey-list"
                        placeholder="Ketik jenis survey..."
                        value={form.jenisSurvey}
                        onChange={(e) => handleChange('jenisSurvey', e.target.value.toUpperCase())}
                      />
                      <datalist id="nd-custom-survey-list">
                        {allSurveyCategories.bkiForms.map((s) => <option key={s} value={s} />)}
                        {allSurveyCategories.klasifikasi.map((s) => <option key={s} value={s} />)}
                        {allSurveyCategories.komponen.map((s) => <option key={s} value={s} />)}
                        {allSurveyCategories.dariDatabase.map((s) => <option key={s} value={s} />)}
                      </datalist>
                    </>
                  ) : (
                    <select
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={form.jenisSurvey}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomSurvey(true);
                        } else {
                          handleChange('jenisSurvey', e.target.value);
                        }
                      }}
                    >
                      <optgroup label="📋 Form & Kode Nota Debit BKI">
                        {allSurveyCategories.bkiForms.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>

                      <optgroup label="⚓ Survei Klasifikasi & Statutoria Standar">
                        {allSurveyCategories.klasifikasi.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>

                      <optgroup label="🔍 Survei Komponen & Spesifik">
                        {allSurveyCategories.komponen.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>

                      {allSurveyCategories.dariDatabase.length > 0 && (
                        <optgroup label="📂 Dari Riwayat Database / Kapal">
                          {allSurveyCategories.dariDatabase.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </optgroup>
                      )}

                      <option value="__custom__">✏️ Ketik Manual (Lainnya)...</option>
                    </select>
                  )}
                </div>

                {/* KATEGORI PROSES BISNIS / POTENSI PRODUKSI */}
                <div style={{ ...groupStyle, marginTop: '0.6rem' }}>
                  <label style={labelStyle}>
                    <TrendingUp size={13} color="#0369a1" />
                    Kategori Proses Bisnis / Potensi Produksi <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {KATEGORI_PROSES_BISNIS.map((kat) => {
                      const meta = PROSES_BISNIS_META[kat];
                      const isSelected = form.kategoriBisnis === kat;
                      return (
                        <button
                          key={kat}
                          type="button"
                          onClick={() => handleChange('kategoriBisnis', kat)}
                          style={{
                            padding: '0.45rem 0.5rem',
                            borderRadius: '7px',
                            fontSize: '0.72rem',
                            fontWeight: isSelected ? 800 : 600,
                            border: isSelected ? `2px solid ${meta.color}` : '1px solid var(--border-color, #e2e8f0)',
                            background: isSelected ? meta.bg : 'var(--bg-main, #f8fafc)',
                            color: isSelected ? meta.textColor : 'var(--text-secondary, #475569)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          {isSelected && '✓'} {meta.name}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    * Nilai nota debit otomatis masuk ke laporan bulanan <strong>Proses Bisnis / Potensi Produksi</strong> kategori ini.
                  </div>
                </div>
              </div>
            </div>

            {/* SEKSI 5: Biaya */}
            <div>
              <div style={sectionTitleStyle}>💰 Rincian Biaya</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <DollarSign size={13} color="#059669" />
                    Fee Survey (Rp)
                  </label>
                  <input
                    style={{ ...inputStyle, fontWeight: 700 }}
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={form.feeSurvey}
                    onChange={(e) => handleChange('feeSurvey', e.target.value)}
                  />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>
                    <DollarSign size={13} color="#0284c7" />
                    Biaya Survey (Rp)
                  </label>
                  <input
                    style={{ ...inputStyle, fontWeight: 700 }}
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={form.biayaSurvey}
                    onChange={(e) => handleChange('biayaSurvey', e.target.value)}
                  />
                </div>
              </div>

              {/* Kalkulasi otomatis */}
              <div style={computedRowStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                  {[
                    { label: 'Biaya Sebelum PPN', value: biayaSebelumPPN, color: '#374151' },
                    { label: `PPN ${activePpnRate}%`, value: ppnAmount, color: '#d97706' },
                    { label: 'Total Setelah PPN', value: totalSetelahPPN, color: '#059669', bold: true },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {row.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: row.bold ? 900 : 700,
                          color: row.color,
                          background: row.bold ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                          padding: row.bold ? '0.15rem 0.4rem' : '0',
                          borderRadius: row.bold ? '6px' : '0',
                          display: 'inline-block',
                        }}
                      >
                        Rp {row.value.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      justifyContent: 'center',
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      border: '1px dashed #cbd5e1'
                    }}
                    title="Terkunci: Pengaturan Tarif PPN diatur terpusat di Menu Manajemen Tarif"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Lock size={10} color="#64748b" />
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Tarif PPN (%)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <input
                        type="number"
                        readOnly
                        disabled
                        style={{
                          width: '55px',
                          textAlign: 'center',
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          color: '#d97706',
                          padding: '0.15rem 0.2rem',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          background: '#f1f5f9',
                          cursor: 'not-allowed'
                        }}
                        value={globalPpnRate}
                        title="Terkunci: Untuk mengubah tarif PPN, silakan buka Menu Manajemen Tarif"
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706' }}>%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>



            {/* ACTIONS */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.55rem 1.25rem',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                style={{
                  padding: '0.55rem 1.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(3, 105, 161, 0.35)',
                  fontFamily: 'inherit',
                }}
              >
                <Check size={16} />
                {isEdit ? 'Simpan Perubahan' : 'Simpan & Cetak Tanda Terima'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
