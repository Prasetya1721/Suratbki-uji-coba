import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Check, FileText, Building2, Calendar, Hash, Truck, Ship, DollarSign, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalPortal } from './ModalPortal';
import { useData } from '../context/DataContext';
import { formatRupiah } from '../utils/formatters';

const DEFAULT_NOTE = `Mohon Pelunasan Agar Ditransfer ke Virtual Account Pada Masing-masing Invoice
Catatan: Jatuh tempo pelunasan diharapkan sebelum 30 hari setelah diterima dokumen ini.`;

export const AgendaNotaDebitModal = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndPrint,
  initialData = null,
  isEdit = false
}) => {
  const { notaDebit = [], agendaNotaDebit = [], getCompanyAddress, saveCompanyAddress } = useData();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentYearShort = useMemo(() => new Date().getFullYear().toString().slice(-2), []);

  // Generate next default letter number: B.00XXX/KU.403/PK/KI-YY
  const defaultNomorSurat = useMemo(() => {
    let maxNum = 660; // baseline from specimen B.00661
    (agendaNotaDebit || []).forEach((ag) => {
      const match = (ag.nomorSurat || '').match(/B\.0*(\d+)\//i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });
    const nextNum = maxNum + 1;
    return `B.${String(nextNum).padStart(5, '0')}/KU.403/PK/KI-${currentYearShort}`;
  }, [agendaNotaDebit, currentYearShort]);

  // Form State
  const [tanggalSurat, setTanggalSurat] = useState(todayStr);
  const [nomorSurat, setNomorSurat] = useState(defaultNomorSurat);
  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [kota, setKota] = useState('PONTIANAK');
  const [noResi, setNoResi] = useState('');
  const [keteranganLain, setKeteranganLain] = useState(DEFAULT_NOTE);
  const [items, setItems] = useState([]);

  // List of unique companies from Nota Debit
  const availableCompanies = useMemo(() => {
    const setComp = new Set();
    (notaDebit || []).forEach((nd) => {
      const comp = (nd.penggunaJasa || '').trim().toUpperCase();
      if (comp) setComp.add(comp);
    });
    return Array.from(setComp).sort();
  }, [notaDebit]);

  // Set of all Nota Debit IDs and Invoice numbers that are already used in other Buku Agenda entries
  const alreadyUsedInOtherAgendas = useMemo(() => {
    const usedIds = new Set();
    const usedInvoices = new Set();
    const usedSeris = new Set();

    (agendaNotaDebit || []).forEach((ag) => {
      // Jika sedang edit, jangan anggap item milik agenda ini sebagai 'used in other'
      if (initialData?.id && ag.id === initialData.id) return;

      (ag.items || []).forEach((it) => {
        if (it.notaDebitId) usedIds.add(String(it.notaDebitId));
        if (it.nomorInvoice) usedInvoices.add(it.nomorInvoice.trim().toUpperCase());
        if (it.noSeri) usedSeris.add(String(it.noSeri).trim());
      });
    });

    return { usedIds, usedInvoices, usedSeris };
  }, [agendaNotaDebit, initialData]);

  // Available Nota Debit for selected company yang BELUM TERISI (Kalo sudah terisi tidak ada lagi)
  const companyNotaDebitList = useMemo(() => {
    if (!namaPerusahaan.trim()) return [];
    const cleanComp = namaPerusahaan.trim().toUpperCase();

    // Nota debit IDs, invoices, & seris yang sudah dimasukkan ke dalam form surat ini
    const currentItemIds = new Set(items.map((it) => String(it.notaDebitId)).filter(Boolean));
    const currentItemInvoices = new Set(items.map((it) => (it.nomorInvoice || '').trim().toUpperCase()).filter(Boolean));
    const currentItemSeris = new Set(items.map((it) => String(it.noSeri || '').trim()).filter(Boolean));

    return (notaDebit || []).filter((nd) => {
      // 1. Harus perusahaan yang sama
      if ((nd.penggunaJasa || '').trim().toUpperCase() !== cleanComp) return false;

      // 2. Kalo sudah terisi di form item saat ini -> TIDAK ADA LAGI
      if (currentItemIds.has(String(nd.id))) return false;
      if (nd.nomorInvoice && currentItemInvoices.has(nd.nomorInvoice.trim().toUpperCase())) return false;
      if (nd.noSeriFormND && currentItemSeris.has(String(nd.noSeriFormND).trim())) return false;

      // 3. Kalo sudah terisi di Buku Agenda lain -> TIDAK ADA LAGI
      if (alreadyUsedInOtherAgendas.usedIds.has(String(nd.id))) return false;
      if (nd.nomorInvoice && alreadyUsedInOtherAgendas.usedInvoices.has(nd.nomorInvoice.trim().toUpperCase())) return false;
      if (nd.noSeriFormND && alreadyUsedInOtherAgendas.usedSeris.has(String(nd.noSeriFormND).trim())) return false;

      // 4. Kalo statusnya sudah 'Tercetak' di Nota Debit -> TIDAK ADA LAGI
      // (Kecuali jika item ini adalah bagian dari initialData saat mode edit)
      const isPartofInitial = initialData?.items?.some(
        (it) => it.notaDebitId === nd.id || it.nomorInvoice === nd.nomorInvoice
      );
      if (!isPartofInitial && (nd.keterangan === 'Tercetak' || nd.keterangan === 'Tercetak Baik')) {
        return false;
      }

      return true;
    });
  }, [notaDebit, namaPerusahaan, items, alreadyUsedInOtherAgendas, initialData]);

  // Load initialData when editing
  useEffect(() => {
    if (initialData && isOpen) {
      setTanggalSurat(initialData.tanggalSurat || todayStr);
      setNomorSurat(initialData.nomorSurat || defaultNomorSurat);
      setNamaPerusahaan(initialData.namaPerusahaan || '');
      setAlamat(initialData.alamat || '');
      setTelepon(initialData.telepon || '');
      setKota(initialData.kota || 'PONTIANAK');
      setNoResi(initialData.noResi || '');
      setKeteranganLain(initialData.keteranganLain || DEFAULT_NOTE);
      setItems(Array.isArray(initialData.items) ? [...initialData.items] : []);
    } else if (isOpen) {
      setTanggalSurat(todayStr);
      setNomorSurat(defaultNomorSurat);
      setNamaPerusahaan('');
      setAlamat('');
      setTelepon('');
      setKota('PONTIANAK');
      setNoResi('');
      setKeteranganLain(DEFAULT_NOTE);
      setItems([]);
    }
  }, [initialData, isOpen, todayStr, defaultNomorSurat]);

  // Handle Company Selection
  const handleSelectCompany = (compName) => {
    const cleanComp = compName.trim().toUpperCase();
    setNamaPerusahaan(cleanComp);

    // Auto load company address
    const dbAddr = getCompanyAddress ? getCompanyAddress(cleanComp) : null;
    let savedAddr = dbAddr?.alamat || '';
    let savedTel = dbAddr?.telepon || '';
    let savedCity = dbAddr?.kota || 'PONTIANAK';

    if (!savedAddr && cleanComp) {
      try {
        const stored = localStorage.getItem(`st_addr_${cleanComp}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          savedAddr = parsed.alamat || '';
          savedTel = parsed.telepon || '';
          savedCity = parsed.kota || 'PONTIANAK';
        }
      } catch {}
    }

    setAlamat(savedAddr);
    setTelepon(savedTel);
    setKota(savedCity);
  };

  // Add Item from selected Nota Debit record
  const handleAddNotaDebitItem = (nd) => {
    // Check if already in items list
    const alreadyExists = items.some(
      (it) => it.notaDebitId === nd.id || (it.nomorInvoice && it.nomorInvoice === nd.nomorInvoice)
    );
    if (alreadyExists) {
      toast.error(`Nota Debit ${nd.nomorInvoice || nd.noSeriFormND} sudah ada dalam daftar!`);
      return;
    }

    const newItem = {
      id: `it-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      notaDebitId: nd.id,
      nomorInvoice: nd.nomorInvoice || '',
      namaKapal: (nd.namaObyekProduksi || '').toUpperCase(),
      noSeri: nd.noSeriFormND || '',
      nominal: Number(nd.totalSetelahPPN || nd.feeSurvey || nd.biayaSebelumPPN || 0),
      banyaknya: '1 (satu) set',
      keterangan: 'Copy'
    };

    setItems((prev) => [...prev, newItem]);
    toast.success(`Berhasil menambahkan ${newItem.namaKapal || newItem.nomorInvoice}!`);
  };

  // Add manual item row
  const handleAddManualRow = () => {
    const newItem = {
      id: `it-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      notaDebitId: null,
      nomorInvoice: '',
      namaKapal: '',
      noSeri: '',
      nominal: 0,
      banyaknya: '1 (satu) set',
      keterangan: 'Copy'
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update item field
  const handleUpdateItem = (itemId, field, value) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, [field]: value } : it))
    );
  };

  // Remove item
  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Calculate total nominal
  const totalNominal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.nominal) || 0), 0);
  }, [items]);

  const handleSubmit = (e, andPrint = false) => {
    if (e) e.preventDefault();

    if (!namaPerusahaan.trim()) {
      toast.error('Pilih atau masukkan Nama Perusahaan!');
      return;
    }

    if (!nomorSurat.trim()) {
      toast.error('Nomor Surat Pengantar wajib diisi!');
      return;
    }

    if (items.length === 0) {
      toast.error('Tambahkan minimal 1 item Nota Debit / Kapal!');
      return;
    }

    // Save company address to directory if provided
    const cleanComp = namaPerusahaan.trim().toUpperCase();
    if (cleanComp && saveCompanyAddress) {
      saveCompanyAddress(cleanComp, {
        alamat: alamat.trim().toUpperCase(),
        telepon: telepon.trim(),
        kota: kota.trim().toUpperCase()
      });
    }

    const payload = {
      id: initialData?.id,
      tanggalSurat,
      nomorSurat: nomorSurat.trim(),
      namaPerusahaan: cleanComp,
      alamat: alamat.trim().toUpperCase(),
      telepon: telepon.trim(),
      kota: kota.trim().toUpperCase(),
      noResi: noResi.trim(),
      keteranganLain: keteranganLain.trim(),
      items,
      totalNominal,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (andPrint && onSaveAndPrint) {
      onSaveAndPrint(payload);
    } else if (onSave) {
      onSave(payload);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
        <div
          className="modal-content"
          style={{
            maxWidth: '920px',
            width: '95vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="modal-header"
            style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0f172a',
              color: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
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
                <FileText size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                  {isEdit ? 'Edit Surat Pengantar Nota Debit' : 'Buat Surat Pengantar Nota Debit'}
                </h3>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Buku Agenda Pengiriman Nota Debet / Invoice ke Pelanggan
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#ffffff',
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <div
            className="modal-body"
            style={{
              padding: '1.25rem',
              overflowY: 'auto',
              flex: '1 1 auto',
              background: '#ffffff'
            }}
          >
            <form onSubmit={(e) => handleSubmit(e, false)}>
              {/* SECTION 1: HEADER SURAT & PERUSAHAAN */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                  {/* Tanggal Surat */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={13} color="#0284c7" />
                      <span>Tanggal Surat *</span>
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={tanggalSurat}
                      onChange={(e) => setTanggalSurat(e.target.value)}
                      required
                      style={{ fontWeight: 700, fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Nomor Surat */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Hash size={13} color="#0284c7" />
                      <span>Nomor Surat Pengantar *</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={nomorSurat}
                      onChange={(e) => setNomorSurat(e.target.value)}
                      placeholder="B.00661/KU.403/PK/KI-26"
                      required
                      style={{ fontWeight: 800, fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* No Resi Pengiriman */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Truck size={13} color="#0284c7" />
                      <span>No. Resi Pengiriman (Opsional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={noResi}
                      onChange={(e) => setNoResi(e.target.value)}
                      placeholder="No Resi / Ekspedisi / Kurir"
                      style={{ fontSize: '0.85rem' }}
                    />
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                      *Akan dicantumkan pada kolom Keterangan surat
                    </div>
                  </div>
                </div>

                {/* Perusahaan & Alamat */}
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '0.75rem' }}>
                    {/* Nama Perusahaan */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Building2 size={13} color="#0284c7" />
                        <span>Nama Perusahaan (Diambil dari Nota Debit) *</span>
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          list="company-options"
                          value={namaPerusahaan}
                          onChange={(e) => handleSelectCompany(e.target.value)}
                          placeholder="Pilih atau ketik nama perusahaan..."
                          required
                          style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase' }}
                        />
                        <datalist id="company-options">
                          {availableCompanies.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Telepon */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                        Telepon Perusahaan
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={telepon}
                        onChange={(e) => setTelepon(e.target.value)}
                        placeholder="Contoh: 0561-721846"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.85rem' }}>
                    {/* Alamat */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                        Alamat Perusahaan
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={alamat}
                        onChange={(e) => setAlamat(e.target.value.toUpperCase())}
                        placeholder="Contoh: Jl. WR. Supratman Blok A-7 Samping SMKN 3"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* Kota */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
                        Kota
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={kota}
                        onChange={(e) => setKota(e.target.value.toUpperCase())}
                        placeholder="PONTIANAK"
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PEMILIH CEPAT DARI NOTA DEBIT TERSEDIA */}
              {namaPerusahaan.trim() && (
                <div
                  style={{
                    background: companyNotaDebitList.length > 0 ? '#eff6ff' : '#f0fdf4',
                    border: companyNotaDebitList.length > 0 ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem'
                  }}
                >
                  {companyNotaDebitList.length > 0 ? (
                    <>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>💡 Nota Debit Tersedia untuk {namaPerusahaan} ({companyNotaDebitList.length} belum dibuatkan surat):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                        {companyNotaDebitList.map((nd) => (
                          <button
                            key={nd.id}
                            type="button"
                            onClick={() => handleAddNotaDebitItem(nd)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.28rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #3b82f6',
                              background: '#ffffff',
                              color: '#1d4ed8',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              boxShadow: '0 1px 2px rgba(59,130,246,0.1)'
                            }}
                            title={`Klik untuk menambahkan ${nd.namaObyekProduksi} (${nd.nomorInvoice}) ke surat`}
                          >
                            <Plus size={13} color="#2563eb" />
                            <span>{nd.nomorInvoice || 'Tanpa No'} • {nd.namaObyekProduksi} • {formatRupiah(nd.totalSetelahPPN || nd.feeSurvey)}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Check size={14} color="#16a34a" />
                      <span>Semua Nota Debit untuk <strong>{namaPerusahaan}</strong> sudah terisi / tercetak dalam Buku Agenda.</span>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: DAFTAR ITEM SURAT PENGANTAR (MULTI-KAPAL) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Ship size={16} color="#0284c7" />
                    <span>Daftar Dokumen / Kapal (Multi-Kapal Sesuai Contoh)</span>
                    <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.5rem', borderRadius: '12px' }}>
                      {items.length} Item
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleAddManualRow}
                      className="btn btn-sm"
                      style={{
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px'
                      }}
                    >
                      <Plus size={13} />
                      <span>Tambah Baris Manual</span>
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {items.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '1.75rem 1rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px dashed #cbd5e1',
                      color: '#64748b',
                      fontSize: '0.85rem'
                    }}
                  >
                    Belum ada Nota Debit atau kapal yang ditambahkan.
                    <div style={{ marginTop: '0.35rem', fontSize: '0.78rem' }}>
                      Pilih dari Nota Debit yang tersedia di atas atau klik <strong>"Tambah Baris Manual"</strong>.
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#334155', textAlign: 'left', fontWeight: 700 }}>
                          <th style={{ padding: '0.45rem 0.5rem', width: '35px', textAlign: 'center' }}>No</th>
                          <th style={{ padding: '0.45rem 0.5rem' }}>Nomor Invoice *</th>
                          <th style={{ padding: '0.45rem 0.5rem' }}>Nama Kapal *</th>
                          <th style={{ padding: '0.45rem 0.5rem', width: '120px' }}>No Seri *</th>
                          <th style={{ padding: '0.45rem 0.5rem', width: '140px' }}>Nominal (Rp) *</th>
                          <th style={{ padding: '0.45rem 0.5rem', width: '110px' }}>Banyaknya</th>
                          <th style={{ padding: '0.45rem 0.5rem', width: '90px' }}>Keterangan</th>
                          <th style={{ padding: '0.45rem 0.5rem', width: '40px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={it.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                              {idx + 1}.
                            </td>
                            <td style={{ padding: '0.4rem 0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={it.nomorInvoice}
                                onChange={(e) => handleUpdateItem(it.id, 'nomorInvoice', e.target.value)}
                                placeholder="00735-PK/B1/0726"
                                required
                                style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.3rem 0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem 0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={it.namaKapal}
                                onChange={(e) => handleUpdateItem(it.id, 'namaKapal', e.target.value.toUpperCase())}
                                placeholder="PRIMA SAMUDRA I"
                                required
                                style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.3rem 0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem 0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={it.noSeri}
                                onChange={(e) => handleUpdateItem(it.id, 'noSeri', e.target.value)}
                                placeholder="13759"
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem 0.5rem' }}>
                              <input
                                type="number"
                                min="0"
                                className="form-input"
                                value={it.nominal}
                                onChange={(e) => handleUpdateItem(it.id, 'nominal', Number(e.target.value) || 0)}
                                placeholder="0"
                                required
                                style={{ fontSize: '0.8rem', fontWeight: 800, color: '#059669', textAlign: 'right', padding: '0.3rem 0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem 0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={it.banyaknya}
                                onChange={(e) => handleUpdateItem(it.id, 'banyaknya', e.target.value)}
                                placeholder="1 (satu) set"
                                style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem 0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={it.keterangan}
                                onChange={(e) => handleUpdateItem(it.id, 'keterangan', e.target.value)}
                                placeholder="Copy"
                                style={{ fontSize: '0.78rem', padding: '0.3rem 0.5rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  padding: '3px'
                                }}
                                title="Hapus baris"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Subtotal & Total Banner */}
                {items.length > 0 && (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      padding: '0.65rem 1rem',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                      Akumulasi Total Nominal ({items.length} Nota Debet):
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#15803d' }}>
                      Rp {formatRupiah(totalNominal)}
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION 4: CATATAN BAWAH SURAT */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1rem'
                }}
              >
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  Catatan Bawah Surat (Transfer VA & Jatuh Tempo)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={keteranganLain}
                  onChange={(e) => setKeteranganLain(e.target.value)}
                  style={{ fontSize: '0.8rem', lineHeight: '1.4' }}
                />
              </div>

              {/* FOOTER ACTIONS */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.65rem',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="btn"
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px'
                  }}
                >
                  <Printer size={15} />
                  <span>Simpan & Langsung Cetak</span>
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', fontWeight: 800, padding: '0.5rem 1.25rem' }}
                >
                  Simpan ke Buku Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
