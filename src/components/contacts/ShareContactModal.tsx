import { useState } from 'react';
import type { ContactRow } from '../../types/contact';
import { contactDisplayName } from '../../types/contact';
import { downloadVCard, formatContactAsPlainText, generateVCard } from '../../lib/vcard';
import { LCard, LH, LBtn, LIcon } from '../primitives';
import { colors, z } from '../../styles/tokens';

interface ShareContactModalProps {
  contact: ContactRow;
  onClose: () => void;
}

type Tab = 'vcard' | 'text';

export function ShareContactModal({ contact, onClose }: ShareContactModalProps) {
  const [tab, setTab] = useState<Tab>('vcard');
  const [copied, setCopied] = useState(false);

  const vcardString = generateVCard(contact);
  const textString = formatContactAsPlainText(contact);

  const handleCopy = async () => {
    const toCopy = tab === 'vcard' ? vcardString : textString;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleDownload = () => {
    downloadVCard(contact);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: z.modalBackdrop,
        padding: 24,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '100%' }}>
        <LCard padding={28} bg={colors.bgOverlay}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <LH level={3}>SHARE CONTACT</LH>
              <div style={{ fontSize: 13, color: colors.dimSoft, marginTop: 4 }}>
                แชร์ข้อมูลของ <b style={{ color: colors.text }}>{contactDisplayName(contact)}</b>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.dim,
                cursor: 'pointer',
                fontSize: 20,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.line}`, marginBottom: 14 }}>
            <TabBtn label="vCard (.vcf)" active={tab === 'vcard'} onClick={() => setTab('vcard')} />
            <TabBtn label="Plain Text" active={tab === 'text'} onClick={() => setTab('text')} />
          </div>

          {/* Preview */}
          <div
            style={{
              background: colors.bgSoft,
              border: `1px solid ${colors.line}`,
              borderRadius: '10px 3px 10px 3px',
              padding: 14,
              fontSize: 11.5,
              fontFamily: "'IBM Plex Mono', monospace",
              color: colors.surface,
              maxHeight: 280,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: 1.5,
              letterSpacing: 0.2,
            }}
          >
            {tab === 'vcard' ? vcardString : textString}
          </div>

          {/* Action explanation */}
          <div
            style={{
              fontSize: 11.5,
              color: colors.dim,
              marginTop: 10,
              lineHeight: 1.5,
              letterSpacing: 0.3,
            }}
          >
            {tab === 'vcard' ? (
              <>
                <b style={{ color: colors.surface }}>vCard (.vcf)</b> = ไฟล์ standard สำหรับ Contacts app — เปิดได้บน iPhone,
                Android, Outlook, Google Contacts ทันที
              </>
            ) : (
              <>
                <b style={{ color: colors.surface }}>Plain Text</b> = สำหรับ paste ใน Line, Email, Slack
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
            <LBtn ghost onClick={onClose}>ปิด</LBtn>
            {tab === 'vcard' && (
              <LBtn onClick={handleDownload}>
                <LIcon kind="doc" size={12} color={colors.text} />
                ดาวน์โหลด .vcf
              </LBtn>
            )}
            <LBtn primary onClick={handleCopy}>
              {copied ? '✓ คัดลอกแล้ว' : tab === 'vcard' ? 'Copy vCard' : 'Copy ข้อความ'}
            </LBtn>
          </div>
        </LCard>
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? colors.green : 'transparent'}`,
        color: active ? colors.green : colors.dimSoft,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}
