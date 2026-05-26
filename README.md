# CM Terminal AI Infrastructure Evidence

v0.1 evidence supplement for the CM Terminal AI Infrastructure Profit Capture vs Capital Burden comparison.

## Purpose

This package provides a filing-based, issuer-level evidence set for a descriptive analytics chart comparing operating margin and CapEx intensity across eight issuers selected for an issuer-level AI infrastructure economics comparison. The records are source-mapped, validation is reproducible, and the chart can be regenerated from structured data. This package is non-advisory.

## Scope

The package covers only the latest-year company-level comparison set:

- NVDA FY2025
- AMD FY2024
- TSM FY2024
- ASML FY2024
- AVGO FY2024
- MU FY2024
- ANET FY2024
- VRT FY2024

It does not include historical rows, segment-level metrics, valuation, target prices, rankings, or recommendations.

## Data Sources

Metrics are taken from official issuer filings, annual reports, Form 10-K / Form 20-F filings, or official issuer investor-relations filing copies. Source mapping records identify statement tables, exact line items, reported values, stored values, units, and reconciliation notes.

## Metrics

The core comparison uses:

- Revenue
- Operating income
- Capital expenditure
- Operating margin
- CapEx intensity

Filing-sign CapEx values are preserved in `data/source_mapping_latest.json` as `reportedValue`. Positive CapEx magnitude is used as `storedValue` for CapEx intensity calculation.

## Validate

Run:

```bash
node scripts/validate_core_metrics.js
```

The validator checks row scope, required fields, formula recomputation, source mapping coverage, provenance fields, stored-value reconciliation, and CapEx sign/unit convention.

## Reproduce Chart

Run:

```bash
node scripts/reproduce_profit_capture_chart.js
```

The script writes:

```text
outputs/ai-infrastructure-profit-capture-vs-capital-burden.svg
```

## Limitations

This package is issuer-level and descriptive. It does not estimate pure AI revenue, does not attribute segment-level margin or CapEx, does not apply FX conversion, and does not rank securities.

Ratio comparison is directional and descriptive; it is not a fully normalized cross-company accounting model. The chart is not a ranking of company quality, investment attractiveness, or future performance.

## What This Is Not

- Not a valuation model.
- Not an investment recommendation.
- Not a stock ranking.
- Not a pure AI revenue estimate.
- Not a segment-level attribution model.
- Not a full normalized cross-company accounting model.

## Non-Advisory Boundary

This package is not investment advice. It does not provide valuation, target prices, buy/sell/hold recommendations, investment rankings, or expected return estimates.

## Relation To CM Terminal

This repository is an evidence supplement for CM Terminal Analytics. It may link back to CM Terminal for narrative context while keeping this repository limited to evidence, methodology, validation, and chart reproduction.
