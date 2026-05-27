import type { CSSProperties, ChangeEvent, SelectHTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

interface SelectOption {
  value: string;
  label: string;
}

interface LSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'style'> {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  style?: CSSProperties;
}

export function LSelect({ value, onChange, options, placeholder, style = {}, ...rest }: LSelectProps) {
  return (
    <select
      {...rest}
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: colors.bgSoft,
        color: value ? colors.text : colors.dim,
        border: `1px solid ${colors.lineHi}`,
        borderRadius: '10px 0 10px 0',
        padding: '9px 12px',
        fontSize: 13.5,
        fontFamily: 'inherit',
        outline: 'none',
        appearance: 'none',
        cursor: 'pointer',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 14 14'%3E%3Cpath d='M2,5 H8 V12' stroke='%23747474' stroke-width='1.5' fill='none'/%3E%3Cpath d='M5,9 L8,12 L11,9' stroke='%23747474' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: 32,
        ...style,
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ background: colors.bgCard, color: colors.text }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
