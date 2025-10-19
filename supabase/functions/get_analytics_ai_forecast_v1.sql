-- ✅ v2025.11K – AI Forecast Merge
drop function if exists mplan.get_analytics_ai_forecast_v1();

create or replace function mplan.get_analytics_ai_forecast_v1()
returns table (
  kategori text,
  base_month date,
  predicted_month date,
  predicted_revenue numeric,
  actual_revenue numeric,
  deviation numeric,
  accuracy_percent numeric,
  status text
)
language sql as $$
with forecast as (
  select * from mplan.get_analytics_forecast_v1()
),
actual as (
  select
    c.kategori,
    date_trunc('month', u.update_date)::date as month,
    sum(coalesce(r.revenue_amount,0)) as total_revenue
  from mplan.updates u
  join mplan.companies c using (company_code)
  left join mplan.revenue_logs r
    on r.company_code = u.company_code
    and r.revenue_month = date_trunc('month', u.update_date)::date
  group by c.kategori, date_trunc('month', u.update_date)::date
)
select
  f.kategori,
  f.base_month,
  f.predicted_month,
  f.predicted_revenue,
  a.total_revenue as actual_revenue,
  (a.total_revenue - f.predicted_revenue) as deviation,
  round(100 - abs((a.total_revenue - f.predicted_revenue) / nullif(a.total_revenue,0) * 100),2) as accuracy_percent,
  case
    when abs((a.total_revenue - f.predicted_revenue) / nullif(a.total_revenue,0)) > 0.2 then 'ANOMALY'
    else 'NORMAL'
  end as status
from forecast f
left join actual a
  on a.kategori = f.kategori
  and a.month = f.predicted_month
order by kategori, predicted_month;
$$;
