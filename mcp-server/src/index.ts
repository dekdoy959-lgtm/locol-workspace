#!/usr/bin/env node
/**
 * LOCOL Workspace · MCP Server
 *
 * Stdio MCP server that exposes LOCOL CRUD tools to Claude Desktop / Claude Code.
 * Configure in Claude Desktop config (claude_desktop_config.json):
 *
 *   {
 *     "mcpServers": {
 *       "locol": {
 *         "command": "node",
 *         "args": ["/absolute/path/to/locol-workspace/mcp-server/dist/index.js"],
 *         "env": {
 *           "SUPABASE_URL": "https://xxx.supabase.co",
 *           "SUPABASE_SERVICE_KEY": "sb_secret_..."
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[locol-mcp] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  // ─── Search & list ────
  {
    name: 'search',
    description:
      'Unified search across contacts, organizations, and opportunities. Returns a summary of matching records.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword (substring match, case-insensitive)' },
        types: {
          type: 'array',
          items: { enum: ['contact', 'organization', 'opportunity'] },
          description: 'Which entity types to search. Default: all',
        },
        limit: { type: 'number', default: 20 },
      },
      required: ['query'],
    },
  },

  // ─── Contacts ────
  {
    name: 'list_contacts',
    description: 'List contacts. Optionally filter by tier or tag.',
    inputSchema: {
      type: 'object',
      properties: {
        tier: { type: 'number', enum: [1, 2, 3] },
        tag: { type: 'string' },
        limit: { type: 'number', default: 50 },
      },
    },
  },
  {
    name: 'get_contact',
    description: 'Get a single contact by ID, including all profile fields, notes, milestones, and relations.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'create_contact',
    description:
      'Create a new contact. Required: first_name. Recommended: last_name, nick_name, tier (1=Inner, 2=Active, 3=Wide), channel, and at least one phone/email. Multi-value fields (phones/emails/orgs/etc.) accept arrays of objects.',
    inputSchema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        nick_name: { type: 'string' },
        bio: { type: 'string' },
        birthday: { type: 'string', description: 'YYYY-MM-DD' },
        tier: { type: 'number', enum: [1, 2, 3] },
        tie_type: { type: 'string', enum: ['Strong', 'Bridge', 'Weak'] },
        priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
        channel: { type: 'string', description: 'e.g. Line, Email, Phone' },
        met_story: { type: 'string' },
        value_exchange: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        phones: {
          type: 'array',
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, value: { type: 'string' } },
            required: ['label', 'value'],
          },
        },
        emails: {
          type: 'array',
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, value: { type: 'string' } },
            required: ['label', 'value'],
          },
        },
        orgs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              org_id: { type: 'string', description: 'UUID of existing org, or null if new' },
              org_name: { type: 'string' },
              role: { type: 'string' },
              is_primary: { type: 'boolean' },
              is_current: { type: 'boolean' },
              start_date: { type: 'string', description: 'YYYY-MM-DD' },
              end_date: { type: 'string', description: 'YYYY-MM-DD' },
            },
            required: ['org_name'],
          },
        },
      },
      required: ['first_name'],
    },
  },
  {
    name: 'update_contact',
    description: 'Update an existing contact. Pass only the fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        patch: {
          type: 'object',
          description: 'Partial contact fields to update (same shape as create_contact)',
        },
      },
      required: ['id', 'patch'],
    },
  },
  {
    name: 'delete_contact',
    description: 'Delete a contact by ID. Cascades to all linked notes, milestones, etc. IRREVERSIBLE.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },

  // ─── Organizations ────
  {
    name: 'list_organizations',
    description: 'List all organizations.',
    inputSchema: {
      type: 'object',
      properties: { search: { type: 'string' }, limit: { type: 'number', default: 50 } },
    },
  },
  {
    name: 'get_organization',
    description: 'Get an organization by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'create_organization',
    description: 'Create a new organization.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        industry: { type: 'string' },
        type: { type: 'string', description: 'Company / Startup / NGO / Government / University / Foundation / Media / Other' },
        hq: { type: 'string' },
        size: { type: 'string' },
        founded: { type: 'number' },
        website: { type: 'string' },
        our_tier: { type: 'number', enum: [1, 2, 3] },
        notes: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_organization',
    description: 'Update an organization.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, patch: { type: 'object' } },
      required: ['id', 'patch'],
    },
  },

  // ─── Opportunities ────
  {
    name: 'list_opportunities',
    description: 'List opportunities (default: non-archived).',
    inputSchema: {
      type: 'object',
      properties: {
        track: { type: 'string', enum: ['apply', 'act', 'watch', 'contract', 'event'] },
        stage: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'number', default: 50 },
      },
    },
  },
  {
    name: 'get_opportunity',
    description: 'Get an opportunity by ID, including organizers and attendees.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'create_opportunity',
    description:
      'Create a new opportunity. Required: track, title, stage. Default stages per track — apply: Spotted, act: Captured, watch: New, contract: Lead, event: Spotted.',
    inputSchema: {
      type: 'object',
      properties: {
        track: { type: 'string', enum: ['apply', 'act', 'watch', 'contract', 'event'] },
        title: { type: 'string' },
        stage: { type: 'string' },
        status: { type: 'string', default: 'New' },
        priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
        source_url: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        owner_id: { type: 'string', description: 'team_member UUID' },
        reviewer_id: { type: 'string', description: 'team_member UUID' },
        ai_summary: { type: 'string' },
        details: {
          type: 'object',
          description:
            'Track-specific fields. apply: { sponsor: {org_id, org_name}, ask_amount, currency, eligibility, ... }. event: { event_date_start, location, format, cost, ... }. contract: { counterparty: {org_id, org_name}, contract_value, term_months, renewal_date, ... }',
        },
      },
      required: ['track', 'title', 'stage'],
    },
  },
  {
    name: 'update_opportunity',
    description: 'Update an opportunity (e.g. change stage, mark won/lost, add summary).',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, patch: { type: 'object' } },
      required: ['id', 'patch'],
    },
  },
  {
    name: 'add_opportunity_person',
    description: 'Link a Contact or Org to an Opportunity as organizer or attendee.',
    inputSchema: {
      type: 'object',
      properties: {
        opportunity_id: { type: 'string' },
        contact_id: { type: 'string', description: 'Provide either contact_id or org_id, not both' },
        org_id: { type: 'string' },
        role: { type: 'string', enum: ['organizer', 'attendee'] },
        status: {
          type: 'string',
          enum: ['VVIP', 'Invitee', 'Audience', 'Speaker', 'Sponsor', 'Other'],
          description: 'For attendees only',
        },
        note: { type: 'string' },
      },
      required: ['opportunity_id', 'role'],
    },
  },

  // ─── Notes ────
  {
    name: 'add_note',
    description:
      'Add a note to a contact, organization, or opportunity. Can be a future-dated note with reminder.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['contact', 'org', 'opportunity'] },
        target_id: { type: 'string' },
        text: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD, defaults to today' },
        tags: { type: 'array', items: { type: 'string' } },
        is_future: { type: 'boolean', description: 'Mark as reminder if date is in the future' },
      },
      required: ['scope', 'target_id', 'text'],
    },
  },
  {
    name: 'list_notes',
    description: 'List notes for a contact, org, or opportunity.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['contact', 'org', 'opportunity'] },
        target_id: { type: 'string' },
        limit: { type: 'number', default: 20 },
      },
      required: ['scope', 'target_id'],
    },
  },

  // ─── Milestones ────
  {
    name: 'add_milestone',
    description: 'Add a milestone to a contact. side: them (their goal), us (our goal from them), shared (joint).',
    inputSchema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string' },
        side: { type: 'string', enum: ['them', 'us', 'shared'] },
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
      },
      required: ['contact_id', 'side', 'title'],
    },
  },

  // ─── Relations ────
  {
    name: 'create_relation',
    description: 'Connect two contacts with a relationship type (e.g. introduced-by, coworker, mentor).',
    inputSchema: {
      type: 'object',
      properties: {
        from_contact_id: { type: 'string' },
        to_contact_id: { type: 'string' },
        type: {
          type: 'string',
          description:
            'introduced-by, introduced-to, coworker, co-founder, co-panel, knows-well, family, married-to, mentor, investor, client, vendor, other',
        },
        note: { type: 'string' },
      },
      required: ['from_contact_id', 'to_contact_id', 'type'],
    },
  },

  // ─── Groups ────
  {
    name: 'list_groups',
    description: 'List all groups (with parent_id and cadence).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_group',
    description: 'Create a new group. parent_id for sub-group. cadence_days overrides Tier default.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        parent_id: { type: 'string' },
        cadence_days: { type: 'number' },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_to_group',
    description: 'Add a contact to a group.',
    inputSchema: {
      type: 'object',
      properties: {
        group_id: { type: 'string' },
        contact_id: { type: 'string' },
      },
      required: ['group_id', 'contact_id'],
    },
  },

  // ─── Team ────
  {
    name: 'list_team_members',
    description: 'List all team members (use to pick owner/reviewer for opportunities).',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─── Tool implementations ────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // ─── Search ────
    case 'search': {
      const q = String(args.query ?? '').toLowerCase();
      const types = (args.types as string[] | undefined) ?? ['contact', 'organization', 'opportunity'];
      const limit = Number(args.limit ?? 20);
      const out: Record<string, unknown> = {};

      if (types.includes('contact')) {
        const { data } = await supabase.from('contacts').select('id, first_name, last_name, nick_name, tier').limit(200);
        out.contacts = (data ?? [])
          .filter((c: any) =>
            `${c.first_name} ${c.last_name ?? ''} ${c.nick_name ?? ''}`.toLowerCase().includes(q),
          )
          .slice(0, limit);
      }
      if (types.includes('organization')) {
        const { data } = await supabase.from('organizations').select('id, name, industry, type').limit(200);
        out.organizations = (data ?? [])
          .filter((o: any) => `${o.name} ${o.industry ?? ''}`.toLowerCase().includes(q))
          .slice(0, limit);
      }
      if (types.includes('opportunity')) {
        const { data } = await supabase
          .from('opportunities')
          .select('id, title, track, stage, due_date, priority')
          .is('archived_at', null)
          .limit(200);
        out.opportunities = (data ?? []).filter((o: any) => o.title.toLowerCase().includes(q)).slice(0, limit);
      }

      return out;
    }

    // ─── Contacts ────
    case 'list_contacts': {
      let q = supabase.from('contacts').select('*').limit(Number(args.limit) || 50);
      if (args.tier) q = q.eq('tier', args.tier);
      if (args.tag) q = q.contains('tags', [args.tag]);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
    case 'get_contact': {
      const id = String(args.id);
      const [{ data: contact, error }, { data: notes }, { data: milestones }, { data: relations }] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', id).maybeSingle(),
        supabase.from('notes').select('*').eq('scope', 'contact').eq('target_id', id).order('date', { ascending: false }),
        supabase.from('milestones').select('*').eq('contact_id', id),
        supabase.from('relations').select('*').or(`from_contact_id.eq.${id},to_contact_id.eq.${id}`),
      ]);
      if (error) throw error;
      return { contact, notes, milestones, relations };
    }
    case 'create_contact': {
      const { data, error } = await supabase.from('contacts').insert(args as never).select('*').single();
      if (error) throw error;
      return data;
    }
    case 'update_contact': {
      const { data, error } = await supabase
        .from('contacts')
        .update(args.patch as never)
        .eq('id', args.id as string)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
    case 'delete_contact': {
      const { error } = await supabase.from('contacts').delete().eq('id', args.id as string);
      if (error) throw error;
      return { ok: true };
    }

    // ─── Organizations ────
    case 'list_organizations': {
      let q = supabase.from('organizations').select('*').limit(Number(args.limit) || 50);
      const { data, error } = await q;
      if (error) throw error;
      if (args.search) {
        const s = String(args.search).toLowerCase();
        return (data ?? []).filter((o: any) => o.name.toLowerCase().includes(s));
      }
      return data;
    }
    case 'get_organization': {
      const id = String(args.id);
      const { data, error } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    }
    case 'create_organization': {
      const { data, error } = await supabase.from('organizations').insert(args as never).select('*').single();
      if (error) throw error;
      return data;
    }
    case 'update_organization': {
      const { data, error } = await supabase
        .from('organizations')
        .update(args.patch as never)
        .eq('id', args.id as string)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }

    // ─── Opportunities ────
    case 'list_opportunities': {
      let q = supabase.from('opportunities').select('*').is('archived_at', null).limit(Number(args.limit) || 50);
      if (args.track) q = q.eq('track', args.track);
      if (args.stage) q = q.eq('stage', args.stage);
      if (args.status) q = q.eq('status', args.status);
      const { data, error } = await q.order('last_update_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    case 'get_opportunity': {
      const id = String(args.id);
      const [{ data: opp, error }, { data: people }] = await Promise.all([
        supabase.from('opportunities').select('*').eq('id', id).maybeSingle(),
        supabase.from('opportunity_people').select('*').eq('opportunity_id', id),
      ]);
      if (error) throw error;
      return { ...opp, people };
    }
    case 'create_opportunity': {
      const { data, error } = await supabase.from('opportunities').insert(args as never).select('*').single();
      if (error) throw error;
      return data;
    }
    case 'update_opportunity': {
      const patch = { ...(args.patch as Record<string, unknown>), last_update_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('opportunities')
        .update(patch as never)
        .eq('id', args.id as string)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
    case 'add_opportunity_person': {
      const { data, error } = await supabase
        .from('opportunity_people')
        .insert(args as never)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }

    // ─── Notes ────
    case 'add_note': {
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        scope: args.scope,
        target_id: args.target_id,
        text: args.text,
        date: args.date ?? today,
        tags: args.tags ?? [],
        is_future: args.is_future ?? false,
      };
      const { data, error } = await supabase.from('notes').insert(payload as never).select('*').single();
      if (error) throw error;
      return data;
    }
    case 'list_notes': {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('scope', args.scope as string)
        .eq('target_id', args.target_id as string)
        .order('date', { ascending: false })
        .limit(Number(args.limit) || 20);
      if (error) throw error;
      return data;
    }

    // ─── Milestones ────
    case 'add_milestone': {
      const { data, error } = await supabase.from('milestones').insert(args as never).select('*').single();
      if (error) throw error;
      return data;
    }

    // ─── Relations ────
    case 'create_relation': {
      const { data, error } = await supabase.from('relations').insert(args as never).select('*').single();
      if (error) throw error;
      return data;
    }

    // ─── Groups ────
    case 'list_groups': {
      const { data, error } = await supabase.from('groups').select('*').order('name');
      if (error) throw error;
      return data;
    }
    case 'create_group': {
      const { data, error } = await supabase.from('groups').insert(args as never).select('*').single();
      if (error) throw error;
      return data;
    }
    case 'add_to_group': {
      const { data, error } = await supabase
        .from('group_members')
        .insert({ group_id: args.group_id, contact_id: args.contact_id } as never)
        .select('*')
        .single();
      if (error && error.code !== '23505') throw error;
      return data ?? { ok: true, note: 'already a member' };
    }

    // ─── Team ────
    case 'list_team_members': {
      const { data, error } = await supabase.from('team_members').select('*').order('full_name');
      if (error) throw error;
      return data;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Server boilerplate ──────────────────────────────────────────────────────

const server = new Server(
  { name: 'locol-workspace', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    const result = await callTool(name, args as Record<string, unknown>);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error calling ${name}: ${msg}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Stderr logging only (stdout is reserved for MCP protocol)
console.error('[locol-mcp] Server ready · tools:', TOOLS.length);
