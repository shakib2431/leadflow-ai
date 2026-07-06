# Revenue Intelligence SQL Migration Scripts

## 1. Create revenue_forecasts

```sql
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id BIGSERIAL PRIMARY KEY,
  business_id TEXT NOT NULL,
  forecast_name TEXT NOT NULL DEFAULT 'Current Forecast',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  commit_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  best_case_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  pipeline_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  at_risk_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 2. Create revenue_goals

```sql
CREATE TABLE IF NOT EXISTS revenue_goals (
  id BIGSERIAL PRIMARY KEY,
  business_id TEXT NOT NULL,
  goal_name TEXT NOT NULL,
  target_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  achieved_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 3. Create revenue_snapshots

```sql
CREATE TABLE IF NOT EXISTS revenue_snapshots (
  id BIGSERIAL PRIMARY KEY,
  business_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_pipeline_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  weighted_forecast NUMERIC(18,2) NOT NULL DEFAULT 0,
  closed_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  average_deal_size NUMERIC(18,2) NOT NULL DEFAULT 0,
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  sales_velocity NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 4. Create sales_activities

```sql
CREATE TABLE IF NOT EXISTS sales_activities (
  id BIGSERIAL PRIMARY KEY,
  business_id TEXT NOT NULL,
  deal_id TEXT,
  company_id TEXT,
  activity_type TEXT NOT NULL,
  activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome TEXT,
  value NUMERIC(18,2) NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
