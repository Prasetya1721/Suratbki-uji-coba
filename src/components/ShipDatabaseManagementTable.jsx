import React, { useState, useMemo, useEffect } from 'react';
import {
  Ship, Plus, Search, Pencil, Trash2, X, Check, Anchor, Building2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
  MapPin, Phone, CheckCircle2, AlertCircle, ExternalLink, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { DEFAULT_SURVEY_TYPES } from './MultiSurveySelect';
import { MASTER_COMPANIES } from '../data/defaultMasterKapal';

const EMPTY_FORM = { namaKapal: '', noAgenda: '', pemohon: '', alamatPerusahaan: '', jenisSurvey: '' };

// ==========================================
// MODAL: FORM TAMBAH / EDIT DATA KAPAL
// ==========================================
const ShipFormModal = ({ isOpen, onClose, onSave, initialData = EMPTY_FORM, isEdit = false, getCompanyAddress }) => {
  const [form, setForm] = useState(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Auto-fill alamat when pemohon changes if address not manually entered or changing company
  const handlePemohonChange = (val) => {
    const upper = val.toUpperCase();
    let newAlamat = form.alamatPerusahaan;
    if (getCompanyAddress) {
      const compInfo = getCompanyAddress(upper);
      if (compInfo && compInfo.alamat) {
        newAlamat = compInfo.alamat + (compInfo.kota ? `, ${compInfo.kota}` : '');
      }
    }
    setForm((p) => ({ ...p, pemohon: upper, alamatPerusahaan: newAlamat }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.namaKapal.trim()) {
      toast.error('Nama Kapal tidak boleh kosong');
      return;
    }
    const result = onSave(form);
    if (result !== false) {
      onClose();
    }
  };

  const handleSelectQuickSurvey = (surveyType) => {
    setForm(prev => {
      const current = prev.jenisSurvey ? prev.jenisSurvey.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (current.includes(surveyType)) {
        return { ...prev, jenisSurvey: current.filter(s => s !== surveyType).join(', ') };
      } else {
        return { ...prev, jenisSurvey: [...current, surveyType].join(', ') };
      }
    });
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
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
            width: '100%', maxWidth: '540px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color,#e2e8f0)',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Anchor size={18} color="#38bdf8" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                {isEdit ? 'Edit Data Kapal' : 'Tambah Kapal Baru'}
              </span>
            </div>
            <button type="button" onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', borderRadius: '6px' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Nama Kapal <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: KM DHARMA FERRY"
                value={form.namaKapal}
                onChange={(e) => setForm((p) => ({ ...p, namaKapal: e.target.value.toUpperCase() }))}
                autoFocus
                style={{ textTransform: 'uppercase', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>No. Agenda</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: 00002PK26"
                  value={form.noAgenda}
                  onChange={(e) => setForm((p) => ({ ...p, noAgenda: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Building2 size={14} color="var(--accent-primary)" />
                  <span>Perusahaan (Pemohon)</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  list="master-companies-autocomplete-list"
                  placeholder="Contoh: PT. PELAYARAN ARI DUTA BAHARI"
                  value={form.pemohon || ''}
                  onChange={(e) => handlePemohonChange(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
                <datalist id="master-companies-autocomplete-list">
                  {MASTER_COMPANIES.map((comp, idx) => (
                    <option key={idx} value={comp} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* ALAMAT PERUSAHAAN */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={14} color="var(--accent-primary)" />
                  <span>Alamat Perusahaan</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  Otomatis tersimpan ke database direktori
                </span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: JL. BUDI KARYA NO. C.8 – C.20, PONTIANAK"
                value={form.alamatPerusahaan || ''}
                onChange={(e) => setForm((p) => ({ ...p, alamatPerusahaan: e.target.value.toUpperCase() }))}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Jenis Survei</label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: PEMBAHARUAN, PENGEDOKAN, TAHUNAN"
                value={form.jenisSurvey}
                onChange={(e) => setForm((p) => ({ ...p, jenisSurvey: e.target.value.toUpperCase() }))}
                style={{ textTransform: 'uppercase', marginBottom: '0.4rem' }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Pilihan Cepat Jenis Survei:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '100px', overflowY: 'auto' }}>
                {DEFAULT_SURVEY_TYPES.map((type) => {
                  const isSelected = form.jenisSurvey && form.jenisSurvey.toUpperCase().includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelectQuickSurvey(type)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.68rem',
                        borderRadius: '5px',
                        border: isSelected ? '1px solid #0284c7' : '1px solid var(--border-color, #e2e8f0)',
                        background: isSelected ? 'rgba(2,132,199,0.15)' : 'var(--bg-main, #f8fafc)',
                        color: isSelected ? '#0284c7' : 'var(--text-secondary, #64748b)',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {isSelected && '✓ '} {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ minWidth: '90px' }}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '120px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Check size={15} />
                {isEdit ? 'Simpan Perubahan' : 'Tambah Kapal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

// ==========================================
// MODAL: FORM TAMBAH / EDIT ALAMAT PERUSAHAAN
// ==========================================
const CompanyAddressModal = ({ isOpen, onClose, onSave, initialData = null, companiesList = [] }) => {
  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [kota, setKota] = useState('PONTIANAK');

  useEffect(() => {
    if (initialData) {
      setNamaPerusahaan(initialData.namaPerusahaan || initialData.nama || '');
      setAlamat(initialData.alamat || '');
      setTelepon(initialData.telepon || '');
      setKota(initialData.kota || 'PONTIANAK');
    } else {
      setNamaPerusahaan('');
      setAlamat('');
      setTelepon('');
      setKota('PONTIANAK');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!namaPerusahaan.trim()) {
      toast.error('Nama Perusahaan tidak boleh kosong');
      return;
    }
    if (!alamat.trim()) {
      toast.error('Alamat Perusahaan tidak boleh kosong');
      return;
    }
    onSave(namaPerusahaan.trim().toUpperCase(), {
      alamat: alamat.trim().toUpperCase(),
      telepon: telepon.trim(),
      kota: kota.trim().toUpperCase() || 'PONTIANAK'
    });
    onClose();
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
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
            width: '100%', maxWidth: '520px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color,#e2e8f0)',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Building2 size={18} color="#38bdf8" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                {initialData?.alamat ? 'Edit Alamat Perusahaan' : 'Tambah Alamat Perusahaan'}
              </span>
            </div>
            <button type="button" onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', borderRadius: '6px' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Nama Perusahaan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-input"
                type="text"
                list="company-name-datalist"
                placeholder="Contoh: PT. SINAR LAUT KHATULISTIWA"
                value={namaPerusahaan}
                onChange={(e) => setNamaPerusahaan(e.target.value.toUpperCase())}
                autoFocus={!initialData}
                style={{ textTransform: 'uppercase', fontWeight: 700 }}
              />
              <datalist id="company-name-datalist">
                {companiesList.map((comp, idx) => (
                  <option key={idx} value={comp} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} color="var(--accent-primary)" />
                <span>Alamat Lengkap Perusahaan <span style={{ color: '#ef4444' }}>*</span></span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Contoh: JL. BUDI KARYA NO. C.8 – C.20"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Phone size={13} color="var(--accent-primary)" />
                  <span>No. Telepon / HP</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: 0561-577211"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Kota</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: PONTIANAK"
                  value={kota}
                  onChange={(e) => setKota(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ minWidth: '90px' }}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '130px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Check size={15} />
                Simpan Alamat
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

// ==========================================
// KOMPONEN UTAMA: SHIP & COMPANY DATABASE
// ==========================================
export const ShipDatabaseManagementTable = () => {
  const {
    masterKapal,
    addMasterKapal,
    updateMasterKapal,
    deleteMasterKapal,
    companyDirectory,
    saveCompanyAddress,
    deleteCompanyAddress,
    getCompanyAddress
  } = useData();

  // Tab: 'ships' | 'companies'
  const [activeTab, setActiveTab] = useState('ships');

  // --- Ships State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('nama_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // --- Companies State ---
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('ALL'); // 'ALL' | 'HAS_ADDR' | 'NO_ADDR'
  const [companySortBy, setCompanySortBy] = useState('nama_asc');
  const [companyCurrentPage, setCompanyCurrentPage] = useState(1);
  const [companyRowsPerPage, setCompanyRowsPerPage] = useState(25);

  // Modals
  const [showShipModal, setShowShipModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [confirmDeleteCompanyKey, setConfirmDeleteCompanyKey] = useState(null);

  // Total unique companies from ships
  const uniqueCompanies = useMemo(() => {
    const set = new Set();
    masterKapal.forEach((k) => {
      if (k.pemohon && k.pemohon.trim()) set.add(k.pemohon.trim());
    });
    return set.size;
  }, [masterKapal]);

  // List of unique companies for filter dropdown & autocomplete
  const companiesList = useMemo(() => {
    const set = new Set();
    MASTER_COMPANIES.forEach((c) => {
      if (c && c !== '-') set.add(c.trim());
    });
    masterKapal.forEach((k) => {
      if (k.pemohon && k.pemohon.trim()) set.add(k.pemohon.trim());
    });
    Object.keys(companyDirectory || {}).forEach((k) => {
      if (k && k !== '-') set.add(k.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterKapal, companyDirectory]);

  // Comprehensive list of all companies with address and ship counts
  const allCompaniesList = useMemo(() => {
    const map = new Map();

    // 1. From MASTER_COMPANIES
    MASTER_COMPANIES.forEach((comp) => {
      const name = (comp || '').trim().toUpperCase();
      if (name && name !== '-') {
        map.set(name, {
          namaPerusahaan: name,
          alamat: '',
          telepon: '',
          kota: 'PONTIANAK',
          shipCount: 0
        });
      }
    });

    // 2. Count ships and check kapal.alamatPerusahaan
    masterKapal.forEach((k) => {
      const name = (k.pemohon || '').trim().toUpperCase();
      if (name && name !== '-') {
        const existing = map.get(name) || {
          namaPerusahaan: name,
          alamat: '',
          telepon: '',
          kota: 'PONTIANAK',
          shipCount: 0
        };
        existing.shipCount = (existing.shipCount || 0) + 1;
        if (!existing.alamat && k.alamatPerusahaan) {
          existing.alamat = k.alamatPerusahaan;
        }
        map.set(name, existing);
      }
    });

    // 3. Merge companyDirectory
    Object.entries(companyDirectory || {}).forEach(([key, val]) => {
      const name = (val.namaPerusahaan || key).trim().toUpperCase();
      if (name && name !== '-') {
        const existing = map.get(name) || {
          namaPerusahaan: name,
          alamat: '',
          telepon: '',
          kota: 'PONTIANAK',
          shipCount: 0
        };
        if (val.alamat) existing.alamat = val.alamat;
        if (val.telepon) existing.telepon = val.telepon;
        if (val.kota) existing.kota = val.kota;
        map.set(name, existing);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.namaPerusahaan.localeCompare(b.namaPerusahaan));
  }, [masterKapal, companyDirectory]);

  // Number of companies with address
  const companiesWithAddressCount = useMemo(() => {
    return allCompaniesList.filter((c) => Boolean(c.alamat && c.alamat.trim())).length;
  }, [allCompaniesList]);

  // Filtered & Sorted Ships
  const filteredShips = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const list = masterKapal.filter((k) => {
      if (q) {
        const matches =
          (k.namaKapal || '').toLowerCase().includes(q) ||
          (k.noAgenda || '').toLowerCase().includes(q) ||
          (k.pemohon || '').toLowerCase().includes(q) ||
          (k.alamatPerusahaan || '').toLowerCase().includes(q) ||
          (k.jenisSurvey || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (companyFilter !== 'ALL') {
        if ((k.pemohon || '').trim().toUpperCase() !== companyFilter.toUpperCase()) {
          return false;
        }
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'nama_asc') return (a.namaKapal || '').localeCompare(b.namaKapal || '');
      if (sortBy === 'nama_desc') return (b.namaKapal || '').localeCompare(a.namaKapal || '');
      if (sortBy === 'agenda_asc') return (a.noAgenda || '').localeCompare(b.noAgenda || '');
      if (sortBy === 'agenda_desc') return (b.noAgenda || '').localeCompare(a.noAgenda || '');
      if (sortBy === 'pemohon_asc') return (a.pemohon || '').localeCompare(b.pemohon || '');
      return 0;
    });

    return list;
  }, [masterKapal, searchTerm, companyFilter, sortBy]);

  // Pagination Ships
  const effectiveRowsPerPage = Number(rowsPerPage) || (filteredShips.length || 1);
  const totalPages = rowsPerPage === 0 ? 1 : Math.max(1, Math.ceil(filteredShips.length / effectiveRowsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, companyFilter, rowsPerPage]);

  const paginatedShips = useMemo(() => {
    if (rowsPerPage === 0) return filteredShips;
    const start = (currentPage - 1) * effectiveRowsPerPage;
    return filteredShips.slice(start, start + effectiveRowsPerPage);
  }, [filteredShips, currentPage, effectiveRowsPerPage, rowsPerPage]);

  const startIndex = (currentPage - 1) * effectiveRowsPerPage;
  const endIndex = rowsPerPage === 0 ? filteredShips.length : Math.min(filteredShips.length, startIndex + effectiveRowsPerPage);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (currentPage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [totalPages, currentPage]);

  const handleJumpPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPageInput('');
    } else {
      toast.error(`Masukkan nomor halaman antara 1 dan ${totalPages}`);
    }
  };

  // Filtered & Sorted Companies
  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();

    const list = allCompaniesList.filter((comp) => {
      if (q) {
        const matches =
          comp.namaPerusahaan.toLowerCase().includes(q) ||
          (comp.alamat || '').toLowerCase().includes(q) ||
          (comp.telepon || '').toLowerCase().includes(q) ||
          (comp.kota || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (companyStatusFilter === 'HAS_ADDR' && (!comp.alamat || !comp.alamat.trim())) {
        return false;
      }
      if (companyStatusFilter === 'NO_ADDR' && (comp.alamat && comp.alamat.trim())) {
        return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (companySortBy === 'nama_asc') return a.namaPerusahaan.localeCompare(b.namaPerusahaan);
      if (companySortBy === 'nama_desc') return b.namaPerusahaan.localeCompare(a.namaPerusahaan);
      if (companySortBy === 'ships_desc') return b.shipCount - a.shipCount;
      return 0;
    });

    return list;
  }, [allCompaniesList, companySearch, companyStatusFilter, companySortBy]);

  // Pagination Companies
  const compEffectiveRows = Number(companyRowsPerPage) || (filteredCompanies.length || 1);
  const compTotalPages = companyRowsPerPage === 0 ? 1 : Math.max(1, Math.ceil(filteredCompanies.length / compEffectiveRows));

  useEffect(() => {
    setCompanyCurrentPage(1);
  }, [companySearch, companyStatusFilter, companyRowsPerPage]);

  const paginatedCompanies = useMemo(() => {
    if (companyRowsPerPage === 0) return filteredCompanies;
    const start = (companyCurrentPage - 1) * compEffectiveRows;
    return filteredCompanies.slice(start, start + compEffectiveRows);
  }, [filteredCompanies, companyCurrentPage, compEffectiveRows, companyRowsPerPage]);

  const compStartIndex = (companyCurrentPage - 1) * compEffectiveRows;
  const compEndIndex = companyRowsPerPage === 0 ? filteredCompanies.length : Math.min(filteredCompanies.length, compStartIndex + compEffectiveRows);

  const compPageNumbers = useMemo(() => {
    if (compTotalPages <= 7) return Array.from({ length: compTotalPages }, (_, i) => i + 1);
    if (companyCurrentPage <= 4) return [1, 2, 3, 4, 5, '...', compTotalPages];
    if (companyCurrentPage >= compTotalPages - 3) return [1, '...', compTotalPages - 4, compTotalPages - 3, compTotalPages - 2, compTotalPages - 1, compTotalPages];
    return [1, '...', companyCurrentPage - 1, companyCurrentPage, companyCurrentPage + 1, '...', compTotalPages];
  }, [compTotalPages, companyCurrentPage]);

  // Handlers Ships
  const handleAddShip = (data) => {
    const result = addMasterKapal(data);
    if (result && !result.success && result.error === 'duplicate') {
      toast.error(`No. Agenda "${result.noAgenda}" sudah digunakan oleh kapal "${result.existingKapal}". Tidak dapat menyimpan data duplikat.`, { duration: 5000 });
      return false;
    }
    toast.success(`Kapal "${data.namaKapal.toUpperCase()}" berhasil ditambahkan ke database`);
    return true;
  };

  const handleEditShip = (data) => {
    const result = updateMasterKapal(editingKapal.id, data);
    if (result && !result.success && result.error === 'duplicate') {
      toast.error(`No. Agenda "${result.noAgenda}" sudah digunakan oleh kapal "${result.existingKapal}". Tidak dapat menyimpan data duplikat.`, { duration: 5000 });
      return false;
    }
    toast.success('Data kapal berhasil diperbarui');
    setEditingKapal(null);
    return true;
  };

  const handleDeleteShip = (id) => {
    const kapal = masterKapal.find((k) => k.id === id);
    deleteMasterKapal(id);
    toast.success(`Kapal "${kapal?.namaKapal}" dihapus dari database`);
    setConfirmDeleteId(null);
  };

  // Handlers Companies
  const handleSaveCompany = (name, data) => {
    saveCompanyAddress(name, data);
    toast.success(`Alamat untuk "${name}" berhasil disimpan ke database!`);
  };

  const handleDeleteCompany = (name) => {
    if (deleteCompanyAddress) {
      deleteCompanyAddress(name);
      toast.success(`Alamat untuk "${name}" dihapus dari direktori`);
    }
    setConfirmDeleteCompanyKey(null);
  };

  const handleViewShipsOfCompany = (companyName) => {
    setCompanyFilter(companyName);
    setActiveTab('ships');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 70%, #0c4a6e 100%)',
          border: 'none', padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem', borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 46, height: 46, borderRadius: '12px',
            background: 'rgba(56,189,248,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {activeTab === 'ships' ? <Ship size={24} color="#38bdf8" /> : <Building2 size={24} color="#38bdf8" />}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              Database Kapal & Alamat Perusahaan
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              <strong>{masterKapal.length}</strong> kapal • <strong>{allCompaniesList.length}</strong> perusahaan • <strong>{companiesWithAddressCount}</strong> memiliki alamat lengkap
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* TAB BUTTONS */}
          <div style={{
            display: 'inline-flex', background: 'rgba(255,255,255,0.1)',
            padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('ships')}
              style={{
                padding: '0.42rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '6px', border: 'none',
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: activeTab === 'ships' ? '#ffffff' : 'transparent',
                color: activeTab === 'ships' ? '#0f172a' : '#cbd5e1'
              }}
            >
              ⚓ Data Kapal ({masterKapal.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              style={{
                padding: '0.42rem 0.85rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '6px', border: 'none',
                cursor: 'pointer', transition: 'all 0.15s ease',
                background: activeTab === 'companies' ? '#ffffff' : 'transparent',
                color: activeTab === 'companies' ? '#0f172a' : '#cbd5e1'
              }}
            >
              🏢 Direktori Perusahaan ({allCompaniesList.length})
            </button>
          </div>

          {/* PRIMARY ACTION BUTTON */}
          {activeTab === 'ships' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { setEditingKapal(null); setShowShipModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, borderRadius: '8px', padding: '0.52rem 1.15rem', fontSize: '0.84rem' }}
            >
              <Plus size={15} />
              Tambah Kapal
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => { setEditingCompany(null); setShowCompanyModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, borderRadius: '8px', padding: '0.52rem 1.15rem', fontSize: '0.84rem' }}
            >
              <Plus size={15} />
              Tambah / Edit Alamat
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DATA KAPAL                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'ships' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
          {/* TOOLBAR */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border-color,#e2e8f0)',
              background: 'var(--bg-main,#f8fafc)',
              display: 'grid',
              gridTemplateColumns: '1.4fr 1.1fr 0.9fr auto',
              gap: '0.65rem',
              alignItems: 'center'
            }}
          >
            {/* Search Box */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                type="text"
                placeholder="Cari nama kapal, no. agenda, perusahaan, alamat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '2rem', height: '32px', fontSize: '0.8rem', width: '100%' }}
              />
            </div>

            {/* Company / Pemohon Filter */}
            <div>
              <select
                className="form-select"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                style={{ width: '100%', height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
              >
                <option value="ALL">🏢 Semua Perusahaan ({uniqueCompanies})</option>
                {companiesList.map((comp, idx) => (
                  <option key={idx} value={comp}>
                    🏢 {comp}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                className="form-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%', height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
              >
                <option value="nama_asc">🔤 Nama Kapal (A - Z)</option>
                <option value="nama_desc">🔤 Nama Kapal (Z - A)</option>
                <option value="agenda_asc">📄 No. Agenda (Asc)</option>
                <option value="agenda_desc">📄 No. Agenda (Desc)</option>
                <option value="pemohon_asc">🏢 Perusahaan (A - Z)</option>
              </select>
            </div>

            {/* Rows Per Page */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tampil:</span>
              <select
                className="form-select"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                style={{ height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.4rem', width: '85px' }}
              >
                <option value={15}>15 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
                <option value={250}>250 baris</option>
                <option value={0}>Semua</option>
              </select>
            </div>
          </div>

          {/* Top Info Bar */}
          <div
            style={{
              padding: '0.45rem 1rem',
              background: 'var(--bg-card,#ffffff)',
              borderBottom: '1px solid var(--border-color,#e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div>
              Menampilkan <strong>{filteredShips.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{endIndex}</strong> dari <strong>{filteredShips.length}</strong> data kapal
              {(searchTerm !== '' || companyFilter !== 'ALL' || sortBy !== 'nama_asc') && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setCompanyFilter('ALL'); setSortBy('nama_asc'); }}
                  style={{
                    background: 'transparent', border: 'none', color: '#ef4444',
                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                  }}
                >
                  <RotateCcw size={11} /> Reset Filter
                </button>
              )}
            </div>
            {totalPages > 1 && (
              <div style={{ fontWeight: 600 }}>
                Halaman <strong style={{ color: 'var(--accent-primary)' }}>{currentPage}</strong> dari <strong>{totalPages}</strong>
              </div>
            )}
          </div>

          {/* Table Content */}
          <div style={{ overflowX: 'auto', minHeight: '320px' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '55px', textAlign: 'center' }}>No.</th>
                  <th>Nama Kapal</th>
                  <th style={{ width: '150px' }}>No. Agenda</th>
                  <th style={{ minWidth: '240px' }}>Perusahaan & Alamat</th>
                  <th style={{ minWidth: '180px' }}>Jenis Survei</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShips.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                        <Anchor size={36} color="#cbd5e1" />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Tidak ada data kapal yang sesuai
                          </p>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
                            Ubah kata kunci pencarian atau klik "Tambah Kapal" untuk menambah data
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedShips.map((kapal, idx) => {
                    const trueIndex = startIndex + idx + 1;
                    const companyAddrInfo = getCompanyAddress ? getCompanyAddress(kapal.pemohon) : null;
                    const displayAddr = kapal.alamatPerusahaan || companyAddrInfo?.alamat;
                    const displayCity = companyAddrInfo?.kota;

                    return (
                      <tr key={kapal.id}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {trueIndex}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '7px',
                              background: 'rgba(2,132,199,0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <Ship size={15} color="#0284c7" />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                              {kapal.namaKapal}
                            </span>
                          </div>
                        </td>
                        <td>
                          {kapal.noAgenda ? (
                            <span style={{
                              background: 'rgba(5,150,105,0.1)', color: '#059669',
                              borderRadius: '5px', padding: '0.15rem 0.55rem',
                              fontSize: '0.78rem', fontWeight: 700, fontFamily: 'monospace'
                            }}>
                              {kapal.noAgenda}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td>
                          {kapal.pemohon ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Building2 size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                  {kapal.pemohon}
                                </span>
                              </div>
                              {displayAddr ? (
                                <div style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '0.3rem',
                                  marginTop: '0.2rem', fontSize: '0.71rem', color: 'var(--text-muted)'
                                }}>
                                  <MapPin size={11} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                                  <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {displayAddr}{displayCity ? ` • ${displayCity}` : ''}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCompany({ namaPerusahaan: kapal.pemohon });
                                    setShowCompanyModal(true);
                                  }}
                                  style={{
                                    background: 'none', border: 'none', padding: 0, marginTop: '0.25rem',
                                    fontSize: '0.7rem', color: '#0284c7', cursor: 'pointer',
                                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600
                                  }}
                                  title="Tambah alamat untuk perusahaan ini"
                                >
                                  <Plus size={11} /> Tambah Alamat
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td>
                          {kapal.jenisSurvey ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                              {kapal.jenisSurvey.split(',').map((s, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.12)',
                                    color: '#0284c7',
                                    border: '1px solid rgba(2, 132, 199, 0.25)',
                                    borderRadius: '4px',
                                    padding: '0.1rem 0.45rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700
                                  }}
                                >
                                  {s.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {confirmDeleteId === kapal.id ? (
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>Hapus?</span>
                              <button type="button" onClick={() => handleDeleteShip(kapal.id)}
                                style={{ padding: '0.15rem 0.45rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                                Ya
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)}
                                style={{ padding: '0.15rem 0.45rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                              <button type="button"
                                onClick={() => { setEditingKapal(kapal); setShowShipModal(true); }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                  padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700,
                                  background: 'rgba(2,132,199,0.1)', color: '#0284c7',
                                  border: '1px solid rgba(2,132,199,0.25)', borderRadius: '6px', cursor: 'pointer'
                                }}
                                title="Edit kapal"
                              >
                                <Pencil size={11} /> Edit
                              </button>
                              <button type="button"
                                onClick={() => setConfirmDeleteId(kapal.id)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                  padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700,
                                  background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                  border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer'
                                }}
                                title="Hapus kapal"
                              >
                                <Trash2 size={11} /> Hapus
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BOTTOM PAGINATION CONTROLLER SHIPS */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-color,#e2e8f0)',
                background: 'var(--bg-main,#f8fafc)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Menampilkan data <strong>{startIndex + 1}</strong> - <strong>{endIndex}</strong> dari total <strong>{filteredShips.length}</strong> kapal
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.45 : 1
                  }}
                  title="Halaman Pertama"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.45 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {pageNumbers.map((p, i) => {
                  if (p === '...') {
                    return <span key={`ellipsis-${i}`} style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>...</span>;
                  }
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        minWidth: '28px', height: '28px', padding: '0 0.35rem', fontSize: '0.75rem',
                        fontWeight: isActive ? 800 : 600, borderRadius: '5px',
                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color,#e2e8f0)',
                        background: isActive ? 'var(--accent-primary)' : 'var(--bg-card,#fff)',
                        color: isActive ? '#ffffff' : 'var(--text-primary)', cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.45 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.45 : 1
                  }}
                  title="Halaman Terakhir"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>

              <form onSubmit={handleJumpPage} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Lompat:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  placeholder={String(currentPage)}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  style={{ width: '52px', height: '28px', padding: '0 0.35rem', fontSize: '0.75rem', textAlign: 'center', borderRadius: '5px', border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)' }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '28px', padding: '0 0.55rem', fontSize: '0.72rem' }}>
                  Go
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DIREKTORI PERUSAHAAN & ALAMAT                                     */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
          {/* TOOLBAR COMPANIES */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border-color,#e2e8f0)',
              background: 'var(--bg-main,#f8fafc)',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr auto',
              gap: '0.65rem',
              alignItems: 'center'
            }}
          >
            {/* Search Box */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                type="text"
                placeholder="Cari perusahaan, alamat, telepon, kota..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                style={{ paddingLeft: '2rem', height: '32px', fontSize: '0.8rem', width: '100%' }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="form-select"
                value={companyStatusFilter}
                onChange={(e) => setCompanyStatusFilter(e.target.value)}
                style={{ width: '100%', height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
              >
                <option value="ALL">📋 Semua Status ({allCompaniesList.length})</option>
                <option value="HAS_ADDR">✅ Ada Alamat ({companiesWithAddressCount})</option>
                <option value="NO_ADDR">⚠️ Belum Ada Alamat ({allCompaniesList.length - companiesWithAddressCount})</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                className="form-select"
                value={companySortBy}
                onChange={(e) => setCompanySortBy(e.target.value)}
                style={{ width: '100%', height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
              >
                <option value="nama_asc">🔤 Nama Perusahaan (A - Z)</option>
                <option value="nama_desc">🔤 Nama Perusahaan (Z - A)</option>
                <option value="ships_desc">⚓ Jumlah Kapal Terbanyak</option>
              </select>
            </div>

            {/* Rows Per Page */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tampil:</span>
              <select
                className="form-select"
                value={companyRowsPerPage}
                onChange={(e) => setCompanyRowsPerPage(Number(e.target.value))}
                style={{ height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.4rem', width: '85px' }}
              >
                <option value={15}>15 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
                <option value={0}>Semua</option>
              </select>
            </div>
          </div>

          {/* Top Info Bar Companies */}
          <div
            style={{
              padding: '0.45rem 1rem',
              background: 'var(--bg-card,#ffffff)',
              borderBottom: '1px solid var(--border-color,#e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div>
              Menampilkan <strong>{filteredCompanies.length > 0 ? compStartIndex + 1 : 0}</strong> - <strong>{compEndIndex}</strong> dari <strong>{filteredCompanies.length}</strong> perusahaan
              {(companySearch !== '' || companyStatusFilter !== 'ALL' || companySortBy !== 'nama_asc') && (
                <button
                  type="button"
                  onClick={() => { setCompanySearch(''); setCompanyStatusFilter('ALL'); setCompanySortBy('nama_asc'); }}
                  style={{
                    background: 'transparent', border: 'none', color: '#ef4444',
                    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    marginLeft: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                  }}
                >
                  <RotateCcw size={11} /> Reset Filter
                </button>
              )}
            </div>
            {compTotalPages > 1 && (
              <div style={{ fontWeight: 600 }}>
                Halaman <strong style={{ color: 'var(--accent-primary)' }}>{companyCurrentPage}</strong> dari <strong>{compTotalPages}</strong>
              </div>
            )}
          </div>

          {/* Table Content Companies */}
          <div style={{ overflowX: 'auto', minHeight: '320px' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No.</th>
                  <th style={{ minWidth: '220px' }}>Nama Perusahaan</th>
                  <th style={{ minWidth: '240px' }}>Alamat Lengkap</th>
                  <th style={{ width: '150px' }}>Telepon / HP</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Kota</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Kapal Terdaftar</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                        <Building2 size={36} color="#cbd5e1" />
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Tidak ada data perusahaan yang sesuai filter
                          </p>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
                            Klik "+ Tambah / Edit Alamat" untuk menambahkan data alamat baru
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCompanies.map((comp, idx) => {
                    const trueIndex = compStartIndex + idx + 1;
                    const hasAddr = Boolean(comp.alamat && comp.alamat.trim());

                    return (
                      <tr key={comp.namaPerusahaan}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {trueIndex}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '6px',
                              background: hasAddr ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <Building2 size={14} color={hasAddr ? '#059669' : '#d97706'} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                              {comp.namaPerusahaan}
                            </span>
                          </div>
                        </td>
                        <td>
                          {hasAddr ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                              <MapPin size={13} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {comp.alamat}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                              Belum diisi
                            </span>
                          )}
                        </td>
                        <td>
                          {comp.telepon ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Phone size={12} color="#059669" />
                              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                {comp.telepon}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            background: 'var(--bg-main,#f1f5f9)', color: 'var(--text-secondary)',
                            borderRadius: '4px', padding: '0.15rem 0.45rem', fontSize: '0.74rem', fontWeight: 700
                          }}>
                            {comp.kota || 'PONTIANAK'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {comp.shipCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleViewShipsOfCompany(comp.namaPerusahaan)}
                              style={{
                                background: 'rgba(2,132,199,0.12)', color: '#0284c7',
                                border: '1px solid rgba(2,132,199,0.25)', borderRadius: '6px',
                                padding: '0.15rem 0.55rem', fontSize: '0.76rem', fontWeight: 800,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                              }}
                              title={`Lihat ${comp.shipCount} kapal milik perusahaan ini`}
                            >
                              <Anchor size={11} /> {comp.shipCount} Kapal
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {hasAddr ? (
                            <span style={{
                              background: 'rgba(16,185,129,0.12)', color: '#059669',
                              border: '1px solid rgba(16,185,129,0.25)', borderRadius: '4px',
                              padding: '0.12rem 0.45rem', fontSize: '0.7rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                            }}>
                              <CheckCircle2 size={11} /> Ada Alamat
                            </span>
                          ) : (
                            <span style={{
                              background: 'rgba(245,158,11,0.12)', color: '#d97706',
                              border: '1px solid rgba(245,158,11,0.25)', borderRadius: '4px',
                              padding: '0.12rem 0.45rem', fontSize: '0.7rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: '0.25rem'
                            }}>
                              <AlertCircle size={11} /> Belum Ada
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {confirmDeleteCompanyKey === comp.namaPerusahaan ? (
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>Hapus?</span>
                              <button type="button" onClick={() => handleDeleteCompany(comp.namaPerusahaan)}
                                style={{ padding: '0.15rem 0.45rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                                Ya
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteCompanyKey(null)}
                                style={{ padding: '0.15rem 0.45rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => { setEditingCompany(comp); setShowCompanyModal(true); }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                  padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700,
                                  background: 'rgba(2,132,199,0.1)', color: '#0284c7',
                                  border: '1px solid rgba(2,132,199,0.25)', borderRadius: '6px', cursor: 'pointer'
                                }}
                                title="Edit Alamat"
                              >
                                <Pencil size={11} /> {hasAddr ? 'Edit' : '+ Alamat'}
                              </button>
                              {hasAddr && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCompanyKey(comp.namaPerusahaan)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    padding: '0.25rem 0.45rem', fontSize: '0.72rem',
                                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer'
                                  }}
                                  title="Hapus alamat perusahaan ini"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BOTTOM PAGINATION CONTROLLER COMPANIES */}
          {compTotalPages > 1 && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-color,#e2e8f0)',
                background: 'var(--bg-main,#f8fafc)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Menampilkan data <strong>{compStartIndex + 1}</strong> - <strong>{compEndIndex}</strong> dari total <strong>{filteredCompanies.length}</strong> perusahaan
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setCompanyCurrentPage(1)}
                  disabled={companyCurrentPage === 1}
                  style={{
                    padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: companyCurrentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: companyCurrentPage === 1 ? 'not-allowed' : 'pointer', opacity: companyCurrentPage === 1 ? 0.45 : 1
                  }}
                  title="Halaman Pertama"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={companyCurrentPage === 1}
                  style={{
                    padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: companyCurrentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: companyCurrentPage === 1 ? 'not-allowed' : 'pointer', opacity: companyCurrentPage === 1 ? 0.45 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {compPageNumbers.map((p, i) => {
                  if (p === '...') {
                    return <span key={`comp-ell-${i}`} style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>...</span>;
                  }
                  const isActive = p === companyCurrentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCompanyCurrentPage(p)}
                      style={{
                        minWidth: '28px', height: '28px', padding: '0 0.35rem', fontSize: '0.75rem',
                        fontWeight: isActive ? 800 : 600, borderRadius: '5px',
                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color,#e2e8f0)',
                        background: isActive ? 'var(--accent-primary)' : 'var(--bg-card,#fff)',
                        color: isActive ? '#ffffff' : 'var(--text-primary)', cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setCompanyCurrentPage((p) => Math.min(compTotalPages, p + 1))}
                  disabled={companyCurrentPage === compTotalPages}
                  style={{
                    padding: '0.25rem 0.55rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: companyCurrentPage === compTotalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: companyCurrentPage === compTotalPages ? 'not-allowed' : 'pointer', opacity: companyCurrentPage === compTotalPages ? 0.45 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyCurrentPage(compTotalPages)}
                  disabled={companyCurrentPage === compTotalPages}
                  style={{
                    padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '5px',
                    border: '1px solid var(--border-color,#e2e8f0)', background: 'var(--bg-card,#fff)',
                    color: companyCurrentPage === compTotalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: companyCurrentPage === compTotalPages ? 'not-allowed' : 'pointer', opacity: companyCurrentPage === compTotalPages ? 0.45 : 1
                  }}
                  title="Halaman Terakhir"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: SHIP FORM */}
      <ShipFormModal
        isOpen={showShipModal}
        onClose={() => { setShowShipModal(false); setEditingKapal(null); }}
        onSave={editingKapal ? handleEditShip : handleAddShip}
        initialData={editingKapal || EMPTY_FORM}
        isEdit={!!editingKapal}
        getCompanyAddress={getCompanyAddress}
      />

      {/* MODAL: COMPANY ADDRESS FORM */}
      <CompanyAddressModal
        isOpen={showCompanyModal}
        onClose={() => { setShowCompanyModal(false); setEditingCompany(null); }}
        onSave={handleSaveCompany}
        initialData={editingCompany}
        companiesList={companiesList}
      />
    </div>
  );
};
