-- Per-track opportunity details (jsonb for flexibility)
-- Different tracks store different fields:
--   apply:    { sponsor, ask_amount, currency, eligibility, submission_url, required_docs }
--   act:      { action_type, to_whom, artefact_link }
--   watch:    { category, takeaway }
--   contract: { counterparty, contract_value, currency, term_months, renewal_date }
--   event:    { event_date, event_time, location, format, cost, currency, capacity }

alter table public.opportunities
  add column if not exists details jsonb not null default '{}';
