import { LInput, LSelect } from '../primitives';
import { FREQ_UNIT_OPTIONS, type FreqUnit, freqToDays, daysToFreq } from '../../types/contact';
import { colors } from '../../styles/tokens';

interface FrequencyFieldProps {
  freqDays: number | null;
  freqUnit: FreqUnit | null;
  onChange: (freqDays: number | null, freqUnit: FreqUnit | null) => void;
}

export function FrequencyField({ freqDays, freqUnit, onChange }: FrequencyFieldProps) {
  const unit: FreqUnit = freqUnit ?? 'months';
  const displayValue = freqDays ? String(daysToFreq(freqDays, unit)) : '';

  const handleValueChange = (raw: string) => {
    const num = raw.trim() === '' ? null : Number(raw);
    if (num === null) {
      onChange(null, unit);
    } else if (!Number.isNaN(num) && num > 0) {
      onChange(freqToDays(num, unit), unit);
    }
  };

  const handleUnitChange = (newUnit: string) => {
    const u = newUnit as FreqUnit;
    if (freqDays) {
      const numInOldUnit = daysToFreq(freqDays, unit);
      onChange(freqToDays(numInOldUnit, u), u);
    } else {
      onChange(null, u);
    }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
        <LInput
          type="number"
          value={displayValue}
          onChange={handleValueChange}
          placeholder="0"
        />
        <LSelect value={unit} onChange={handleUnitChange} options={FREQ_UNIT_OPTIONS} />
      </div>
      {freqDays && (
        <div style={{ fontSize: 11, color: colors.dim, marginTop: 6, letterSpacing: 0.3 }}>
          = ทุก ~{freqDays} วัน
        </div>
      )}
    </div>
  );
}
