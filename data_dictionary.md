# Data Dictionary

## `data/company_metrics_latest.json`

- `ticker`: issuer ticker used in the comparison.
- `companyName`: issuer name.
- `fiscalYear`: fiscal-year label used by the issuer and this package.
- `periodEnded`: fiscal period end date.
- `currency`: reporting currency for monetary fields.
- `unit`: unit used for stored monetary fields.
- `revenue`: company-level revenue, net sales, or equivalent top-line metric.
- `operatingIncome`: company-level operating income, income from operations, or operating profit.
- `capitalExpenditure`: issuer-level cash-flow capital expenditure line item documented in `data/source_mapping_latest.json`, stored as positive magnitude for ratio calculation.
- `operatingMargin`: `operatingIncome / revenue`.
- `capexIntensity`: `abs(capitalExpenditure) / revenue`.
- `sourceUrl`: issuer filing or official filing copy used for the row.
- `sourceType`: source filing type.
- `sourceNote`: human-readable source and line-item note.

## `data/source_mapping_latest.json`

- `ticker`: issuer ticker.
- `companyName`: issuer name.
- `fiscalYear`: fiscal-year label.
- `periodEnded`: fiscal period end date.
- `periodColumn`: period column label as used in the source filing.
- `metric`: normalized package metric key.
- `metricLabel`: human-readable metric label.
- `reportedValue`: value as presented in the source filing, preserving filing sign and filing unit. Filing-sign CapEx values are preserved here.
- `storedValue`: value stored for analysis after documented sign or unit normalization. Positive CapEx magnitude is used here for CapEx intensity calculation.
- `currency`: reporting currency for the metric.
- `unit`: package-level display unit for the stored value.
- `reportedUnit`: unit used by the filing value.
- `storedUnit`: unit used by the stored value.
- `valueMatchKind`: description of exact match or transformation needed.
- `sourceFiling`: filing type.
- `sourceAuthority`: authority or publication channel used for `sourceUrl`.
- `canonicalSourceAuthority`: preferred canonical source authority, usually SEC EDGAR where available.
- `secAccessionNumber`: SEC accession number where applicable.
- `secFilingIndexUrl`: SEC filing index URL where applicable.
- `sourceUrl`: source filing URL used for review.
- `canonicalSourceUrl`: canonical source URL where available.
- `statementTable`: financial statement table containing the source value.
- `exactLineItem`: exact or normalized filing line item.
- `filingPage`: filing page reference where available.
- `filingSection`: filing section reference.
- `sourceLocator`: detailed source locator for human review.
- `pageOrSection`: concise page or section locator.
- `matchStatus`: reconciliation status versus stored data.
- `reviewStatus`: review state for the mapping record.
- `reviewMethod`: method used to reconcile the record.
- `reviewedAt`: date of mapping review.
- `reviewNote`: note explaining the match.
- `transformationNote`: note explaining sign or unit transformation; may be null if no transformation was needed.
- `exceptionNote`: limitation or interpretive boundary for the metric.
