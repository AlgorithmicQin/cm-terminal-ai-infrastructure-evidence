#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const METRICS_PATH = path.join(ROOT, "data/company_metrics_latest.json");
const SOURCE_MAPPING_PATH = path.join(ROOT, "data/source_mapping_latest.json");

const EXPECTED = {
  NVDA: 2025,
  AMD: 2024,
  TSM: 2024,
  ASML: 2024,
  AVGO: 2024,
  MU: 2024,
  ANET: 2024,
  VRT: 2024,
};

const RAW_FIELDS = ["revenue", "operatingIncome", "capitalExpenditure"];
const DERIVED_FIELDS = ["operatingMargin", "capexIntensity"];
const SOURCE_METRICS = RAW_FIELDS;
const FORMULA_TOLERANCE = 1e-6;
const VALUE_TOLERANCE = 1e-9;

const REQUIRED_SOURCE_FIELDS = [
  "ticker",
  "fiscalYear",
  "metric",
  "reportedValue",
  "storedValue",
  "reportedUnit",
  "storedUnit",
  "currency",
  "sourceFiling",
  "statementTable",
  "exactLineItem",
  "sourceLocator",
  "matchStatus",
  "reviewStatus",
  "reviewMethod",
  "transformationNote",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isNumeric(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function almostEqual(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

function sourceKey(row) {
  return `${row.ticker} FY${row.fiscalYear} ${row.metric}`;
}

function noteMentionsUnitConversion(row) {
  const text = `${row.valueMatchKind ?? ""} ${row.matchStatus ?? ""} ${row.reviewNote ?? ""} ${
    row.transformationNote ?? ""
  }`.toLowerCase();
  return (
    text.includes("unit conversion") ||
    text.includes("divides by 1,000") ||
    text.includes("divides by 1000") ||
    text.includes("thousands") ||
    text.includes("usd thousands")
  );
}

function conversionFactor(row) {
  const reported = String(row.reportedUnit ?? "").toLowerCase();
  const stored = String(row.storedUnit ?? "").toLowerCase();

  if (reported.includes("thousands") && stored.includes("millions")) {
    if (!noteMentionsUnitConversion(row)) {
      return { ok: false, factor: null, reason: "unit conversion is not explicitly documented" };
    }
    return { ok: true, factor: 1000, reason: null };
  }

  if (reported === stored) {
    return { ok: true, factor: 1, reason: null };
  }

  return {
    ok: false,
    factor: null,
    reason: `unsupported unit conversion from "${row.reportedUnit}" to "${row.storedUnit}"`,
  };
}

function pushFailure(failures, category, message) {
  failures.push({ category, message });
}

function main() {
  const failures = [];
  const warnings = [];

  const financialMetrics = readJson(METRICS_PATH);
  const sourceMapping = readJson(SOURCE_MAPPING_PATH);

  const expectedTickers = Object.keys(EXPECTED);
  const expectedTickerSet = new Set(expectedTickers);

  const selectedRows = financialMetrics.filter(
    (row) => expectedTickerSet.has(row.ticker) && row.fiscalYear === EXPECTED[row.ticker],
  );

  if (selectedRows.length !== 8) {
    pushFailure(failures, "latest rows", `Expected exactly 8 selected latest-year rows, found ${selectedRows.length}.`);
  }

  for (const [ticker, fiscalYear] of Object.entries(EXPECTED)) {
    const matches = selectedRows.filter((row) => row.ticker === ticker && row.fiscalYear === fiscalYear);
    if (matches.length !== 1) {
      pushFailure(
        failures,
        "latest rows",
        `${ticker} FY${fiscalYear} expected exactly one financial metrics row, found ${matches.length}.`,
      );
      continue;
    }

    const row = matches[0];
    for (const field of RAW_FIELDS) {
      if (!isNumeric(row[field])) {
        pushFailure(failures, "raw fields", `${ticker} FY${fiscalYear} ${field} is missing or non-numeric.`);
      }
    }
    for (const field of DERIVED_FIELDS) {
      if (!isNumeric(row[field])) {
        pushFailure(failures, "derived fields", `${ticker} FY${fiscalYear} ${field} is missing or non-numeric.`);
      }
    }

    if (isNumeric(row.revenue) && row.revenue === 0) {
      pushFailure(failures, "formulas", `${ticker} FY${fiscalYear} revenue is zero; ratios cannot be validated.`);
      continue;
    }

    if (
      isNumeric(row.revenue) &&
      isNumeric(row.operatingIncome) &&
      isNumeric(row.capitalExpenditure) &&
      isNumeric(row.operatingMargin) &&
      isNumeric(row.capexIntensity)
    ) {
      const recomputedOperatingMargin = row.operatingIncome / row.revenue;
      const recomputedCapexIntensity = Math.abs(row.capitalExpenditure) / row.revenue;

      if (!almostEqual(recomputedOperatingMargin, row.operatingMargin, FORMULA_TOLERANCE)) {
        pushFailure(
          failures,
          "formulas",
          `${ticker} FY${fiscalYear} operatingMargin mismatch: stored=${row.operatingMargin}, recomputed=${recomputedOperatingMargin}.`,
        );
      }

      if (!almostEqual(recomputedCapexIntensity, row.capexIntensity, FORMULA_TOLERANCE)) {
        pushFailure(
          failures,
          "formulas",
          `${ticker} FY${fiscalYear} capexIntensity mismatch: stored=${row.capexIntensity}, recomputed=${recomputedCapexIntensity}.`,
        );
      }
    }
  }

  const scopedSourceRows = sourceMapping.filter(
    (row) =>
      expectedTickerSet.has(row.ticker) &&
      row.fiscalYear === EXPECTED[row.ticker] &&
      SOURCE_METRICS.includes(row.metric),
  );

  if (scopedSourceRows.length !== 24) {
    pushFailure(failures, "source mapping", `Expected exactly 24 scoped source mapping records, found ${scopedSourceRows.length}.`);
  }

  for (const [ticker, fiscalYear] of Object.entries(EXPECTED)) {
    const rows = scopedSourceRows.filter((row) => row.ticker === ticker && row.fiscalYear === fiscalYear);
    if (rows.length !== 3) {
      pushFailure(
        failures,
        "source mapping",
        `${ticker} FY${fiscalYear} expected exactly 3 source mapping records, found ${rows.length}.`,
      );
    }

    for (const metric of SOURCE_METRICS) {
      const matches = rows.filter((row) => row.metric === metric);
      if (matches.length !== 1) {
        pushFailure(
          failures,
          "source mapping",
          `${ticker} FY${fiscalYear} ${metric} expected exactly one source mapping record, found ${matches.length}.`,
        );
      }
    }
  }

  const metricRowsByTicker = new Map(selectedRows.map((row) => [row.ticker, row]));

  for (const row of scopedSourceRows) {
    const key = sourceKey(row);

    for (const field of REQUIRED_SOURCE_FIELDS) {
      if (!(field in row)) {
        pushFailure(failures, "provenance", `${key} is missing required field "${field}".`);
      }
    }

    if (!("sourceUrl" in row) && !("canonicalSourceUrl" in row)) {
      pushFailure(failures, "provenance", `${key} is missing both sourceUrl and canonicalSourceUrl.`);
    }

    if (!isNumeric(row.reportedValue)) {
      pushFailure(failures, "provenance", `${key} reportedValue is missing or non-numeric.`);
    }
    if (!isNumeric(row.storedValue)) {
      pushFailure(failures, "provenance", `${key} storedValue is missing or non-numeric.`);
    }

    const metricsRow = metricRowsByTicker.get(row.ticker);
    if (!metricsRow) {
      pushFailure(failures, "source mapping", `${key} has no matching financial metrics row.`);
      continue;
    }

    const expectedStoredValue = metricsRow[row.metric];
    if (!almostEqual(row.storedValue, expectedStoredValue, VALUE_TOLERANCE)) {
      pushFailure(
        failures,
        "source mapping",
        `${key} storedValue mismatch: sourceMapping=${row.storedValue}, financialMetrics=${expectedStoredValue}.`,
      );
    }

    const conversion = conversionFactor(row);
    if (!conversion.ok) {
      pushFailure(failures, "unit conversion", `${key} ${conversion.reason}.`);
      continue;
    }

    if (row.metric === "capitalExpenditure") {
      if (!(row.storedValue > 0)) {
        pushFailure(failures, "capex convention", `${key} storedValue must be positive.`);
      }

      const normalizedReportedValue = Math.abs(row.reportedValue) / conversion.factor;
      if (!almostEqual(row.storedValue, normalizedReportedValue, VALUE_TOLERANCE)) {
        pushFailure(
          failures,
          "capex convention",
          `${key} storedValue must equal abs(reportedValue) after unit conversion: stored=${row.storedValue}, normalizedReported=${normalizedReportedValue}.`,
        );
      }
    } else {
      const normalizedReportedValue = row.reportedValue / conversion.factor;
      if (!almostEqual(row.storedValue, normalizedReportedValue, VALUE_TOLERANCE)) {
        pushFailure(
          failures,
          "source mapping",
          `${key} storedValue must equal reportedValue after unit conversion: stored=${row.storedValue}, normalizedReported=${normalizedReportedValue}.`,
        );
      }
    }

    if (row.ticker === "ANET") {
      const reportedUnit = String(row.reportedUnit ?? "").toLowerCase();
      const storedUnit = String(row.storedUnit ?? "").toLowerCase();
      if (!(reportedUnit.includes("thousands") && storedUnit.includes("millions") && noteMentionsUnitConversion(row))) {
        pushFailure(
          failures,
          "ANET unit conversion",
          `${key} must explicitly document USD thousands to USD millions conversion.`,
        );
      }
    }
  }

  console.log("AI Infrastructure Core Metrics Validation");
  console.log("=========================================");
  console.log(`Financial metrics: ${path.relative(ROOT, METRICS_PATH)}`);
  console.log(`Source mapping:    ${path.relative(ROOT, SOURCE_MAPPING_PATH)}`);
  console.log(`Formula tolerance: ${FORMULA_TOLERANCE}`);
  console.log(`Value tolerance:   ${VALUE_TOLERANCE}`);
  console.log("");
  console.log(`Selected latest-year rows: ${selectedRows.length}`);
  console.log(`Scoped source records:     ${scopedSourceRows.length}`);
  console.log("");

  for (const row of selectedRows.sort((a, b) => expectedTickers.indexOf(a.ticker) - expectedTickers.indexOf(b.ticker))) {
    const sourceCount = scopedSourceRows.filter((sourceRow) => sourceRow.ticker === row.ticker).length;
    console.log(
      `- ${row.ticker} FY${row.fiscalYear}: revenue=${row.revenue}, operatingIncome=${row.operatingIncome}, capitalExpenditure=${row.capitalExpenditure}, sourceRecords=${sourceCount}`,
    );
  }

  if (warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("");
  if (failures.length === 0) {
    console.log("PASS: P0 core metrics validation passed.");
    process.exit(0);
  }

  console.log(`FAIL: Found ${failures.length} P0 validation failure(s).`);
  for (const failure of failures) {
    console.log(`- [${failure.category}] ${failure.message}`);
  }
  process.exit(1);
}

main();
