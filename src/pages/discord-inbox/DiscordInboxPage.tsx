import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { LPage, LCard, LChip, LH, LNote, LBtn } from '../../components/primitives';
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
};

function useDiscordInbox(category: string | null) {
  return useQuery({
    queryKey: ['discord-inbox', category],
    queryFn: async () => {
      let q = supabase
        .from('discord_inbox')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (category) q = q.eq('detected_category', category);
      const { data, error } = await q;
      if (error) throw error;
      return data as InboxRow[];
    },
    staleTime: 30_000,
  });
}

export function DiscordInboxPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: items = [], isLoading, error } = useDiscordInbox(activeCategory);

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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
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
          <InboxCard key={item.id} item={item} />
        ))}
      </div>
    </LPage>
  );
}

function InboxCard({ item }: { item: InboxRow }) {
  const [expanded, setExpanded] = useState(false);
  const catMeta = item.detected_category ? CATEGORY_LABELS[item.detected_category] : null;

  const opmsLink = item.created_opportunity_id
    ? `/inbox/${item.created_opportunity_id}`
    : item.created_contact_id
    ? `/contacts/${item.created_contact_id}`
    : null;

  const storageBase = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/discord-attachments/`;

  return (
    <LCard>
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
                <a key={i} href={storageBase + a.storage_path} target="_blank" rel="noreferrer">
                  <img
                    src={storageBase + a.storage_path}
                    alt={a.filename}
                    style={{
                      width: 80,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: '6px 0 6px 0',
                      border: `1px solid ${colors.lineHi}`,
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </a>
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

        {/* Action: link to created record */}
        {opmsLink && (
          <Link to={opmsLink}>
            <LBtn style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              ดูใน OPMS →
            </LBtn>
          </Link>
        )}
      </div>
    </LCard>
  );
}
