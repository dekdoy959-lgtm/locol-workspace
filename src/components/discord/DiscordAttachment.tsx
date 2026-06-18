/**
 * Renders a single Discord attachment thumbnail (linked to the full image).
 *
 * The 'discord-attachments' bucket is PRIVATE — we resolve a short-lived
 * signed URL per attachment instead of a public URL. The signing call runs
 * under the user's JWT, so it requires the authenticated SELECT policy on
 * storage.objects (migration 0018).
 *
 * Failure handling: if signing fails or the image errors, the whole anchor
 * is removed (returns null) rather than leaving a dangling empty <a>.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { colors } from '../../styles/tokens';

const BUCKET = 'discord-attachments';
const SIGNED_TTL_SEC = 60 * 60; // 1 hour

interface Props {
  storagePath: string;
  filename: string;
  width?: number;
  height?: number;
}

export function DiscordAttachment({ storagePath, filename, width = 100, height = 72 }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!storagePath || typeof storagePath !== 'string') {
      setFailed(true);
      return;
    }
    let active = true;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_TTL_SEC)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.signedUrl) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [storagePath]);

  const box = {
    width,
    height,
    borderRadius: '6px 2px 6px 2px',
    border: `1px solid ${colors.lineHi}`,
  } as const;

  if (failed) return null;
  // Placeholder while the signed URL resolves (avoids layout shift).
  if (!url) return <div style={{ ...box, background: colors.bgCard }} />;

  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img
        src={url}
        alt={filename}
        style={{ ...box, objectFit: 'cover' }}
        onError={() => setFailed(true)}
      />
    </a>
  );
}
