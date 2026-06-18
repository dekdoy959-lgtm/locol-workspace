import { Link } from 'react-router-dom';
import { TRACK_DETAILS, formatCurrency, normalizeOrgPickerValue } from '../../types/opportunityDetails';
import type { TrackKey } from '../../types/opportunity';
import { colors } from '../../styles/tokens';

interface OpportunityDetailsViewProps {
  track: TrackKey;
  details: Record<string, unknown> | null | undefined;
}

export function OpportunityDetailsView({ track, details }: OpportunityDetailsViewProps) {
  const fields = TRACK_DETAILS[track] ?? [];
  const d = details ?? {};

  const hasAny = fields.some((f) => {
    const v = d[f.key];
    if (v === null || v === undefined || v === '') return false;
    if (f.type === 'org_picker') {
      const norm = normalizeOrgPickerValue(v);
      return !!(norm.org_id || norm.org_name);
    }
    return true;
  });

  if (!hasAny) {
    return (
      <div
        style={{
          padding: 14,
          background: colors.bgSoft,
          border: `1px dashed ${colors.line}`,
          borderRadius: '10px 3px 10px 3px',
          color: colors.dim,
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        ยังไม่มี detail ที่ track-specific — คลิก "แก้ไข" เพื่อเพิ่ม
      </div>
    );
  }

  const currency = (d.currency as string) || 'THB';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, columnGap: 24 }}>
      {fields.map((spec) => {
        const v = d[spec.key];
        if (v === null || v === undefined || v === '') return null;

        let displayValue: React.ReactNode;
        if (spec.type === 'org_picker') {
          const orgVal = normalizeOrgPickerValue(v);
          if (!orgVal.org_id && !orgVal.org_name) return null;
          if (orgVal.org_id) {
            displayValue = (
              <Link
                to={`/organizations/${orgVal.org_id}`}
                style={{
                  color: colors.green,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    background: colors.oliveBg,
                    border: `1px solid ${colors.oliveDk}`,
                    color: colors.olive,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: '5px 2px 5px 2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {orgVal.org_name.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ textDecoration: 'underline' }}>{orgVal.org_name}</span>
                <span style={{ fontSize: 9, color: colors.green, letterSpacing: 0.5 }}>↗</span>
              </Link>
            );
          } else {
            displayValue = (
              <span style={{ color: colors.dimSoft }}>
                {orgVal.org_name} <span style={{ fontSize: 10, color: colors.dim, marginLeft: 6 }}>(ไม่ได้ link)</span>
              </span>
            );
          }
        } else if (spec.type === 'number' && (spec.key.includes('amount') || spec.key.includes('value') || spec.key === 'cost')) {
          displayValue = formatCurrency(v as number | string, currency);
        } else if (spec.type === 'url') {
          displayValue = (
            <a
              href={String(v)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.green, textDecoration: 'underline', wordBreak: 'break-all' }}
            >
              {String(v).replace(/^https?:\/\//, '').slice(0, 50)}
            </a>
          );
        } else if (spec.type === 'textarea') {
          displayValue = (
            <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{String(v)}</span>
          );
        } else {
          displayValue = String(v);
        }

        const fullWidth = spec.type === 'textarea' || spec.type === 'org_picker';

        return (
          <div key={spec.key} style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
            <div
              style={{
                fontSize: 10,
                color: colors.dim,
                letterSpacing: 1.1,
                textTransform: 'uppercase',
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              {spec.label}
            </div>
            <div style={{ fontSize: 13.5, color: colors.text, lineHeight: 1.4 }}>{displayValue}</div>
          </div>
        );
      })}
    </div>
  );
}
