import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AvatarUploadResult {
  url: string;
  path: string;
}

export function useAvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File, contactId?: string): Promise<AvatarUploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${contactId ?? 'new'}-${Date.now()}.${ext}`;
      const filePath = `contacts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return { url: data.publicUrl, path: filePath };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, error };
}
