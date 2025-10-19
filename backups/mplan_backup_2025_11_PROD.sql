


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "mplan";


ALTER SCHEMA "mplan" OWNER TO "postgres";


CREATE TYPE "mplan"."email_send_status" AS ENUM (
    'queued',
    'sent',
    'failed',
    'cancelled'
);


ALTER TYPE "mplan"."email_send_status" OWNER TO "postgres";


CREATE TYPE "mplan"."email_template_key" AS ENUM (
    'EMOL',
    'EMFO',
    'EMFO_MONTHLY'
);


ALTER TYPE "mplan"."email_template_key" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."add_business_days"("start_date" "date", "add_days" integer) RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
declare
  result timestamp := start_date::timestamp;
  added integer := 0;
begin
  if add_days is null or add_days <= 0 then
    return start_date;
  end if;

  while added < add_days loop
    result := result + interval '1 day';
    -- isodow: 1..5 = Mon..Fri. skip Sat(6) & Sun(7)
    if extract(isodow from result) < 6 then
      added := added + 1;
    end if;
  end loop;

  return result::date;
end;
$$;


ALTER FUNCTION "mplan"."add_business_days"("start_date" "date", "add_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."auto_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_email TEXT;
BEGIN
  -- Ambil email user dari JWT Supabase Auth
  current_email := current_setting('request.jwt.claim.email', true);

  -- Kalau INSERT, isi created_by & updated_by
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := current_email;
    END IF;
    NEW.updated_by := current_email;
  END IF;

  -- Kalau UPDATE, isi updated_by
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by := current_email;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "mplan"."auto_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."auto_promote_staging"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform mplan.promote_staging_all();
  return null;
end;
$$;


ALTER FUNCTION "mplan"."auto_promote_staging"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."auto_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    NEW.created_by := COALESCE(
      NEW.created_by,
      (current_setting('request.jwt.claims', true)::jsonb->>'email'),
      'SYSTEM'
    );
    NEW.updated_by := COALESCE(
      NEW.updated_by,
      (current_setting('request.jwt.claims', true)::jsonb->>'email'),
      'SYSTEM'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    NEW.updated_by := COALESCE(
      (current_setting('request.jwt.claims', true)::jsonb->>'email'),
      'SYSTEM'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "mplan"."auto_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."autocreate_emol_on_tele"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare 
  comp record;
begin
  -- hanya jalan kalau status = TELE
  if upper(new.status) <> 'TELE' then 
    return new; 
  end if;

  -- ambil data perusahaan berdasarkan company_code (FIX)
  select * into comp 
  from mplan.companies c 
  where c.company_code = new.company_code 
  limit 1;

  -- kalau perusahaan gak punya email, stop
  if coalesce(comp.pic_email,'') = '' then 
    return new; 
  end if;

  -- auto-insert status EMOL baru
  insert into mplan.updates (company_code, status, update_date, update_notes)
  values (new.company_code, 'EMOL', now(), 'Auto from TELE (email available)');

  return new;
end;
$$;


ALTER FUNCTION "mplan"."autocreate_emol_on_tele"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."delete_view_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  delete from mplan.updates where update_id = old.update_id;

  insert into mplan.activity_log (action, table_name, record_id, detail, changed_by)
  values ('DELETE', 'updates_with_timeline_editable_v3', old.update_id, to_jsonb(old), auth.uid());

  return old;
end;
$$;


ALTER FUNCTION "mplan"."delete_view_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."enqueue_scheduled_posts"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into mplan.publish_jobs (post_id, run_at)
  select id, now()
  from mplan.social_posts
  where status = 'scheduled'
  and not exists (
    select 1 from mplan.publish_jobs j where j.post_id = mplan.social_posts.id and j.status = 'pending'
  );
end;
$$;


ALTER FUNCTION "mplan"."enqueue_scheduled_posts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."fn_auto_publish_log_detail"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Tambahkan log START
  insert into mplan.publish_logs_detail(log_id, step, level, message)
  values (
    new.id,  -- UUID
    'start',
    'info',
    format(
      'Publish %s → akun %s (%s) dimulai dengan status awal: %s',
      new.platform,
      coalesce(new.account_name, '-'),
      coalesce(new.account_id, '-'),
      coalesce(new.status, 'scheduled')
    )
  );

  -- Kalau status langsung success/failed → auto buat log END
  if new.status in ('success', 'failed') then
    insert into mplan.publish_logs_detail(log_id, step, level, message)
    values (
      new.id,
      'end',
      case when new.status = 'success' then 'info' else 'error' end,
      format(
        'Publish %s untuk akun %s selesai dengan status: %s. Pesan: %s',
        new.platform,
        coalesce(new.account_name, '-'),
        new.status,
        coalesce(new.message, '-')
      )
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "mplan"."fn_auto_publish_log_detail"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."generate_company_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.company_code is null or new.company_code = '' then
    new.company_code := 'C' || lpad(nextval('mplan.company_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "mplan"."generate_company_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_ai_forecast_v1"() RETURNS TABLE("kategori" "text", "predicted_month" "date", "predicted_revenue" numeric, "actual_revenue" numeric, "deviation" numeric, "accuracy_percent" numeric, "status" "text")
    LANGUAGE "sql"
    AS $$
with forecast as (
  select
    kategori,
    predicted_month,
    predicted_revenue
  from mplan.get_analytics_forecast_v1()
),
actual as (
  select
    c.kategori,
    date_trunc('month', u.update_date)::date as actual_month,
    sum(coalesce(r.revenue_amount, 0)) as actual_revenue
  from mplan.updates u
  join mplan.companies c using (company_code)
  left join mplan.revenue_logs r
    on r.company_code = u.company_code
    and r.revenue_month = date_trunc('month', u.update_date)::date
  group by c.kategori, date_trunc('month', u.update_date)::date
)
select
  f.kategori,
  f.predicted_month,
  f.predicted_revenue,
  a.actual_revenue,
  (a.actual_revenue - f.predicted_revenue) as deviation,
  case
    when f.predicted_revenue = 0 then null
    else round(100 * (1 - abs(a.actual_revenue - f.predicted_revenue) / f.predicted_revenue), 2)
  end as accuracy_percent,
  case
    when abs(a.actual_revenue - f.predicted_revenue) > 0.2 * f.predicted_revenue then 'ANOMALY'
    else 'OK'
  end as status
from forecast f
left join actual a
  on f.kategori = a.kategori
  and f.predicted_month = a.actual_month
order by f.kategori, f.predicted_month;
$$;


ALTER FUNCTION "mplan"."get_analytics_ai_forecast_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_forecast_v1"() RETURNS TABLE("kategori" "text", "base_month" "date", "predicted_month" "date", "predicted_revenue" numeric, "trend" "text")
    LANGUAGE "sql"
    AS $$
with base as (
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
),
ma as (
  select
    kategori,
    month as base_month,
    avg(total_revenue)
      over (partition by kategori order by month
            rows between 2 preceding and current row) as ma3
  from base
),
lagged as (
  select
    kategori,
    base_month,
    ma3,
    lag(ma3) over (partition by kategori order by base_month) as prev_ma3
  from ma
),
trend_calc as (
  select
    kategori,
    max(base_month) as base_month,
    (max(base_month) + interval '1 month')::date as predicted_month,
    round(avg(ma3),0) as predicted_revenue,
    case
      when avg(ma3) > avg(prev_ma3) then 'UP'
      when avg(ma3) < avg(prev_ma3) then 'DOWN'
      else 'STABLE'
    end as trend
  from lagged
  group by kategori
)
select * from trend_calc
union all
select
  kategori,
  max(base_month),
  (max(base_month) + interval '2 month')::date,
  round(avg(ma3),0),
  'FORECAST'
from ma
group by kategori
union all
select
  kategori,
  max(base_month),
  (max(base_month) + interval '3 month')::date,
  round(avg(ma3),0),
  'FORECAST'
from ma
group by kategori
order by kategori, predicted_month;
$$;


ALTER FUNCTION "mplan"."get_analytics_forecast_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_growth_v1"() RETURNS TABLE("kategori" "text", "update_month" "date", "total_revenue" numeric, "prev_month_revenue" numeric, "growth_percent" numeric)
    LANGUAGE "sql"
    AS $$
  with base as (
    select
      c.kategori,
      date_trunc('month', u.update_date)::date as update_month,
      sum(coalesce(r.revenue_amount,0)) as total_revenue
    from mplan.updates u
    join mplan.companies c using (company_code)
    left join mplan.revenue_logs r 
      on r.company_code = u.company_code
      and r.revenue_month = date_trunc('month', u.update_date)::date
    group by c.kategori, date_trunc('month', u.update_date)::date
  ),
  with_prev as (
    select
      b.kategori,
      b.update_month,
      b.total_revenue,
      lag(b.total_revenue) over (partition by b.kategori order by b.update_month) as prev_month_revenue
    from base b
  )
  select
    kategori,
    update_month,
    total_revenue,
    prev_month_revenue,
    round(
      case 
        when prev_month_revenue = 0 or prev_month_revenue is null then null
        else ((total_revenue - prev_month_revenue) / prev_month_revenue) * 100
      end, 2
    ) as growth_percent
  from with_prev
  order by kategori, update_month;
$$;


ALTER FUNCTION "mplan"."get_analytics_growth_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_section_v1"("section" "text", "date_start" "date", "date_end" "date", "kategori_filter" "text") RETURNS TABLE("label" "text", "value" numeric)
    LANGUAGE "sql"
    AS $$
select 'Sample'::text as label, 10::numeric as value;
$$;


ALTER FUNCTION "mplan"."get_analytics_section_v1"("section" "text", "date_start" "date", "date_end" "date", "kategori_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_section_v2"("p_section" "text" DEFAULT 'summary'::"text", "p_date_start" "date" DEFAULT NULL::"date", "p_date_end" "date" DEFAULT NULL::"date", "p_kategori" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text") RETURNS TABLE("kategori" "text", "status" "text", "update_month" "date", "total_updates" bigint, "avg_duration" numeric, "total_revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    c.kategori,
    u.status,
    date_trunc('month', u.update_date)::date as update_month,
    count(*) as total_updates,
    round(avg(extract(epoch from (u.next_date - u.update_date)) / 86400), 2) as avg_duration,  -- 🧩 FIX: ubah interval → hari (numeric)
    sum(coalesce(r.revenue_amount, 0)) as total_revenue
  from mplan.updates u
  join mplan.companies c using (company_code)
  left join mplan.revenue_logs r 
    on r.company_code = u.company_code 
    and r.revenue_month = date_trunc('month', u.update_date)::date
  where
    (p_date_start is null or u.update_date >= p_date_start)
    and (p_date_end is null or u.update_date <= p_date_end)
    and (p_kategori is null or c.kategori = p_kategori)
    and (p_status is null or u.status = p_status)
  group by c.kategori, u.status, date_trunc('month', u.update_date)::date
  order by update_month desc;
end;
$$;


ALTER FUNCTION "mplan"."get_analytics_section_v2"("p_section" "text", "p_date_start" "date", "p_date_end" "date", "p_kategori" "text", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_summary"("period" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
declare
  result json;
begin
  -- Pilih interval berdasarkan parameter
  result := json_build_object(
    'companies_by_kategori',
      (select json_agg(row_to_json(t))
       from (
         select kategori, count(*) as total
         from mplan.companies
         group by kategori
         order by count(*) desc
       ) t),

    'updates_by_status',
      (select json_agg(row_to_json(t))
       from (
         select status, count(*) as total
         from mplan.updates
         group by status
         order by count(*) desc
       ) t),

    'total_overdue',
      (select count(*) from mplan.updates_with_timeline_plus_v3
       where checking = false and next_date < current_date
      ),

    'updates_timeline',
      (select json_agg(row_to_json(t))
       from (
         select
           case
             when lower(period) = 'day' then to_char(update_date, 'DD Mon')
             when lower(period) = 'week' then to_char(date_trunc('week', update_date), 'DD Mon')
             when lower(period) = 'month' then to_char(date_trunc('month', update_date), 'Mon YYYY')
             else to_char(date_trunc('year', update_date), 'YYYY')
           end as periode_label,
           count(*) as total_update
         from mplan.updates
         where update_date >= (
           case
             when lower(period) = 'day' then current_date - interval '7 days'
             when lower(period) = 'week' then current_date - interval '49 days'
             when lower(period) = 'month' then current_date - interval '6 months'
             else current_date - interval '3 years'
           end
         )
         group by 1
         order by min(update_date)
       ) t)
  );
  return result;
end;
$$;


ALTER FUNCTION "mplan"."get_analytics_summary"("period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_summary_v2"("period" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
declare
  result json;
  start_date date;
  prev_start date;
begin
  -- Hitung periode aktif & sebelumnya
  start_date := case
    when lower(period) = 'day' then current_date - interval '7 days'
    when lower(period) = 'week' then current_date - interval '49 days'
    when lower(period) = 'month' then current_date - interval '6 months'
    else current_date - interval '3 years'
  end;

  prev_start := case
    when lower(period) = 'day' then start_date - interval '7 days'
    when lower(period) = 'week' then start_date - interval '49 days'
    when lower(period) = 'month' then start_date - interval '6 months'
    else start_date - interval '3 years'
  end;

  result := json_build_object(
    'companies_by_kategori',
      (select json_agg(row_to_json(t))
       from (
         select kategori, count(*) as total
         from mplan.companies
         group by kategori
         order by count(*) desc
       ) t),

    'updates_by_status',
      (select json_agg(row_to_json(t))
       from (
         select status, count(*) as total
         from mplan.updates
         group by status
         order by count(*) desc
       ) t),

    'total_overdue',
      (select count(*) from mplan.updates_with_timeline_plus_v3
       where checking = false and next_date < current_date
      ),

    'updates_timeline',
      (select json_agg(row_to_json(t))
       from (
         select
           case
             when lower(period) = 'day' then to_char(update_date, 'DD Mon')
             when lower(period) = 'week' then to_char(date_trunc('week', update_date), 'DD Mon')
             when lower(period) = 'month' then to_char(date_trunc('month', update_date), 'Mon YYYY')
             else to_char(date_trunc('year', update_date), 'YYYY')
           end as periode_label,
           count(*) as total_update
         from mplan.updates
         where update_date >= start_date
         group by 1
         order by min(update_date)
       ) t),

    -- 🔥 KPI: Growth Summary
    'growth_summary',
      json_build_object(
        'updates_current', (select count(*) from mplan.updates where update_date >= start_date),
        'updates_prev', (select count(*) from mplan.updates where update_date >= prev_start and update_date < start_date),
        'companies_new_current', (select count(*) from mplan.companies where created_at::date >= start_date),
        'companies_new_prev', (select count(*) from mplan.companies where created_at::date >= prev_start and created_at::date < start_date)
      )
  );

  return result;
end;
$$;


ALTER FUNCTION "mplan"."get_analytics_summary_v2"("period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_analytics_summary_v3"("period" "text", "kategori_filter" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'mplan', 'public'
    AS $$
declare
  result json;
  start_date date;
  prev_start date;
  kfilter text := null;
begin
  if trim(coalesce(kategori_filter, '')) = '' then
    kfilter := null;
  else
    kfilter := lower(trim(kategori_filter));
  end if;

  start_date := case
    when lower(period) = 'day' then current_date - interval '7 days'
    when lower(period) = 'week' then current_date - interval '49 days'
    when lower(period) = 'month' then current_date - interval '6 months'
    else current_date - interval '3 years'
  end;

  prev_start := start_date - (current_date - start_date);

  result := json_build_object(
    'companies_by_kategori',
      (select json_agg(row_to_json(t))
       from (select kategori, count(*) as total from mplan.companies group by kategori order by count(*) desc) t),
    'updates_by_status',
      (select json_agg(row_to_json(t))
       from (
         select u.status, count(*) as total
         from mplan.updates u
         join mplan.companies c using (company_code)
         where (kfilter is null or lower(c.kategori) = kfilter)
         group by u.status order by count(*) desc
       ) t),
    'total_overdue',
      (select count(*) from mplan.updates_with_timeline_plus_v3 u
         join mplan.companies c using (company_code)
         where u.checking = false
           and u.next_date < current_date
           and (kfilter is null or lower(c.kategori) = kfilter)
      ),
    'updates_timeline',
      (select json_agg(row_to_json(t))
       from (
         select
           case
             when lower(period) = 'day' then to_char(u.update_date, 'DD Mon')
             when lower(period) = 'week' then to_char(date_trunc('week', u.update_date), 'DD Mon')
             when lower(period) = 'month' then to_char(date_trunc('month', u.update_date), 'Mon YYYY')
             else to_char(date_trunc('year', u.update_date), 'YYYY')
           end as periode_label,
           count(*) as total_update
         from mplan.updates u
         join mplan.companies c using (company_code)
         where u.update_date >= start_date
           and (kfilter is null or lower(c.kategori) = kfilter)
         group by 1
         order by min(u.update_date)
       ) t),
    'kpi_kategori',
      (select json_agg(row_to_json(t))
       from (
         select
           c.kategori,
           count(distinct c.company_code) as total_company,
           count(u.update_id) as total_update
         from mplan.companies c
         left join mplan.updates u on u.company_code = c.company_code
         where (kfilter is null or lower(c.kategori) = kfilter)
         group by c.kategori
       ) t),
    'growth_summary',
      json_build_object(
        'updates_current', (select count(*) from mplan.updates u join mplan.companies c using (company_code)
                            where u.update_date >= start_date
                              and (kfilter is null or lower(c.kategori) = kfilter)),
        'updates_prev', (select count(*) from mplan.updates u join mplan.companies c using (company_code)
                         where u.update_date >= prev_start
                           and u.update_date < start_date
                           and (kfilter is null or lower(c.kategori) = kfilter))
      )
  );
  return result;
end;
$$;


ALTER FUNCTION "mplan"."get_analytics_summary_v3"("period" "text", "kategori_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_anomaly_alert_stats_v1"() RETURNS TABLE("total_alerts" bigint, "total_sent" bigint, "total_failed" bigint, "avg_accuracy" numeric, "avg_deviation" numeric, "last_alert_time" timestamp with time zone)
    LANGUAGE "sql"
    AS $$
  select
    count(*) as total_alerts,
    count(*) filter (where alert_status = 'sent') as total_sent,
    count(*) filter (where alert_status = 'failed') as total_failed,
    round(avg(accuracy_percent), 2) as avg_accuracy,
    round(avg(abs(deviation)), 0) as avg_deviation,
    max(created_at) as last_alert_time
  from mplan.anomaly_alert_logs;
$$;


ALTER FUNCTION "mplan"."get_anomaly_alert_stats_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_anomaly_alert_v1"() RETURNS TABLE("kategori" "text", "predicted_month" "date", "predicted_revenue" numeric, "actual_revenue" numeric, "deviation" numeric, "accuracy_percent" numeric, "alert_message" "text")
    LANGUAGE "sql"
    AS $$
select
  kategori,
  predicted_month,
  predicted_revenue,
  actual_revenue,
  deviation,
  accuracy_percent,
  '⚠️ ANOMALY DETECTED: ' || kategori ||
  ' bulan ' || to_char(predicted_month, 'Mon YYYY') ||
  ' — Deviasi ' || round(deviation,0) ||
  ' (Akurasi ' || round(accuracy_percent,1) || '%)' as alert_message
from mplan.get_analytics_ai_forecast_v1()
where abs(deviation) > (0.2 * nullif(actual_revenue,0))
order by predicted_month desc;
$$;


ALTER FUNCTION "mplan"."get_anomaly_alert_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_revenue_timeseries_v1"("date_start" "date" DEFAULT (CURRENT_DATE - '180 days'::interval), "date_end" "date" DEFAULT CURRENT_DATE, "kategori_filter" "text" DEFAULT 'ALL'::"text", "granularity" "text" DEFAULT 'month'::"text") RETURNS TABLE("kategori" "text", "period" "text", "total_revenue" numeric, "extra" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
begin
  -- ⚙️ versi awal: simulasi omzet berdasarkan jumlah update * 1.5jt (contoh)
  return query
  select
    c.kategori,
    case
      when granularity = 'week' then to_char(date_trunc('week', u.update_date), 'IYYY-IW')
      else to_char(date_trunc('month', u.update_date), 'YYYY-MM')
    end as period,
    sum(1500000)::numeric as total_revenue,  -- nilai simulasi per update
    jsonb_build_object(
      'month', to_char(min(u.update_date), 'Month YYYY'),
      'simulated', true
    ) as extra
  from mplan.updates u
  join mplan.companies c using (company_code)
  where u.update_date between date_start and date_end
    and (kategori_filter = 'ALL' or c.kategori = kategori_filter)
  group by c.kategori, period
  order by c.kategori, period;
end;
$$;


ALTER FUNCTION "mplan"."get_revenue_timeseries_v1"("date_start" "date", "date_end" "date", "kategori_filter" "text", "granularity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_social_summary_v1"("date_start" "date" DEFAULT (CURRENT_DATE - '90 days'::interval), "date_end" "date" DEFAULT CURRENT_DATE, "platforms" "text"[] DEFAULT '{tiktok,instagram,youtube}'::"text"[]) RETURNS TABLE("platform" "text", "total_posts" numeric, "total_views" numeric, "total_likes" numeric, "total_comments" numeric, "total_shares" numeric, "avg_ctr" numeric, "avg_engagement" numeric, "top_post" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    lower(sp1.platform) as platform,
    count(*)::numeric as total_posts,
    sum(sp1.views)::numeric as total_views,
    sum(sp1.likes)::numeric as total_likes,
    sum(sp1.comments)::numeric as total_comments,
    sum(sp1.shares)::numeric as total_shares,
    round(avg(sp1.ctr), 2) as avg_ctr,
    round(avg(sp1.engagement_rate), 2) as avg_engagement,
    (
      select jsonb_build_object(
        'caption', sp2.caption,
        'views', sp2.views,
        'likes', sp2.likes,
        'post_date', sp2.post_date
      )
      from mplan.social_posts_manual sp2
      where sp2.platform = sp1.platform
        and sp2.views = (
          select max(sp3.views)
          from mplan.social_posts_manual sp3
          where sp3.platform = sp1.platform
            and sp3.post_date between date_start and date_end
        )
      limit 1
    ) as top_post
  from mplan.social_posts_manual sp1
  where sp1.post_date between date_start and date_end
    and (array_length(platforms, 1) is null or lower(sp1.platform) = any(platforms))
  group by sp1.platform
  order by total_views desc;
end;
$$;


ALTER FUNCTION "mplan"."get_social_summary_v1"("date_start" "date", "date_end" "date", "platforms" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_table_kategori_v1"("date_start" "date" DEFAULT (CURRENT_DATE - '90 days'::interval), "date_end" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("kategori" "text", "total_update" numeric, "unique_company" numeric, "last_status" "text", "last_update_date" "date")
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    c.kategori,
    count(u.update_id)::numeric as total_update,
    count(distinct c.company_code)::numeric as unique_company,
    (array_agg(u.status_singkat order by u.update_date desc))[1] as last_status,
    max(u.update_date)::date as last_update_date
  from mplan.updates_with_timeline_plus u
  join mplan.companies c using (company_code)
  where u.update_date between date_start and date_end
  group by c.kategori
  order by total_update desc;
end;
$$;


ALTER FUNCTION "mplan"."get_table_kategori_v1"("date_start" "date", "date_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_table_status_v1"("date_start" "date" DEFAULT (CURRENT_DATE - '90 days'::interval), "date_end" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("status" "text", "total_update" numeric, "unique_company" numeric, "last_update_date" "date")
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    u.status_singkat as status,
    count(u.update_id)::numeric as total_update,
    count(distinct u.company_code)::numeric as unique_company,
    max(u.update_date)::date as last_update_date
  from mplan.updates_with_timeline_plus u
  where u.update_date between date_start and date_end
  group by u.status_singkat
  order by total_update desc;
end;
$$;


ALTER FUNCTION "mplan"."get_table_status_v1"("date_start" "date", "date_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."get_timeseries_compare_v1"("type" "text", "keys" "text"[], "date_start" "date" DEFAULT (CURRENT_DATE - '90 days'::interval), "date_end" "date" DEFAULT CURRENT_DATE, "granularity" "text" DEFAULT 'month'::"text") RETURNS TABLE("key" "text", "period" "text", "total_update" numeric, "extra" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
begin
  if type = 'status' then
    return query
    select
      u.status_singkat as key,
      case
        when granularity = 'week' then to_char(date_trunc('week', u.update_date), 'IYYY-IW')
        else to_char(date_trunc('month', u.update_date), 'YYYY-MM')
      end as period,
      count(*)::numeric as total_update,
      jsonb_build_object('month', to_char(min(u.update_date), 'Month YYYY')) as extra
    from mplan.updates_with_timeline_plus u
    where u.update_date between date_start and date_end
      and (array_length(keys, 1) is null or u.status_singkat = any(keys))
    group by key, period
    order by key, period;

  elsif type = 'kategori' then
    return query
    select
      c.kategori as key,
      case
        when granularity = 'week' then to_char(date_trunc('week', u.update_date), 'IYYY-IW')
        else to_char(date_trunc('month', u.update_date), 'YYYY-MM')
      end as period,
      count(*)::numeric as total_update,
      jsonb_build_object('month', to_char(min(u.update_date), 'Month YYYY')) as extra
    from mplan.updates u
    join mplan.companies c using (company_code)
    where u.update_date between date_start and date_end
      and (array_length(keys, 1) is null or c.kategori = any(keys))
    group by key, period
    order by key, period;

  else
    raise exception 'Invalid type: %, must be ''status'' or ''kategori''', type;
  end if;
end;
$$;


ALTER FUNCTION "mplan"."get_timeseries_compare_v1"("type" "text", "keys" "text"[], "date_start" "date", "date_end" "date", "granularity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."insert_view_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into mplan.updates (
    update_id, company_code, status, next_status, next_date, update_date, update_notes
  )
  values (
    new.update_id, new.company_code, new.status, new.next_status, new.next_date, new.update_date, new.update_notes
  );

  update mplan.companies
  set
    kategori = new.kategori,
    name = coalesce(new.company_name, name),
    company_telp = coalesce(new.company_telp, company_telp),
    pic = coalesce(new.pic, pic),
    pic_email = coalesce(new.pic_email, pic_email),
    pic_whatsapp = coalesce(new.pic_whatsapp, pic_whatsapp),
    updated_at = now()
  where company_code = new.company_code;

  insert into mplan.companies (
    company_code, name, kategori, company_telp, pic, pic_email, pic_whatsapp, created_at
  )
  values (
    new.company_code, new.company_name, new.kategori, new.company_telp,
    new.pic, new.pic_email, new.pic_whatsapp, now()
  )
  on conflict (company_code) do nothing;

  insert into mplan.activity_log (action, table_name, record_id, detail, changed_by)
  values ('INSERT', 'updates_with_timeline_editable_v3', new.update_id, to_jsonb(new), auth.uid());

  return new;
end;
$$;


ALTER FUNCTION "mplan"."insert_view_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  result JSONB := '{}'::jsonb;
  key TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- loop semua key di old dan new
  FOR key IN SELECT DISTINCT jsonb_object_keys(old_data || new_data)
  LOOP
    old_val := old_data ->> key;
    new_val := new_data ->> key;
    IF old_val IS DISTINCT FROM new_val THEN
      result := result || jsonb_build_object(key, jsonb_build_array(old_val, new_val));
    END IF;
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "mplan"."jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."log_audit_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_email TEXT;
BEGIN
  -- Ambil email dari JWT (kalau user login)
  current_email := current_setting('request.jwt.claim.email', true);

  -- Simpan log sesuai jenis operasi
  IF TG_OP = 'INSERT' THEN
    INSERT INTO mplan.audit_logs (table_name, action, user_email, new_data)
    VALUES (TG_TABLE_NAME, 'INSERT', current_email, row_to_json(NEW));

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO mplan.audit_logs (table_name, action, user_email, old_data, new_data)
    VALUES (TG_TABLE_NAME, 'UPDATE', current_email, row_to_json(OLD), row_to_json(NEW));

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO mplan.audit_logs (table_name, action, user_email, old_data)
    VALUES (TG_TABLE_NAME, 'DELETE', current_email, row_to_json(OLD));
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "mplan"."log_audit_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."next_business_day"("d" "date") RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
begin
  while extract(dow from d) in (0,6) loop  -- 0=Sun, 6=Sat
    d := d + interval '1 day';
  end loop;
  return d;
end $$;


ALTER FUNCTION "mplan"."next_business_day"("d" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."next_send_window"("now_utc" timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE "plpgsql"
    AS $$
declare
  local_ts timestamptz;
  local_time time;
  today date;
  target timestamptz;
begin
  -- konversi ke WIB
  local_ts := now_utc at time zone 'UTC' at time zone 'Asia/Jakarta';
  local_time := local_ts::time;
  today := local_ts::date;

  if local_time between time '08:30' and time '09:00' then
    target := local_ts;  -- sudah dalam window
  elsif local_time < time '08:30' then
    target := (today + time '08:45') at time zone 'Asia/Jakarta' at time zone 'UTC';
  else
    target := (mplan.next_business_day(today + 1) + time '08:45') at time zone 'Asia/Jakarta' at time zone 'UTC';
  end if;

  return target;
end $$;


ALTER FUNCTION "mplan"."next_send_window"("now_utc" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."queue_email_on_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  comp record;
  rcpt text;
  tkey mplan.email_template_key;
  when_to_send timestamptz;
  payload jsonb;
begin
  -- hanya untuk status EMOL atau EMFO
  if upper(new.status) not in ('EMOL','EMFO') then
    return new;
  end if;

  -- ✅ FIX: gunakan kolom company_code
  select * into comp
  from mplan.companies c
  where c.company_code = new.company_code
  limit 1;

  if comp is null then
    return new;
  end if;

  rcpt := coalesce(comp.pic_email,'');
  if rcpt = '' then
    return new; -- gak ada email, gak perlu antri
  end if;

  tkey := case when upper(new.status)='EMOL' then 'EMOL' else 'EMFO' end;
  when_to_send := mplan.next_send_window(now());

  payload := jsonb_build_object(
    'FirstName', split_part(coalesce(comp.pic,''),' ',1),
    'NamaPerusahaan', coalesce(comp.name,''),
    'Bagian', coalesce('', ''),
    'Website', 'https://www.sumsido.co.id',
    'WhatsAppLink', coalesce(comp.pic_whatsapp,''),
    'CompanyProfileURL', 'https://example.com/company-profile.pdf',
    'PriceListURL', 'https://example.com/pricelist.pdf'
  );

  insert into mplan.email_queue(company_code, recipient_email, template_key, payload, scheduled_at)
  values(new.company_code, rcpt, tkey, payload, when_to_send)
  on conflict do nothing;

  return new;
end;
$$;


ALTER FUNCTION "mplan"."queue_email_on_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."random_code_9"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
BEGIN
  FOR i IN 1..9 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "mplan"."random_code_9"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."sec_decrypt"("encrypted" "bytea") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- stub untuk dev; nanti bisa diganti ke decrypt pakai APP_ENC_KEY
  return convert_from(encrypted, 'UTF8');
end;
$$;


ALTER FUNCTION "mplan"."sec_decrypt"("encrypted" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."sec_decrypt"("p_encrypted" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_key text;
begin
  v_key := current_setting('app.settings.APP_ENC_KEY', true);
  if v_key is null then
    raise warning 'APP_ENC_KEY belum di-set di session.';
    return null;
  end if;
  return convert_from(
    decrypt_iv(
      decode(p_encrypted, 'hex'),
      convert_to(v_key, 'UTF8'),
      '0123456789abcdef'::bytea,
      'aes'
    ),
    'UTF8'
  );
end;
$$;


ALTER FUNCTION "mplan"."sec_decrypt"("p_encrypted" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."sec_encrypt"("p_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_key text;
begin
  v_key := current_setting('app.settings.APP_ENC_KEY', true);
  if v_key is null then
    raise warning 'APP_ENC_KEY belum di-set di session.';
    return null;
  end if;
  return encode(
    encrypt_iv(
      convert_to(p_text, 'UTF8'),
      convert_to(v_key, 'UTF8'),
      '0123456789abcdef'::bytea,
      'aes'
    ),
    'hex'
  );
end;
$$;


ALTER FUNCTION "mplan"."sec_encrypt"("p_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."set_app_enc_key"("p_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  perform set_config('app.settings.APP_ENC_KEY', p_key, true);
end;
$$;


ALTER FUNCTION "mplan"."set_app_enc_key"("p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."set_scheduled_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.scheduled_date := new.scheduled_at::date;
  return new;
end $$;


ALTER FUNCTION "mplan"."set_scheduled_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "mplan"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."sync_staging_companies"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into mplan.companies (name, company_telp, pic, pic_email, pic_whatsapp)
  values (new.company_name, new.company_telp, new.pic, new.pic_email, new.pic_whatsapp)
  on conflict (name) do update
    set company_telp = excluded.company_telp,
        pic = excluded.pic,
        pic_email = excluded.pic_email,
        pic_whatsapp = excluded.pic_whatsapp,
        updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "mplan"."sync_staging_companies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."sync_staging_to_main"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_company_code text;
BEGIN
  -- Cari perusahaan di main
  SELECT c.company_code
    INTO v_company_code
  FROM mplan.companies c
  WHERE c.name = NEW.company_name
  LIMIT 1;

  -- Jika belum ada, buat dari staging_companies (ambil profilnya kalau ada)
  IF v_company_code IS NULL THEN
    INSERT INTO mplan.companies (
      name, company_telp, pic, pic_email, pic_whatsapp, created_at, updated_at
    )
    SELECT
      NEW.company_name,
      s.company_telp,
      s.pic,
      s.pic_email,
      s.pic_whatsapp,
      NOW(), NOW()
    FROM mplan.staging_companies s
    WHERE s.company_name = NEW.company_name
    LIMIT 1
    RETURNING company_code INTO v_company_code;

    -- fallback kalau tidak ada record pendamping di staging_companies
    IF v_company_code IS NULL THEN
      INSERT INTO mplan.companies (name, created_at, updated_at)
      VALUES (NEW.company_name, NOW(), NOW())
      RETURNING company_code INTO v_company_code;
    END IF;
  END IF;

  -- Tulis update ke main
  INSERT INTO mplan.updates (
    company_code, update_notes, status, update_date, created_at, updated_at
  )
  VALUES (
    v_company_code,
    NEW.update_notes,
    NEW.status,
    COALESCE(NEW.update_date::timestamp, NOW()),
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "mplan"."sync_staging_to_main"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."sync_staging_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_company_code text;
begin
  -- cari kode perusahaan
  select c.company_code into v_company_code
  from mplan.companies c
  where lower(c.name) = lower(new.company_name)
  limit 1;

  -- kalau belum ada, buat otomatis
  if v_company_code is null then
    insert into mplan.companies (name)
    values (new.company_name)
    returning company_code into v_company_code;
  end if;

  -- masukkan ke updates
  insert into mplan.updates (company_code, update_date, update_notes, status)
  values (v_company_code, coalesce(new.update_date, current_date), new.update_notes, new.status)
  on conflict (company_code, update_date) do update
    set update_notes = excluded.update_notes,
        status = excluded.status,
        updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "mplan"."sync_staging_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."trigger_anomaly_alert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  supabase_url text := 'https://jwljhpelgkxnvoibwcdw.supabase.co';
  service_key  text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bGpocGVsZ2t4bnZvaWJ3Y2R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA1NzY0MiwiZXhwIjoyMDc0NjMzNjQyfQ.1l_vd13kQwTro3LWEd_XkA9gev4Xde77LAS3Atd4M_w';
  fn_endpoint text;
  headers text;
  last_sent timestamptz;
  res json;
  attempt int := 0;
begin
  fn_endpoint := supabase_url || '/functions/v1/send-anomaly-alert';
  headers := format('Authorization: Bearer %s', service_key);

  -- 🧱 Anti-spam lock: cek waktu terakhir trigger dijalankan (cooldown 30 detik)
  select max(created_at) into last_sent
  from mplan.anomaly_alert_logs
  where created_at > now() - interval '30 seconds';

  if last_sent is not null then
    raise notice '⚠️ Skip alert (cooldown active)';
    return NEW;
  end if;

  -- ⚡ Jalankan hanya kalau kondisi anomaly terpenuhi
  if abs(NEW.deviation) > 300000 or NEW.accuracy_percent < 60 then
    <<retry_block>>
    loop
      attempt := attempt + 1;
      begin
        perform http_post(fn_endpoint, '{}', headers);
        raise notice '✅ Anomaly alert triggered (attempt %)', attempt;
        exit retry_block; -- sukses → keluar loop
      exception when others then
        if attempt < 2 then
          perform pg_sleep(1); -- tunggu 1 detik, retry sekali lagi
        else
          raise notice '❌ HTTP call failed after 2 attempts.';
          exit retry_block;
        end if;
      end;
    end loop;
  end if;

  return NEW;
end;
$$;


ALTER FUNCTION "mplan"."trigger_anomaly_alert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."update_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "mplan"."update_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."update_timestamp_social_posts"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "mplan"."update_timestamp_social_posts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."update_view_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update mplan.updates
  set
    status = new.status,
    next_status = new.next_status,
    next_date = new.next_date,
    update_notes = new.update_notes
  where update_id = old.update_id;

  update mplan.companies
  set
    kategori = new.kategori,
    name = new.company_name,
    company_telp = new.company_telp,
    pic = new.pic,
    pic_email = new.pic_email,
    pic_whatsapp = new.pic_whatsapp
  where company_code = new.company_code;

  insert into mplan.activity_log (action, table_name, record_id, detail)
  values (
    'UPDATE',
    'updates_with_timeline_editable_v3',
    new.update_id,
    jsonb_build_object(
      'company_code', new.company_code,
      'status', new.status,
      'next_status', new.next_status,
      'update_notes', new.update_notes,
      'updated_at', now()
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "mplan"."update_view_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "mplan"."upsert_social_account"("p_user_id" "uuid", "p_provider" "text", "p_external_id" "text", "p_handle" "text", "p_scopes" "text"[], "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_meta" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare v_id uuid;
begin
  insert into mplan.social_accounts(
    user_id, provider, account_external_id, account_handle, scopes,
    access_token, refresh_token, token_expires_at, meta
  ) values (
    p_user_id, p_provider, p_external_id, p_handle, p_scopes,
    mplan.sec_encrypt(p_access_token),
    case when p_refresh_token is null then null else mplan.sec_encrypt(p_refresh_token) end,
    p_expires_at, coalesce(p_meta,'{}'::jsonb)
  )
  on conflict (user_id, provider, account_external_id)
  do update set
    account_handle = excluded.account_handle,
    scopes = excluded.scopes,
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    token_expires_at = excluded.token_expires_at,
    meta = excluded.meta,
    updated_at = now()
  returning id into v_id;

  return v_id;
end$$;


ALTER FUNCTION "mplan"."upsert_social_account"("p_user_id" "uuid", "p_provider" "text", "p_external_id" "text", "p_handle" "text", "p_scopes" "text"[], "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_meta" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "mplan"."activity_log" (
    "id" bigint NOT NULL,
    "action" "text",
    "table_name" "text",
    "record_id" "text",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "detail" "jsonb",
    "changed_by" "uuid"
);


ALTER TABLE "mplan"."activity_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "mplan"."activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "mplan"."activity_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "mplan"."activity_log_id_seq" OWNED BY "mplan"."activity_log"."id";



CREATE OR REPLACE VIEW "mplan"."activity_log_with_user_v1" AS
 SELECT "a"."id" AS "log_id",
    "a"."action",
    "a"."table_name",
    "a"."record_id",
    "a"."changed_at",
    "a"."changed_by",
    "u"."email" AS "user_email",
    COALESCE(("u"."raw_user_meta_data" ->> 'name'::"text"), ("u"."raw_user_meta_data" ->> 'full_name'::"text"), 'Unknown'::"text") AS "user_name",
    "a"."detail"
   FROM ("mplan"."activity_log" "a"
     LEFT JOIN "auth"."users" "u" ON (("u"."id" = "a"."changed_by")))
  ORDER BY "a"."changed_at" DESC;


ALTER VIEW "mplan"."activity_log_with_user_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."event_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_time" timestamp with time zone DEFAULT "now"(),
    "section_key" "text" NOT NULL,
    "event_type" "text" DEFAULT 'refresh'::"text",
    "event_detail" "text",
    "user_email" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "mplan"."event_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."analytics_activity_v1" AS
 SELECT "section_key",
    "date_trunc"('minute'::"text", "event_time") AS "minute_bucket",
    "count"(*) AS "event_count"
   FROM "mplan"."event_logs"
  WHERE ("event_time" > ("now"() - '02:00:00'::interval))
  GROUP BY "section_key", ("date_trunc"('minute'::"text", "event_time"))
  ORDER BY ("date_trunc"('minute'::"text", "event_time"));


ALTER VIEW "mplan"."analytics_activity_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."analytics_ai_forecast_v1" (
    "id" bigint NOT NULL,
    "kategori" "text",
    "predicted_month" "date",
    "predicted_revenue" numeric,
    "actual_revenue" numeric,
    "deviation" numeric,
    "accuracy_percent" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."analytics_ai_forecast_v1" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "mplan"."analytics_ai_forecast_v1_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "mplan"."analytics_ai_forecast_v1_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "mplan"."analytics_ai_forecast_v1_id_seq" OWNED BY "mplan"."analytics_ai_forecast_v1"."id";



CREATE TABLE IF NOT EXISTS "mplan"."analytics_perf_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_key" "text" NOT NULL,
    "fetch_duration_ms" numeric,
    "render_duration_ms" numeric,
    "rows_count" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."analytics_perf_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."analytics_anomaly_v1" AS
 WITH "daily" AS (
         SELECT "analytics_perf_logs"."section_key",
            "date_trunc"('day'::"text", "analytics_perf_logs"."created_at") AS "day",
            "avg"("analytics_perf_logs"."fetch_duration_ms") AS "avg_fetch_ms",
            "avg"("analytics_perf_logs"."render_duration_ms") AS "avg_render_ms"
           FROM "mplan"."analytics_perf_logs"
          GROUP BY "analytics_perf_logs"."section_key", ("date_trunc"('day'::"text", "analytics_perf_logs"."created_at"))
        )
 SELECT "d1"."section_key",
    "d1"."day",
    "d1"."avg_fetch_ms",
    "d1"."avg_render_ms",
    "avg"("d2"."avg_fetch_ms") AS "baseline_fetch",
    "avg"("d2"."avg_render_ms") AS "baseline_render",
        CASE
            WHEN ("d1"."avg_fetch_ms" > ("avg"("d2"."avg_fetch_ms") * 1.5)) THEN true
            ELSE false
        END AS "fetch_anomaly",
        CASE
            WHEN ("d1"."avg_render_ms" > ("avg"("d2"."avg_render_ms") * 1.5)) THEN true
            ELSE false
        END AS "render_anomaly"
   FROM ("daily" "d1"
     LEFT JOIN "daily" "d2" ON ((("d1"."section_key" = "d2"."section_key") AND (("d2"."day" >= ("d1"."day" - '7 days'::interval)) AND ("d2"."day" <= ("d1"."day" - '1 day'::interval))))))
  GROUP BY "d1"."section_key", "d1"."day", "d1"."avg_fetch_ms", "d1"."avg_render_ms"
  ORDER BY "d1"."day" DESC;


ALTER VIEW "mplan"."analytics_anomaly_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."analytics_cache_health_v1" AS
 SELECT "section_key",
    "max"("updated_at") AS "last_fetch",
    "avg"("fetch_duration_ms") AS "avg_fetch_ms",
    "avg"("render_duration_ms") AS "avg_render_ms",
    "count"(*) AS "total_samples"
   FROM "mplan"."analytics_perf_logs"
  GROUP BY "section_key";


ALTER VIEW "mplan"."analytics_cache_health_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."analytics_perf_timeline_v1" AS
 SELECT "section_key",
    "date_trunc"('day'::"text", "created_at") AS "day",
    "avg"("fetch_duration_ms") AS "avg_fetch_ms",
    "avg"("render_duration_ms") AS "avg_render_ms",
    "count"(*) AS "samples"
   FROM "mplan"."analytics_perf_logs"
  GROUP BY "section_key", ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC;


ALTER VIEW "mplan"."analytics_perf_timeline_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."analytics_predicted_ttl" (
    "section_key" "text" NOT NULL,
    "predicted_ttl_ms" numeric,
    "refreshed_at" timestamp with time zone
);


ALTER TABLE "mplan"."analytics_predicted_ttl" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."companies" (
    "id" "text" DEFAULT "mplan"."random_code_9"() NOT NULL,
    "company_code" "text" DEFAULT "upper"("substr"("md5"(("random"())::"text"), 1, 9)) NOT NULL,
    "name" "text" NOT NULL,
    "company_telp" "text",
    "pic" "text",
    "pic_email" "text",
    "pic_whatsapp" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone,
    "created_by" "text",
    "updated_by" "text",
    "kategori" "text",
    "checking" boolean
);


ALTER TABLE "mplan"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."revenue_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_code" "text",
    "revenue_amount" numeric DEFAULT 0,
    "revenue_month" "date" DEFAULT "date_trunc"('month'::"text", "now"()),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."revenue_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."updates" (
    "id" bigint NOT NULL,
    "company_code" "text" NOT NULL,
    "update_notes" "text",
    "status" "text",
    "update_date" timestamp without time zone DEFAULT "now"(),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone,
    "created_by" "text",
    "updated_by" "text",
    "update_id" "text" DEFAULT "upper"("substr"("md5"(("random"())::"text"), 1, 9)),
    "next_date" "date",
    "next_step" "text",
    "checking" "text" DEFAULT 'UNCHECKED'::"text",
    "next_status" "text"
);


ALTER TABLE "mplan"."updates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."analytics_summary_v1" AS
 SELECT "c"."kategori",
    "u"."status",
    "date_trunc"('month'::"text", "u"."update_date") AS "update_month",
    "count"(*) AS "total_updates",
    "avg"((("u"."next_date")::timestamp without time zone - "u"."update_date")) AS "avg_duration",
    "sum"(COALESCE("r"."revenue_amount", (0)::numeric)) AS "total_revenue"
   FROM (("mplan"."updates" "u"
     JOIN "mplan"."companies" "c" USING ("company_code"))
     LEFT JOIN "mplan"."revenue_logs" "r" ON ((("r"."company_code" = "u"."company_code") AND ("r"."revenue_month" = "date_trunc"('month'::"text", "u"."update_date")))))
  GROUP BY "c"."kategori", "u"."status", ("date_trunc"('month'::"text", "u"."update_date"))
  ORDER BY ("date_trunc"('month'::"text", "u"."update_date")) DESC;


ALTER VIEW "mplan"."analytics_summary_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."snapshot_ttl_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_key" "text",
    "ttl" integer,
    "recorded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."snapshot_ttl_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."snapshot_ttl_stats_v1" AS
 SELECT "section_key",
    "round"("avg"("ttl")) AS "avg_ttl",
    "count"(*) AS "samples",
    "max"("recorded_at") AS "last_recorded"
   FROM "mplan"."snapshot_ttl_stats"
  GROUP BY "section_key";


ALTER VIEW "mplan"."snapshot_ttl_stats_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."analytics_system_health_v1" AS
 SELECT "now"() AS "audit_time",
    ( SELECT "count"(*) AS "count"
           FROM "mplan"."analytics_perf_logs") AS "total_perf_logs",
    ( SELECT "count"(DISTINCT "analytics_perf_logs"."section_key") AS "count"
           FROM "mplan"."analytics_perf_logs") AS "active_sections",
    ( SELECT "round"(("avg"("snapshot_ttl_stats_v1"."avg_ttl") / (1000)::numeric), 1) AS "round"
           FROM "mplan"."snapshot_ttl_stats_v1") AS "avg_ttl_s",
    ( SELECT "count"(*) AS "count"
           FROM "mplan"."analytics_perf_logs"
          WHERE (("analytics_perf_logs"."fetch_duration_ms" > ( SELECT ("avg"("analytics_perf_logs_1"."fetch_duration_ms") * 1.5)
                   FROM "mplan"."analytics_perf_logs" "analytics_perf_logs_1")) AND ("analytics_perf_logs"."created_at" > ("now"() - '7 days'::interval)))) AS "anomalies_7d",
    ( SELECT "count"(*) AS "count"
           FROM "mplan"."analytics_cache_health_v1") AS "cache_samples",
    ( SELECT "max"("analytics_perf_logs"."updated_at") AS "max"
           FROM "mplan"."analytics_perf_logs") AS "last_perf_update",
    ( SELECT "max"("analytics_perf_logs"."updated_at") AS "max"
           FROM "mplan"."analytics_perf_logs"
          WHERE ("analytics_perf_logs"."fetch_duration_ms" > (0)::numeric)) AS "last_fetch_update";


ALTER VIEW "mplan"."analytics_system_health_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."analytics_weekly_summary_v1" AS
 SELECT "section_key",
    "date_trunc"('week'::"text", "created_at") AS "week_start",
    "avg"("fetch_duration_ms") AS "avg_fetch_ms",
    "avg"("render_duration_ms") AS "avg_render_ms",
    "count"(*) AS "total_samples",
    "sum"(
        CASE
            WHEN ("fetch_duration_ms" > ( SELECT ("avg"("analytics_perf_logs_1"."fetch_duration_ms") * 1.5)
               FROM "mplan"."analytics_perf_logs" "analytics_perf_logs_1")) THEN 1
            ELSE 0
        END) AS "fetch_anomalies",
    "sum"(
        CASE
            WHEN ("render_duration_ms" > ( SELECT ("avg"("analytics_perf_logs_1"."render_duration_ms") * 1.5)
               FROM "mplan"."analytics_perf_logs" "analytics_perf_logs_1")) THEN 1
            ELSE 0
        END) AS "render_anomalies"
   FROM "mplan"."analytics_perf_logs"
  GROUP BY "section_key", ("date_trunc"('week'::"text", "created_at"))
  ORDER BY ("date_trunc"('week'::"text", "created_at")) DESC;


ALTER VIEW "mplan"."analytics_weekly_summary_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."anomaly_alert_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kategori" "text",
    "predicted_month" "date",
    "predicted_revenue" numeric,
    "actual_revenue" numeric,
    "deviation" numeric,
    "accuracy_percent" numeric,
    "alert_message" "text",
    "alert_status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."anomaly_alert_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."anomaly_alert_logs_view" AS
 SELECT "kategori",
    "to_char"(("predicted_month")::timestamp with time zone, 'YYYY-MM'::"text") AS "bulan",
    "deviation",
    "accuracy_percent",
    "alert_status",
    "left"("alert_message", 80) AS "message_preview",
    "created_at"
   FROM "mplan"."anomaly_alert_logs"
  ORDER BY "created_at" DESC;


ALTER VIEW "mplan"."anomaly_alert_logs_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."anomaly_alert_summary_v1" AS
 SELECT "kategori",
    "count"(*) AS "total_alerts",
    "count"(*) FILTER (WHERE ("alert_status" = 'sent'::"text")) AS "sent_count",
    "count"(*) FILTER (WHERE ("alert_status" = 'failed'::"text")) AS "failed_count",
    "avg"("accuracy_percent") AS "avg_accuracy",
    "avg"("abs"("deviation")) AS "avg_deviation",
    "max"("created_at") AS "last_alert"
   FROM "mplan"."anomaly_alert_logs"
  GROUP BY "kategori"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "mplan"."anomaly_alert_summary_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."anomaly_alert_trend_v1" AS
 SELECT ("date_trunc"('month'::"text", ("predicted_month")::timestamp with time zone))::"date" AS "bulan",
    "count"(*) AS "alert_count",
    "avg"("accuracy_percent") AS "avg_accuracy",
    "avg"("abs"("deviation")) AS "avg_deviation"
   FROM "mplan"."anomaly_alert_logs"
  GROUP BY (("date_trunc"('month'::"text", ("predicted_month")::timestamp with time zone))::"date")
  ORDER BY (("date_trunc"('month'::"text", ("predicted_month")::timestamp with time zone))::"date");


ALTER VIEW "mplan"."anomaly_alert_trend_v1" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid",
    "url" "text" NOT NULL,
    "mime" "text",
    "width" integer,
    "height" integer,
    "filesize" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."audit_logs" (
    "log_id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "action" "text" NOT NULL,
    "user_email" "text",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."audit_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "mplan"."audit_logs_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "mplan"."audit_logs_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "mplan"."audit_logs_log_id_seq" OWNED BY "mplan"."audit_logs"."log_id";



CREATE OR REPLACE VIEW "mplan"."audit_view" AS
 SELECT "a"."log_id",
    "a"."table_name",
    "a"."action",
    "a"."user_email",
    "a"."created_at" AS "log_time",
    COALESCE(("a"."new_data" ->> 'company_code'::"text"), ("a"."old_data" ->> 'company_code'::"text")) AS "company_code",
    "c"."name" AS "company_name",
    "a"."old_data",
    "a"."new_data",
        CASE
            WHEN ("a"."action" = 'UPDATE'::"text") THEN "mplan"."jsonb_diff"("a"."old_data", "a"."new_data")
            ELSE NULL::"jsonb"
        END AS "diff"
   FROM ("mplan"."audit_logs" "a"
     LEFT JOIN "mplan"."companies" "c" ON (("c"."company_code" = COALESCE(("a"."new_data" ->> 'company_code'::"text"), ("a"."old_data" ->> 'company_code'::"text")))))
  ORDER BY "a"."created_at" DESC;


ALTER VIEW "mplan"."audit_view" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "mplan"."company_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "mplan"."company_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."status_rules" (
    "status_key" "text" NOT NULL,
    "days" integer DEFAULT 0 NOT NULL,
    "next_status" "text"
);


ALTER TABLE "mplan"."status_rules" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."updates_with_timeline_plus_v3" AS
 WITH "src" AS (
         SELECT COALESCE("c"."company_code", "u"."company_code") AS "company_code",
            "c"."name" AS "company_name",
            "c"."company_telp",
            "c"."pic",
            "c"."pic_email",
            "c"."pic_whatsapp",
            "u"."update_notes",
            "upper"(NULLIF(TRIM(BOTH FROM "u"."status"), ''::"text")) AS "status",
            ("u"."update_date")::"date" AS "update_date",
            "u"."created_at",
            "u"."updated_at",
            "u"."created_by",
            "u"."updated_by"
           FROM ("mplan"."updates" "u"
             LEFT JOIN "mplan"."companies" "c" ON (("u"."company_code" = "c"."company_code")))
        ), "sr" AS (
         SELECT "status_rules"."status_key" AS "status",
            "status_rules"."days",
            "status_rules"."next_status"
           FROM "mplan"."status_rules"
        )
 SELECT "row_number"() OVER (ORDER BY "src"."update_date" DESC NULLS LAST, "src"."created_at" DESC NULLS LAST) AS "update_id",
    "src"."company_code",
    "src"."company_name",
    "src"."company_telp",
    "src"."pic",
    "src"."pic_email",
    "src"."pic_whatsapp",
    "src"."update_notes",
    "src"."status",
    "src"."update_date",
    "src"."created_at",
    "src"."updated_at",
    "src"."created_by",
    "src"."updated_by",
        CASE
            WHEN ("src"."status" ~~ 'CUS%'::"text") THEN 'LANGGANAN'::"text"
            WHEN (("src"."status" ~~ 'QUOT%'::"text") OR ("src"."status" ~~ 'PRIO%'::"text")) THEN 'KONTRAK'::"text"
            WHEN (("src"."status" ~~ 'TELE%'::"text") OR ("src"."status" ~~ 'EMOL%'::"text")) THEN 'KLIEN BARU'::"text"
            ELSE 'BELUM KATEGORI'::"text"
        END AS "kategori",
    "sr"."next_status",
    "mplan"."add_business_days"("src"."update_date", "sr"."days") AS "next_date",
    ("mplan"."add_business_days"("src"."update_date", "sr"."days") >= CURRENT_DATE) AS "checking"
   FROM ("src"
     LEFT JOIN "sr" ON (("lower"("sr"."status") = "lower"(TRIM(BOTH FROM "src"."status")))));


ALTER VIEW "mplan"."updates_with_timeline_plus_v3" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."company_latest_update_v1" AS
 SELECT DISTINCT ON ("company_code") "company_code",
    "company_name",
    "company_telp",
    "pic",
    "pic_email",
    "pic_whatsapp",
    "status",
    "update_notes",
    "update_date",
    "kategori",
    "next_status",
    "next_date",
    "checking"
   FROM "mplan"."updates_with_timeline_plus_v3" "u"
  ORDER BY "company_code", "update_date" DESC NULLS LAST;


ALTER VIEW "mplan"."company_latest_update_v1" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."company_update_timeline" AS
 SELECT "u"."company_code",
    "c"."name" AS "company_name",
    "u"."status",
    "u"."update_notes",
    "u"."update_date",
    "u"."created_at",
    "u"."updated_at"
   FROM ("mplan"."updates" "u"
     JOIN "mplan"."companies" "c" ON (("c"."company_code" = "u"."company_code")))
  ORDER BY "u"."company_code", "u"."update_date" DESC;


ALTER VIEW "mplan"."company_update_timeline" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."updates_with_timeline_plus_v2" AS
 WITH "src" AS (
         SELECT COALESCE("c"."company_code", "u"."company_code") AS "company_code",
            "c"."name" AS "company_name",
            "c"."company_telp",
            "c"."pic",
            "c"."pic_email",
            "c"."pic_whatsapp",
            "u"."update_notes",
            "upper"(NULLIF(TRIM(BOTH FROM "u"."status"), ''::"text")) AS "status_from_col",
            ("regexp_matches"("upper"(COALESCE("u"."update_notes", ''::"text")), '(TELE|EMOL|EMFO|TEFO|QUOT|MEET|PRIO|CUSO|CUPRO|CUSD|CUGR|SELESAI|REJE[ A-Z]*)'::"text"))[1] AS "status_from_notes",
            ("u"."update_date")::"date" AS "update_date",
            "u"."created_at",
            "u"."updated_at",
            "u"."created_by",
            "u"."updated_by"
           FROM ("mplan"."updates" "u"
             LEFT JOIN "mplan"."companies" "c" ON (("u"."company_code" = "c"."company_code")))
        ), "ur" AS (
         SELECT DISTINCT ON ("src"."company_code") "src"."company_code",
            "src"."company_name",
            "src"."company_telp",
            "src"."pic",
            "src"."pic_email",
            "src"."pic_whatsapp",
            "src"."update_notes",
            COALESCE("src"."status_from_col", NULLIF(TRIM(BOTH FROM "src"."status_from_notes"), ''::"text")) AS "status",
            "src"."update_date",
            "src"."created_at",
            "src"."updated_at",
            "src"."created_by",
            "src"."updated_by"
           FROM "src"
          ORDER BY "src"."company_code", "src"."update_date" DESC NULLS LAST, "src"."created_at" DESC NULLS LAST
        ), "sr" AS (
         SELECT "status_rules"."status_key" AS "status",
            "status_rules"."days",
            "status_rules"."next_status"
           FROM "mplan"."status_rules"
        )
 SELECT "row_number"() OVER (ORDER BY "ur"."update_date" DESC NULLS LAST) AS "update_id",
    "ur"."company_code",
    "ur"."company_name",
    "ur"."company_telp",
    "ur"."pic",
    "ur"."pic_email",
    "ur"."pic_whatsapp",
    "ur"."update_notes",
    "ur"."status",
    "ur"."update_date",
    "ur"."created_at",
    "ur"."updated_at",
    "ur"."created_by",
    "ur"."updated_by",
        CASE
            WHEN ("ur"."status" ~~ 'CUS%'::"text") THEN 'LANGGANAN'::"text"
            WHEN (("ur"."status" ~~ 'QUOT%'::"text") OR ("ur"."status" ~~ 'PRIO%'::"text")) THEN 'KONTRAK'::"text"
            WHEN (("ur"."status" ~~ 'TELE%'::"text") OR ("ur"."status" ~~ 'EMOL%'::"text")) THEN 'KLIEN BARU'::"text"
            ELSE 'BELUM KATEGORI'::"text"
        END AS "kategori",
    "sr"."next_status",
    "mplan"."add_business_days"(COALESCE("ur"."update_date", CURRENT_DATE), COALESCE("sr"."days", 0)) AS "next_date"
   FROM ("ur"
     LEFT JOIN "sr" ON (("lower"("sr"."status") = "lower"(TRIM(BOTH FROM "ur"."status")))));


ALTER VIEW "mplan"."updates_with_timeline_plus_v2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."updates_with_timeline_plus" AS
 SELECT "update_id",
    "company_code",
    "company_name",
    "company_telp",
    "pic",
    "pic_email",
    "pic_whatsapp",
    "update_notes",
    "status" AS "status_singkat",
    "update_date",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by",
    "kategori",
    "next_status",
    "next_date"
   FROM "mplan"."updates_with_timeline_plus_v2";


ALTER VIEW "mplan"."updates_with_timeline_plus" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."company_with_last_update_v3" AS
 SELECT "c"."company_code",
    "c"."name" AS "company_name",
    "c"."kategori",
    "c"."company_telp",
    "c"."pic",
    "c"."pic_email",
    "c"."pic_whatsapp",
    ("u"."update_date")::timestamp without time zone AS "last_update_date",
    "u"."status_singkat" AS "last_status",
    "u"."update_notes",
    ("u"."next_date")::timestamp without time zone AS "next_date",
    "u"."next_status"
   FROM ("mplan"."companies" "c"
     LEFT JOIN LATERAL ( SELECT "u1"."update_date",
            "u1"."status_singkat",
            "u1"."update_notes",
            "u1"."next_date",
            "u1"."next_status"
           FROM "mplan"."updates_with_timeline_plus" "u1"
          WHERE ("u1"."company_code" = "c"."company_code")
          ORDER BY "u1"."update_date" DESC NULLS LAST
         LIMIT 1) "u" ON (true))
  ORDER BY "c"."name";


ALTER VIEW "mplan"."company_with_last_update_v3" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."daily_update_stats" AS
 SELECT ("update_date")::"date" AS "day",
    "count"("update_id") AS "total_updates",
    "count"(DISTINCT "company_code") AS "total_companies"
   FROM "mplan"."updates"
  GROUP BY (("update_date")::"date")
  ORDER BY (("update_date")::"date") DESC;


ALTER VIEW "mplan"."daily_update_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."email_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_code" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "template_key" "mplan"."email_template_key" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "scheduled_date" "date",
    "status" "mplan"."email_send_status" DEFAULT 'queued'::"mplan"."email_send_status" NOT NULL,
    "sent_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "mplan"."email_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_key" "mplan"."email_template_key" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "html_body" "text" NOT NULL,
    "text_body" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "mplan"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."logs" (
    "id" bigint NOT NULL,
    "action" "text",
    "table_name" "text",
    "details" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "mplan"."logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "mplan"."logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "mplan"."logs_id_seq" OWNED BY "mplan"."logs"."id";



CREATE OR REPLACE VIEW "mplan"."mv_status_distribution" AS
 SELECT "c"."kategori",
    "u"."status_singkat" AS "status",
    "count"(*) AS "total"
   FROM ("mplan"."updates_with_timeline_plus" "u"
     JOIN "mplan"."companies" "c" ON (("c"."company_code" = "u"."company_code")))
  WHERE ("u"."update_date" >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY "c"."kategori", "u"."status_singkat"
  ORDER BY "c"."kategori", "u"."status_singkat";


ALTER VIEW "mplan"."mv_status_distribution" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."mv_status_distribution_pivot" AS
 SELECT "c"."kategori",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'TELE'::"text") THEN 1
            ELSE 0
        END) AS "tele",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'EMOL'::"text") THEN 1
            ELSE 0
        END) AS "emol",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'EMFO'::"text") THEN 1
            ELSE 0
        END) AS "emfo",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'TEFO'::"text") THEN 1
            ELSE 0
        END) AS "tefo",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'QUOT'::"text") THEN 1
            ELSE 0
        END) AS "quot",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'MEET'::"text") THEN 1
            ELSE 0
        END) AS "meet",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'PRIO'::"text") THEN 1
            ELSE 0
        END) AS "prio",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'CUSO'::"text") THEN 1
            ELSE 0
        END) AS "cuso",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'CUPRO'::"text") THEN 1
            ELSE 0
        END) AS "cupro",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'CUSD'::"text") THEN 1
            ELSE 0
        END) AS "cusd",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'CUGR'::"text") THEN 1
            ELSE 0
        END) AS "cugr",
    "sum"(
        CASE
            WHEN ("u"."status_singkat" = 'SELESAI'::"text") THEN 1
            ELSE 0
        END) AS "selesai",
    "count"(*) AS "total"
   FROM ("mplan"."updates_with_timeline_plus" "u"
     JOIN "mplan"."companies" "c" ON (("c"."company_code" = "u"."company_code")))
  WHERE ("u"."update_date" >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY "c"."kategori"
  ORDER BY "c"."kategori";


ALTER VIEW "mplan"."mv_status_distribution_pivot" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."oauth_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "state" "text" NOT NULL,
    "redirect_to" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."oauth_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."post_draft_assets" (
    "draft_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "order_index" integer DEFAULT 0
);


ALTER TABLE "mplan"."post_draft_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."post_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "caption" "text",
    "first_comment" "text",
    "tags" "text"[],
    "geo" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."post_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."post_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "draft_id" "uuid",
    "account_id" "uuid",
    "channel_type" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "scheduled_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "result_post_id" "text",
    "result_permalink" "text",
    "error_message" "text",
    "platform" "text" DEFAULT 'instagram'::"text",
    "views" integer DEFAULT 0,
    "likes" integer DEFAULT 0,
    "comments" integer DEFAULT 0,
    "ctr" numeric(5,2) DEFAULT 0,
    "engagement_rate" numeric(5,2) DEFAULT 0
);


ALTER TABLE "mplan"."post_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."publish_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_id" "uuid",
    "run_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'queued'::"text",
    "attempt" integer DEFAULT 0,
    "last_error" "text"
);


ALTER TABLE "mplan"."publish_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."publish_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"(),
    "message" "text",
    "run_id" "uuid" DEFAULT "gen_random_uuid"(),
    "platform" "text",
    "account_id" "text",
    "account_name" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "caption" "text",
    "media_url" "text",
    "posted_url" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "mplan"."publish_logs" OWNER TO "postgres";


COMMENT ON TABLE "mplan"."publish_logs" IS 'Log utama hasil publish sosial media (1 baris per akun/platform).';



COMMENT ON COLUMN "mplan"."publish_logs"."run_id" IS 'UUID unik untuk satu kali proses publish (1 run_id bisa punya banyak detail logs)';



CREATE TABLE IF NOT EXISTS "mplan"."publish_logs_detail" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "published_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "log_id" "uuid",
    "step" "text",
    "level" "text" DEFAULT 'info'::"text",
    "message" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "publish_logs_detail_provider_check" CHECK (("provider" = ANY (ARRAY['instagram'::"text", 'tiktok'::"text", 'youtube'::"text", 'x'::"text"])))
);


ALTER TABLE "mplan"."publish_logs_detail" OWNER TO "postgres";


COMMENT ON TABLE "mplan"."publish_logs_detail" IS 'Detail step-by-step dari setiap publish run.';



COMMENT ON COLUMN "mplan"."publish_logs_detail"."log_id" IS 'UUID induk dari tabel publish_logs (foreign key, tiap detail log terhubung ke satu log utama)';



COMMENT ON COLUMN "mplan"."publish_logs_detail"."step" IS 'Tahapan proses publish (prepare, upload, finish, dsb)';



COMMENT ON COLUMN "mplan"."publish_logs_detail"."level" IS 'Level log: info, warn, error';



COMMENT ON COLUMN "mplan"."publish_logs_detail"."message" IS 'Pesan detail log (text)';



COMMENT ON COLUMN "mplan"."publish_logs_detail"."meta" IS 'Data tambahan JSON untuk debug';



CREATE TABLE IF NOT EXISTS "mplan"."share_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "snapshot" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "mplan"."share_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."social_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "account_external_id" "text" NOT NULL,
    "account_handle" "text",
    "scopes" "text"[],
    "access_token" "bytea" NOT NULL,
    "refresh_token" "bytea",
    "token_expires_at" timestamp with time zone,
    "meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "publish_mode" "text" DEFAULT 'simulated'::"text",
    CONSTRAINT "social_accounts_provider_check" CHECK (("provider" = ANY (ARRAY['instagram'::"text", 'tiktok'::"text", 'youtube'::"text", 'x'::"text"]))),
    CONSTRAINT "social_accounts_publish_mode_check" CHECK (("publish_mode" = ANY (ARRAY['simulated'::"text", 'real'::"text"])))
);


ALTER TABLE "mplan"."social_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."social_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "metrics" "jsonb" NOT NULL
);


ALTER TABLE "mplan"."social_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."social_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "platform_post_id" "text",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "media_type" "text" DEFAULT 'image'::"text" NOT NULL,
    "caption" "text",
    "media_url" "text",
    "schedule_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "api_response" "jsonb",
    "api_status" "text",
    "api_url" "text",
    "token_used" "text",
    "provider_response_code" integer,
    CONSTRAINT "social_posts_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text", 'text'::"text"]))),
    CONSTRAINT "social_posts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'publishing'::"text", 'published'::"text", 'failed'::"text", 'archived'::"text"])))
);


ALTER TABLE "mplan"."social_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."social_posts_manual" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "platform" "text" NOT NULL,
    "account_name" "text" NOT NULL,
    "post_id" "text",
    "caption" "text",
    "hashtags" "text",
    "post_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "views" integer DEFAULT 0,
    "likes" integer DEFAULT 0,
    "comments" integer DEFAULT 0,
    "shares" integer DEFAULT 0,
    "ctr" numeric(5,2),
    "engagement_rate" numeric(5,2),
    "source" "text" DEFAULT 'manual'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "social_posts_manual_platform_check" CHECK (("platform" = ANY (ARRAY['tiktok'::"text", 'instagram'::"text", 'youtube'::"text"])))
);


ALTER TABLE "mplan"."social_posts_manual" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."staging_companies" (
    "company_name" "text",
    "company_telp" "text",
    "pic" "text",
    "pic_email" "text",
    "pic_whatsapp" "text"
);


ALTER TABLE "mplan"."staging_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."staging_updates" (
    "company_name" "text",
    "update_notes" "text",
    "status" "text",
    "update_date" "date"
);


ALTER TABLE "mplan"."staging_updates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."status_distribution" AS
 SELECT "status",
    "count"(*) AS "total_status"
   FROM "mplan"."updates"
  GROUP BY "status"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "mplan"."status_distribution" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "mplan"."test_companies" (
    "id" bigint,
    "company_code" "text"
);


ALTER TABLE "mplan"."test_companies" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."timeline_pro" AS
 SELECT "c"."company_code",
    "c"."name" AS "company_name",
    "jsonb_agg"("jsonb_build_object"('timestamp', "a"."created_at", 'action', "a"."action", 'user_email', "a"."user_email", 'old_status', ("a"."old_data" ->> 'status'::"text"), 'new_status', ("a"."new_data" ->> 'status'::"text"), 'update_notes', COALESCE(("a"."new_data" ->> 'update_notes'::"text"), ("a"."old_data" ->> 'update_notes'::"text")), 'diff',
        CASE
            WHEN ("a"."action" = 'UPDATE'::"text") THEN "mplan"."jsonb_diff"("a"."old_data", "a"."new_data")
            ELSE NULL::"jsonb"
        END) ORDER BY "a"."created_at") AS "timeline"
   FROM ("mplan"."companies" "c"
     LEFT JOIN "mplan"."audit_logs" "a" ON ((COALESCE(("a"."new_data" ->> 'company_code'::"text"), ("a"."old_data" ->> 'company_code'::"text")) = "c"."company_code")))
  GROUP BY "c"."company_code", "c"."name"
  ORDER BY "c"."name";


ALTER VIEW "mplan"."timeline_pro" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."top_active_companies" AS
 SELECT "c"."company_code",
    "c"."name" AS "company_name",
    "count"("u"."update_id") AS "total_updates",
    "max"("u"."update_date") AS "last_update_date",
    "max"("u"."status") AS "latest_status"
   FROM ("mplan"."companies" "c"
     LEFT JOIN "mplan"."updates" "u" ON (("u"."company_code" = "c"."company_code")))
  GROUP BY "c"."company_code", "c"."name"
  ORDER BY ("count"("u"."update_id")) DESC, ("max"("u"."update_date")) DESC
 LIMIT 10;


ALTER VIEW "mplan"."top_active_companies" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "mplan"."updates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "mplan"."updates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "mplan"."updates_id_seq" OWNED BY "mplan"."updates"."id";



CREATE OR REPLACE VIEW "mplan"."updates_with_company" AS
 SELECT "u"."id",
    "u"."company_code",
    "c"."name" AS "company_name",
    "c"."company_telp",
    "c"."pic",
    "c"."pic_email",
    "c"."pic_whatsapp",
    "u"."status",
    "u"."update_notes",
    "u"."update_date",
    "u"."created_at",
    "u"."updated_at"
   FROM ("mplan"."updates" "u"
     JOIN "mplan"."companies" "c" ON (("u"."company_code" = "c"."company_code")))
  ORDER BY "u"."update_date" DESC, "u"."created_at" DESC;


ALTER VIEW "mplan"."updates_with_company" OWNER TO "postgres";


CREATE OR REPLACE VIEW "mplan"."updates_with_timeline_editable_v3" AS
 SELECT "u"."update_id",
    "u"."company_code",
    "c"."name" AS "company_name",
    "c"."kategori",
    "c"."company_telp",
    "c"."pic",
    "c"."pic_email",
    "c"."pic_whatsapp",
    "u"."status",
    "u"."next_status",
    "u"."next_date",
    "u"."update_date",
    "u"."update_notes",
        CASE
            WHEN ("u"."next_date" IS NULL) THEN '⚠️ Belum dijadwalkan'::"text"
            WHEN ("u"."next_date" < ("now"())::"date") THEN '⚠️ Terlambat'::"text"
            ELSE '✅ On Track'::"text"
        END AS "checking",
        CASE
            WHEN ("u"."next_status" IS NULL) THEN NULL::"text"
            ELSE "u"."next_status"
        END AS "next_step"
   FROM ("mplan"."updates" "u"
     JOIN "mplan"."companies" "c" USING ("company_code"));


ALTER VIEW "mplan"."updates_with_timeline_editable_v3" OWNER TO "postgres";


ALTER TABLE ONLY "mplan"."activity_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"mplan"."activity_log_id_seq"'::"regclass");



ALTER TABLE ONLY "mplan"."analytics_ai_forecast_v1" ALTER COLUMN "id" SET DEFAULT "nextval"('"mplan"."analytics_ai_forecast_v1_id_seq"'::"regclass");



ALTER TABLE ONLY "mplan"."audit_logs" ALTER COLUMN "log_id" SET DEFAULT "nextval"('"mplan"."audit_logs_log_id_seq"'::"regclass");



ALTER TABLE ONLY "mplan"."logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"mplan"."logs_id_seq"'::"regclass");



ALTER TABLE ONLY "mplan"."updates" ALTER COLUMN "id" SET DEFAULT "nextval"('"mplan"."updates_id_seq"'::"regclass");



ALTER TABLE ONLY "mplan"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."analytics_ai_forecast_v1"
    ADD CONSTRAINT "analytics_ai_forecast_v1_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."analytics_perf_logs"
    ADD CONSTRAINT "analytics_perf_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."analytics_predicted_ttl"
    ADD CONSTRAINT "analytics_predicted_ttl_pkey" PRIMARY KEY ("section_key");



ALTER TABLE ONLY "mplan"."anomaly_alert_logs"
    ADD CONSTRAINT "anomaly_alert_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "mplan"."companies"
    ADD CONSTRAINT "companies_company_code_key" UNIQUE ("company_code");



ALTER TABLE ONLY "mplan"."companies"
    ADD CONSTRAINT "companies_name_key" UNIQUE ("name");



ALTER TABLE ONLY "mplan"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."email_queue"
    ADD CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."email_templates"
    ADD CONSTRAINT "email_templates_template_key_key" UNIQUE ("template_key");



ALTER TABLE ONLY "mplan"."event_logs"
    ADD CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."logs"
    ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."oauth_states"
    ADD CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."post_draft_assets"
    ADD CONSTRAINT "post_draft_assets_pkey" PRIMARY KEY ("draft_id", "asset_id");



ALTER TABLE ONLY "mplan"."post_drafts"
    ADD CONSTRAINT "post_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."post_targets"
    ADD CONSTRAINT "post_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."publish_jobs"
    ADD CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."publish_logs_detail"
    ADD CONSTRAINT "publish_logs_detail_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."publish_logs"
    ADD CONSTRAINT "publish_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."revenue_logs"
    ADD CONSTRAINT "revenue_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."share_links"
    ADD CONSTRAINT "share_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."share_links"
    ADD CONSTRAINT "share_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "mplan"."snapshot_ttl_stats"
    ADD CONSTRAINT "snapshot_ttl_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."social_accounts"
    ADD CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."social_accounts"
    ADD CONSTRAINT "social_accounts_user_id_provider_account_external_id_key" UNIQUE ("user_id", "provider", "account_external_id");



ALTER TABLE ONLY "mplan"."social_metrics"
    ADD CONSTRAINT "social_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."social_posts_manual"
    ADD CONSTRAINT "social_posts_manual_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."social_posts"
    ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."status_rules"
    ADD CONSTRAINT "status_rules_pkey" PRIMARY KEY ("status_key");



ALTER TABLE ONLY "mplan"."updates"
    ADD CONSTRAINT "updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "mplan"."updates"
    ADD CONSTRAINT "updates_update_id_key" UNIQUE ("update_id");



CREATE INDEX "analytics_perf_logs_section_idx" ON "mplan"."analytics_perf_logs" USING "btree" ("section_key");



CREATE INDEX "event_logs_section_time_idx" ON "mplan"."event_logs" USING "btree" ("section_key", "event_time" DESC);



CREATE INDEX "idx_companies_company_code" ON "mplan"."companies" USING "btree" ("company_code");



CREATE INDEX "idx_companies_kategori" ON "mplan"."companies" USING "btree" ("kategori");



CREATE INDEX "idx_social_platform" ON "mplan"."social_posts_manual" USING "btree" ("platform");



CREATE INDEX "idx_social_post_date" ON "mplan"."social_posts_manual" USING "btree" ("post_date");



CREATE INDEX "idx_updates_company_code" ON "mplan"."updates" USING "btree" ("company_code");



CREATE INDEX "idx_updates_status" ON "mplan"."updates" USING "btree" ("status");



CREATE INDEX "idx_updates_update_date" ON "mplan"."updates" USING "btree" ("update_date");



CREATE UNIQUE INDEX "uq_email_queue_once_per_day" ON "mplan"."email_queue" USING "btree" ("recipient_email", "template_key", "scheduled_date");



CREATE OR REPLACE TRIGGER "analytics_perf_logs_updated_at" BEFORE UPDATE ON "mplan"."analytics_perf_logs" FOR EACH ROW EXECUTE FUNCTION "mplan"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_ai_forecast_alert" AFTER INSERT OR UPDATE ON "mplan"."analytics_ai_forecast_v1" FOR EACH ROW EXECUTE FUNCTION "mplan"."trigger_anomaly_alert"();



CREATE OR REPLACE TRIGGER "trg_audit_companies" AFTER INSERT OR DELETE OR UPDATE ON "mplan"."companies" FOR EACH ROW EXECUTE FUNCTION "mplan"."log_audit_changes"();



CREATE OR REPLACE TRIGGER "trg_audit_updates" AFTER INSERT OR DELETE OR UPDATE ON "mplan"."updates" FOR EACH ROW EXECUTE FUNCTION "mplan"."log_audit_changes"();



CREATE OR REPLACE TRIGGER "trg_auto_publish_log_detail" AFTER INSERT ON "mplan"."publish_logs" FOR EACH ROW EXECUTE FUNCTION "mplan"."fn_auto_publish_log_detail"();



CREATE OR REPLACE TRIGGER "trg_auto_timestamp_updates" BEFORE INSERT OR UPDATE ON "mplan"."updates" FOR EACH ROW EXECUTE FUNCTION "mplan"."auto_timestamp"();



CREATE OR REPLACE TRIGGER "trg_autocreate_emol_on_tele" AFTER INSERT ON "mplan"."updates" FOR EACH ROW EXECUTE FUNCTION "mplan"."autocreate_emol_on_tele"();



CREATE OR REPLACE TRIGGER "trg_gen_company_code" BEFORE INSERT ON "mplan"."companies" FOR EACH ROW EXECUTE FUNCTION "mplan"."generate_company_code"();



CREATE OR REPLACE TRIGGER "trg_queue_email_on_updates" AFTER INSERT ON "mplan"."updates" FOR EACH ROW EXECUTE FUNCTION "mplan"."queue_email_on_status"();



CREATE OR REPLACE TRIGGER "trg_set_scheduled_date" BEFORE INSERT OR UPDATE ON "mplan"."email_queue" FOR EACH ROW EXECUTE FUNCTION "mplan"."set_scheduled_date"();



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "mplan"."updates" FOR EACH ROW EXECUTE FUNCTION "mplan"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_staging_companies" AFTER INSERT OR UPDATE ON "mplan"."staging_companies" FOR EACH ROW EXECUTE FUNCTION "mplan"."sync_staging_companies"();



CREATE OR REPLACE TRIGGER "trg_sync_staging_updates" AFTER INSERT OR UPDATE ON "mplan"."staging_updates" FOR EACH ROW EXECUTE FUNCTION "mplan"."sync_staging_updates"();



CREATE OR REPLACE TRIGGER "trg_update_timestamp" BEFORE UPDATE ON "mplan"."companies" FOR EACH ROW EXECUTE FUNCTION "mplan"."update_timestamp"();



CREATE OR REPLACE TRIGGER "trg_update_timestamp_social_posts" BEFORE UPDATE ON "mplan"."social_posts_manual" FOR EACH ROW EXECUTE FUNCTION "mplan"."update_timestamp_social_posts"();



CREATE OR REPLACE TRIGGER "updates_view_delete" INSTEAD OF DELETE ON "mplan"."updates_with_timeline_editable_v3" FOR EACH ROW EXECUTE FUNCTION "mplan"."delete_view_trigger"();



CREATE OR REPLACE TRIGGER "updates_view_insert" INSTEAD OF INSERT ON "mplan"."updates_with_timeline_editable_v3" FOR EACH ROW EXECUTE FUNCTION "mplan"."insert_view_trigger"();



CREATE OR REPLACE TRIGGER "updates_view_update" INSTEAD OF UPDATE ON "mplan"."updates_with_timeline_editable_v3" FOR EACH ROW EXECUTE FUNCTION "mplan"."update_view_trigger"();



ALTER TABLE ONLY "mplan"."updates"
    ADD CONSTRAINT "fk_updates_company" FOREIGN KEY ("company_code") REFERENCES "mplan"."companies"("company_code") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."oauth_states"
    ADD CONSTRAINT "oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."post_draft_assets"
    ADD CONSTRAINT "post_draft_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "mplan"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."post_draft_assets"
    ADD CONSTRAINT "post_draft_assets_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "mplan"."post_drafts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."post_targets"
    ADD CONSTRAINT "post_targets_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "mplan"."post_drafts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."publish_jobs"
    ADD CONSTRAINT "publish_jobs_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "mplan"."post_targets"("id");



ALTER TABLE ONLY "mplan"."publish_logs_detail"
    ADD CONSTRAINT "publish_logs_detail_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "mplan"."publish_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."revenue_logs"
    ADD CONSTRAINT "revenue_logs_company_code_fkey" FOREIGN KEY ("company_code") REFERENCES "mplan"."companies"("company_code");



ALTER TABLE ONLY "mplan"."social_accounts"
    ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."social_metrics"
    ADD CONSTRAINT "social_metrics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "mplan"."social_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."social_posts"
    ADD CONSTRAINT "social_posts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "mplan"."social_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "mplan"."social_posts"
    ADD CONSTRAINT "social_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all bypass on email_queue" ON "mplan"."email_queue" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on companies" ON "mplan"."companies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on email_queue" ON "mplan"."email_queue" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on logs" ON "mplan"."logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all on updates" ON "mplan"."updates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow anon insert on email_queue" ON "mplan"."email_queue" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anon insert on updates" ON "mplan"."updates" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anon insert updates" ON "mplan"."updates" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow anon select companies" ON "mplan"."companies" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon select on companies" ON "mplan"."companies" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon select on email_queue" ON "mplan"."email_queue" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon select on updates" ON "mplan"."updates" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon select updates" ON "mplan"."updates" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow anon update updates" ON "mplan"."updates" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow insert staging_companies" ON "mplan"."staging_companies" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow insert staging_updates" ON "mplan"."staging_updates" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow select companies" ON "mplan"."companies" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow select companies for anon" ON "mplan"."companies" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow select staging_companies" ON "mplan"."staging_companies" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow select staging_updates" ON "mplan"."staging_updates" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow select updates" ON "mplan"."updates" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow select updates for anon" ON "mplan"."updates" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read companies" ON "mplan"."companies" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read updates" ON "mplan"."updates" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Authenticated full access companies" ON "mplan"."companies" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access email_templates" ON "mplan"."email_templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated full access updates" ON "mplan"."updates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "allow read companies" ON "mplan"."companies" FOR SELECT USING (true);



ALTER TABLE "mplan"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "companies - authenticated delete" ON "mplan"."companies" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "companies - authenticated insert" ON "mplan"."companies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "companies - authenticated select" ON "mplan"."companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "companies - authenticated update" ON "mplan"."companies" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "companies delete (dev)" ON "mplan"."companies" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "companies insert (dev)" ON "mplan"."companies" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "companies read (dev)" ON "mplan"."companies" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "companies update (dev)" ON "mplan"."companies" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "delete_authenticated" ON "mplan"."email_templates" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "dev_write_anon" ON "mplan"."email_templates" USING (("auth"."role"() = 'anon'::"text")) WITH CHECK (("auth"."role"() = 'anon'::"text"));



ALTER TABLE "mplan"."email_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "mplan"."email_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_templates - authenticated delete" ON "mplan"."email_templates" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "email_templates - authenticated insert" ON "mplan"."email_templates" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "email_templates - authenticated select" ON "mplan"."email_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "email_templates - authenticated update" ON "mplan"."email_templates" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "insert_authenticated" ON "mplan"."email_templates" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "insert_queue" ON "mplan"."email_queue" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "mplan"."logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "mplan"."oauth_states" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "oauth_states_crud_own" ON "mplan"."oauth_states" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "oauth_states_select_own" ON "mplan"."oauth_states" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "promote_companies_for_superadmin" ON "mplan"."companies" FOR INSERT TO "super_admin" WITH CHECK (true);



CREATE POLICY "promote_updates_for_superadmin" ON "mplan"."updates" FOR INSERT TO "super_admin" WITH CHECK (true);



CREATE POLICY "read_queue" ON "mplan"."email_queue" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_templates" ON "mplan"."email_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "select_all" ON "mplan"."email_templates" FOR SELECT USING (true);



CREATE POLICY "social_accounts_crud_own" ON "mplan"."social_accounts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "social_accounts_select_own" ON "mplan"."social_accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "social_metrics_insert_by_owner" ON "mplan"."social_metrics" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "mplan"."social_posts" "p"
  WHERE (("p"."id" = "social_metrics"."post_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "social_metrics_select_by_owner" ON "mplan"."social_metrics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "mplan"."social_posts" "p"
  WHERE (("p"."id" = "social_metrics"."post_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "social_posts_crud_own" ON "mplan"."social_posts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "social_posts_select_own" ON "mplan"."social_posts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "super_admin full companies" ON "mplan"."companies" TO "super_admin" USING (true) WITH CHECK (true);



CREATE POLICY "super_admin full staging_companies" ON "mplan"."staging_companies" TO "super_admin" USING (true) WITH CHECK (true);



CREATE POLICY "super_admin full staging_updates" ON "mplan"."staging_updates" TO "super_admin" USING (true) WITH CHECK (true);



CREATE POLICY "super_admin full updates" ON "mplan"."updates" TO "super_admin" USING (true) WITH CHECK (true);



CREATE POLICY "superadmin_full_companies" ON "mplan"."companies" TO "super_admin" USING (true) WITH CHECK (true);



CREATE POLICY "superadmin_full_updates" ON "mplan"."updates" TO "super_admin" USING (true) WITH CHECK (true);



CREATE POLICY "update_authenticated" ON "mplan"."email_templates" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "update_queue" ON "mplan"."email_queue" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "update_templates" ON "mplan"."email_templates" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "updates - authenticated delete" ON "mplan"."updates" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "updates - authenticated insert" ON "mplan"."updates" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "updates - authenticated select" ON "mplan"."updates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "updates - authenticated update" ON "mplan"."updates" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "updates delete (dev)" ON "mplan"."updates" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "updates insert (dev)" ON "mplan"."updates" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "updates read (dev)" ON "mplan"."updates" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "updates update (dev)" ON "mplan"."updates" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "write_templates" ON "mplan"."email_templates" FOR INSERT TO "authenticated" WITH CHECK (true);



GRANT USAGE ON SCHEMA "mplan" TO "anon";
GRANT USAGE ON SCHEMA "mplan" TO "authenticated";
GRANT USAGE ON SCHEMA "mplan" TO "super_admin";
GRANT USAGE ON SCHEMA "mplan" TO "service_role";



GRANT ALL ON FUNCTION "mplan"."add_business_days"("start_date" "date", "add_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "mplan"."auto_audit"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."auto_promote_staging"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."auto_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."autocreate_emol_on_tele"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."delete_view_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."enqueue_scheduled_posts"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."fn_auto_publish_log_detail"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."generate_company_code"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_ai_forecast_v1"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_forecast_v1"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_growth_v1"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_section_v1"("section" "text", "date_start" "date", "date_end" "date", "kategori_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_section_v2"("p_section" "text", "p_date_start" "date", "p_date_end" "date", "p_kategori" "text", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_summary"("period" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_summary_v2"("period" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_analytics_summary_v3"("period" "text", "kategori_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_anomaly_alert_stats_v1"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_anomaly_alert_v1"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_revenue_timeseries_v1"("date_start" "date", "date_end" "date", "kategori_filter" "text", "granularity" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_social_summary_v1"("date_start" "date", "date_end" "date", "platforms" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_table_kategori_v1"("date_start" "date", "date_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_table_status_v1"("date_start" "date", "date_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."get_timeseries_compare_v1"("type" "text", "keys" "text"[], "date_start" "date", "date_end" "date", "granularity" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."insert_view_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."jsonb_diff"("old_data" "jsonb", "new_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."log_audit_changes"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."next_business_day"("d" "date") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."next_send_window"("now_utc" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "mplan"."queue_email_on_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "mplan"."queue_email_on_status"() TO "authenticated";
GRANT ALL ON FUNCTION "mplan"."queue_email_on_status"() TO "anon";
GRANT ALL ON FUNCTION "mplan"."queue_email_on_status"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."random_code_9"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."sec_decrypt"("encrypted" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."sec_decrypt"("p_encrypted" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."sec_encrypt"("p_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."set_app_enc_key"("p_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "mplan"."set_scheduled_date"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."sync_staging_companies"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."sync_staging_to_main"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."sync_staging_updates"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."trigger_anomaly_alert"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."update_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."update_timestamp_social_posts"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."update_view_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "mplan"."upsert_social_account"("p_user_id" "uuid", "p_provider" "text", "p_external_id" "text", "p_handle" "text", "p_scopes" "text"[], "p_access_token" "text", "p_refresh_token" "text", "p_expires_at" timestamp with time zone, "p_meta" "jsonb") TO "service_role";



GRANT ALL ON TABLE "mplan"."activity_log" TO "anon";
GRANT ALL ON TABLE "mplan"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "mplan"."activity_log" TO "service_role";



GRANT ALL ON SEQUENCE "mplan"."activity_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "mplan"."activity_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "mplan"."activity_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "mplan"."activity_log_with_user_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."activity_log_with_user_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."activity_log_with_user_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."event_logs" TO "anon";
GRANT ALL ON TABLE "mplan"."event_logs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."event_logs" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_activity_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_activity_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_activity_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_ai_forecast_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_ai_forecast_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_ai_forecast_v1" TO "service_role";



GRANT ALL ON SEQUENCE "mplan"."analytics_ai_forecast_v1_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "mplan"."analytics_ai_forecast_v1_id_seq" TO "authenticated";



GRANT ALL ON TABLE "mplan"."analytics_perf_logs" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_perf_logs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_perf_logs" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_anomaly_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_anomaly_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_anomaly_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_cache_health_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_cache_health_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_cache_health_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_perf_timeline_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_perf_timeline_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_perf_timeline_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_predicted_ttl" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_predicted_ttl" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_predicted_ttl" TO "service_role";



GRANT ALL ON TABLE "mplan"."companies" TO "anon";
GRANT ALL ON TABLE "mplan"."companies" TO "authenticated";
GRANT ALL ON TABLE "mplan"."companies" TO "service_role";



GRANT ALL ON TABLE "mplan"."revenue_logs" TO "anon";
GRANT ALL ON TABLE "mplan"."revenue_logs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."revenue_logs" TO "service_role";



GRANT ALL ON TABLE "mplan"."updates" TO "anon";
GRANT ALL ON TABLE "mplan"."updates" TO "authenticated";
GRANT ALL ON TABLE "mplan"."updates" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_summary_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_summary_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_summary_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."snapshot_ttl_stats" TO "anon";
GRANT ALL ON TABLE "mplan"."snapshot_ttl_stats" TO "authenticated";
GRANT ALL ON TABLE "mplan"."snapshot_ttl_stats" TO "service_role";



GRANT ALL ON TABLE "mplan"."snapshot_ttl_stats_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."snapshot_ttl_stats_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."snapshot_ttl_stats_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_system_health_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_system_health_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_system_health_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."analytics_weekly_summary_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."analytics_weekly_summary_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."analytics_weekly_summary_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."anomaly_alert_logs" TO "anon";
GRANT ALL ON TABLE "mplan"."anomaly_alert_logs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."anomaly_alert_logs" TO "service_role";



GRANT ALL ON TABLE "mplan"."anomaly_alert_logs_view" TO "anon";
GRANT ALL ON TABLE "mplan"."anomaly_alert_logs_view" TO "authenticated";
GRANT ALL ON TABLE "mplan"."anomaly_alert_logs_view" TO "service_role";



GRANT ALL ON TABLE "mplan"."anomaly_alert_summary_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."anomaly_alert_summary_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."anomaly_alert_summary_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."anomaly_alert_trend_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."anomaly_alert_trend_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."anomaly_alert_trend_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."assets" TO "anon";
GRANT ALL ON TABLE "mplan"."assets" TO "authenticated";
GRANT ALL ON TABLE "mplan"."assets" TO "service_role";



GRANT ALL ON TABLE "mplan"."audit_logs" TO "anon";
GRANT ALL ON TABLE "mplan"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "mplan"."audit_logs_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "mplan"."audit_logs_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "mplan"."audit_logs_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "mplan"."audit_view" TO "anon";
GRANT ALL ON TABLE "mplan"."audit_view" TO "authenticated";
GRANT ALL ON TABLE "mplan"."audit_view" TO "service_role";



GRANT ALL ON SEQUENCE "mplan"."company_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "mplan"."company_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "mplan"."company_code_seq" TO "service_role";



GRANT ALL ON TABLE "mplan"."status_rules" TO "anon";
GRANT ALL ON TABLE "mplan"."status_rules" TO "authenticated";
GRANT ALL ON TABLE "mplan"."status_rules" TO "service_role";



GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus_v3" TO "anon";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus_v3" TO "authenticated";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus_v3" TO "service_role";



GRANT ALL ON TABLE "mplan"."company_latest_update_v1" TO "anon";
GRANT ALL ON TABLE "mplan"."company_latest_update_v1" TO "authenticated";
GRANT ALL ON TABLE "mplan"."company_latest_update_v1" TO "service_role";



GRANT ALL ON TABLE "mplan"."company_update_timeline" TO "anon";
GRANT ALL ON TABLE "mplan"."company_update_timeline" TO "authenticated";
GRANT ALL ON TABLE "mplan"."company_update_timeline" TO "service_role";



GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus_v2" TO "anon";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus_v2" TO "authenticated";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus_v2" TO "service_role";



GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus" TO "anon";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus" TO "authenticated";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_plus" TO "service_role";



GRANT ALL ON TABLE "mplan"."company_with_last_update_v3" TO "anon";
GRANT ALL ON TABLE "mplan"."company_with_last_update_v3" TO "authenticated";
GRANT ALL ON TABLE "mplan"."company_with_last_update_v3" TO "service_role";



GRANT ALL ON TABLE "mplan"."daily_update_stats" TO "anon";
GRANT ALL ON TABLE "mplan"."daily_update_stats" TO "authenticated";
GRANT ALL ON TABLE "mplan"."daily_update_stats" TO "service_role";



GRANT ALL ON TABLE "mplan"."email_queue" TO "anon";
GRANT ALL ON TABLE "mplan"."email_queue" TO "authenticated";
GRANT ALL ON TABLE "mplan"."email_queue" TO "service_role";



GRANT ALL ON TABLE "mplan"."email_templates" TO "anon";
GRANT ALL ON TABLE "mplan"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "mplan"."email_templates" TO "service_role";



GRANT ALL ON TABLE "mplan"."logs" TO "anon";
GRANT ALL ON TABLE "mplan"."logs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."logs" TO "service_role";



GRANT ALL ON SEQUENCE "mplan"."logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "mplan"."logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "mplan"."logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "mplan"."mv_status_distribution" TO "anon";
GRANT ALL ON TABLE "mplan"."mv_status_distribution" TO "authenticated";
GRANT ALL ON TABLE "mplan"."mv_status_distribution" TO "service_role";



GRANT ALL ON TABLE "mplan"."mv_status_distribution_pivot" TO "anon";
GRANT ALL ON TABLE "mplan"."mv_status_distribution_pivot" TO "authenticated";
GRANT ALL ON TABLE "mplan"."mv_status_distribution_pivot" TO "service_role";



GRANT ALL ON TABLE "mplan"."oauth_states" TO "anon";
GRANT ALL ON TABLE "mplan"."oauth_states" TO "authenticated";
GRANT ALL ON TABLE "mplan"."oauth_states" TO "service_role";



GRANT ALL ON TABLE "mplan"."post_draft_assets" TO "anon";
GRANT ALL ON TABLE "mplan"."post_draft_assets" TO "authenticated";
GRANT ALL ON TABLE "mplan"."post_draft_assets" TO "service_role";



GRANT ALL ON TABLE "mplan"."post_drafts" TO "anon";
GRANT ALL ON TABLE "mplan"."post_drafts" TO "authenticated";
GRANT ALL ON TABLE "mplan"."post_drafts" TO "service_role";



GRANT ALL ON TABLE "mplan"."post_targets" TO "anon";
GRANT ALL ON TABLE "mplan"."post_targets" TO "authenticated";
GRANT ALL ON TABLE "mplan"."post_targets" TO "service_role";



GRANT ALL ON TABLE "mplan"."publish_jobs" TO "anon";
GRANT ALL ON TABLE "mplan"."publish_jobs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."publish_jobs" TO "service_role";



GRANT ALL ON TABLE "mplan"."publish_logs" TO "anon";
GRANT ALL ON TABLE "mplan"."publish_logs" TO "authenticated";
GRANT ALL ON TABLE "mplan"."publish_logs" TO "service_role";



GRANT ALL ON TABLE "mplan"."publish_logs_detail" TO "anon";
GRANT ALL ON TABLE "mplan"."publish_logs_detail" TO "authenticated";
GRANT ALL ON TABLE "mplan"."publish_logs_detail" TO "service_role";



GRANT ALL ON TABLE "mplan"."share_links" TO "anon";
GRANT ALL ON TABLE "mplan"."share_links" TO "authenticated";
GRANT ALL ON TABLE "mplan"."share_links" TO "service_role";



GRANT ALL ON TABLE "mplan"."social_accounts" TO "anon";
GRANT ALL ON TABLE "mplan"."social_accounts" TO "authenticated";
GRANT ALL ON TABLE "mplan"."social_accounts" TO "service_role";



GRANT ALL ON TABLE "mplan"."social_metrics" TO "anon";
GRANT ALL ON TABLE "mplan"."social_metrics" TO "authenticated";
GRANT ALL ON TABLE "mplan"."social_metrics" TO "service_role";



GRANT ALL ON TABLE "mplan"."social_posts" TO "anon";
GRANT ALL ON TABLE "mplan"."social_posts" TO "authenticated";
GRANT ALL ON TABLE "mplan"."social_posts" TO "service_role";



GRANT ALL ON TABLE "mplan"."social_posts_manual" TO "anon";
GRANT ALL ON TABLE "mplan"."social_posts_manual" TO "authenticated";
GRANT ALL ON TABLE "mplan"."social_posts_manual" TO "service_role";



GRANT ALL ON TABLE "mplan"."staging_companies" TO "anon";
GRANT ALL ON TABLE "mplan"."staging_companies" TO "authenticated";
GRANT ALL ON TABLE "mplan"."staging_companies" TO "service_role";



GRANT ALL ON TABLE "mplan"."staging_updates" TO "anon";
GRANT ALL ON TABLE "mplan"."staging_updates" TO "authenticated";
GRANT ALL ON TABLE "mplan"."staging_updates" TO "service_role";



GRANT ALL ON TABLE "mplan"."status_distribution" TO "anon";
GRANT ALL ON TABLE "mplan"."status_distribution" TO "authenticated";
GRANT ALL ON TABLE "mplan"."status_distribution" TO "service_role";



GRANT ALL ON TABLE "mplan"."test_companies" TO "anon";
GRANT ALL ON TABLE "mplan"."test_companies" TO "authenticated";
GRANT ALL ON TABLE "mplan"."test_companies" TO "service_role";



GRANT ALL ON TABLE "mplan"."timeline_pro" TO "anon";
GRANT ALL ON TABLE "mplan"."timeline_pro" TO "authenticated";
GRANT ALL ON TABLE "mplan"."timeline_pro" TO "service_role";



GRANT ALL ON TABLE "mplan"."top_active_companies" TO "anon";
GRANT ALL ON TABLE "mplan"."top_active_companies" TO "authenticated";
GRANT ALL ON TABLE "mplan"."top_active_companies" TO "service_role";



GRANT ALL ON SEQUENCE "mplan"."updates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "mplan"."updates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "mplan"."updates_id_seq" TO "service_role";



GRANT ALL ON TABLE "mplan"."updates_with_company" TO "anon";
GRANT ALL ON TABLE "mplan"."updates_with_company" TO "authenticated";
GRANT ALL ON TABLE "mplan"."updates_with_company" TO "service_role";



GRANT ALL ON TABLE "mplan"."updates_with_timeline_editable_v3" TO "anon";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_editable_v3" TO "authenticated";
GRANT ALL ON TABLE "mplan"."updates_with_timeline_editable_v3" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mplan" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mplan" GRANT ALL ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mplan" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mplan" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mplan" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "mplan" GRANT ALL ON TABLES TO "service_role";




RESET ALL;
