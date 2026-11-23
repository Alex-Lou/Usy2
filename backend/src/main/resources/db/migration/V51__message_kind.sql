-- A message can be a small event of the conversation instead of something
-- written: null for a usual message, 'thinking' for « … pense à toi 💭 »
-- (sent from the « Je pense à toi » button, shown as a little cloud).
alter table message add column kind varchar(16);
