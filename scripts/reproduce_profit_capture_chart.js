#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INPUT_PATH = path.join(ROOT, "data/company_metrics_latest.json");
const OUTPUT_PATH = path.join(ROOT, "outputs/ai-infrastructure-profit-capture-vs-capital-burden.svg");

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

const POINT_COLORS = {
  NVDA: "#15803d",
  AMD: "#ca8a04",
  TSM: "#dc2626",
  ASML: "#0f766e",
  AVGO: "#2563eb",
  MU: "#7c3aed",
  ANET: "#ea580c",
  VRT: "#be185d",
};

const WIDTH = 1120;
const HEIGHT = 760;
const MARGIN = { top: 118, right: 92, bottom: 120, left: 112 };
const PLOT = {
  x: MARGIN.left,
  y: MARGIN.top,
  width: WIDTH - MARGIN.left - MARGIN.right,
  height: HEIGHT - MARGIN.top - MARGIN.bottom,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function niceCeil(value, step) {
  return Math.ceil(value / step) * step;
}

function selectRows(metrics) {
  const selected = [];
  const errors = [];

  for (const [ticker, fiscalYear] of Object.entries(EXPECTED)) {
    const matches = metrics.filter((row) => row.ticker === ticker && row.fiscalYear === fiscalYear);
    if (matches.length !== 1) {
      errors.push(`${ticker} FY${fiscalYear}: expected exactly one row, found ${matches.length}`);
      continue;
    }

    const row = matches[0];
    for (const field of ["capexIntensity", "operatingMargin"]) {
      if (!isNumber(row[field])) {
        errors.push(`${ticker} FY${fiscalYear}: ${field} is missing or non-numeric`);
      }
    }

    selected.push({
      ticker,
      fiscalYear,
      capexIntensity: row.capexIntensity,
      operatingMargin: row.operatingMargin,
    });
  }

  if (selected.length !== 8) {
    errors.push(`Expected exactly 8 selected rows, found ${selected.length}`);
  }

  if (errors.length > 0) {
    throw new Error(`Cannot reproduce chart:\n- ${errors.join("\n- ")}`);
  }

  return selected;
}

function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  return (value) => {
    const t = (value - domainMin) / (domainMax - domainMin);
    return rangeMin + t * (rangeMax - rangeMin);
  };
}

function labelOffset(ticker) {
  const offsets = {
    NVDA: [10, -14],
    AMD: [10, 18],
    TSM: [10, -14],
    ASML: [10, -14],
    AVGO: [10, 18],
    MU: [10, 18],
    ANET: [10, -14],
    VRT: [10, -14],
  };
  return offsets[ticker] ?? [10, -12];
}

function buildSvg(rows) {
  const xMax = niceCeil(Math.max(...rows.map((row) => row.capexIntensity)), 0.05);
  const yMax = niceCeil(Math.max(...rows.map((row) => row.operatingMargin)), 0.1);
  const xTicks = Array.from({ length: Math.round(xMax / 0.05) + 1 }, (_, i) => i * 0.05);
  const yTicks = Array.from({ length: Math.round(yMax / 0.1) + 1 }, (_, i) => i * 0.1);

  const xScale = scaleLinear(0, xMax, PLOT.x, PLOT.x + PLOT.width);
  const yScale = scaleLinear(0, yMax, PLOT.y + PLOT.height, PLOT.y);

  const gridLines = [
    ...xTicks.map((tick) => {
      const x = xScale(tick);
      return `<line x1="${x.toFixed(2)}" y1="${PLOT.y}" x2="${x.toFixed(2)}" y2="${
        PLOT.y + PLOT.height
      }" stroke="#e2e8f0" stroke-width="1" />`;
    }),
    ...yTicks.map((tick) => {
      const y = yScale(tick);
      return `<line x1="${PLOT.x}" y1="${y.toFixed(2)}" x2="${PLOT.x + PLOT.width}" y2="${y.toFixed(
        2,
      )}" stroke="#e2e8f0" stroke-width="1" />`;
    }),
  ].join("\n    ");

  const xTickLabels = xTicks
    .map((tick) => {
      const x = xScale(tick);
      return `<g transform="translate(${x.toFixed(2)},${PLOT.y + PLOT.height + 24})">
        <line y1="-8" y2="-2" stroke="#94a3b8" />
        <text text-anchor="middle" font-size="12" fill="#475569">${pct(tick, 0)}</text>
      </g>`;
    })
    .join("\n    ");

  const yTickLabels = yTicks
    .map((tick) => {
      const y = yScale(tick);
      return `<g transform="translate(${PLOT.x - 16},${y.toFixed(2)})">
        <line x1="8" x2="14" stroke="#94a3b8" />
        <text text-anchor="end" dominant-baseline="middle" font-size="12" fill="#475569">${pct(tick, 0)}</text>
      </g>`;
    })
    .join("\n    ");

  const points = rows
    .map((row) => {
      const x = xScale(row.capexIntensity);
      const y = yScale(row.operatingMargin);
      const [dx, dy] = labelOffset(row.ticker);
      const color = POINT_COLORS[row.ticker] ?? "#334155";
      return `<g>
        <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="7" fill="${color}" stroke="#ffffff" stroke-width="2">
          <title>${escapeXml(row.ticker)} FY${row.fiscalYear}: CapEx intensity ${pct(
            row.capexIntensity,
            2,
          )}; Operating margin ${pct(row.operatingMargin, 2)}</title>
        </circle>
        <text x="${(x + dx).toFixed(2)}" y="${(y + dy).toFixed(
          2,
        )}" font-size="13" font-weight="700" fill="#0f172a">${escapeXml(row.ticker)}</text>
      </g>`;
    })
    .join("\n    ");

  const rowSummary = rows
    .map(
      (row) =>
        `${row.ticker} FY${row.fiscalYear}: x=${row.capexIntensity.toFixed(6)} (${pct(
          row.capexIntensity,
          2,
        )}), y=${row.operatingMargin.toFixed(6)} (${pct(row.operatingMargin, 2)})`,
    )
    .join("&#10;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title desc">
  <title id="title">AI Infrastructure: Profit Capture vs Capital Burden</title>
  <desc id="desc">Issuer-level latest fiscal year scatter plot of CapEx intensity on the x-axis and operating margin on the y-axis. ${escapeXml(
    rowSummary,
  )}</desc>
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="${MARGIN.left}" y="48" font-size="28" font-weight="800" fill="#0f172a">AI Infrastructure: Profit Capture vs Capital Burden</text>
  <text x="${MARGIN.left}" y="78" font-size="15" fill="#475569">Issuer-level latest fiscal year; no FX conversion; no segment-level attribution; non-advisory.</text>

  <g aria-label="plot area">
    <rect x="${PLOT.x}" y="${PLOT.y}" width="${PLOT.width}" height="${PLOT.height}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
    ${gridLines}
    <line x1="${PLOT.x}" y1="${PLOT.y + PLOT.height}" x2="${PLOT.x + PLOT.width}" y2="${
      PLOT.y + PLOT.height
    }" stroke="#334155" stroke-width="1.5" />
    <line x1="${PLOT.x}" y1="${PLOT.y}" x2="${PLOT.x}" y2="${PLOT.y + PLOT.height}" stroke="#334155" stroke-width="1.5" />
    ${xTickLabels}
    ${yTickLabels}
    ${points}
  </g>

  <text x="${PLOT.x + PLOT.width / 2}" y="${HEIGHT - 58}" text-anchor="middle" font-size="15" font-weight="700" fill="#334155">CapEx intensity</text>
  <text x="34" y="${PLOT.y + PLOT.height / 2}" transform="rotate(-90 34 ${PLOT.y + PLOT.height / 2})" text-anchor="middle" font-size="15" font-weight="700" fill="#334155">Operating margin</text>
  <text x="${MARGIN.left}" y="${HEIGHT - 24}" font-size="12" fill="#64748b">Source: company public filings; structured by CM Terminal Analytics.</text>
</svg>
`;
}

function main() {
  const metrics = readJson(INPUT_PATH);
  const selectedRows = selectRows(metrics);
  const svg = buildSvg(selectedRows);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, svg, "utf8");

  console.log("AI Infrastructure Profit Capture Chart Reproduction");
  console.log("====================================================");
  console.log(`Input:  ${path.relative(ROOT, INPUT_PATH)}`);
  console.log(`Output: ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log("");
  console.log("Selected rows and plotted values:");
  for (const row of selectedRows) {
    console.log(
      `- ${row.ticker} FY${row.fiscalYear}: x capexIntensity=${row.capexIntensity.toFixed(
        6,
      )}, y operatingMargin=${row.operatingMargin.toFixed(6)}`,
    );
  }
}

main();
