import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  Globe,
  DollarSign,
  Calendar,
  Lock,
  Building2,
  Ship
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, cleanDocNumber, isDocumentLocked } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData } from '../utils/security';
import { countHolidaysAndWeekendsInRange } from '../utils/holidays';
import { findSurveyorUser } from '../utils/filterData';
import ShipDatabaseSearchSelect from './ShipDatabaseSearchSelect';
import { MASTER_COMPANIES } from '../data/defaultMasterKapal';

export const PdsLuarNegeriModal = ({ isOpen, onClose, editItem = null }) => {
  const {
    createPdsFromSurvey,
    updateSuratTugas,
    adminSettings,
    masterKapal,
    addMasterKapal,
    updateMasterKapal,
    companyDirectory,
    saveCompanyAddress,
    getCompanyAddress,
    gradeTariffs
  } = useData();
  const { usersList, currentUser, role } = useAuth();

  const isLocked = Boolean(editItem && isDocumentLocked(editItem, 3) && !editItem.isUnlockedByAdmin);

  const companyOptions = useMemo(() => {
    const set = new Set();
    (MASTER_COMPANIES || []).forEach((c) => {
      const trimmed = String(c || '').trim().toUpperCase();
      if (trimmed && trimmed !== '-') set.add(trimmed);
    });
    Object.keys(companyDirectory || {}).forEach((c) => {
      const trimmed = String(c || '').trim().toUpperCase();
      if (trimmed) set.add(trimmed);
    });
    (masterKapal || []).forEach((k) => {
      const trimmed = String(k.pemohon || '').trim().toUpperCase();
      if (trimmed && trimmed !== '-') set.add(trimmed);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [companyDirectory, masterKapal]);

  const surveyorUsers = useMemo(
    () => (usersList || []).filter((u) => u.role === 'surveyor' || u.role === 'kacab'),
    [usersList]
  );

  const defaultSurveyor = (role === 'surveyor' || role === 'kacab')
    ? (currentUser?.name || surveyorUsers[0]?.name || 'TRI LAKSONO JOENIAWAN')
    : (surveyorUsers[0]?.name || 'TRI LAKSONO JOENIAWAN');
  const userGrade = (findSurveyorUser(surveyorUsers, defaultSurveyor) || {})?.grade || 'GRADE 6 A';
  const todayDate = new Date().toISOString().split('T')[0];

  const gradeData = useMemo(() => {
    return (gradeTariffs || []).find(
      (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === (userGrade || 'GRADE 6 A').replace(/\s+/g, '').toUpperCase()
    ) || {};
  }, [gradeTariffs, userGrade]);

  const defaultUangHarianDlm = Number(gradeData.uangHarian) || 300000;

  const [formData, setFormData] = useState({
    nomor: 'A 0    /SV.201/PK/KI-26',
    namaKapal: '',
    noAgenda: '',
    noOrder: 'RFQ-0000',
    noCda: '5100010',
    pemohon: 'PEMOHON SURVEY KLAS',
    jenisSurvey: 'DINAS SURVEY KLAS',
    perihal: 'DINAS SURVEY KLAS',
    petugas: defaultSurveyor,
    pangkat: userGrade,
    jabatan: 'SURVEYOR',
    negaraTujuan: 'CHINA',
    lokasi: 'CHINA',
    tempatSurvey: 'CHINA',
    // Periode Luar Negeri
    tglMulai: todayDate,
    tglSelesai: todayDate,
    jumlahHariLibur: 0,
    // Periode & Komponen Transit Dalam Negeri (IDR)
    denganDalamNegeri: true,
    tglMulaiTransit: '',
    tglSelesaiTransit: '',
    hrTransit: 0,
    mlmTransit: 0,
    jumlahHariLiburTransit: 0,
    uangHarianDlmRate: defaultUangHarianDlm,
    uangHotelDlmRate: 0,
    tiketDalamNegeri: 0,
    asalTujuanDlm: Number(adminSettings?.tatLuarKota || 750000),
    // Komponen Luar Negeri (USD)
    uangHarianUsdRate: 150,
    uangHotelUsdRate: 0,
    tiketLuarNegeriUsd: 0,
    asalTujuanLuarUsd: 0,
    pakaianDinginUsd: 0,
    hariLiburUsdManual: null,
    // Kurs
    kursUsd: 16640,
    // Keterangan
    keteranganLain: 'TIKET, HOTEL DAN TAT DI LUAR NEGERI DITANGGUNG PEMOHON',
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    // Berkas
    fileFotoName: '',
    fileFotoData: '',
    fileVisitName: '',
    fileVisitData: '',
    fileTiketTransportName: '',
    fileTiketTransportData: '',
    fileKwitansiHotelName: '',
    fileKwitansiHotelData: ''
  });

  // Load editItem jika ada
  useEffect(() => {
    if (editItem) {
      const editGrade = editItem.pangkat || userGrade;
      const editGradeData = (gradeTariffs || []).find(
        (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === (editGrade || '').replace(/\s+/g, '').toUpperCase()
      ) || {};
      const rateDlm = editItem.uangHarianDlmRate !== undefined ? Number(editItem.uangHarianDlmRate) : (Number(editGradeData.uangHarian) || defaultUangHarianDlm);

      setFormData({
        ...editItem,
        nomor: cleanDocNumber(editItem.nomor || 'A 0    /SV.201/PK/KI-26'),
        namaKapal: editItem.namaKapal || '',
        noAgenda: editItem.noAgenda || editItem.agenda || '',
        noOrder: editItem.noOrder || 'RFQ-0000',
        noCda: editItem.noCda || '5100010',
        pemohon: editItem.pemohon || 'PEMOHON SURVEY KLAS',
        jenisSurvey: (editItem.jenisSurvey || 'DINAS SURVEY KLAS').toUpperCase(),
        perihal: (editItem.perihal || 'DINAS SURVEY KLAS').toUpperCase(),
        petugas: editItem.petugas || defaultSurveyor,
        pangkat: editGrade,
        jabatan: editItem.jabatan || 'SURVEYOR',
        negaraTujuan: (editItem.negaraTujuan || editItem.tempatSurvey || editItem.lokasi || 'CHINA').toUpperCase(),
        lokasi: (editItem.negaraTujuan || editItem.tempatSurvey || editItem.lokasi || 'CHINA').toUpperCase(),
        tempatSurvey: (editItem.negaraTujuan || editItem.tempatSurvey || editItem.lokasi || 'CHINA').toUpperCase(),
        tglMulai: editItem.tglMulai || todayDate,
        tglSelesai: editItem.tglSelesai || editItem.tglMulai || todayDate,
        jumlahHariLibur: editItem.jumlahHariLibur !== undefined ? Number(editItem.jumlahHariLibur) : (Number(editItem.hariLiburLuarNegeri) || 0),
        // Transit Dalam Negeri
        denganDalamNegeri: editItem.denganDalamNegeri !== undefined
          ? !!editItem.denganDalamNegeri
          : (Number(editItem.totalTransitIdr || editItem.asalTujuanDlm || editItem.tiketDalamNegeri) > 0 || !!editItem.tglMulaiTransit),
        tglMulaiTransit: editItem.tglMulaiTransit || '',
        tglSelesaiTransit: editItem.tglSelesaiTransit || '',
        hrTransit: editItem.hrTransit !== undefined ? Number(editItem.hrTransit) : (Number(editItem.hariTransit) || 0),
        mlmTransit: editItem.mlmTransit !== undefined ? Number(editItem.mlmTransit) : (Number(editItem.malamTransit) || 0),
        jumlahHariLiburTransit: editItem.jumlahHariLiburTransit !== undefined ? Number(editItem.jumlahHariLiburTransit) : (Number(editItem.hariLiburTransit) || 0),
        uangHarianDlmRate: rateDlm,
        uangHotelDlmRate: editItem.uangHotelDlmRate !== undefined ? Number(editItem.uangHotelDlmRate) : 0,
        tiketDalamNegeri: Number(editItem.tiketDalamNegeri) || (Number(editItem.tiketPesawatTaxi) || 0),
        asalTujuanDlm: editItem.asalTujuanDlm !== undefined ? Number(editItem.asalTujuanDlm) : Number(adminSettings?.tatLuarKota || 750000),
        // Luar Negeri
        uangHarianUsdRate: editItem.uangHarianUsdRate !== undefined ? Number(editItem.uangHarianUsdRate) : (Number(editItem.uangHarianUsd) || 150),
        uangHotelUsdRate: editItem.uangHotelUsdRate !== undefined ? Number(editItem.uangHotelUsdRate) : (Number(editItem.uangHotelUsd) || 0),
        tiketLuarNegeriUsd: Number(editItem.tiketLuarNegeriUsd) || 0,
        asalTujuanLuarUsd: Number(editItem.asalTujuanLuarUsd) || 0,
        pakaianDinginUsd: Number(editItem.pakaianDinginUsd) || 0,
        hariLiburUsdManual: editItem.hariLiburUsdTotal !== undefined ? Number(editItem.hariLiburUsdTotal) : null,
        kursUsd: Number(editItem.kursUsd) || 16640,
        keteranganLain: editItem.keteranganLain || 'TIKET, HOTEL DAN TAT DI LUAR NEGERI DITANGGUNG PEMOHON',
        kepalaCabang: editItem.kepalaCabang || adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: editItem.nup || adminSettings?.nup || '48199-KI'
      });
    } else {
      setFormData({
        nomor: 'A 0    /SV.201/PK/KI-26',
        namaKapal: '',
        noAgenda: '',
        noOrder: `RFQ260${String(Math.floor(Math.random() * 900) + 100)}`,
        noCda: '5100010',
        pemohon: 'PEMOHON SURVEY KLAS',
        jenisSurvey: 'DINAS SURVEY KLAS',
        perihal: 'DINAS SURVEY KLAS',
        petugas: defaultSurveyor,
        pangkat: userGrade,
        jabatan: 'SURVEYOR',
        negaraTujuan: 'CHINA',
        lokasi: 'CHINA',
        tempatSurvey: 'CHINA',
        tglMulai: todayDate,
        tglSelesai: todayDate,
        jumlahHariLibur: 0,
        denganDalamNegeri: true,
        tglMulaiTransit: '',
        tglSelesaiTransit: '',
        hrTransit: 0,
        mlmTransit: 0,
        jumlahHariLiburTransit: 0,
        uangHarianDlmRate: defaultUangHarianDlm,
        uangHotelDlmRate: 0,
        uangHarianUsdRate: 150,
        uangHotelUsdRate: 0,
        tiketLuarNegeriUsd: 0,
        asalTujuanLuarUsd: 0,
        pakaianDinginUsd: 0,
        hariLiburUsdManual: null,
        tiketDalamNegeri: 0,
        asalTujuanDlm: Number(adminSettings?.tatLuarKota || 750000),
        kursUsd: 16640,
        keteranganLain: 'TIKET, HOTEL DAN TAT DI LUAR NEGERI DITANGGUNG PEMOHON',
        kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
        nup: adminSettings?.nup || '48199-KI',
        fileFotoName: '',
        fileFotoData: '',
        fileVisitName: '',
        fileVisitData: '',
        fileTiketTransportName: '',
        fileTiketTransportData: '',
        fileKwitansiHotelName: '',
        fileKwitansiHotelData: ''
      });
    }
  }, [editItem, isOpen, defaultSurveyor, userGrade, todayDate, adminSettings, defaultUangHarianDlm, gradeTariffs]);

  // Handle Date Transit changes & auto calculate Hari, Malam, Libur
  const handleTransitDatesChange = (startVal, endVal) => {
    let hr = formData.hrTransit;
    let mlm = formData.mlmTransit;
    let libur = formData.jumlahHariLiburTransit;
    if (startVal && endVal) {
      const s = new Date(startVal);
      const e = new Date(endVal);
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
      hr = diff > 0 ? diff : 0;
      mlm = Math.max(0, hr - 1);
      const { count } = countHolidaysAndWeekendsInRange(startVal, endVal);
      libur = count;
    }
    setFormData((prev) => ({
      ...prev,
      tglMulaiTransit: startVal,
      tglSelesaiTransit: endVal,
      hrTransit: hr,
      mlmTransit: mlm,
      jumlahHariLiburTransit: libur
    }));
  };

  // Date Calculation: Days, Nights, Weekend & National Holidays
  const { totalDays, totalNights, autoHolidays } = useMemo(() => {
    if (!formData.tglMulai || !formData.tglSelesai) {
      return { totalDays: 1, totalNights: 0, autoHolidays: 0 };
    }
    const start = new Date(formData.tglMulai);
    const end = new Date(formData.tglSelesai);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
    const hr = diff > 0 ? diff : 1;
    const mlm = Math.max(0, hr - 1);

    const { count } = countHolidaysAndWeekendsInRange(formData.tglMulai, formData.tglSelesai);
    return { totalDays: hr, totalNights: mlm, autoHolidays: count };
  }, [formData.tglMulai, formData.tglSelesai]);

  useEffect(() => {
    if (!editItem) {
      setFormData((prev) => ({
        ...prev,
        jumlahHariLibur: autoHolidays
      }));
    }
  }, [autoHolidays, editItem]);

  // Kalkulasi Komponen Biaya Real-Time
  const calcs = useMemo(() => {
    const hr = totalDays;
    const mlm = totalNights;
    const hrLbr = Number(formData.jumlahHariLibur) || 0;

    // USD Components
    const rateUangHarian = Number(formData.uangHarianUsdRate) || 0;
    const totalUangHarianUsd = hr * rateUangHarian;

    const rateUangHotel = Number(formData.uangHotelUsdRate) || 0;
    const totalUangHotelUsd = mlm * rateUangHotel;

    const totalHariLiburUsd = formData.hariLiburUsdManual !== null && formData.hariLiburUsdManual !== undefined
      ? Number(formData.hariLiburUsdManual)
      : (hrLbr * rateUangHarian * 0.5);

    const tiketLuarUsd = Number(formData.tiketLuarNegeriUsd) || 0;
    const asalTujuanLuarUsd = Number(formData.asalTujuanLuarUsd) || 0;
    const pakaianDinginUsd = Number(formData.pakaianDinginUsd) || 0;

    const totalUsd = tiketLuarUsd + asalTujuanLuarUsd + totalUangHarianUsd + totalUangHotelUsd + totalHariLiburUsd + pakaianDinginUsd;

    // IDR Transit Components (Lengkap Sesuai PDS Dalam Negeri)
    const denganDalamNegeri = !!formData.denganDalamNegeri;
    const hrTransit = Number(formData.hrTransit) || 0;
    const mlmTransit = Number(formData.mlmTransit) || 0;
    const hrLbrTransit = Number(formData.jumlahHariLiburTransit) || 0;

    const rateUangHarianDlm = Number(formData.uangHarianDlmRate) || 0;
    const totalUangHarianDlm = hrTransit * rateUangHarianDlm;

    const rateHotelDlm = Number(formData.uangHotelDlmRate) || 0;
    const totalHotelDlm = mlmTransit * rateHotelDlm;

    const totalHrLiburDlm = hrLbrTransit * rateUangHarianDlm * 0.5;

    const tiketDlmIdr = Number(formData.tiketDalamNegeri) || 0;
    const asalTujuanDlmIdr = Number(formData.asalTujuanDlm) || 0;

    const totalTransitIdr = denganDalamNegeri
      ? (totalUangHarianDlm + totalHotelDlm + totalHrLiburDlm + tiketDlmIdr + asalTujuanDlmIdr)
      : 0;

    // Kurs & Conversion
    const kurs = Number(formData.kursUsd) || 16640;
    const konversiUsdKeIdr = Math.round(totalUsd * kurs);

    const grandTotalIdr = konversiUsdKeIdr + totalTransitIdr;

    return {
      hr,
      mlm,
      hrLbr,
      rateUangHarian,
      totalUangHarianUsd,
      rateUangHotel,
      totalUangHotelUsd,
      totalHariLiburUsd,
      tiketLuarUsd,
      asalTujuanLuarUsd,
      pakaianDinginUsd,
      totalUsd,
      // Transit Domestik
      denganDalamNegeri,
      hrTransit,
      mlmTransit,
      hrLbrTransit,
      rateUangHarianDlm,
      totalUangHarianDlm,
      rateHotelDlm,
      totalHotelDlm,
      totalHrLiburDlm,
      tiketDlmIdr,
      asalTujuanDlmIdr,
      totalTransitIdr,
      kurs,
      konversiUsdKeIdr,
      grandTotalIdr
    };
  }, [formData, totalDays, totalNights]);

  const handleSurveyorChange = (name) => {
    const user = findSurveyorUser(surveyorUsers, name);
    const grade = user?.grade || 'GRADE 6 A';
    const gData = (gradeTariffs || []).find(
      (g) => (g.grade || '').replace(/\s+/g, '').toUpperCase() === grade.replace(/\s+/g, '').toUpperCase()
    ) || {};
    const newRateDlm = Number(gData.uangHarian) || 300000;
    setFormData((prev) => ({
      ...prev,
      petugas: name,
      pangkat: grade,
      uangHarianDlmRate: prev.uangHarianDlmRate === defaultUangHarianDlm ? newRateDlm : prev.uangHarianDlmRate
    }));
  };

  const handleSelectShipFromDatabase = (foundShip) => {
    if (!foundShip) return;
    const shipNameUpper = String(foundShip.namaKapal || '').trim().toUpperCase();
    const shipPemohonUpper = (foundShip.pemohon && foundShip.pemohon !== '-') ? String(foundShip.pemohon).trim().toUpperCase() : '';
    setFormData((prev) => ({
      ...prev,
      namaKapal: shipNameUpper,
      noAgenda: foundShip.noAgenda || prev.noAgenda,
      noOrder: foundShip.noOrder || prev.noOrder,
      pemohon: shipPemohonUpper || prev.pemohon
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isLocked) {
      toast.error('Dokumen ini terkunci (melewati batas 3 hari). Buka kunci terlebih dahulu.');
      return;
    }

    if (!formData.nomor || !formData.nomor.trim()) {
      alert('Nomor Surat PDS wajib diisi!');
      return;
    }

    if (!formData.namaKapal || !formData.namaKapal.trim()) {
      alert('Nama Kapal wajib diisi!');
      return;
    }

    if (!formData.negaraTujuan || !formData.negaraTujuan.trim()) {
      alert('Negara / Kota Tujuan Luar Negeri wajib diisi!');
      return;
    }

    const cleanShipName = (formData.namaKapal || '').trim().toUpperCase();
    const cleanPemohon = (formData.pemohon || '').trim().toUpperCase();

    // 1. Simpan kapal baru ke masterKapal database jika belum terdaftar
    if (cleanShipName && cleanShipName !== '-' && cleanShipName !== 'KAPAL') {
      const existingShip = (masterKapal || []).find(
        (k) => (k.namaKapal || '').trim().toUpperCase() === cleanShipName
      );
      if (!existingShip) {
        if (addMasterKapal) {
          addMasterKapal({
            namaKapal: cleanShipName,
            noAgenda: formData.noAgenda || '',
            pemohon: cleanPemohon || '',
            jenisSurvey: 'SURVEY LUAR NEGERI'
          });
          toast.success(`Kapal "${cleanShipName}" berhasil disimpan otomatis ke database!`, { duration: 3000 });
        }
      } else if (cleanPemohon && (!existingShip.pemohon || existingShip.pemohon === '-')) {
        if (updateMasterKapal) {
          updateMasterKapal(existingShip.id, {
            ...existingShip,
            pemohon: cleanPemohon,
            noAgenda: existingShip.noAgenda || formData.noAgenda || ''
          });
        }
      }
    }

    // 2. Simpan pemohon (perusahaan) ke database/direktori jika belum ada
    if (cleanPemohon && cleanPemohon !== '-' && cleanPemohon !== 'PERUSAHAAN') {
      const existingCompany = getCompanyAddress ? getCompanyAddress(cleanPemohon) : null;
      if (!existingCompany && saveCompanyAddress) {
        saveCompanyAddress(cleanPemohon, {
          namaPerusahaan: cleanPemohon,
          alamat: '',
          kota: 'PONTIANAK'
        });
        toast.success(`Perusahaan pemohon "${cleanPemohon}" tersimpan di database!`, { duration: 3000 });
      }
    }

    const payload = sanitizeFormData({
      ...formData,
      namaKapal: cleanShipName,
      pemohon: cleanPemohon,
      docType: 'PDS',
      isPds: true,
      pdsType: 'luar_negeri',
      isLuarNegeri: true,
      negaraTujuan: formData.negaraTujuan.toUpperCase(),
      tempatSurvey: formData.negaraTujuan.toUpperCase(),
      lokasi: formData.negaraTujuan.toUpperCase(),
      kategoriPerjalanan: 'Luar Negeri',
      saranaTransportasi: 'PESAWAT TERBANG & DARAT',
      // Simpan rincian kalkulasi USD
      hariLuarNegeri: calcs.hr,
      malamLuarNegeri: calcs.mlm,
      hariLiburLuarNegeri: calcs.hrLbr,
      uangHarianUsdRate: calcs.rateUangHarian,
      uangHarianUsdTotal: calcs.totalUangHarianUsd,
      uangHotelUsdRate: calcs.rateUangHotel,
      uangHotelUsdTotal: calcs.totalUangHotelUsd,
      hariLiburUsdTotal: calcs.totalHariLiburUsd,
      tiketLuarNegeriUsd: calcs.tiketLuarUsd,
      asalTujuanLuarUsd: calcs.asalTujuanLuarUsd,
      pakaianDinginUsd: calcs.pakaianDinginUsd,
      totalUsd: calcs.totalUsd,
      // Transit Dalam Negeri (IDR)
      denganDalamNegeri: calcs.denganDalamNegeri,
      tglMulaiTransit: calcs.denganDalamNegeri ? (formData.tglMulaiTransit || '') : '',
      tglSelesaiTransit: calcs.denganDalamNegeri ? (formData.tglSelesaiTransit || '') : '',
      hrTransit: calcs.denganDalamNegeri ? calcs.hrTransit : 0,
      mlmTransit: calcs.denganDalamNegeri ? calcs.mlmTransit : 0,
      jumlahHariLiburTransit: calcs.denganDalamNegeri ? calcs.hrLbrTransit : 0,
      uangHarianDlmRate: calcs.denganDalamNegeri ? calcs.rateUangHarianDlm : 0,
      totalUangHarianDlm: calcs.denganDalamNegeri ? calcs.totalUangHarianDlm : 0,
      uangHotelDlmRate: calcs.denganDalamNegeri ? calcs.rateHotelDlm : 0,
      totalUangHotelDlm: calcs.denganDalamNegeri ? calcs.totalHotelDlm : 0,
      totalHrLiburDlm: calcs.denganDalamNegeri ? calcs.totalHrLiburDlm : 0,
      tiketDalamNegeri: calcs.denganDalamNegeri ? calcs.tiketDlmIdr : 0,
      asalTujuanDlm: calcs.denganDalamNegeri ? calcs.asalTujuanDlmIdr : 0,
      totalTransitIdr: calcs.totalTransitIdr,
      // Kurs & Grand Total
      kursUsd: calcs.kurs,
      konversiUsdKeIdr: calcs.konversiUsdKeIdr,
      jumlahEstimasi: calcs.grandTotalIdr,
      totalIdrTerima: calcs.grandTotalIdr,
      // Default shipsDetail for table compatibility
      shipsDetail: [
        {
          namaKapal: cleanShipName,
          noAgenda: formData.noAgenda || '-',
          noOrder: formData.noOrder || '-',
          pemohon: cleanPemohon || '-',
          biayaSurvei: calcs.grandTotalIdr
        }
      ]
    });

    if (editItem) {
      if (editItem.approvalStatus === 'Revisi') {
        payload.approvalStatus = null;
        payload.approvalNote = '';
        payload.approvalBy = null;
        payload.approvalAt = null;
      }
      updateSuratTugas(editItem.id, payload);
      toast.success('PDS Luar Negeri berhasil diperbarui!');
    } else {
      createPdsFromSurvey(payload, []);
      toast.success('PDS Luar Negeri berhasil diterbitkan!');
    }

    onClose();
  };

  if (!isOpen) return null;

  // Prefix & Suffix Nomor Surat
  const rawNomor = formData.nomor ?? 'A 0    /SV.201/PK/KI-26';
  const cleanNomor = cleanDocNumber(rawNomor);
  const slashIdx = cleanNomor.indexOf('/');
  const prefix = slashIdx !== -1 ? cleanNomor.substring(0, slashIdx).trim() : cleanNomor.trim();
  const suffix = slashIdx !== -1 ? cleanNomor.substring(slashIdx).trim() : '/SV.201/PK/KI-26';

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '1080px', width: '95vw', maxHeight: '92vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="modal-header" style={{ flexShrink: 0, borderBottom: '1.5px solid #0284c7', background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)', color: '#ffffff' }}>
            <div className="card-title-group">
              <Globe size={26} color="#ffffff" />
              <div>
                <h3 className="modal-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{editItem ? (isLocked ? 'Lihat PDS Luar Negeri [Terkunci]' : 'Edit PDS Luar Negeri (USD)') : 'Input Perjalanan Dinas Surveyor (PDS) Luar Negeri'}</span>
                  <span style={{ fontSize: '0.72rem', background: '#ffffff', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 800 }}>
                    Mancanegara / USD
                  </span>
                </h3>
                <div className="card-subtitle" style={{ color: '#e0f2fe' }}>
                  Sesuai Lampiran Surat Tugas & Tabel Daftar Biaya Mancanegara (Konversi Kurs USD ke IDR)
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose} type="button" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff' }}>
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem 6rem' }}>
              {/* Lock Warning */}
              {isLocked && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#991b1b', fontSize: '0.84rem' }}>
                  <Lock size={18} color="#dc2626" />
                  <div>
                    <strong>Dokumen Terkunci (3 Hari):</strong> Hanya dapat dilihat (read-only). Untuk mengedit, hubungi Admin / Kepala Cabang untuk membuka kunci.
                  </div>
                </div>
              )}

              <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0 }}>
                {/* SECTION 1: NOMOR SURAT, SURVEYOR & TUJUAN NEGARA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Nomor Surat */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                      Nomor Surat PDS Resmi *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '0.4rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="A 0"
                        value={prefix}
                        onChange={(e) => {
                          const newPrefix = e.target.value;
                          const currentSuffix = suffix.startsWith('/') ? suffix : '/' + suffix;
                          const isDef = !newPrefix || /^A[\s.]*0*$/i.test(newPrefix.trim());
                          const combined = isDef
                            ? `${newPrefix ? newPrefix.trim() : 'A 0'}    ${currentSuffix}`
                            : `${newPrefix.trim()} ${currentSuffix}`;
                          setFormData({ ...formData, nomor: combined });
                        }}
                        style={{ fontWeight: 800, textAlign: 'center', color: 'var(--accent-primary)' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="/SV.201/PK/KI-26"
                        value={suffix}
                        onChange={(e) => {
                          let newSuffix = e.target.value;
                          if (newSuffix && !newSuffix.startsWith('/')) newSuffix = '/' + newSuffix;
                          const isDef = !prefix || /^A[\s.]*0*$/i.test(prefix.trim());
                          const combined = isDef
                            ? `${prefix ? prefix.trim() : 'A 0'}    ${newSuffix}`
                            : `${prefix.trim()} ${newSuffix}`;
                          setFormData({ ...formData, nomor: combined });
                        }}
                        required
                        style={{ fontWeight: 800 }}
                      />
                    </div>
                  </div>

                  {/* Surveyor */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Marine Surveyor *
                    </label>
                    {role === 'surveyor' || role === 'kacab' ? (
                      <input
                        type="text"
                        className="form-input"
                        value={formData.petugas}
                        readOnly
                        style={{ fontWeight: 700, background: 'var(--bg-main)' }}
                      />
                    ) : (
                      <select
                        className="form-select"
                        value={formData.petugas}
                        onChange={(e) => handleSurveyorChange(e.target.value)}
                        required
                        style={{ fontWeight: 700 }}
                      >
                        {surveyorUsers.map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name} ({u.grade || 'GRADE 6 A'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Negara / Tujuan Luar Negeri */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Globe size={15} />
                      <span>Negara / Tujuan Luar Negeri *</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: CHINA, SINGAPURA, MALAYSIA"
                      value={formData.negaraTujuan}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData({ ...formData, negaraTujuan: val, lokasi: val, tempatSurvey: val });
                      }}
                      required
                      style={{ fontWeight: 800, letterSpacing: '0.05em', color: '#0369a1', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                {/* SECTION 2: KAPAL, NO AGENDA, PEMOHON */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Ship size={14} color="#0284c7" />
                      <span>Nama Kapal *</span>
                    </label>
                    <ShipDatabaseSearchSelect
                      masterKapal={masterKapal}
                      value={formData.namaKapal}
                      onChange={(val) => setFormData({ ...formData, namaKapal: val.toUpperCase() })}
                      onSelectShip={handleSelectShipFromDatabase}
                      placeholder="Contoh: LCT SHUN JUN 7"
                      disabled={isLocked}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                      Bisa pilih dari database atau ketik manual kapal baru
                    </span>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">No. Agenda</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="AG-..."
                      value={formData.noAgenda}
                      onChange={(e) => setFormData({ ...formData, noAgenda: e.target.value.toUpperCase() })}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">No. Order (RFQ)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.noOrder}
                      onChange={(e) => setFormData({ ...formData, noOrder: e.target.value })}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building2 size={14} color="#0284c7" />
                      <span>Pemohon (Perusahaan)</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ketik / pilih perusahaan..."
                      list="pds-ln-perusahaan-list"
                      value={formData.pemohon}
                      onChange={(e) => setFormData({ ...formData, pemohon: e.target.value.toUpperCase() })}
                      style={{ textTransform: 'uppercase' }}
                      disabled={isLocked}
                    />
                    <datalist id="pds-ln-perusahaan-list">
                      {companyOptions.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                      Ketik perusahaan baru jika belum ada di database
                    </span>
                  </div>
                </div>

                {/* SECTION 3: TANGGAL PENUGASAN LUAR NEGERI & KALKULASI HARI */}
                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={17} />
                      <span>Periode Penugasan Luar Negeri ({formData.negaraTujuan || 'Mancanegara'})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
                      <span className="badge" style={{ background: '#0284c7', color: '#ffffff', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                        Hari: {calcs.hr} Hari
                      </span>
                      <span className="badge" style={{ background: '#0369a1', color: '#ffffff', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                        Malam: {calcs.mlm} Malam
                      </span>
                      <span className="badge" style={{ background: calcs.hrLbr > 0 ? '#b91c1c' : '#64748b', color: '#ffffff', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                        Hari Libur: {calcs.hrLbr} Hari
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Tanggal Berangkat Luar Negeri *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.tglMulai}
                        onChange={(e) => setFormData({ ...formData, tglMulai: e.target.value })}
                        required
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Tanggal Kembali Luar Negeri *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.tglSelesai}
                        onChange={(e) => setFormData({ ...formData, tglSelesai: e.target.value })}
                        required
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Hari Libur (Manual Override)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={formData.jumlahHariLibur}
                        onChange={(e) => setFormData({ ...formData, jumlahHariLibur: Number(e.target.value) || 0 })}
                        style={{ fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: RINCIAN BIAYA LUAR NEGERI (MATA UANG USD) */}
                <div style={{ border: '1.5px solid #cbd5e1', borderRadius: 'var(--radius-md)', padding: '1.1rem', marginBottom: '1.25rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={18} color="#059669" />
                      <span>Komponen Biaya Luar Negeri (Dalam Mata Uang USD $)</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#059669' }}>
                      Subtotal USD: ${calcs.totalUsd.toLocaleString('en-US')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                    {/* Uang Harian USD */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        Uang Harian (USD/Hari) *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: '#059669' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="form-input"
                          value={formData.uangHarianUsdRate}
                          onChange={(e) => setFormData({ ...formData, uangHarianUsdRate: Number(e.target.value) || 0 })}
                          style={{ fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        {calcs.hr} Hari $\times$ ${calcs.rateUangHarian} = <strong>${calcs.totalUangHarianUsd}</strong>
                      </div>
                    </div>

                    {/* Uang Hotel USD */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        Uang Hotel (USD/Malam)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: '#059669' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="form-input"
                          placeholder="0 (Jika ditanggung pemohon)"
                          value={formData.uangHotelUsdRate}
                          onChange={(e) => setFormData({ ...formData, uangHotelUsdRate: Number(e.target.value) || 0 })}
                          style={{ fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        {calcs.mlm} Malam $\times$ ${calcs.rateUangHotel} = <strong>${calcs.totalUangHotelUsd}</strong>
                      </div>
                    </div>

                    {/* Hari Libur USD */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        Hari Libur (50% * U.HR USD)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: '#059669' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="form-input"
                          value={calcs.totalHariLiburUsd}
                          onChange={(e) => setFormData({ ...formData, hariLiburUsdManual: Number(e.target.value) || 0 })}
                          style={{ fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Formula: {calcs.hrLbr} Libur $\times$ (${calcs.rateUangHarian} $\times$ 50%)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    {/* Pakaian Dingin (USD) */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        Pakaian Dingin (USD)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: '#059669' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          placeholder="0"
                          value={formData.pakaianDinginUsd}
                          onChange={(e) => setFormData({ ...formData, pakaianDinginUsd: Number(e.target.value) || 0 })}
                          style={{ fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Tunjangan perlengkapan cuaca dingin (jika ada)
                      </div>
                    </div>

                    {/* Tiket Pesawat / Transport Luar Negeri USD */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        Tiket Transport Luar Negeri (USD)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: '#059669' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          placeholder="0 (Jika ditanggung pemohon)"
                          value={formData.tiketLuarNegeriUsd}
                          onChange={(e) => setFormData({ ...formData, tiketLuarNegeriUsd: Number(e.target.value) || 0 })}
                          style={{ fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Isi 0 jika ditanggung oleh pihak pemohon
                      </div>
                    </div>

                    {/* Asal Tujuan Luar (USD) */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        Asal Tujuan Luar Negeri (USD)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: '#059669' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          placeholder="0 (Jika ditanggung pemohon)"
                          value={formData.asalTujuanLuarUsd}
                          onChange={(e) => setFormData({ ...formData, asalTujuanLuarUsd: Number(e.target.value) || 0 })}
                          style={{ fontWeight: 800 }}
                        />
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        Transport lokal luar negeri (TAT Luar)
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 5: KOMPONEN TRANSIT DALAM NEGERI (BANNER HIJAU "DALAM NEGERI") */}
                <div style={{
                  border: formData.denganDalamNegeri ? '2px solid #84cc16' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  marginBottom: '1.25rem',
                  background: formData.denganDalamNegeri ? '#f7fee7' : '#f8fafc',
                  transition: 'all 0.2s ease'
                }}>
                  {/* Header & Toggle Section */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <div style={{ fontWeight: 800, color: formData.denganDalamNegeri ? '#3f6212' : 'var(--text-secondary)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{
                        background: formData.denganDalamNegeri ? '#65a30d' : '#94a3b8',
                        color: '#ffffff',
                        padding: '0.15rem 0.6rem',
                        borderRadius: '4px',
                        letterSpacing: '0.05em',
                        fontSize: '0.78rem'
                      }}>
                        DALAM NEGERI
                      </span>
                      <span>Bagian Biaya Transit / Perjalanan Domestik (Mata Uang IDR Rp)</span>
                    </div>

                    {/* Tombol Toggle Dengan & Tanpa Dalam Negeri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.08)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, denganDalamNegeri: true }))}
                          style={{
                            fontSize: '0.76rem',
                            padding: '0.25rem 0.65rem',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: formData.denganDalamNegeri ? '#65a30d' : 'transparent',
                            color: formData.denganDalamNegeri ? '#ffffff' : 'var(--text-secondary)'
                          }}
                        >
                          ✅ Dengan Dalam Negeri
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, denganDalamNegeri: false }))}
                          style={{
                            fontSize: '0.76rem',
                            padding: '0.25rem 0.65rem',
                            fontWeight: 800,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            background: !formData.denganDalamNegeri ? '#dc2626' : 'transparent',
                            color: !formData.denganDalamNegeri ? '#ffffff' : 'var(--text-secondary)'
                          }}
                        >
                          ❌ Tanpa Dalam Negeri
                        </button>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: formData.denganDalamNegeri ? '#3f6212' : '#94a3b8' }}>
                        Subtotal Transit: {formData.denganDalamNegeri ? formatRupiah(calcs.totalTransitIdr) : 'Rp 0'}
                      </div>
                    </div>
                  </div>

                  {formData.denganDalamNegeri ? (
                    <>
                      {/* Grid 1: Periode & Durasi Transit Domestik */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1.2fr 0.8fr 0.8fr 1fr',
                        gap: '0.85rem',
                        marginBottom: '1rem',
                        background: '#ffffff',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #d9f99d'
                      }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>Tgl Berangkat Transit</label>
                          <input
                            type="date"
                            className="form-input"
                            value={formData.tglMulaiTransit}
                            onChange={(e) => handleTransitDatesChange(e.target.value, formData.tglSelesaiTransit)}
                            style={{ fontWeight: 700, fontSize: '0.8rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>Tgl Kembali Transit</label>
                          <input
                            type="date"
                            className="form-input"
                            value={formData.tglSelesaiTransit}
                            onChange={(e) => handleTransitDatesChange(formData.tglMulaiTransit, e.target.value)}
                            style={{ fontWeight: 700, fontSize: '0.8rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', color: '#15803d' }}>
                            Hari (HR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            value={formData.hrTransit}
                            onChange={(e) => setFormData({ ...formData, hrTransit: Number(e.target.value) || 0 })}
                            style={{ fontWeight: 800, textAlign: 'center', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', color: '#15803d' }}>
                            Malam (MLM)
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            value={formData.mlmTransit}
                            onChange={(e) => setFormData({ ...formData, mlmTransit: Number(e.target.value) || 0 })}
                            style={{ fontWeight: 800, textAlign: 'center', fontSize: '0.82rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', color: '#b45309' }}>
                            Hari Libur (Lbr)
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="form-input"
                            placeholder="0"
                            value={formData.jumlahHariLiburTransit}
                            onChange={(e) => setFormData({ ...formData, jumlahHariLiburTransit: Number(e.target.value) || 0 })}
                            style={{ fontWeight: 800, textAlign: 'center', fontSize: '0.82rem' }}
                          />
                        </div>
                      </div>

                      {/* Grid 2: Komponen Biaya Lengkap Sesuai PDS Dalam Negeri */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.1fr 1.1fr 1.1fr', gap: '0.85rem' }}>
                        {/* Uang Harian Domestik */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            Uang Harian (Rp/hari)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="25000"
                            className="form-input"
                            value={formData.uangHarianDlmRate}
                            onChange={(e) => setFormData({ ...formData, uangHarianDlmRate: Number(e.target.value) || 0 })}
                            style={{ fontWeight: 700, color: '#3f6212', fontSize: '0.82rem' }}
                          />
                          <div style={{ fontSize: '0.7rem', color: '#4d7c0f', marginTop: '0.25rem', fontWeight: 600 }}>
                            Total: {formatRupiah(calcs.totalUangHarianDlm)}
                          </div>
                        </div>

                        {/* Uang Hotel Domestik */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            Uang Hotel (Rp/mlm)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="50000"
                            className="form-input"
                            value={formData.uangHotelDlmRate}
                            onChange={(e) => setFormData({ ...formData, uangHotelDlmRate: Number(e.target.value) || 0 })}
                            style={{ fontWeight: 700, fontSize: '0.82rem' }}
                          />
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>
                            Total: {formatRupiah(calcs.totalHotelDlm)}
                          </div>
                        </div>

                        {/* Uang Hari Libur Domestik (50% x U.HR) */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309' }}>
                            Hari Libur (50% U.HR)
                          </label>
                          <input
                            type="text"
                            readOnly
                            className="form-input"
                            value={formatRupiah(calcs.totalHrLiburDlm)}
                            style={{ fontWeight: 800, background: '#fffbeb', color: '#b45309', fontSize: '0.82rem' }}
                          />
                          <div style={{ fontSize: '0.7rem', color: '#92400e', marginTop: '0.25rem' }}>
                            {calcs.hrLbrTransit} hari x 50%
                          </div>
                        </div>

                        {/* Asal Tujuan Dlm (TAT) */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            Asal Tujuan Dlm (TAT Rp) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            className="form-input"
                            placeholder="750000"
                            value={formData.asalTujuanDlm}
                            onChange={(e) => setFormData({ ...formData, asalTujuanDlm: Number(e.target.value) || 0 })}
                            style={{ fontWeight: 800, color: '#3f6212', fontSize: '0.82rem' }}
                          />
                          <div style={{ fontSize: '0.7rem', color: '#4d7c0f', marginTop: '0.25rem' }}>
                            Transport lokal domestik
                          </div>
                        </div>

                        {/* Tiket Domestik */}
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            Tiket Domestik (IDR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            className="form-input"
                            placeholder="0"
                            value={formData.tiketDalamNegeri}
                            onChange={(e) => setFormData({ ...formData, tiketDalamNegeri: Number(e.target.value) || 0 })}
                            style={{ fontWeight: 700, fontSize: '0.82rem' }}
                          />
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Pesawat / Taxi transit
                          </div>
                        </div>
                      </div>

                      {/* Rincian Ringkas Breakdown */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '0.85rem',
                        padding: '0.45rem 0.75rem',
                        background: 'rgba(101, 163, 13, 0.1)',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        color: '#365314',
                        fontWeight: 700,
                        flexWrap: 'wrap',
                        gap: '0.4rem'
                      }}>
                        <span>Rincian Biaya Transit:</span>
                        <span>U.Harian: {formatRupiah(calcs.totalUangHarianDlm)}</span>
                        <span>•</span>
                        <span>Hotel: {formatRupiah(calcs.totalHotelDlm)}</span>
                        <span>•</span>
                        <span>Hr Libur: {formatRupiah(calcs.totalHrLiburDlm)}</span>
                        <span>•</span>
                        <span>TAT: {formatRupiah(calcs.asalTujuanDlmIdr)}</span>
                        <span>•</span>
                        <span>Tiket: {formatRupiah(calcs.tiketDlmIdr)}</span>
                        <span>=</span>
                        <span style={{ color: '#166534', fontWeight: 900, fontSize: '0.82rem' }}>
                          Total: {formatRupiah(calcs.totalTransitIdr)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{
                      padding: '0.85rem',
                      background: '#ffffff',
                      border: '1px dashed #cbd5e1',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        ℹ️ <strong>Mode Tanpa Dalam Negeri Aktif:</strong> Biaya transit domestik dinonaktifkan (Rp 0). Grand Total hanya mengonversi biaya Luar Negeri (USD) ke Rupiah.
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setFormData((prev) => ({ ...prev, denganDalamNegeri: true }))}
                        style={{ fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        + Aktifkan Transit Dalam Negeri
                      </button>
                    </div>
                  )}
                </div>

                {/* SECTION 6: KURS USD & RINGKASAN GRAND TOTAL (PERSIS EXCEL SPESIMEN) */}
                <div style={{ background: '#f8fafc', border: '2px solid #0284c7', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label" style={{ fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <DollarSign size={16} />
                          <span>Nilai Kurs USD ke Rupiah (KURS) *</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>1 USD = Rp</span>
                          <input
                            type="number"
                            min="1000"
                            step="10"
                            className="form-input"
                            value={formData.kursUsd}
                            onChange={(e) => setFormData({ ...formData, kursUsd: Number(e.target.value) || 16640 })}
                            required
                            style={{ fontWeight: 800, width: '160px', fontSize: '1rem', color: '#0369a1' }}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700 }}>
                          Keterangan / Catatan Spesimen
                        </label>
                        <textarea
                          rows={2}
                          className="form-input"
                          value={formData.keteranganLain}
                          onChange={(e) => setFormData({ ...formData, keteranganLain: e.target.value })}
                          style={{ fontSize: '0.82rem', fontWeight: 600 }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Kalkulasi Sesuai Gambar Excel */}
                    <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                        Kalkulasi Akhir Sesuai Spesimen:
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.3rem' }}>
                        <span>Subtotal USD:</span>
                        <strong style={{ color: '#059669' }}>${calcs.totalUsd.toLocaleString('en-US')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.3rem' }}>
                        <span>KURS USD:</span>
                        <strong>{calcs.kurs.toLocaleString('id-ID')}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.3rem' }}>
                        <span>Konversi Luar Negeri:</span>
                        <strong>{formatRupiah(calcs.konversiUsdKeIdr)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '0.5rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.4rem' }}>
                        <span>Biaya Transit Domestik:</span>
                        <strong>{formatRupiah(calcs.totalTransitIdr)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>JUMLAH TERIMA (IDR):</span>
                        <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0284c7' }}>
                          {formatRupiah(calcs.grandTotalIdr)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '0.85rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                * Dokumen otomatis terdaftar sebagai <strong>PDS Luar Negeri (USD)</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0284c7', borderColor: '#0284c7' }}>
                  <Save size={16} />
                  <span>{editItem ? 'Simpan Perubahan PDS Luar Negeri' : 'Terbitkan PDS Luar Negeri'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
