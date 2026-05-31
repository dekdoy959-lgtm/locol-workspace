import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useOrganizations, useCreateOrganization } from '../../hooks/useOrganizations';
import { LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface OrgPickerProps {
  value: { org_id: string | null; org_name: string };
  onChange: (next: { org_id: string | null; org_name: string }) => void;
}

export function OrgPicker({ value, onChange }: OrgPickerProps) {
  const [search, setSearch] = useState(value.org_name);
  const [focused, setFocused] = useState(false);
  const { data: orgs = [] } = useOrganizations();
  const create = useCreateOrganization();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setSearch(value.org_name);
  }, [value.org_name]);

  const trimmed = search.trim();
  const lowerSearch = trimmed.toLowerCase();

  const filtered = useMemo(() => {
    if (!lowerSearch) return orgs.slice(0, 20);
    return orgs.filter((o) => o.name.toLowerCase().includes(lowerSearch)).slice(0, 20);
  }, [orgs, lowerSearch]);

  const exactMatch = orgs.find((o) => o.name.toLowerCase() === lowerSearch);
  const canCreate = !exactMatch && trimmed.length > 0;

  const handlePick = (orgId: string, orgName: string) => {
    onChange({ org_id: orgId, org_name: orgName });
    setSearch(orgName);
    setFocused(false);
  };

  const handleCreate = async () => {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const created = await create.mutateAsync({ name: trimmed });
      onChange({ org_id: created.id, org_name: created.name });
      setSearch(created.name);
      setFocused(false);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (exactMatch) {
        handlePick(exactMatch.id, exactMatch.name);
      } else if (filtered.length > 0) {
        handlePick(filtered[0].id, filtered[0].name);
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          // Whenever user edits text manually, drop org_id link until they pick or create
          onChange({ org_id: null, org_name: e.target.value });
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder="พิมพ์ชื่อ org... (เลือกของเดิม หรือสร้างใหม่)"
        style={{
          width: '100%',
          background: colors.bgSoft,
          color: colors.text,
          border: `1px solid ${focused ? colors.green : colors.lineHi}`,
          borderRadius: '10px 0 10px 0',
          padding: value.org_id ? '9px 80px 9px 12px' : '9px 12px',
          fontSize: 13.5,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 150ms ease-out',
        }}
      />

      {value.org_id && (
        <span
          title="Linked กับ Organization ในระบบ"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 9,
            color: colors.green,
            background: colors.greenBg,
            border: `1px solid ${colors.greenDk}`,
            padding: '2px 7px',
            borderRadius: '5px 0 5px 0',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          ✓ LINKED
        </span>
      )}

      {focused && (filtered.length > 0 || canCreate) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: colors.bgCard,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '10px 0 10px 0',
            maxHeight: 260,
            overflowY: 'auto',
            zIndex: 20,
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
          }}
        >
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              disabled={creating}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: colors.greenBg,
                border: 'none',
                color: colors.green,
                cursor: creating ? 'wait' : 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: filtered.length > 0 ? `1px solid ${colors.line}` : 'none',
                fontWeight: 600,
              }}
            >
              <LIcon kind="plus" size={12} color={colors.green} />
              <span>
                {creating ? 'กำลังสร้าง…' : 'สร้าง Organization ใหม่: '}
                {!creating && <b style={{ color: colors.text }}>"{trimmed}"</b>}
              </span>
            </button>
          )}

          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handlePick(o.id, o.name);
              }}
              style={{
                width: '100%',
                padding: '9px 14px',
                background: 'transparent',
                border: 'none',
                color: colors.text,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgSoft)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  background: colors.oliveBg,
                  border: `1px solid ${colors.oliveDk}`,
                  borderRadius: '6px 0 6px 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.olive,
                  fontWeight: 700,
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                {o.name.slice(0, 2).toUpperCase()}
              </span>
              <span style={{ flex: 1 }}>{o.name}</span>
              {(o.type || o.industry) && (
                <span style={{ fontSize: 10.5, color: colors.dim }}>
                  {[o.type, o.industry].filter(Boolean).join(' · ')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
