create or replace view public.v_latest_cleanup_scores as
select distinct on (account_id, window_days)
  account_id,
  window_days,
  comments_last_30_days,
  repeated_comments,
  recency_score,
  inactivity_penalty,
  interaction_score,
  bucket,
  calculated_at
from public.account_scores
order by account_id, window_days, calculated_at desc;

create or replace view public.v_daily_top_recommendations as
select
  r.*,
  a.username,
  a.full_name,
  a.category
from public.recommendations r
join public.accounts a on a.id = r.account_id
where r.rank <= 50;

comment on view public.v_latest_cleanup_scores is 'Latest interaction score snapshot per account/window.';
comment on view public.v_daily_top_recommendations is 'Top 50 daily recommendations joined with account metadata.';
