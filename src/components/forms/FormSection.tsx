import type { ReactNode } from 'react';
import { colors } from '../../styles/tokens';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section
      style={{
        padding: '24px 0',
        borderTop: `1px solid ${colors.line}`,
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h3
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: colors.green,
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 12,
              color: colors.dimSoft,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}
