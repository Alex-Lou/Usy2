-- "Log out all my devices": connections (JWTs) issued before this instant are refused.
alter table app_user add column tokens_valid_after timestamptz;
