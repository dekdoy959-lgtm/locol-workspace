import type { CSSProperties, ChangeEvent, InputHTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

interface LInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'style'> {
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
}

export function LInput({ value, onChange, style = {}, ...rest }: LInputProps) {
  return (
    <input
      {...rest}
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
