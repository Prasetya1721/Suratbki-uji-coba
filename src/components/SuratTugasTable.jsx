import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  User,
  Calendar,
  MapPin,
  Anchor,
  Printer,
  ArrowUpDown,
  Filter,
  RotateCcw,
  Clock,
  Calculator,
  Lock,
  Unlock,
  CheckCircle,
  MessageSquare,
  AlertTriangle,
  Send,
  CheckCheck,
  Globe
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo, getStatusBadgeClass, cleanDocNumber, formatRupiah, isDocumentLocked } from '../utils/formatters';
import { filterDataByRole, isSameSurveyor } from '../utils/filterData';
import { SpsModal } from './SpsModal';
import { PdsModal } from './PdsModal';
import { PdsLuarNegeriModal } from './PdsLuarNegeriModal';
import { SuratTugasPrintModal } from './SuratTugasPrintModal';
import { SuratTugasPdsPrintModal } from './SuratTugasPdsPrintModal';
import { BiayaPdsPrintModal } from './BiayaPdsPrintModal';
import { BiayaPdsLuarNegeriPrintModal } from './BiayaPdsLuarNegeriPrintModal';
import { LampiranParafPrintModal } from './LampiranParafPrintModal';
import { TandaTerimaSmcPrintModal } from './TandaTerimaSmcPrintModal';
import { ConfirmModal } from './ConfirmModal';
import { exportBiayaPerjalananDinas } from '../utils/exportExcelBiaya';

export const SuratTugasTable = ({ filterType = 'SPS' }) => {
  const { suratTugas, deleteSuratTugas, updateSuratTugas, gradeTariffs, tariffs } = useData();
  const { role, usersList, currentUser } = useAuth();
  const isFinance = role === 'finance' || role === 'keuangan';
  const effectiveFilterType = isFinance ? 'SPS' : filterType;

  // Search & Basic Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [surveyorFilter, setSurveyorFilter] = useState('Semua');

  // Multi-Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState('Semua');
  const [selectedYear, setSelectedYear] = useState('Semua');

  // Multi-Day / Custom Date Range Filter
  const [datePreset, setDatePreset] = useState('all'); // all, today, this_week, this_month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting Option (Sort / Short Multi Hari & Tanggal)
  const [sortBy, setSortBy] = useState('tgl_desc'); // tgl_desc, tgl_asc, duration_desc, duration_asc, kapal_asc, kapal_desc, petugas_asc, nomor_asc

  // Modals
  const [isSpsModalOpen, setIsSpsModalOpen] = useState(false);
  const [isPdsModalOpen, setIsPdsModalOpen] = useState(false);
  const [isPdsLuarNegeriModalOpen, setIsPdsLuarNegeriModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [pdsSubTab, setPdsSubTab] = useState(() => {
    if (filterType === 'PDS_LUAR') return 'LUAR';
    return 'DALAM';
  });

  useEffect(() => {
    if (filterType === 'PDS_LUAR') setPdsSubTab('LUAR');
    else if (filterType === 'PDS_DALAM') setPdsSubTab('DALAM');
  }, [filterType]);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPdsPrintModalOpen, setIsPdsPrintModalOpen] = useState(false);
  const [isParafModalOpen, setIsParafModalOpen] = useState(false);
  const [isBiayaPrintModalOpen, setIsBiayaPrintModalOpen] = useState(false);
  const [isBiayaLuarNegeriPrintModalOpen, setIsBiayaLuarNegeriPrintModalOpen] = useState(false);
  const [isSmcPrintModalOpen, setIsSmcPrintModalOpen] = useState(false);
  const [selectedPrintItem, setSelectedPrintItem] = useState(null);
  const [selectedParafItem, setSelectedParafItem] = useState(null);
  const [selectedSmcItem, setSelectedSmcItem] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // ACC / Revisi Modal State
  const [isRevisiModalOpen, setIsRevisiModalOpen] = useState(false);
  const [revisiItem, setRevisiItem] = useState(null);
  const [revisiNote, setRevisiNote] = useState('');

  const canCreateSps = (role === 'admin' || role === 'developer' || role === 'kacab' || role === 'surveyor') && !isFinance;
  const canCreatePds = (role === 'admin' || role === 'developer' || role === 'kacab' || role === 'surveyor') && !isFinance;
  const canEdit = (role === 'admin' || role === 'developer' || role === 'kacab' || role === 'surveyor') && !isFinance;
  const isAdminOrKacab = role === 'admin' || role === 'developer' || role === 'kacab';
  const canAcc = isAdminOrKacab || isFinance;

  const handleToggleUnlock = (item) => {
    const isUnlocked = !item.isUnlockedByAdmin;
    updateSuratTugas(item.id, {
      isUnlockedByAdmin: isUnlocked,
      unlockedAt: isUnlocked ? new Date().toISOString() : null,
      unlockedBy: isUnlocked ? currentUser?.name : null
    });
    if (isUnlocked) {
      toast.success(`🔓 Kunci dibuka untuk ${item.namaKapal || 'dokumen ini'}. Surveyor dapat mengedit kembali.`);
    } else {
      toast.info(`🔒 Dokumen ${item.namaKapal || ''} berhasil dikunci kembali.`);
    }
  };
  const canDelete = role === 'admin' || role === 'developer';

  const handleKirimParaf = (item) => {
    updateSuratTugas(item.id, {
      isParafSent: true,
      parafSentAt: new Date().toISOString(),
      parafSentBy: currentUser?.name || item.petugas
    });
    toast.success(`Laporan Paraf untuk kapal ${item.namaKapal} berhasil dikirim ke Laporan Paraf BKI!`);
  };

  const handleBatalkanKirimParaf = (item) => {
    updateSuratTugas(item.id, {
      isParafSent: false,
      parafSentAt: null,
      parafSentBy: null
    });
    toast.info(`Pengiriman Laporan Paraf untuk ${item.namaKapal} dibatalkan.`);
  };

  // ACC / Revisi Handlers
  const handleToggleAccPds = (item) => {
    const isCurrentlyAcc = item.approvalStatus === 'ACC' || (item.status === 'Selesai' && item.approvalStatus !== 'Revisi');
    const updaterName = currentUser?.name || (isFinance ? 'Staff Keuangan' : (currentUser?.role === 'kacab' ? 'Kepala Cabang' : 'Admin'));
    if (isCurrentlyAcc) {
      updateSuratTugas(item.id, {
        approvalStatus: 'Menunggu',
        status: 'Berjalan',
        approvalNote: '',
        approvalBy: null,
        approvedBy: null,
        approvalAt: null,
        approvalDate: null
      });
      toast.info(`Status ACC untuk PDS ${item.namaKapal || ''} dibatalkan (Menunggu ACC).`);
    } else {
      updateSuratTugas(item.id, {
        approvalStatus: 'ACC',
        status: 'Selesai',
        approvalNote: '',
        approvalBy: updaterName,
        approvedBy: updaterName,
        approvalAt: new Date().toISOString(),
        approvalDate: new Date().toISOString()
      });
      toast.success(`✅ PDS ${item.namaKapal || ''} telah di-ACC dan ditandai Selesai.`);
    }
  };

  const handleOpenRevisi = (item) => {
    setRevisiItem(item);
    setRevisiNote('');
    setIsRevisiModalOpen(true);
  };

  const handleSubmitRevisi = () => {
    if (!revisiItem) return;
    if (!revisiNote.trim()) {
      toast.error('Keterangan revisi wajib diisi.');
      return;
    }
    updateSuratTugas(revisiItem.id, {
      approvalStatus: 'Revisi',
      approvalNote: revisiNote.trim(),
      approvalBy: currentUser?.name || 'Admin',
      approvalAt: new Date().toISOString()
    });
    toast.success(`🔄 Revisi diminta untuk PDS ${revisiItem.namaKapal || ''}. Notifikasi akan muncul di dashboard surveyor.`);
    setIsRevisiModalOpen(false);
    setRevisiItem(null);
    setRevisiNote('');
  };

  const monthNames = [
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
    { value: '12', label: 'Desember' }
  ];

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const docYears = (suratTugas || [])
      .map((item) => (item.tglMulai || item.tglSelesai || '').substring(0, 4))
      .filter((y) => y && y.length === 4);
    const years = ['Semua', String(currentYear + 1), String(currentYear), String(currentYear - 1), String(currentYear - 2), ...docYears];
    const unique = Array.from(new Set(years));
    return unique.sort((a, b) => {
      if (a === 'Semua') return -1;
      if (b === 'Semua') return 1;
      return Number(b) - Number(a);
    });
  }, [suratTugas]);

  const surveyors = useMemo(() => {
    const list = usersList?.filter(u => u.role === 'surveyor' || u.role === 'kacab') || [];
    return list;
  }, [usersList]);

  // Handle Quick Date Preset Changes
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay());
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const lastDate = new Date(year, today.getMonth() + 1, 0).getDate();
      setStartDate(`${year}-${month}-01`);
      setEndDate(`${year}-${month}-${String(lastDate).padStart(2, '0')}`);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('Semua');
    setSurveyorFilter('Semua');
    setSelectedMonth('Semua');
    setSelectedYear('Semua');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSortBy('tgl_desc');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'Semua' ||
    surveyorFilter !== 'Semua' ||
    selectedMonth !== 'Semua' ||
    selectedYear !== 'Semua' ||
    startDate !== '' ||
    endDate !== '' ||
    sortBy !== 'tgl_desc';

  // Helper to calculate days between dates
  const calculateDays = (start, end) => {
    if (!start) return 1;
    if (!end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e)) return 1;
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  // Filter & Sort Data
  const filteredAndSortedData = useMemo(() => {
    // Role based visibility
    const roleFiltered = filterDataByRole(suratTugas, currentUser, role, 'petugas');

    // 1. Filter
    const result = roleFiltered.filter((item) => {
      // Filter Type: SPS vs PDS_DALAM vs PDS_LUAR vs PDS
      if (effectiveFilterType === 'SPS') {
        const isPdsOnly = item.docType === 'PDS';
        if (isPdsOnly) return false;
      } else if (effectiveFilterType === 'PDS_DALAM') {
        const isPds = item.docType === 'PDS' || item.isPds || (item.status !== 'Menunggu Survei' && !item.isSps);
        const isLN = item.isLuarNegeri === true || item.pdsType === 'luar_negeri';
        if (!isPds || isLN) return false;
      } else if (effectiveFilterType === 'PDS_LUAR') {
        const isLN = item.isLuarNegeri === true || item.pdsType === 'luar_negeri';
        if (!isLN) return false;
      } else if (effectiveFilterType === 'PDS') {
        const isPds = item.docType === 'PDS' || item.isPds || (item.status !== 'Menunggu Survei' && !item.isSps);
        if (!isPds) return false;
        const isLN = item.isLuarNegeri === true || item.pdsType === 'luar_negeri';
        if (pdsSubTab === 'DALAM' && isLN) return false;
        if (pdsSubTab === 'LUAR' && !isLN) return false;
      }

      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.petugas || '').toLowerCase().includes(searchLower) ||
        (item.nomor || '').toLowerCase().includes(searchLower) ||
        (item.namaKapal || '').toLowerCase().includes(searchLower) ||
        (item.lokasi || '').toLowerCase().includes(searchLower) ||
        (item.perihal || '').toLowerCase().includes(searchLower) ||
        (item.jenisSurvey || '').toLowerCase().includes(searchLower) ||
        (item.agenda || '').toLowerCase().includes(searchLower) ||
        (item.pemohon || '').toLowerCase().includes(searchLower) ||
        (item.noOrder || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'Perlu Revisi') {
        if (item.approvalStatus !== 'Revisi') return false;
      } else if (statusFilter === 'ACC') {
        if (item.approvalStatus !== 'ACC') return false;
      } else if (statusFilter === 'Belum di-ACC') {
        if (item.approvalStatus === 'ACC' || item.approvalStatus === 'Revisi') return false;
      } else if (statusFilter !== 'Semua' && item.status !== statusFilter) {
        return false;
      }

      // Surveyor Filter (fleksibel: SEPTIAN AJI <=> SEPTIAN AJI DEWANGKARA)
      if (surveyorFilter !== 'Semua' && !isSameSurveyor(item.petugas, surveyorFilter, usersList)) {
        return false;
      }

      const itemDate = item.tglMulai || item.tglSelesai || '';

      // Month Filter
      if (selectedMonth !== 'Semua') {
        if (itemDate) {
          const itemMonth = itemDate.substring(5, 7);
          const endMonth = item.tglSelesai ? item.tglSelesai.substring(5, 7) : itemMonth;
          // Matches if starts in month or ends in month
          if (itemMonth !== selectedMonth && endMonth !== selectedMonth) {
            return false;
          }
        }
      }

      // Year Filter
      if (selectedYear !== 'Semua') {
        if (itemDate) {
          const itemYear = itemDate.substring(0, 4);
          const endYear = item.tglSelesai ? item.tglSelesai.substring(0, 4) : itemYear;
          if (itemYear !== selectedYear && endYear !== selectedYear) {
            return false;
          }
        }
      }

      // Multi-Day / Custom Date Range Filter
      if (startDate) {
        const itemEnd = item.tglSelesai || item.tglMulai || '';
        if (itemEnd && itemEnd < startDate) return false;
      }
      if (endDate) {
        const itemStart = item.tglMulai || item.tglSelesai || '';
        if (itemStart && itemStart > endDate) return false;
      }

      return true;
    });

    // 2. Sort (Short / Sortir)
    result.sort((a, b) => {
      const dateA = a.tglMulai || a.tglSelesai || '';
      const dateB = b.tglMulai || b.tglSelesai || '';
      const durA = calculateDays(a.tglMulai, a.tglSelesai);
      const durB = calculateDays(b.tglMulai, b.tglSelesai);

      switch (sortBy) {
        case 'tgl_asc':
          return dateA.localeCompare(dateB);
        case 'duration_desc':
          return durB - durA;
        case 'duration_asc':
          return durA - durB;
        case 'kapal_asc':
          return (a.namaKapal || '').localeCompare(b.namaKapal || '');
        case 'kapal_desc':
          return (b.namaKapal || '').localeCompare(a.namaKapal || '');
        case 'petugas_asc':
          return (a.petugas || '').localeCompare(b.petugas || '');
        case 'petugas_desc':
          return (b.petugas || '').localeCompare(a.petugas || '');
        case 'nomor_asc':
          return (a.nomor || '').localeCompare(b.nomor || '');
        case 'nomor_desc':
          return (b.nomor || '').localeCompare(a.nomor || '');
        case 'tgl_desc':
        default:
          return dateB.localeCompare(dateA);
      }
    });

    return result;
  }, [suratTugas, currentUser, role, filterType, effectiveFilterType, pdsSubTab, searchTerm, statusFilter, surveyorFilter, selectedMonth, selectedYear, startDate, endDate, sortBy, usersList]);

  // Statistics calculation
  const totalHariKegiatan = useMemo(() => {
    return filteredAndSortedData.reduce((acc, item) => acc + calculateDays(item.tglMulai, item.tglSelesai), 0);
  }, [filteredAndSortedData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    if (effectiveFilterType === 'PDS_LUAR' || (effectiveFilterType === 'PDS' && pdsSubTab === 'LUAR')) {
      setIsPdsLuarNegeriModalOpen(true);
    } else if (effectiveFilterType === 'PDS' || effectiveFilterType === 'PDS_DALAM') {
      setIsPdsModalOpen(true);
    } else {
      setIsSpsModalOpen(true);
    }
  };

  const handleOpenAddPdsLuar = () => {
    setEditingItem(null);
    setIsPdsLuarNegeriModalOpen(true);
  };

  const handleOpenAddPdsDalam = () => {
    setEditingItem(null);
    setIsPdsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    if (item.isLuarNegeri || item.pdsType === 'luar_negeri') {
      setIsPdsLuarNegeriModalOpen(true);
    } else if (item.docType === 'PDS' || item.isPds || effectiveFilterType.startsWith('PDS')) {
      setIsPdsModalOpen(true);
    } else {
      setIsSpsModalOpen(true);
    }
  };

  const handleOpenPrint = (item) => {
    setSelectedPrintItem(item);
    setIsPrintModalOpen(true);
  };

  const handleOpenPdsPrint = (item) => {
    setSelectedPrintItem(item);
    setIsPdsPrintModalOpen(true);
  };

  const handleOpenBiayaPrint = (item) => {
    setSelectedPrintItem(item);
    if (item.isLuarNegeri || item.pdsType === 'luar_negeri') {
      setIsBiayaLuarNegeriPrintModalOpen(true);
    } else {
      setIsBiayaPrintModalOpen(true);
    }
  };

  const handleOpenParafPrint = (item) => {
    setSelectedParafItem(item);
    setIsParafModalOpen(true);
  };

  const handleExportExcel = (item) => {
    exportBiayaPerjalananDinas(item, usersList, gradeTariffs);
  };

  const promptDelete = (item) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteSuratTugas(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="card-title">
              {effectiveFilterType === 'SPS' && 'Daftar Surat Penunjukan Survey (SPS)'}
              {effectiveFilterType === 'PDS_DALAM' && 'Daftar PDS Dalam Negeri'}
              {effectiveFilterType === 'PDS_LUAR' && 'Daftar PDS Luar Negeri (USD)'}
              {effectiveFilterType === 'PDS' && (pdsSubTab === 'LUAR' ? 'Daftar PDS Luar Negeri (USD)' : 'Daftar PDS Dalam Negeri')}
            </h2>
            <div className="card-subtitle">
              Kelola penugasan marine surveyor, sortir multi-hari & multi-bulan operasional
            </div>
            {effectiveFilterType.startsWith('PDS') && (
              <div style={{ display: 'inline-flex', background: 'var(--bg-main)', padding: '0.15rem', borderRadius: '6px', border: '1px solid var(--border-color)', gap: '0.2rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${pdsSubTab === 'DALAM' && effectiveFilterType !== 'PDS_LUAR' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPdsSubTab('DALAM')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '0.15rem 0.6rem',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}
                >
                  🇮🇩 Dalam Negeri
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${pdsSubTab === 'LUAR' || effectiveFilterType === 'PDS_LUAR' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPdsSubTab('LUAR')}
                  style={{
                    fontSize: '0.74rem',
                    padding: '0.15rem 0.6rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                    background: (pdsSubTab === 'LUAR' || effectiveFilterType === 'PDS_LUAR') ? '#0284c7' : undefined,
                    borderColor: (pdsSubTab === 'LUAR' || effectiveFilterType === 'PDS_LUAR') ? '#0284c7' : undefined
                  }}
                >
                  <Globe size={12} style={{ marginRight: '0.25rem' }} />
                  🌐 Luar Negeri (USD)
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}
              title="Reset seluruh filter & sorting"
            >
              <RotateCcw size={14} />
              <span>Reset Filter</span>
            </button>
          )}

          {/* Tombol Buat Baru: Surveyor / Admin / Kacab / Dev untuk SPS & PDS */}
          {effectiveFilterType === 'SPS' ? (
            canCreateSps && (
              <button className="btn btn-primary" onClick={handleOpenAdd}>
                <Plus size={16} />
                <span>Buat SPS Baru</span>
              </button>
            )
          ) : (
            canCreatePds && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleOpenAddPdsDalam}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                  title="Buat PDS Baru Perjalanan Domestik"
                >
                  <Plus size={15} />
                  <span>+ PDS Dalam Negeri</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenAddPdsLuar}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#0284c7', borderColor: '#0284c7', fontWeight: 800 }}
                  title="Buat PDS Baru Perjalanan Mancanegara (USD)"
                >
                  <Globe size={15} />
                  <span>+ PDS Luar Negeri</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* COMPACT FILTER & SORTING TOOLBAR (MULTI-HARI, MULTI-BULAN & TAHUN) */}
      <div
        style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.55rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}
      >
        {/* Row 1: Search, Surveyor, Status & Sort Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.9fr 1.2fr', gap: '0.5rem', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="search-box" style={{ width: '100%' }}>
            <Search className="search-icon" size={14} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari agenda, kapal, surveyor, lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem', padding: '0.25rem 0.5rem 0.25rem 2rem', height: '32px' }}
            />
          </div>

          {/* Surveyor Filter */}
          <div>
            {role === 'surveyor' || role === 'kacab' || role === 'kacap' ? (
              <div
                style={{
                  width: '100%',
                  fontSize: '0.78rem',
                  padding: '0.25rem 0.5rem',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  color: 'var(--text-primary)'
                }}
              >
                👤 {currentUser?.name || 'Surveyor'}
              </div>
            ) : (
              <select
                className="form-select"
                value={surveyorFilter}
                onChange={(e) => setSurveyorFilter(e.target.value)}
                style={{ width: '100%', fontSize: '0.78rem', padding: '0.25rem 0.5rem', height: '32px' }}
              >
                <option value="Semua">👤 Semua Surveyor</option>
                {surveyors.map((s) => (
                  <option key={s.id} value={s.name}>
                    👤 {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem', padding: '0.25rem 0.5rem', height: '32px' }}
            >
              <option value="Semua">📌 Semua Status</option>
              <option value="Belum Mulai">⚪ Belum Mulai</option>
              <option value="Berjalan">🔵 Berjalan</option>
              <option value="Selesai">🟢 Selesai</option>
              {effectiveFilterType === 'PDS' && (
                <>
                  <option value="ACC">✅ ACC (Disetujui)</option>
                  <option value="Belum di-ACC">🕒 Belum di-ACC</option>
                  <option value="Perlu Revisi">🔄 Perlu Revisi</option>
                </>
              )}
            </select>
          </div>

          {/* Sortir / Short Dropdown */}
          <div>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                borderColor: 'var(--accent-primary)',
                fontWeight: 600,
                color: 'var(--accent-primary)',
                fontSize: '0.78rem',
                padding: '0.25rem 0.5rem',
                height: '32px'
              }}
            >
              <option value="tgl_desc">📅 Tanggal Mulai (Terbaru)</option>
              <option value="tgl_asc">📅 Tanggal Mulai (Terlama)</option>
              <option value="duration_desc">⏳ Multi-Hari Terpanjang</option>
              <option value="duration_asc">⏳ Multi-Hari Terpendek</option>
              <option value="kapal_asc">🚢 Nama Kapal (A - Z)</option>
              <option value="kapal_desc">🚢 Nama Kapal (Z - A)</option>
              <option value="petugas_asc">👤 Surveyor (A - Z)</option>
              <option value="petugas_desc">👤 Surveyor (Z - A)</option>
              {effectiveFilterType === 'PDS' && <option value="nomor_asc">📄 Nomor Surat (A - Z)</option>}
              {effectiveFilterType === 'PDS' && <option value="nomor_desc">📄 Nomor Surat (Z - A)</option>}
            </select>
          </div>
        </div>

        {/* Row 2: Multi-Bulan, Tahun, & Rentang Multi-Hari */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            paddingTop: '0.4rem',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          {/* Quick Month & Year Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={13} color="var(--accent-primary)" />
              <span>Periode:</span>
            </span>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="Semua">Semua Bulan</option>
              {monthNames.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y === 'Semua' ? 'Semua Tahun' : `Tahun ${y}`}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Multi-Hari Controls */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={13} color="#059669" />
              <span>Rentang Hari:</span>
            </span>

            {/* Quick Presets */}
            <div style={{ display: 'inline-flex', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '1px' }}>
              <button
                type="button"
                onClick={() => handleDatePresetChange('all')}
                style={{
                  background: datePreset === 'all' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'all' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('today')}
                style={{
                  background: datePreset === 'today' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'today' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('this_week')}
                style={{
                  background: datePreset === 'this_week' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'this_week' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePresetChange('this_month')}
                style={{
                  background: datePreset === 'this_month' ? 'var(--accent-primary)' : 'transparent',
                  color: datePreset === 'this_month' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.15rem 0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Bulan Ini
              </button>
            </div>

            {/* Custom Multi-Date Inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="date"
                className="form-input"
                style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem', width: 'auto', height: '28px' }}
                value={startDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                title="Tanggal Dari"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>-</span>
              <input
                type="date"
                className="form-input"
                style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem', width: 'auto', height: '28px' }}
                value={endDate}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                title="Tanggal Sampai"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Filter Summary Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-card)',
            padding: '0.3rem 0.6rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>
              Menampilkan: <strong style={{ color: 'var(--text-primary)' }}>{filteredAndSortedData.length}</strong> Dokumen
            </span>
            <span>•</span>
            <span>
              Total Hari: <strong style={{ color: '#059669' }}>{totalHariKegiatan} Hari</strong>
            </span>
            {selectedMonth !== 'Semua' && (
              <>
                <span>•</span>
                <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                  Bulan {monthNames.find((m) => m.value === selectedMonth)?.label}
                </span>
              </>
            )}
            {selectedYear !== 'Semua' && (
              <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                Tahun {selectedYear}
              </span>
            )}
            {(startDate || endDate) && (
              <span className="badge" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669', fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                {startDate ? formatDateIndo(startDate) : 'Awal'} - {endDate ? formatDateIndo(endDate) : 'Akhir'}
              </span>
            )}
          </div>

          <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
            Urutan:{' '}
            <span style={{ color: 'var(--accent-primary)' }}>
              {sortBy === 'tgl_desc' && 'Tanggal Terbaru'}
              {sortBy === 'tgl_asc' && 'Tanggal Terlama'}
              {sortBy === 'duration_desc' && 'Durasi Terpanjang'}
              {sortBy === 'duration_asc' && 'Durasi Terpendek'}
              {sortBy === 'kapal_asc' && 'Kapal (A-Z)'}
              {sortBy === 'kapal_desc' && 'Kapal (Z-A)'}
              {sortBy === 'petugas_asc' && 'Surveyor (A-Z)'}
              {sortBy === 'petugas_desc' && 'Surveyor (Z-A)'}
              {sortBy === 'nomor_asc' && 'No.Surat (A-Z)'}
              {sortBy === 'nomor_desc' && 'No.Surat (Z-A)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {effectiveFilterType !== 'SPS' ? (
                <th onClick={() => setSortBy(sortBy === 'nomor_asc' ? 'nomor_desc' : 'nomor_asc')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>Nomor Surat PDS</span>
                    <ArrowUpDown size={12} color="var(--text-muted)" />
                  </div>
                </th>
              ) : (
                <th style={{ width: '130px' }}>
                  <span>No. Agenda</span>
                </th>
              )}

              <th onClick={() => setSortBy(sortBy === 'kapal_asc' ? 'kapal_desc' : 'kapal_asc')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>{effectiveFilterType !== 'SPS' ? 'Daftar Kapal & Agenda Terkait' : 'Nama Kapal / Pemohon'}</span>
                  <ArrowUpDown size={12} color="var(--text-muted)" />
                </div>
              </th>

              {effectiveFilterType === 'SPS' && <th>Perihal / Agenda / Order</th>}

              <th onClick={() => setSortBy(sortBy === 'petugas_asc' ? 'petugas_desc' : 'petugas_asc')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>Petugas Surveyor</span>
                  <ArrowUpDown size={12} color="var(--text-muted)" />
                </div>
              </th>

              <th>Lokasi Survey</th>

              <th onClick={() => setSortBy(sortBy === 'tgl_desc' ? 'tgl_asc' : 'tgl_desc')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>{effectiveFilterType !== 'SPS' ? 'Periode Pelaksanaan' : 'Tanggal Mulai'}</span>
                  <ArrowUpDown size={12} color="var(--text-muted)" />
                </div>
              </th>

              {effectiveFilterType !== 'SPS' && <th>Total Biaya</th>}

              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedData.length === 0 ? (
              <tr>
                <td colSpan={effectiveFilterType !== 'SPS' ? 8 : 8} className="table-empty">
                  <div className="table-empty-icon">📄</div>
                  <p>Tidak ada data penugasan yang sesuai dengan filter.</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '0.5rem' }}
                    >
                      Reset Filter
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredAndSortedData.map((item) => {
                const daysCount = calculateDays(item.tglMulai, item.tglSelesai);
                const hasShipsDetail = Array.isArray(item.shipsDetail) && item.shipsDetail.length > 0;
                const isItemLuar = item.isLuarNegeri || item.pdsType === 'luar_negeri';

                return (
                  <tr key={item.id}>
                    {/* Column 1: No Surat PDS or No Agenda SPS */}
                    {effectiveFilterType !== 'SPS' ? (
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {cleanDocNumber(item.nomor)}
                          </span>
                          {isItemLuar ? (
                            <span
                              className="badge"
                              style={{
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd',
                                fontWeight: 800,
                                fontSize: '0.66rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                width: 'fit-content',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Globe size={11} /> Luar Negeri (${item.totalUsd || 0})
                            </span>
                          ) : (
                            <span
                              className="badge"
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                fontWeight: 700,
                                fontSize: '0.66rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                width: 'fit-content'
                              }}
                            >
                              🇮🇩 Dalam Negeri
                            </span>
                          )}
                        </div>
                      </td>
                    ) : (
                      <td>
                        <span
                          style={{
                            fontWeight: 800,
                            color: 'var(--accent-primary)',
                            background: 'rgba(2, 132, 199, 0.1)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}
                        >
                          {item.noAgenda || item.agenda || '-'}
                        </span>
                      </td>
                    )}

                    {/* Column 2: Nama Kapal & Detail */}
                    <td>
                      {effectiveFilterType !== 'SPS' && hasShipsDetail ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {item.shipsDetail.map((sh, sIdx) => (
                            <div key={sh.spsId || sIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                              <Anchor size={13} color="var(--accent-primary)" />
                              <strong style={{ color: 'var(--text-primary)' }}>{sh.namaKapal}</strong>
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', background: 'var(--bg-main)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                                Agenda: {sh.noAgenda || '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            <Anchor size={15} color="var(--accent-primary)" />
                            <span>{item.namaKapal || 'KAPAL SURVEY'}</span>
                            {item.negaraTujuan && (
                              <span style={{ fontSize: '0.72rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 800 }}>
                                📍 {item.negaraTujuan}
                              </span>
                            )}
                          </div>
                          {item.pemohon && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Pemohon: {item.pemohon}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 3: SPS Details (Perihal/Agenda/Order) */}
                    {effectiveFilterType === 'SPS' && (
                      <td style={{ maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600 }}>{item.jenisSurvey || item.perihal}</div>
                        {item.noOrder && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.1rem' }}>
                            Order: {item.noOrder}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Column 4: Petugas Surveyor */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={14} color="var(--text-secondary)" />
                        <span style={{ fontWeight: 600 }}>{item.petugas}</span>
                      </div>
                    </td>

                    {/* Column 5: Lokasi Survey */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={14} color="var(--text-secondary)" />
                        <span>
                          {item.lokasi || '-'}
                          {(() => {
                            const matched = (tariffs || []).find((t) => (t.tujuan || t.name).toUpperCase() === (item.lokasi || '').toUpperCase());
                            return matched && matched.rincian ? ` (${matched.rincian.toUpperCase()})` : '';
                          })()}
                        </span>
                      </div>
                    </td>

                    {/* Column 6: Periode / Tanggal Mulai */}
                    <td>
                      {effectiveFilterType !== 'SPS' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                            <Calendar size={13} color="var(--text-muted)" />
                            <span>{formatDateIndo(item.tglMulai)} s/d {formatDateIndo(item.tglSelesai)}</span>
                          </div>
                          <div>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                background: daysCount > 1 ? 'rgba(2, 132, 199, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                                color: daysCount > 1 ? '#0284c7' : 'var(--text-secondary)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px'
                              }}
                            >
                              ⏳ {daysCount} Hari Pelaksanaan
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                            <Calendar size={13} color="var(--accent-primary)" />
                            <span>Mulai: {formatDateIndo(item.tglMulai)}</span>
                          </div>
                          {(item.tglSurat || item.tglPembuatan || item.createdAt) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <FileText size={11} color="var(--accent-primary)" />
                              <span>Dibuat: {formatDateIndo(item.tglSurat || item.tglPembuatan || item.createdAt)}</span>
                            </div>
                          )}
                          <div>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: 'rgba(234, 179, 8, 0.12)',
                                color: '#b45309',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px'
                              }}
                            >
                              ⏳ Tentatif
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Column 7: PDS Total Biaya */}
                    {effectiveFilterType !== 'SPS' && (
                      <td>
                        {isItemLuar ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.85rem' }}>
                              {formatRupiah(item.totalIdrTerima || item.jumlahEstimasi)}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700 }}>
                              ${Number(item.totalUsd || 0).toLocaleString('en-US')} USD
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.85rem' }}>
                            {formatRupiah(item.jumlahEstimasi || (Number(item.tarifDasar || 0) + Number(item.biayaTiket || 0)))}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Column 8: Status & Lock Badge & Approval Badge */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                          <span className="badge-dot" />
                          {item.status}
                        </span>

                        {/* Approval Badge */}
                        {item.approvalStatus === 'ACC' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px'
                            }}
                            title={`Disetujui oleh ${item.approvalBy || 'Admin'}`}
                          >
                            <CheckCircle size={11} /> ACC
                          </span>
                        )}
                        {item.approvalStatus === 'Revisi' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              maxWidth: '160px'
                            }}
                            title={`Revisi oleh ${item.approvalBy || 'Admin'}: ${item.approvalNote || ''}`}
                          >
                            <AlertTriangle size={11} /> Perlu Revisi
                          </span>
                        )}

                        {effectiveFilterType === 'SPS' && (
                          item.isParafSent ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px'
                              }}
                              title={`Laporan Paraf telah dikirim oleh ${item.parafSentBy || item.petugas || 'Surveyor'}`}
                            >
                              <CheckCheck size={11} /> Paraf Terkirim
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px'
                              }}
                              title="Menunggu surveyor mengirimkan laporan paraf"
                            >
                              <Clock size={11} /> Belum Kirim Paraf
                            </span>
                          )
                        )}

                        {/* Lock badge hanya untuk PDS, SPS tidak pakai fitur 3 hari lock */}
                        {effectiveFilterType !== 'SPS' && (() => {
                          const isLocked = isDocumentLocked(item, 3);
                          if (isLocked) {
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px'
                                }}
                                title="Terkunci otomatis: Sudah melewati batas 3 hari pengisian"
                              >
                                <Lock size={11} /> Terkunci (3 Hari)
                              </span>
                            );
                          }
                          if (item.isUnlockedByAdmin) {
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px'
                                }}
                                title="Akses edit dibuka khusus oleh Admin"
                              >
                                <Unlock size={11} /> Akses Dibuka
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>

                    {/* Column 9: Aksi */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {/* SPS Kirim Laporan Paraf Action Button */}
                        {effectiveFilterType === 'SPS' && (
                          !item.isParafSent ? (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleKirimParaf(item)}
                              title="Kirim Laporan Paraf (Masuk ke Laporan Paraf BKI)"
                              style={{
                                background: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.72rem',
                                padding: '0.25rem 0.55rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Send size={12} />
                              <span>Kirim Paraf</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleBatalkanKirimParaf(item)}
                              title="Laporan Paraf sudah terkirim (Klik untuk batalkan jika perlu)"
                              style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.45rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCheck size={12} />
                              <span>Terkirim</span>
                            </button>
                          )
                        )}

                        {/* ACC / Revisi Buttons (PDS only) */}
                        {effectiveFilterType === 'PDS' && (
                          <>
                            {canAcc ? (
                              (item.approvalStatus === 'ACC' || (item.status === 'Selesai' && item.approvalStatus !== 'Revisi')) ? (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => handleToggleAccPds(item)}
                                  title="PDS Sudah di-ACC (Klik untuk batalkan status ACC)"
                                  style={{
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.72rem',
                                    padding: '0.25rem 0.55rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <CheckCheck size={13} color="#059669" />
                                  <span>Sudah di-ACC</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => handleToggleAccPds(item)}
                                  title="Klik untuk ACC / Menyetujui PDS ini"
                                  style={{
                                    background: '#059669',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.72rem',
                                    padding: '0.25rem 0.6rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <CheckCircle size={13} />
                                  <span>ACC PDS</span>
                                </button>
                              )
                            ) : (
                              (item.approvalStatus === 'ACC' || (item.status === 'Selesai' && item.approvalStatus !== 'Revisi')) ? (
                                <span
                                  style={{
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.45rem',
                                    fontWeight: 700
                                  }}
                                >
                                  <CheckCircle size={12} color="#059669" />
                                  <span>Sudah ACC</span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    background: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.45rem',
                                    fontWeight: 700
                                  }}
                                >
                                  <Clock size={12} color="#d97706" />
                                  <span>Menunggu ACC</span>
                                </span>
                              )
                            )}

                            {isAdminOrKacab && (
                              <button
                                className="btn btn-icon btn-sm"
                                onClick={() => handleOpenRevisi(item)}
                                title="Minta Revisi PDS"
                                style={{
                                  background: item.approvalStatus === 'Revisi' ? '#fef3c7' : '#fffbeb',
                                  color: '#b45309',
                                  borderColor: item.approvalStatus === 'Revisi' ? '#fde68a' : '#fef08a'
                                }}
                              >
                                <MessageSquare size={14} />
                              </button>
                            )}
                          </>
                        )}

                        {effectiveFilterType === 'SPS' && (
                          <button
                            className="btn btn-primary btn-icon btn-sm"
                            onClick={() => handleOpenPrint(item)}
                            title="Download / Cetak PDF SPS"
                          >
                            <Printer size={15} />
                          </button>
                        )}
                        {effectiveFilterType !== 'SPS' && (
                          <>
                            <button
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenBiayaPrint(item)}
                              title={
                                (item.isLuarNegeri || item.pdsType === 'luar_negeri')
                                  ? 'Download / Cetak PDF Rincian Biaya PDS Luar Negeri (USD) & Unduh Excel'
                                  : (item.isSmc || (item.perihal || '').toUpperCase().includes('SMC') || (item.jenisSurvey || '').toUpperCase().includes('SMC'))
                                  ? 'Download / Cetak PDF Rincian Biaya + Tanda Terima SMC (1 File PDF Gabungan)'
                                  : 'Download / Cetak PDF Rincian Biaya Perjalanan Dinas (A4 Landscape)'
                              }
                              style={{ background: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }}
                            >
                              <Calculator size={15} />
                            </button>
                            <button
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenPdsPrint(item)}
                              title="Download / Cetak PDF Surat Tugas PDS"
                            >
                              <FileText size={15} />
                            </button>
                          </>
                        )}

                        {/* Admin Unlock / Lock Button — hanya untuk PDS, SPS tidak pakai lock */}
                        {effectiveFilterType !== 'SPS' && isAdminOrKacab && (
                          <button
                            className={`btn ${item.isUnlockedByAdmin ? 'btn-success' : isDocumentLocked(item, 3) ? 'btn-warning' : 'btn-secondary'} btn-icon btn-sm`}
                            onClick={() => handleToggleUnlock(item)}
                            title={item.isUnlockedByAdmin ? 'Kunci Kembali Dokumen' : isDocumentLocked(item, 3) ? 'Buka Kunci Dokumen (Admin Unlock)' : 'Buka Kunci Akses Pengeditan'}
                            style={
                              item.isUnlockedByAdmin
                                ? { background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }
                                : isDocumentLocked(item, 3)
                                ? { background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
                                : {}
                            }
                          >
                            {item.isUnlockedByAdmin ? <Unlock size={15} /> : <Lock size={15} />}
                          </button>
                        )}

                        {canEdit && (
                          /* SPS selalu bisa diedit tanpa lock, PDS tetap pakai lock 3 hari */
                          (effectiveFilterType === 'SPS' || !isDocumentLocked(item, 3)) ? (
                            <button
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenEdit(item)}
                              title="Ubah Data"
                            >
                              <Edit2 size={15} />
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary btn-icon btn-sm"
                              onClick={() => handleOpenEdit(item)}
                              style={{ background: '#fffbeb', color: '#b45309', borderColor: '#fde68a' }}
                              title="Dokumen Terkunci: Klik untuk melihat detail dokumen (Mode Hanya Lihat / Read-Only)."
                            >
                              <Lock size={15} color="#d97706" />
                            </button>
                          )
                        )}
                        {canDelete && (
                          <button
                            className="btn btn-danger btn-icon btn-sm"
                            onClick={() => promptDelete(item)}
                            title="Hapus Data"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SpsModal
        isOpen={isSpsModalOpen}
        onClose={() => setIsSpsModalOpen(false)}
        editItem={editingItem}
      />
      <PdsModal
        isOpen={isPdsModalOpen}
        onClose={() => setIsPdsModalOpen(false)}
        editItem={editingItem}
        onPrint={(item) => handleOpenPdsPrint(item)}
      />
      <PdsLuarNegeriModal
        isOpen={isPdsLuarNegeriModalOpen}
        onClose={() => setIsPdsLuarNegeriModalOpen(false)}
        editItem={editingItem}
      />

      <SuratTugasPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
      />

      <SuratTugasPdsPrintModal
        isOpen={isPdsPrintModalOpen}
        onClose={() => setIsPdsPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
      />

      <BiayaPdsPrintModal
        isOpen={isBiayaPrintModalOpen}
        onClose={() => setIsBiayaPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
      />
      <BiayaPdsLuarNegeriPrintModal
        isOpen={isBiayaLuarNegeriPrintModalOpen}
        onClose={() => setIsBiayaLuarNegeriPrintModalOpen(false)}
        suratTugas={selectedPrintItem}
      />

      <TandaTerimaSmcPrintModal
        isOpen={isSmcPrintModalOpen}
        onClose={() => setIsSmcPrintModalOpen(false)}
        suratTugas={selectedSmcItem}
      />

      <LampiranParafPrintModal
        isOpen={isParafModalOpen}
        onClose={() => setIsParafModalOpen(false)}
        suratTugas={selectedParafItem}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Data"
        message={
          itemToDelete
            ? `Apakah Anda yakin ingin menghapus data untuk kapal ${itemToDelete.namaKapal}? Kwitansi & Laporan terkait juga akan dihapus.`
            : ''
        }
        confirmText="Ya, Hapus"
        type="danger"
      />

      {/* Revisi Modal */}
      {isRevisiModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setIsRevisiModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={20} color="#b45309" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Minta Revisi PDS
              </h3>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Kapal: <strong>{revisiItem?.namaKapal || '-'}</strong><br />
              Surveyor: <strong>{revisiItem?.petugas || '-'}</strong>
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Keterangan Revisi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Contoh: Lokasi survei salah, mohon diperbaiki..."
              value={revisiNote}
              onChange={(e) => setRevisiNote(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical', marginBottom: '1rem' }}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsRevisiModalOpen(false)}
                style={{ fontSize: '0.82rem' }}
              >
                Batal
              </button>
              <button
                className="btn btn-sm"
                onClick={handleSubmitRevisi}
                style={{ fontSize: '0.82rem', background: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b', fontWeight: 700 }}
              >
                🔄 Kirim Revisi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Cetak Tanda Terima SMC */}
      <TandaTerimaSmcPrintModal
        isOpen={isSmcPrintModalOpen}
        onClose={() => {
          setIsSmcPrintModalOpen(false);
          setSelectedSmcItem(null);
        }}
        suratTugas={selectedSmcItem}
      />
    </div>
  );
};
