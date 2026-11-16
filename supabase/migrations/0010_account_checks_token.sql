-- What Meta reports about the stored token: which app minted it and which scopes
-- it really carries. A webhook that never arrives is often a token from a
-- different app than the one whose callback is configured.
alter table public.account_checks add column if not exists token_app_id text;
alter table public.account_checks add column if not exists token_scopes text[];
alter table public.account_checks add column if not exists token_valid boolean;
