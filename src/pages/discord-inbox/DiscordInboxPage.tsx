import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { LPage, LCard, LChip, LH, LNote, LBtn } from '../../components/primitives';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { DiscordAttachment } from '../../components/discord/DiscordAttachment';
import { colors } from '../../styles/tokens';
import type { Database } from '../../types/database';

type InboxRow = Database['public']['Tables']['discord_inbox']['Row'];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  apply:   { label: 'ขอทุน/งานแข่ง', color: '#E8B923' },
  watch:   { label: 'ติดตามข่าว',     color: '#747474' },
  event:   { label: 'อีเวนต์',        color: '#d96a66' },
  contact: { label: 'Contact',         color: '#57a0d3' },
};

const STATUS_COLORS: Record<string, string> = {
  done:          colors.green,
  pending:       '#E8B923',
  processing:    '#57a0d3',
  failed:        '#d96a66',
  review_needed: '#E8B923',
  cancelled:     colors.dim,
  dismissed:     colors.dim,
};

function useDiscordInbox(category: string | null, showCancelled: boolean) {
  return useQuery({
    queryKey: ['discord-inbox', category, showCancelled],
    queryFn: async () => {
      let q = supabase
        .from('discord_inbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (category) q = q.eq('detected_category', category);
      if (!showCancelled) q = q.not('processing_status', 'in', '("cancelled","dismissed")');
      const { data, error } = await q;
      if (error) throw error;
      return data as InboxRow[];
    },
    staleTime: 30_000,
  });
}

export function DiscordInboxPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const { data: items = [], isLoading, error } = useDiscordInbox(activeCategory, showCancelled);

  const categories = [
    { key: null, label: 'ทั้งหมด' },
    { key: 'apply',   label: 'ขอทุน/งานแข่ง' },
    { key: 'watch',   label: 'ติดตามข่าว' },
    { key: 'event',   label: 'อีเวนต์' },
    { key: 'contact', label: 'Contact' },
  ];

  return (
    <LPage>
      <LH level={3} sub="ข้อความที่ส่งมาใน #bot-inbox-opms">Discord Inbox</LH>

      {/* Category filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {categories.map((c) => (
          <button
            key={String(c.key)}
            type="button"
            onClick={() => setActiveCategory(c.key)}
            style={{
              padding: '5px 14px',
              borderRadius: '8px 0 8px 0',
              border: `1px solid ${activeCategory === c.key ? colors.green : colors.lineHi}`,
              background: activeCategory === c.key ? colors.green : 'transparent',
              color: activeCategory === c.key ? colors.bg : colors.dimSoft,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCancelled(v => !v)}
          style={{
            marginLeft: 'auto',
            padding: '5px 14px',
            borderRadius: '8px 0 8px 0',
            border: `1px solid ${showCancelled ? colors.dim : colors.line}`,
            background: 'transparent',
            color: showCancelled ? colors.surface : colors.dim,
            fontSize: 11.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {showCancelled ? 'ซ่อน cancelled' : 'แสดง cancelled'}
        </button>
      </div>

      {isLoading && <LNote>กำลังโหลด...</LNote>}
      {error && <LNote>Error: {String(error)}</LNote>}

      {!isLoading && items.length === 0 && (
        <LCard>
          <LNote>ยังไม่มีข้อความใน inbox — ส่งข้อความใน #bot-inbox-opms เพื่อเริ่มต้น</LNote>
        </LCard>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((item) => (
          <InboxCard key={item.id} item={item} activeCategory={activeCategory} showCancelled={showCancelled} />
        ))}
      </div>
    </LPage>
  );
}

function InboxCard({
  item,
  activeCategory,
  showCancelled,
}: {
  item: InboxRow;
  activeCategory: string | null;
  showCancelled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const queryClient = useQueryClient();
  const catMeta = item.detected_category ? CATEGORY_LABELS[item.detected_category] : null;
  const isCancelled = (item.processing_status as string) === 'cancelled';

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['discord-inbox', activeCategory, showCancelled] });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('discord_inbox').delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setShowDeleteConfirm(false);
      invalidate();
    },
  });

  // Cancels (archives) the linked opportunity or contact, then marks inbox as cancelled.
  // Undoes by un-archiving and restoring status to 'done'.
  const cancelMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const now = new Date().toISOString();
      if (isCancelled) {
        if (item.created_opportunity_id) {
          const { error } = await db.from('opportunities').update({ archived_at: null, archived_reason: null }).eq('id', item.created_opportunity_id);
          if (error) throw error;
        }
        if (item.created_contact_id) {
          // Only un-archive if the contact is STILL 'archived' (i.e. our cancel
          // is what set it). Guarding on the current value prevents clobbering a
          // status the user changed manually after cancelling.
          const { error } = await db
            .from('contacts')
            .update({ relationship_status: 'known' })
            .eq('id', item.created_contact_id)
            .eq('relationship_status', 'archived');
          if (error) throw error;
        }
        const { error } = await db.from('discord_inbox').update({ processing_status: 'done' }).eq('id', item.id);
        if (error) throw error;
      } else {
        if (item.created_opportunity_id) {
          const { error } = await db.from('opportunities').update({ archived_at: now, archived_reason: 'ยกเลิกจาก Discord Inbox' }).eq('id', item.created_opportunity_id);
          if (error) throw error;
        }
        if (item.created_contact_id) {
          // 'inactive' is not a valid relationship_status enum value
          // (enum: known | prospect | cold | archived) — use 'archived'
          const { error } = await db.from('contacts').update({ relationship_status: 'archived' }).eq('id', item.created_contact_id);
          if (error) throw error;
        }
        const { error } = await db.from('discord_inbox').update({ processing_status: 'cancelled' }).eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setShowCancelConfirm(false);
      invalidate();
    },
    onError: (e) => {
      // Surface the error so a transaction failure doesn't silently leave state divergent
      const msg = e instanceof Error ? e.message : 'Unknown error';
      window.alert(`Cancel failed: ${msg}`);
    },
  });

  const opmsLink = item.created_opportunity_id
    ? `/inbox/${item.created_opportunity_id}`
    : item.created_contact_id
    ? `/contacts/${item.created_contact_id}`
    : null;

  return (
    <>
      <LCard style={{ opacity: isCancelled ? 0.55 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
              {catMeta && (
                <LChip style={{ background: catMeta.color + '22', color: catMeta.color, border: `1px solid ${catMeta.color}44` }}>
                  {catMeta.label}
                </LChip>
              )}
              <span style={{ fontSize: 11, color: STATUS_COLORS[item.processing_status] ?? colors.dim, fontWeight: 600 }}>
                {item.processing_status}
              </span>
              <span style={{ fontSize: 11, color: colors.dim }}>
                @{item.author_name} · {new Date(item.created_at).toLocaleDateString('th-TH')}
              </span>
            </div>

            {/* AI summary */}
            {item.ai_summary && (
              <p style={{ margin: '0 0 6px', fontSize: 13, color: colors.text, lineHeight: 1.5 }}>
                {item.ai_summary.slice(0, 200)}{item.ai_summary.length > 200 ? '…' : ''}
              </p>
            )}

            {/* Original text preview */}
            {item.original_text && (
              <div
                style={{
                  fontSize: 12,
                  color: colors.dim,
                  background: colors.bgSoft,
                  border: `1px solid ${colors.line}`,
                  borderRadius: '6px 0 6px 0',
                  padding: '6px 10px',
                  marginBottom: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: expanded ? 'none' : 80,
                  overflow: 'hidden',
                }}
              >
                {item.original_text}
              </div>
            )}

            {/* Image thumbnails */}
            {item.attachment_paths.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {item.attachment_paths.map((a, i) => (
                  <DiscordAttachment key={i} storagePath={a.storage_path} filename={a.filename} width={80} height={60} />
                ))}
              </div>
            )}

            {/* Expand / collapse */}
            {(item.original_text?.length ?? 0) > 200 && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                style={{ background: 'none', border: 'none', color: colors.green, cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}
              >
                {expanded ? 'แสดงน้อยลง' : 'แสดงทั้งหมด'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'stretch' }}>
            {opmsLink && (
              <Link to={opmsLink}>
                <LBtn style={{ whiteSpace: 'nowrap', width: '100%' }}>ดูใน OPMS →</LBtn>
              </Link>
            )}
            <button
              type="button"
              onClick={() => isCancelled ? cancelMutation.mutate() : setShowCancelConfirm(true)}
              disabled={cancelMutation.isPending}
              style={{
                background: 'transparent',
                border: `1px solid ${isCancelled ? colors.greenDk : colors.lineHi}`,
                color: isCancelled ? colors.green : colors.dim,
                borderRadius: '8px 0 8px 0',
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                letterSpacing: 0.4,
                opacity: cancelMutation.isPending ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {cancelMutation.isPending ? '…' : isCancelled ? 'คืนสถานะ' : 'ยกเลิก'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                background: 'transparent',
                border: `1px solid #5a1a18`,
                color: '#d96a66',
                borderRadius: '8px 0 8px 0',
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: 0.4,
                whiteSpace: 'nowrap',
              }}
            >
              ลบ
            </button>
          </div>
        </div>
      </LCard>

      {showCancelConfirm && (
        <ConfirmModal
          title="ยกเลิก inbox นี้?"
          body={
            item.created_opportunity_id
              ? 'Archive opportunity นี้ออกจาก inbox และทำเครื่องหมายว่ายกเลิกแล้ว สามารถกู้คืนได้ภายหลัง'
              : item.created_contact_id
              ? 'ตั้งสถานะ contact เป็น inactive และทำเครื่องหมายว่ายกเลิกแล้ว'
              : 'ทำเครื่องหมาย inbox นี้ว่าถูกยกเลิกแล้ว'
          }
          confirmLabel="ยืนยันยกเลิก"
          isLoading={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate()}
          onCancel={() => setShowCancelConfirm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="ลบ inbox นี้?"
          body="ลบบันทึกนี้ถาวร ข้อความต้นฉบับและรูปภาพจะหายไป ไม่สามารถกู้คืนได้"
          confirmLabel="ลบถาวร"
          danger
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
