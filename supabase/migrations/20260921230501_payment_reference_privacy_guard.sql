-- Apply the same credential guard to both optional payment text fields.
-- Payment references are processor transaction IDs, never card/bank credentials.
alter table public.work_order_payments add constraint payments_no_credential_text
  check ((coalesce(payment_reference,'') || ' ' || coalesce(note,'')) !~*
    '(cvv|cvc|password|routing[[:space:]]+number|account[[:space:]]+number|security[[:space:]]+code|card[[:space:]]+pin)');
