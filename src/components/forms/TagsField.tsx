import { useMemo, useState, type KeyboardEvent } from 'react';
import { useAllTags } from '../../hooks/useAllTags';
import { LIcon } from '../primitives';
import { colors } from '../../styles/tokens';

interface TagsFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagsField({ value, onChange, placeholder = 'พิมพ์เพื่อค้นหา หรือ Enter เพื่อเพิ่มใหม่' }: TagsFieldProps) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const { data: allTags = [] } = useAllTags();

  const lowerCaseValue = useMemo(() => value.map((t) => t.toLowerCase()), [value]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) {
      return allTags.filter((t) => !lowerCaseValue.includes(t.toLowerCase())).slice(0, 20);
    }
    return allTags
      .filter((t) => t.toLowerCase().includes(q) && !lowerCaseValue.includes(t.toLowerCase()))
      .slice(0, 20);
  }, [allTags, input, lowerCaseValue]);

  const canCreateNew =
    input.trim().length > 0 &&
    !allTags.some((t) => t.toLowerCase() === input.trim().toLowerCase()) &&
    !lowerCaseValue.includes(input.trim().toLowerCase());

  const addTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    if (lowerCaseValue.includes(clean.toLowerCase())) return;
    onChange([...value, clean]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          background: colors.bgSoft,
          border: `1px solid ${focused ? colors.green : colors.lineHi}`,
          borderRadius: '10px 0 10px 0',
          padding: '6px 8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          minHeight: 38,
          transition: 'border-color 150ms ease-out',
        }}
      >
        {value.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              background: colors.greenBg,
              border: `1px solid ${colors.greenDk}`,
              color: colors.green,
              borderRadius: '6px 0 6px 0',
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.green,
                cursor: 'pointer',
                padding: 0,
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={value.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: 140,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: colors.text,
            fontSize: 13,
            fontFamily: 'inherit',
            padding: '4px',
          }}
        />
      </div>

      {focused && (suggestions.length > 0 || canCreateNew) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: colors.bgCard,
            border: `1px solid ${colors.lineHi}`,
            borderRadius: '10px 0 10px 0',
            maxHeight: 240,
            overflowY: 'auto',
            zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {canCreateNew && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(input);
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: colors.greenBg,
                border: 'none',
                color: colors.green,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: suggestions.length > 0 ? `1px solid ${colors.line}` : 'none',
              }}
            >
              <LIcon kind="plus" size={11} color={colors.green} />
              <span>สร้าง tag ใหม่: <b>#{input.trim()}</b></span>
            </button>
          )}
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(tag);
              }}
              style={{
                width: '100%',
                padding: '8px 14px',
                background: 'transparent',
                border: 'none',
                color: colors.surface,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: 12.5,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = colors.bgSoft)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
