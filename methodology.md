# Methodology

## Source Priority

The evidence set uses official issuer disclosures as sources of record:

1. SEC Form 10-K, Form 20-F, or equivalent annual filing.
2. Official annual report when it reconciles to the filed annual statements.
3. Official issuer investor-relations filing copy when it reproduces the same annual filing.

Aggregator sites, market data feeds, news articles, and analyst reports are not sources of record for this package.

## Metric Definitions

- `revenue`: company-level reported revenue, net sales, or equivalent top-line sales measure for the fiscal year.
- `operatingIncome`: company-level operating income, income from operations, or operating profit as reported.
- `capitalExpenditure`: the issuer-level cash-flow capital expenditure line item documented in `source_mapping_latest.json`.
- `operatingMargin`: operating income divided by revenue.
- `capexIntensity`: capital expenditure divided by revenue, using positive CapEx magnitude.

## Formulas

```text
operatingMargin = operatingIncome / revenue
capexIntensity = abs(capitalExpenditure) / revenue
```

Stored ratios are compared to recomputed values by the validation script with a strict rounding tolerance.

## CapEx Sign Convention

Filing cash-flow statements often present capital expenditure as a negative investing cash outflow. Filing-sign CapEx values are preserved in `data/source_mapping_latest.json` as `reportedValue`. Positive CapEx magnitude is used as `storedValue` for CapEx intensity calculation.

## Currency And FX

All monetary values preserve the issuer's reporting currency and unit. No foreign-exchange conversion is applied. Ratio-based comparison avoids ranking absolute revenue across currencies.

Ratio comparison is directional and descriptive; it is not a fully normalized cross-company accounting model.

## Issuer-Level Scope

All metrics are company-level / issuer-level consolidated figures. They are not segment-level, product-level, AI-only, HBM-only, data-center-only, or customer-specific figures.

## Source Mapping Policy

Each raw metric in the comparison must have a source mapping record with:

- ticker and fiscal year
- metric name
- reported value and stored value
- currency and units
- source filing and URL
- statement table and exact line item
- source locator
- match/review status
- review method and notes
- transformation and exception notes where applicable

## Validation Logic

The validation script checks:

- exactly eight latest-year company metric rows
- exactly 24 source mapping records
- required raw and derived fields
- formula recomputation
- source mapping coverage by ticker and metric
- required provenance fields
- stored-value agreement between company metrics and source mapping
- CapEx sign convention
- Arista USD thousands to USD millions unit conversion documentation
