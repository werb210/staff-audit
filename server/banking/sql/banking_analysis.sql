-- 1) Monthly NSF counts (look for fees/returns markers in description codes)
--    Assumes transactions table columns: application_id, tx_date, amount, description, type ('debit'|'credit')
--    Also assumes normalized_description column for easier matching.
WITH tx AS (
  SELECT application_id, tx_date::date, amount, type, description, lower(coalesce(normalized_description, description)) AS nd
  FROM bank_transactions
)
SELECT
  application_id,
  to_char(date_trunc('month', tx_date), 'YYYY-MM') AS month,
  COUNT(*) AS nsf_count
FROM tx
WHERE type='debit'
  AND (
    nd LIKE '%nsf%' OR nd LIKE '%non-sufficient%' OR nd LIKE '%overdraft%' OR nd LIKE '%od fee%' OR nd LIKE '%returned item%'
    OR nd LIKE '%rtn fee%' OR nd LIKE '%item returned%' OR nd LIKE '%insufficient funds%'
  )
GROUP BY application_id, date_trunc('month', tx_date)
ORDER BY application_id, month;

-- 2) Candidate recurring payments (same normalized payee with regular cadence)
--    Heuristic: 3+ occurrences, stdev(amount) <= 5%, average interval approx weekly/biweekly/monthly
WITH base AS (
  SELECT
    application_id,
    date_trunc('day', tx_date)::date AS d,
    ABS(amount) AS amt,
    REGEXP_REPLACE(lower(coalesce(merchant_name, normalized_description, description)), '\s+', ' ', 'g') AS key
  FROM bank_transactions
  WHERE type='debit' AND amount < 0
),
grp AS (
  SELECT
    application_id,
    key,
    COUNT(*) AS n,
    AVG(amt) AS avg_amt,
    STDDEV_POP(amt) AS sd_amt,
    ARRAY_AGG(d ORDER BY d) AS dates,
    MIN(d) AS start_date
  FROM base
  GROUP BY application_id, key
  HAVING COUNT(*) >= 3
     AND (STDDEV_POP(amt) IS NULL OR (STDDEV_POP(amt) / NULLIF(AVG(amt),0)) <= 0.05)
)
SELECT
  application_id,
  key,
  n,
  avg_amt,
  sd_amt,
  start_date,
  dates
FROM grp;

-- 3) Personal-use pulls (owner draws) — heuristics: transfers to individuals, Venmo/Interac e-Transfers, "owner"/"draw"/known names
--    Expect to refine via allowlist/denylist.
SELECT
  application_id,
  tx_date::date AS date,
  ABS(amount) AS amount,
  description
FROM bank_transactions
WHERE type='debit' AND amount < 0
  AND (
    lower(description) ~ '(owner|draw|shareholder|dividend|e-transfer|etransfer|interac|venmo|zelle|cash withdrawal|atm|personal)'
    OR lower(coalesce(counterparty_name, '')) ~ '(owner|todd|williams|shareholder)'
  );