-- The professional account type belongs with the check: a Creator account can
-- have a perfect webhook subscription and still be unable to use the messaging
-- API, which looks identical to "Meta never sent anything".

alter table public.account_checks add column account_type text;
