import type { CSSProperties, ChangeEvent, TextareaHTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

interface LTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value' | 'style'> {
  value: string;
  onChange: (value: string) => void;
  style?: CSSProperties;
}

export function LTextarea({ value, onChange, style = {}, rows = 3, ...rest }: LTextareaProps) {
  const ariaLabel =
    rest['aria-label'] ?? (rest.id || rest['aria-labelledby'] ? undefined : rest.placeholder);
  return (
    <textarea
      {...rest}
      aria-label={ariaLabel}
      rows={rows}
      value={value}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
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
        resize: 'vertical',
        lineHeight: 1.45,
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
