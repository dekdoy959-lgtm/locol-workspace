import { useRef, type ReactNode } from 'react';
import { LBtn, LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface MultiValueFieldProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  emptyItem: T;
  renderItem: (item: T, index: number, update: (next: T) => void) => ReactNode;
  addLabel: string;
}

export function MultiValueField<T>({ items, onChange, emptyItem, renderItem, addLabel }: MultiValueFieldProps<T>) {
  // Stable per-row keys. Using the array index as the React key remounts the
  // input on every add/remove, which drops focus mid-composition and breaks
  // Thai IME typing. Keep a key list aligned with items through add/remove.
  const keysRef = useRef<string[]>(items.map(() => crypto.randomUUID()));
  if (keysRef.current.length !== items.length) {
    keysRef.current = items.map((_, i) => keysRef.current[i] ?? crypto.randomUUID());
  }

  const handleUpdate = (index: number, next: T) => {
    const updated = [...items];
    updated[index] = next;
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    keysRef.current.splice(index, 1);
    onChange(items.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    keysRef.current.push(crypto.randomUUID());
    onChange([...items, structuredClone(emptyItem)]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={keysRef.current[i]}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: 10,
            background: colors.bgSoft,
            border: `1px solid ${colors.line}`,
            borderRadius: '12px 3px 12px 3px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item, i, (next) => handleUpdate(i, next))}</div>
          <button
            type="button"
            onClick={() => handleRemove(i)}
            title="ลบ"
            style={{
              background: 'transparent',
              border: `1px solid ${colors.lineHi}`,
              color: colors.dimSoft,
              borderRadius: '6px 2px 6px 2px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            ลบ
          </button>
        </div>
      ))}
      <div>
        <LBtn ghost small onClick={handleAdd}>
          <LIcon kind="plus" size={11} color={colors.dimSoft} />
          {addLabel}
        </LBtn>
      </div>
    </div>
  );
}
