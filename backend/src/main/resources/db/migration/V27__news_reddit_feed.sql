-- "Actus": the private link of my Reddit home feed, sealed (AES-GCM) by the server.
alter table app_user add column news_reddit_feed text;
