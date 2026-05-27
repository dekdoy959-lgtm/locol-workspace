import { LCard, LH, LNote } from '../components/primitives';
import { colors } from '../styles/tokens';

interface PlaceholderProps {
  title: string;
  description?: string;
  phase?: string;
}

export function Placeholder({ title, description, phase = 'Phase 2' }: PlaceholderProps) {
  return (
    <div style={{ padding: 40, maxWidth: 880 }}>
      <LCard padding={32}>
        <div style={{ marginBottom: 14 }}>
          <LNote>{phase}</LNote>
        </div>
        <LH level={2}>{title}</LH>
        <p
          style={{
            fontSize: 14,
            color: colors.dimSoft,
            lineHeight: 1.6,
            marginTop: 6,
          }}
        >
          {description ?? 'หน้านี้ยังไม่ได้ implement — จะมาใน Phase ถัดไป'}
        </p>
      </LCard>
    </div>
  );
}
