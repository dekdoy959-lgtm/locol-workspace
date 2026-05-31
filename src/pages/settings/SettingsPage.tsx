import { useEffect, useState } from 'react';
import { useTrackSettings, useUpdateTrackSetting } from '../../hooks/useTrackSettings';
import { useMyAlertPrefs, useUpdateMyAlertPrefs } from '../../hooks/useUserAlertPrefs';
import { useAuth } from '../../contexts/AuthContext';
import { TRACKS, type TrackKey } from '../../types/opportunity';
import { LCard, LH, LBtn, LIcon, LInput, LNote, LErrorBanner } from '../../components/primitives';
import { colors } from '../../styles/tokens';

export function SettingsPage() {
  const { user } = useAuth();
  const { data: settings = [], isLoading, error } = useTrackSettings();
  const update = useUpdateTrackSetting();
  const { data: alertPrefs } = useMyAlertPrefs();
  const updatePrefs = useUpdateMyAlertPrefs();
  const [editing, setEditing] = useState<Record<string, { stale: string; ping: boolean; email: boolean }>>({});
  const [savingTrack, setSavingTrack] = useState<TrackKey | null>(null);

  // Scroll to the alerts section when arrived via /settings#alerts (SPA hash).
  useEffect(() => {
    if (window.location.hash === '#alerts') {
      // Defer to ensure the section is rendered.
      setTimeout(() => document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, []);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', color: colors.dim }}>กำลังโหลด…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <LErrorBanner>Error loading settings: {String(error)}</LErrorBanner>
      </div>
    );
  }

  const getEdit = (track: TrackKey) => {
    const cur = settings.find((s) => s.track === track);
    return (
      editing[track] ?? {
        stale: cur?.stale_threshold_days == null ? '' : String(cur.stale_threshold_days),
        ping: cur?.ping_enabled ?? true,
        email: cur?.email_notifications ?? true,
      }
    );
  };

  const setEdit = (track: TrackKey, patch: Partial<{ stale: string; ping: boolean; email: boolean }>) => {
    setEditing((m) => ({ ...m, [track]: { ...getEdit(track), ...patch } }));
  };

  const handleSave = async (track: TrackKey) => {
    setSavingTrack(track);
    try {
      const e = getEdit(track);
      const stale = e.stale.trim();
      await update.mutateAsync({
        track,
        patch: {
          stale_threshold_days: stale === '' ? null : Number(stale),
          ping_enabled: e.ping,
          email_notifications: e.email,
        },
      });
      // Clear local edit
      setEditing((m) => {
        const next = { ...m };
        delete next[track];
        return next;
      });
    } finally {
      setSavingTrack(null);
    }
  };

  return (
    <div style={{ padding: '28px 36px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <LNote>System · Settings</LNote>
        <div style={{ height: 10 }} />
        <LH level={3} sub="ตั้งค่าระบบ — ปรับ stale threshold + notification ต่อ track">
          SETTINGS
        </LH>
      </div>

      <LCard padding={0}>
        <div
          style={{
            padding: '12px 18px',
            borderBottom: `1px solid ${colors.line}`,
            background: colors.bgSoft,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colors.green,
            }}
          >
            PER-TRACK SETTINGS
          </div>
          <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 4, lineHeight: 1.5 }}>
            <b>Stale threshold</b>: opportunity ที่ไม่มี update เกิน X วัน จะถูก flag · เว้นว่าง = ไม่เคย stale (เช่น Watch)
            <br />
            <b>Ping</b>: เปิด/ปิดการแจ้งเตือนภายในแอป
            · <b>Email notif</b>: เปิด/ปิด email (ต้อง connect Resend ก่อนใน Phase 5)
          </div>
        </div>

        <table className="l-rtable" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.line}` }}>
              <Th>Track</Th>
              <Th>Stale threshold (days)</Th>
              <Th>In-app Ping</Th>
              <Th>Email Notif</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {TRACKS.map((track) => {
              const e = getEdit(track.key);
              const cur = settings.find((s) => s.track === track.key);
              const dirty = !!editing[track.key];
              const saving = savingTrack === track.key;

              return (
                <tr key={track.key} style={{ borderBottom: `1px solid ${colors.line}` }}>
                  <Td title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{ width: 10, height: 10, background: track.color.ink, borderRadius: 99 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: track.color.ink, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          {track.name}
                        </div>
                        <div style={{ fontSize: 11, color: colors.dim, marginTop: 1 }}>{track.cadence}</div>
                      </div>
                    </div>
                  </Td>

                  <Td label="Stale (d)">
                    <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <LInput
                        type="number"
                        value={e.stale}
                        onChange={(v) => setEdit(track.key, { stale: v })}
                        placeholder="—"
                      />
                      <span style={{ fontSize: 11, color: colors.dim }}>days</span>
                    </div>
                    {cur && cur.stale_threshold_days == null && e.stale === '' && (
                      <div style={{ fontSize: 10, color: colors.dim, marginTop: 4, fontStyle: 'italic' }}>
                        Never stale
                      </div>
                    )}
                  </Td>

                  <Td label="In-app">
                    <Toggle checked={e.ping} onChange={(v) => setEdit(track.key, { ping: v })} />
                  </Td>

                  <Td label="Email">
                    <Toggle checked={e.email} onChange={(v) => setEdit(track.key, { email: v })} />
                  </Td>

                  <Td label="Action">
                    {dirty && (
                      <LBtn primary small onClick={() => handleSave(track.key)} disabled={saving}>
                        {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                      </LBtn>
                    )}
                    {!dirty && (
                      <span style={{ fontSize: 10.5, color: colors.dim, letterSpacing: 0.5 }}>
                        ✓ บันทึกแล้ว
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </LCard>

      <div style={{ height: 24 }} />

      <LCard padding={18}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            color: colors.dim,
            textTransform: 'uppercase',
            marginBottom: 10,
            fontWeight: 700,
          }}
        >
          QUICK REFERENCE
        </div>
        <div style={{ fontSize: 12.5, color: colors.dimSoft, lineHeight: 1.6 }}>
          <div>· <b style={{ color: colors.text }}>Apply / Act-on</b>: default 7 d — ทุกอย่างต้องถูก update บ่อย</div>
          <div>· <b style={{ color: colors.text }}>Watch</b>: default <b>null</b> — news ไม่ควร stale ตามเวลา</div>
          <div>· <b style={{ color: colors.text }}>Contract</b>: default 14 d — สัญญายาวนาน</div>
          <div>· <b style={{ color: colors.text }}>Event</b>: default 7 d</div>
        </div>
      </LCard>

      {/* My Email Alert Preferences */}
      <div id="alerts" style={{ marginTop: 28, scrollMarginTop: 80 }}>
        <LCard padding={0}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.line}`, background: colors.bgSoft }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: colors.green,
              }}
            >
              📧 MY EMAIL ALERTS
            </div>
            <div style={{ fontSize: 11.5, color: colors.dimSoft, marginTop: 4, lineHeight: 1.5 }}>
              Email จะส่งไปที่ <b style={{ color: colors.text }}>{user?.email}</b> · ปิด/เปิดแต่ละประเภทได้
              · ตอนนี้ต้อง run script เอง (<code style={{ background: colors.bg, padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>scripts/notifications/</code>)
            </div>
          </div>

          <div style={{ padding: 18 }}>
            {/* Master switch */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: alertPrefs?.enabled ? colors.greenBg : colors.bgSoft,
                border: `1px solid ${alertPrefs?.enabled ? colors.greenDk : colors.line}`,
                borderRadius: '10px 0 10px 0',
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>⚡ MASTER SWITCH</div>
                <div style={{ fontSize: 11.5, color: colors.dim, marginTop: 2 }}>
                  ปิดอันนี้ = หยุดทุก email · เปิดอันนี้ = ส่งตาม alert types ด้านล่าง
                </div>
              </div>
              <Toggle
                checked={alertPrefs?.enabled ?? true}
                onChange={(v) => updatePrefs.mutate({ enabled: v })}
              />
            </div>

            <table className="l-rtable" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.line}` }}>
                  <Th>Alert Type</Th>
                  <Th>Description</Th>
                  <Th>Enabled</Th>
                </tr>
              </thead>
              <tbody>
                <AlertRow
                  icon="🚩"
                  label="Stale Opportunities"
                  desc="Opportunity ที่ไม่ได้ update เกิน threshold"
                  checked={alertPrefs?.stale_opportunities ?? true}
                  disabled={!alertPrefs?.enabled}
                  onChange={(v) => updatePrefs.mutate({ stale_opportunities: v })}
                />
                <AlertRow
                  icon="🥶"
                  label="Cold Contacts"
                  desc="Contact ที่ไม่ได้ติดต่อเกิน freq_days"
                  checked={alertPrefs?.cold_contacts ?? true}
                  disabled={!alertPrefs?.enabled}
                  onChange={(v) => updatePrefs.mutate({ cold_contacts: v })}
                />
                <AlertRow
                  icon="🔔"
                  label="Reminder Notes"
                  desc="Note ที่ตั้ง reminder ไว้และถึงวัน"
                  checked={alertPrefs?.reminder_notes ?? true}
                  disabled={!alertPrefs?.enabled}
                  onChange={(v) => updatePrefs.mutate({ reminder_notes: v })}
                />
                <AlertRow
                  icon="🎂"
                  label="Birthdays"
                  desc="วันเกิด contact ใน 7 วันข้างหน้า (ที่เปิด notification)"
                  checked={alertPrefs?.birthdays ?? true}
                  disabled={!alertPrefs?.enabled}
                  onChange={(v) => updatePrefs.mutate({ birthdays: v })}
                />
                <AlertRow
                  icon="⏰"
                  label="Commitment overdue"
                  desc="commitment ที่เลยกำหนด due แล้วยังไม่ปิด"
                  checked={alertPrefs?.commitment_overdue ?? true}
                  disabled={!alertPrefs?.enabled}
                  onChange={(v) => updatePrefs.mutate({ commitment_overdue: v })}
                />
              </tbody>
            </table>
          </div>
        </LCard>
      </div>

      <div style={{ marginTop: 24, padding: 14, background: colors.warnBg, border: `1px solid ${colors.warnDk}`, borderRadius: '10px 0 10px 0' }}>
        <div style={{ fontSize: 11, color: colors.warn, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          <LIcon kind="warn" size={11} color={colors.warn} /> Email setup
        </div>
        <div style={{ fontSize: 12, color: colors.surface, lineHeight: 1.55 }}>
          1. Sign up <a href="https://resend.com" target="_blank" rel="noopener noreferrer" style={{ color: colors.green }}>Resend</a> (free 100/day) → copy API key
          <br />
          2. <code style={{ background: colors.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>cd scripts/notifications && npm install</code>
          <br />
          3. Test: <code style={{ background: colors.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>SUPABASE_SERVICE_KEY=xxx npm run dry-run</code>
          <br />
          4. Send: <code style={{ background: colors.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>RESEND_API_KEY=xxx ... npm run send</code>
          <br />
          5. Schedule daily — see <code style={{ background: colors.bg, padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>scripts/notifications/README.md</code>
        </div>
      </div>
    </div>
  );
}

function AlertRow({
  icon,
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  icon: string;
  label: string;
  desc: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <tr style={{ borderBottom: `1px solid ${colors.line}`, opacity: disabled ? 0.5 : 1 }}>
      <Td title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{label}</span>
        </div>
      </Td>
      <Td label="What">
        <span style={{ fontSize: 12, color: colors.dimSoft }}>{desc}</span>
      </Td>
      <Td label="Enabled">
        {/* Respect the master switch: when alerts are disabled, the per-type
            toggles are dimmed AND inert (don't fire onChange). */}
        <Toggle checked={checked} onChange={(v) => { if (!disabled) onChange(v); }} />
      </Td>
    </tr>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '10px 14px',
        textAlign: 'left',
        fontWeight: 600,
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: colors.dim,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  label,
  title,
}: {
  children?: React.ReactNode;
  label?: string;
  title?: boolean;
}) {
  return (
    <td
      className={title ? 'l-rtable-title' : undefined}
      data-label={label}
      style={{ padding: '14px', verticalAlign: 'middle' }}
    >
      {children}
    </td>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        background: checked ? colors.green : colors.bgRaise,
        border: `1px solid ${checked ? colors.greenDk : colors.lineHi}`,
        borderRadius: 99,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 150ms',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 1,
          left: checked ? 17 : 1,
          width: 16,
          height: 16,
          background: checked ? colors.bg : colors.dimSoft,
          borderRadius: 99,
          transition: 'left 150ms',
        }}
      />
    </button>
  );
}
