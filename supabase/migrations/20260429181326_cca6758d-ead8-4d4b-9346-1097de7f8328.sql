ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'guided_flow_started';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'highest_risk_cta_clicked';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'account_detail_opened_from_guided_flow';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'outreach_modal_opened_from_guided_flow';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'outreach_sent_from_guided_flow';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'guided_flow_exited';