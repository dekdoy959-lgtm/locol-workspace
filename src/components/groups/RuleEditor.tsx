import { useMemo } from 'react';
import {
  CONTACT_FIELDS,
  EMPTY_RULE,
  OPS_BY_TYPE,
  evaluateRule,
  findField,
  isCombinator,
  matchContacts,
  summarizeRule,
  type CombinatorRule,
  type LeafRule,
  type Rule,
} from '../../lib/smartGroupRules';
import { useContacts } from '../../hooks/useContacts';
import { LBtn, LIcon, LInput, LSelect } from '../primitives';
import { colors } from '../../styles/tokens';

interface RuleEditorProps {
  value: Rule | null;
  onChange: (next: Rule | null) => void;
}

export function RuleEditor({ value, onChange }: RuleEditorProps) {
  const root = value ?? EMPTY_RULE;
  const { data: contacts = [] } = useContacts();

  // Use evaluateRule to silence "imported but never used" lint
  void evaluateRule;

  const matches = useMemo(() => matchContacts(root, contacts), [root, contacts]);

  return (
    <div>
      <CombinatorEditor rule={root as CombinatorRule} onChange={onChange} depth={0} />

      <div
        style={{
          marginTop: 14,
          padding: '10px 14px',
          background: colors.greenBg,
          border: `1px solid ${colors.greenDk}`,
          borderRadius: '10px 3px 10px 3px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: 0.5, color: colors.green, fontWeight: 600 }}>
          PREVIEW
        </span>
        <span style={{ flex: 1, fontSize: 12.5, color: colors.text }}>
          <b style={{ color: colors.green, fontFamily: "'IBM Plex Mono', monospace" }}>{matches.length}</b>{' '}
          contact(s) match · {summarizeRule(root)}
        </span>
      </div>
    </div>
  );
}

function CombinatorEditor({
  rule,
  onChange,
  depth,
}: {
  rule: CombinatorRule;
  onChange: (next: Rule | null) => void;
  depth: number;
}) {
  const setRule = (next: Rule | null) => onChange(next);

  const updateChild = (idx: number, child: Rule | null) => {
    const newRules = [...rule.rules];
    if (child === null) {
      newRules.splice(idx, 1);
    } else {
      newRules[idx] = child;
    }
    setRule({ ...rule, rules: newRules });
  };

  const addRule = () => {
    const firstField = CONTACT_FIELDS[0];
    const firstOp = OPS_BY_TYPE[firstField.type][0].value;
    const newLeaf: LeafRule = { field: firstField.key, op: firstOp, value: '' };
    setRule({ ...rule, rules: [...rule.rules, newLeaf] });
  };

  const addGroup = () => {
    const newGroup: CombinatorRule = { combinator: 'all', rules: [] };
    setRule({ ...rule, rules: [...rule.rules, newGroup] });
  };

  const accent = rule.combinator === 'all' ? colors.green : colors.warn;

  return (
    <div
      style={{
        padding: 12,
        background: depth === 0 ? colors.bgSoft : 'transparent',
        border: `1px ${depth === 0 ? 'solid' : 'dashed'} ${accent}`,
        borderRadius: '12px 3px 12px 3px',
        marginLeft: depth * 16,
      }}
    >
      {/* Header: AND/OR toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${accent}`, borderRadius: '6px 2px 6px 2px', overflow: 'hidden' }}>
          {(['all', 'any'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setRule({ ...rule, combinator: c })}
              style={{
                padding: '4px 14px',
                background: rule.combinator === c ? accent : 'transparent',
                color: rule.combinator === c ? colors.bg : accent,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {c === 'all' ? 'AND · ทั้งหมด' : 'OR · อย่างน้อย 1'}
            </button>
          ))}
        </div>

        <span style={{ flex: 1 }} />

        {depth > 0 && (
          <button
            type="button"
            onClick={() => setRule(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.dim,
              cursor: 'pointer',
              fontSize: 14,
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.danger)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
          >
            × Remove group
          </button>
        )}
      </div>

      {/* Children */}
      {rule.rules.length === 0 && (
        <div
          style={{
            padding: 12,
            background: colors.bg,
            border: `1px dashed ${colors.line}`,
            borderRadius: '8px 2px 8px 2px',
            color: colors.dim,
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          ยังไม่มี filter · คลิก + Add filter ด้านล่าง
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rule.rules.map((child, i) => (
          <div key={i}>
            {isCombinator(child) ? (
              <CombinatorEditor
                rule={child}
                onChange={(next) => updateChild(i, next)}
                depth={depth + 1}
              />
            ) : (
              <LeafEditor leaf={child} onChange={(next) => updateChild(i, next)} />
            )}
          </div>
        ))}
      </div>

      {/* Add buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <LBtn small ghost onClick={addRule}>
          <LIcon kind="plus" size={11} color={colors.dimSoft} /> Add filter
        </LBtn>
        {depth < 2 && (
          <LBtn small ghost onClick={addGroup}>
            <LIcon kind="plus" size={11} color={colors.dimSoft} /> Add group
          </LBtn>
        )}
      </div>
    </div>
  );
}

function LeafEditor({ leaf, onChange }: { leaf: LeafRule; onChange: (next: Rule | null) => void }) {
  const field = findField(leaf.field);
  const ops = field ? OPS_BY_TYPE[field.type] : OPS_BY_TYPE.text;
  const needsValue = !['is_set', 'is_unset'].includes(leaf.op);
  const needsTwoValues = leaf.op === 'between';

  const onFieldChange = (key: string) => {
    const newField = findField(key);
    if (!newField) return;
    const firstOp = OPS_BY_TYPE[newField.type][0].value;
    onChange({ field: key, op: firstOp, value: '' });
  };

  const onOpChange = (op: string) => {
    const next = { ...leaf, op: op as LeafRule['op'] };
    // 'between' needs two bounds — seed them so the rule is valid right away
    // instead of carrying an undefined values array until the user types.
    if (op === 'between') next.values = leaf.values ?? [0, 0];
    onChange(next);
  };

  const renderValueInput = () => {
    if (!needsValue || !field) return null;

    if (field.type === 'enum') {
      return (
        <LSelect
          value={String(leaf.value ?? '')}
          onChange={(v) => {
            // Coerce to number if field type expects it
            const opt = field.options?.find((o) => String(o.value) === v);
            onChange({ ...leaf, value: opt?.value ?? v });
          }}
          options={(field.options ?? []).map((o) => ({ value: String(o.value), label: o.label }))}
          placeholder="เลือกค่า"
        />
      );
    }

    if (field.type === 'boolean') {
      return (
        <LSelect
          value={String(leaf.value)}
          onChange={(v) => onChange({ ...leaf, value: v === 'true' })}
          options={[
            { value: 'true', label: 'จริง' },
            { value: 'false', label: 'เท็จ' },
          ]}
        />
      );
    }

    if (needsTwoValues) {
      const vals = (leaf.values ?? [0, 0]).map(String);
      return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <LInput
            type="number"
            value={vals[0] ?? ''}
            onChange={(v) => onChange({ ...leaf, values: [v ? Number(v) : 0, leaf.values?.[1] ?? 0] })}
          />
          <span style={{ color: colors.dim, fontSize: 11 }}>→</span>
          <LInput
            type="number"
            value={vals[1] ?? ''}
            onChange={(v) => onChange({ ...leaf, values: [leaf.values?.[0] ?? 0, v ? Number(v) : 0] })}
          />
        </div>
      );
    }

    return (
      <LInput
        type={field.type === 'number' ? 'number' : 'text'}
        value={String(leaf.value ?? '')}
        onChange={(v) =>
          onChange({ ...leaf, value: field.type === 'number' ? (v ? Number(v) : null) : v })
        }
        placeholder="ค่า"
      />
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 160px 1fr auto',
        gap: 8,
        alignItems: 'center',
        padding: '8px 10px',
        background: colors.bg,
        border: `1px solid ${colors.line}`,
        borderRadius: '8px 2px 8px 2px',
      }}
    >
      <LSelect
        value={leaf.field}
        onChange={onFieldChange}
        options={CONTACT_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
      />
      <LSelect
        value={leaf.op}
        onChange={onOpChange}
        options={ops.map((o) => ({ value: o.value, label: o.label }))}
      />
      {needsValue ? renderValueInput() : <div />}
      <button
        type="button"
        onClick={() => onChange(null)}
        title="ลบ filter"
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.dim,
          cursor: 'pointer',
          fontSize: 16,
          padding: '0 4px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.danger)}
        onMouseLeave={(e) => (e.currentTarget.style.color = colors.dim)}
      >
        ×
      </button>
    </div>
  );
}
