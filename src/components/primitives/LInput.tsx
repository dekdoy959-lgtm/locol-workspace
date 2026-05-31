import type { CSSProperties, ChangeEvent, InputHTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

interface LInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'style'> {
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
}

export function LInput({ value, onChange, style = {}, ...rest }: LInputProps) {
  // Ensure an accessible name even when no <label htmlFor> is wired: fall back
  // to the placeholder. Skipped when an id / aria-labelledby is set (assumed
  // already associated) so we never override a real label.
  const ariaLabel =
    rest['aria-label'] ?? (rest.id || rest['aria-labelledby'] ? undefined : rest.placeholder);
  return (
    <input
      {...rest}
      aria-label={ariaLabel}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: colors.bgSoft,
        color: colors.text,
        border: `1px solid ${colors.lineHi}`,
        borderRadius: '10px 0 10px 0',
        padding: '9px 12px',
        fontSize: 13.5,
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 150ms ease-out',
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = colors.green;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = colors.lineHi;
      }}
    />
  );
}
