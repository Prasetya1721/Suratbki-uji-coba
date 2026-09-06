import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, X, Building2, PlusCircle } from 'lucide-react';

export default function ShipDatabaseSearchSelect({
  shipDatabase = [],
  masterKapal,
  value,
  onChange,
  onSelect,
  onSelectShip,
  placeholder = '-- 🚢 Ketik nama kapal, no. agenda, atau perusahaan pemohon... --',
  style = {},
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isControlled = value !== undefined;
  const [internalTerm, setInternalTerm] = useState(isControlled ? (value || '') : '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const rawDatabase = masterKapal || shipDatabase || [];

  // Sync internal state when controlled value changes externally
  useEffect(() => {
    if (isControlled) {
      setInternalTerm(value || '');
    }
  }, [value, isControlled]);

  const currentTerm = isControlled ? (value || '') : internalTerm;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter ships based on user search term
  const filteredShips = useMemo(() => {
    const cleanTerm = String(currentTerm || '').trim().toUpperCase();
    const safeDb = Array.isArray(rawDatabase) ? rawDatabase : [];
    if (!cleanTerm) return safeDb;
    return safeDb.filter((s) => {
      if (!s) return false;
      const name = String(s.namaKapal || '').toUpperCase();
      const agenda = String(s.noAgenda || '').toUpperCase();
      const order = String(s.noOrder || '').toUpperCase();
      const pemohon = String(s.pemohon || '').toUpperCase();
      return name.includes(cleanTerm) || agenda.includes(cleanTerm) || order.includes(cleanTerm) || pemohon.includes(cleanTerm);
    });
  }, [rawDatabase, currentTerm]);

  const handleItemClick = (ship) => {
    if (disabled || !ship) return;
    const shipNameUpper = String(ship.namaKapal || '').trim().toUpperCase();
    setInternalTerm(shipNameUpper);
    if (onChange) {
      onChange(shipNameUpper);
    }
    if (onSelect) {
      onSelect(ship);
    }
    if (onSelectShip) {
      onSelectShip(ship);
    }
    setIsOpen(false);
  };

  const handleUseManualName = (customName) => {
    const upper = String(customName || '').trim().toUpperCase();
    if (!upper) return;
    setInternalTerm(upper);
    if (onChange) onChange(upper);
    const mockShip = { namaKapal: upper, isManual: true };
    if (onSelect) onSelect(mockShip);
    if (onSelectShip) onSelectShip(mockShip);
    setIsOpen(false);
  };

  const hasExactMatch = useMemo(() => {
    const clean = String(currentTerm || '').trim().toUpperCase();
    if (!clean) return false;
    return (rawDatabase || []).some(
      (s) => String(s.namaKapal || '').trim().toUpperCase() === clean
    );
  }, [rawDatabase, currentTerm]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      {/* Search Input Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: disabled ? 'var(--bg-main)' : 'var(--bg-card)',
          border: isOpen ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 0.65rem',
          gap: '0.5rem',
          boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
          opacity: disabled ? 0.75 : 1,
          cursor: disabled ? 'not-allowed' : 'default',
          transition: 'all 0.15s ease'
        }}
      >
        <Search size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          required={required}
          value={currentTerm}
          onChange={(e) => {
            if (disabled) return;
            const val = e.target.value;
            setInternalTerm(val);
            if (onChange) onChange(val);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter') {
              if (filteredShips.length > 0 && !hasExactMatch) {
                e.preventDefault();
                handleItemClick(filteredShips[0]);
              } else if (currentTerm) {
                setIsOpen(false);
              }
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={disabled ? 'Pencarian database dinonaktifkan (Dokumen Terkunci)' : placeholder}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '100%',
            fontSize: '0.84rem',
            color: 'var(--text-primary)',
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />

        {!disabled && currentTerm && (
          <button
            type="button"
            onClick={() => {
              setInternalTerm('');
              if (onChange) onChange('');
              inputRef.current?.focus();
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Hapus / ketik ulang"
          >
            <X size={14} />
          </button>
        )}

        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isOpen ? 'Tutup daftar' : 'Buka daftar'}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Floating Suggestions / Dropdown List */}
      {!disabled && isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: 'var(--bg-surface, #ffffff)',
            border: '1.5px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '0.35rem 0'
          }}
        >
          {/* Quick Option to use manual typed name if not an exact match */}
          {currentTerm && !hasExactMatch && (
            <div
              onClick={() => handleUseManualName(currentTerm)}
              style={{
                padding: '0.55rem 0.75rem',
                cursor: 'pointer',
                background: 'rgba(16, 185, 129, 0.08)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#059669',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                <PlusCircle size={14} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>Gunakan Kapal Manual Baru:</span>
                <strong style={{ textDecoration: 'underline', color: '#047857', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentTerm.trim().toUpperCase()}
                </strong>
              </div>
              <span style={{ fontSize: '0.68rem', background: '#059669', color: '#ffffff', padding: '0.15rem 0.4rem', borderRadius: '4px', flexShrink: 0 }}>
                Manual
              </span>
            </div>
          )}

          {filteredShips.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  padding: '0.35rem 0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Daftar Database ({filteredShips.length > 100 ? `100 dari ${filteredShips.length}` : filteredShips.length})</span>
                <span>Klik untuk Memilih</span>
              </div>
              {filteredShips.slice(0, 100).map((ship, idx) => (
                <div
                  key={`${ship.namaKapal}-${ship.noAgenda || idx}`}
                  onClick={() => handleItemClick(ship)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    borderBottom: idx < Math.min(filteredShips.length, 100) - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    transition: 'background 0.1s ease',
                    fontSize: '0.82rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>🚢</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ship.namaKapal}
                      </div>
                      {ship.pemohon && ship.pemohon !== '-' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Building2 size={12} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                          <span>{ship.pemohon}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {ship.noAgenda && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(2, 132, 199, 0.12)',
                          color: 'var(--accent-primary)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}
                      >
                        Agenda: {ship.noAgenda}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {currentTerm ? (
                <div>
                  <div>Kapal "<strong>{currentTerm}</strong>" belum terdaftar di database.</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Kapal ini dapat langsung digunakan dan otomatis disimpan ke database saat formulir disimpan.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                    onClick={() => handleUseManualName(currentTerm)}
                  >
                    Gunakan "{currentTerm.trim().toUpperCase()}"
                  </button>
                </div>
              ) : (
                'Belum ada riwayat kapal terdaftar di database.'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
