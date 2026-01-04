# 📊 Módulo de Reportes Avanzados

## Descripción General

El módulo de reportes proporciona capacidades profesionales de exportación y generación de informes para Global Scanner Pro. Permite exportar datos de backtest, portfolios y análisis de mercado en múltiples formatos (Excel, PDF, CSV) con templates especializados para diferentes audiencias.

## Características Principales

### 1. Exportación Multi-Formato

- **Excel (XLSX)**: Archivos multi-hoja con formato profesional
- **PDF**: Reportes con diseño profesional, auto-paginación y tablas formateadas
- **CSV**: Exportación básica compatible con versiones anteriores

### 2. Templates Especializados por Audiencia

#### 📋 Audit Report (Reporte de Auditoría)
**Propósito**: Cumplimiento regulatorio y auditorías internas/externas

**Contenido**:
- Executive Summary automático
- Compliance Status con issues identificados
- Governance Rules aplicadas al portfolio
- Risk Assessment completo (VaR, CVaR, Drawdown, Volatility)
- Detalles de todas las posiciones actuales
- Historial de rebalanceos con justificaciones
- Audit Trail con timestamps de eventos

**Audiencia**: Auditores, compliance officers, reguladores

**Función**: `generateAuditReport(portfolio, governance, riskData, performanceData)`

#### 💼 Investment Committee Report
**Propósito**: Toma de decisiones estratégicas de inversión

**Contenido**:
- Executive Summary con overview de performance
- Key Performance Metrics (CAGR, Sharpe, Sortino, Calmar)
- Market Context (régimen de mercado, sentiment)
- Strategic Positioning (top holdings, sector allocation)
- Risk Analysis con identificación de riesgos principales
- Benchmark Comparison (Alpha, Beta, Tracking Error, Excess Return)
- Recommendations automáticas basadas en métricas

**Audiencia**: Comité de inversión, gestores de portfolio, directores

**Función**: `generateInvestmentCommitteeReport(portfolio, performanceData, riskData, marketContext)`

#### 👤 Client Report
**Propósito**: Comunicación clara con inversores finales

**Contenido**:
- Portfolio Snapshot (valor actual, ganancia/pérdida)
- Performance Summary en lenguaje simple
- Holdings completos con weights y P&L
- Risk Level simplificado (LOW/MODERATE/HIGH)
- Comparison to Market (vs benchmark)
- Glosario de términos financieros

**Audiencia**: Clientes finales, inversores retail, advisors

**Función**: `generateClientReport(portfolio, performanceData, riskData)`

### 3. Análisis Comparativo

Permite comparar múltiples estrategias o períodos de tiempo lado a lado.

**Características**:
- Comparación multi-estrategia con rankings automáticos
- Cálculo de "Best Overall Strategy" basado en rank promedio
- Comparación por períodos (YTD, Last Year, Custom ranges)
- Análisis de diferencias period-over-period
- Exportación en PDF y Excel

**Funciones principales**:
```javascript
compareBacktestStrategies(results)           // Compara múltiples backtests
comparePerformancePeriods(data, periods)     // Compara períodos
compareTwoPeriods(period1, period2, labels)  // Compara dos períodos específicos
generateComparativePDF(datasets, title)      // PDF comparativo
generateComparativeExcel(datasets, title)    // Excel comparativo
```

### 4. Executive Summary Generator

Generación automática de resúmenes ejecutivos con IA heurística.

**Elementos generados automáticamente**:

1. **Overview**: Párrafo descriptivo del performance general
2. **Key Metrics**: Extracción de métricas más relevantes
3. **Top Signals**: Identificación de las 5 mejores oportunidades
   - Posiciones con score > 0.7
   - Señales de momentum fuerte
   - Otros indicadores técnicos
4. **Main Risks**: Análisis de riesgos principales
   - Drawdown Risk (threshold: 15%)
   - Concentration Risk (threshold: 25% single position)
   - Volatility Risk (threshold: 25%)
   - Beta/Market Sensitivity (threshold: |beta| > 1.5)
5. **Recommendations**: Sugerencias automáticas
   - Mejora de Sharpe ratio
   - Reducción de concentración
   - Implementación de downside protection
6. **Market Context**: Contexto de mercado actual
   - Régimen (BULL/BEAR/SIDEWAYS)
   - Volatility level
   - Trend direction
   - Sentiment

**Uso**:
```javascript
const summaryGen = new ExecutiveSummaryGenerator(data);
const summary = summaryGen.generate();
```

## Arquitectura del Módulo

### Estructura de Archivos

```
src/reports/
├── report-generator.js          # Clases base abstractas
│   ├── ReportGenerator          # Base para todos los reportes
│   ├── ExcelReportGenerator     # Generador de Excel
│   ├── PDFReportGenerator       # Generador de PDF
│   ├── ComparativeAnalysisGenerator
│   └── ExecutiveSummaryGenerator
│
├── excel-exporter.js             # Exportadores Excel especializados
│   ├── exportBacktestToExcel()
│   ├── exportPortfolioToExcel()
│   └── exportScanResultsToExcel()
│
├── pdf-templates.js              # Templates PDF
│   ├── generateAuditReport()
│   ├── generateInvestmentCommitteeReport()
│   ├── generateClientReport()
│   └── generateBacktestPDF()
│
├── comparative-analysis.js       # Análisis comparativo
│   ├── compareBacktestStrategies()
│   ├── comparePerformancePeriods()
│   ├── generateComparativePDF()
│   └── generateComparativeExcel()
│
├── index.js                      # Exports centralizados
└── README.md                     # Documentación técnica
```

### Clases Base

#### ReportGenerator
Clase base con utilidades comunes:
- `getFilename(prefix, extension)` - Generación de nombres con timestamp
- `formatNumber(value, decimals)` - Formateo de números
- `formatPercent(value, decimals)` - Formateo de porcentajes
- `formatCurrency(value, currency)` - Formateo de moneda
- `safeValue(obj, path, default)` - Extracción segura de valores

#### ExcelReportGenerator
Extiende `ReportGenerator`, especializado en Excel:
- `addWorksheet(name, data, options)` - Agregar hoja con datos
- `download(filename)` - Descargar archivo Excel
- Soporta column widths personalizables
- Arrays de arrays para datos tabulares

#### PDFReportGenerator
Extiende `ReportGenerator`, especializado en PDF:
- `addTitle(text, fontSize)` - Agregar título
- `addSubtitle(text, fontSize)` - Agregar subtítulo
- `addSectionHeader(text, fontSize)` - Headers de sección
- `addText(text, fontSize)` - Párrafos de texto
- `addTable(headers, rows, options)` - Tablas con jspdf-autotable
- `addMetricsBox(metrics, columns)` - Cajas de métricas visuales
- `checkPageBreak(space)` - Auto-paginación
- `addFooter()` - Footers con números de página
- `download(filename)` - Descargar PDF

## Formatos de Datos

### Excel Exports

#### Backtest Results (4 sheets)

**Sheet 1: Performance Summary**
```
Columns: Strategy, Initial Capital, Final Value, Total Return, CAGR, Sharpe Ratio, Max Drawdown, Win Rate
Format: Headers bold, percentages formatted, decimals: 2
```

**Sheet 2: Risk Metrics**
```
Columns: Strategy, Volatility, Max Drawdown, Avg Drawdown, Recovery Days, Sortino Ratio
```

**Sheet 3: Trading Metrics**
```
Columns: Strategy, Profit Factor, Avg Win, Avg Loss, Transaction Costs
```

**Sheet 4: Strategy Comparison**
```
Columns: Strategy, CAGR, Sharpe, Sortino, Calmar, Max DD, Volatility, Alpha, Beta, Info Ratio
Format: 4 decimals for precision comparison
```

#### Portfolio Export (5 sheets)

**Sheet 1: Portfolio Overview**
```
Layout: Key-Value pairs
Includes: Name, Created, Strategy, Benchmark, Total Value, Cost Basis, P&L, Risk Metrics
```

**Sheet 2: Current Positions**
```
Columns: Ticker, Name, Quantity, Entry Price, Current Price, Weight %, Unrealized P&L, Unrealized P&L %
```

**Sheet 3: Performance**
```
Layout: Key-Value pairs
Includes: Total Return, Annualized Return, Sharpe, Sortino, Calmar, Volatility, Max DD, Alpha, Beta, Tracking Error, Excess Return
```

**Sheet 4: Risk Analysis**
```
Layout: Key-Value pairs
Includes: VaR 95%, CVaR 95%, Daily Vol, Annual Vol, Concentration, Num Positions
```

**Sheet 5: Rebalance History** (últimos 100)
```
Columns: Date, Reason, Number of Changes, Total Value
```

#### Scan Results Export (4 sheets)

**Sheet 1: Top Ranked Assets**
```
Columns: Rank, Ticker, Name, Score, Trend, Momentum, Risk, Liquidity, Price, Volume
Rows: Top 100 assets
```

**Sheet 2: Allocation**
```
Columns: Ticker, Name, Score, Weight %, Volatility, Recommended $, Marginal Risk
```

**Sheet 3: Portfolio Risk**
```
Layout: Key-Value pairs
Includes: Expected Volatility, Diversification Ratio, Concentration, Diversified VaR, Undiversified VaR
```

**Sheet 4: Detailed Scores**
```
Columns: Ticker, Name, Total Score, Trend Score, Momentum Score, Risk Score, Liquidity Score, Final Score
```

### PDF Structure

Todos los PDFs incluyen:
- **Header**: Título principal con tamaño 18pt
- **Subtitle**: Información contextual (nombre, fecha)
- **Section Headers**: Tamaño 14pt, bold
- **Tables**: Auto-width, alternating row colors (#f8fafc)
- **Metrics Boxes**: Cajas con fondo #f1f5f9, label pequeño (8pt), valor grande (11pt)
- **Footer**: Número de página + timestamp de generación
- **Auto-pagination**: Saltos automáticos de página

## Integración en la Aplicación

### Backtest Results

**Ubicación**: `src/core/scanner.js`

**Botones disponibles**:
```html
📄 Export CSV          - exportBacktestToCSV()
📊 Export Excel        - exportBacktestToExcelAdvanced()
📑 Export PDF          - exportBacktestToPDFAdvanced()
📈 Comparative Report  - exportBacktestComparative()
```

**Implementación**:
```javascript
import {
  exportBacktestToExcel,
  generateBacktestPDF,
  generateComparativePDF,
  generateComparativeExcel
} from '../reports/index.js';

// Exportar a Excel
function exportBacktestToExcelAdvanced() {
  if (!lastBacktestResults || lastBacktestResults.length === 0) {
    alert('No backtest results available');
    return;
  }
  exportBacktestToExcel(lastBacktestResults);
}
```

### Scanner Results

**Ubicación**: `index.html` + `src/core/scanner.js`

**Botón**:
```html
<button onclick="exportScanResults()">📊 Export Results to Excel</button>
```

**Implementación**:
```javascript
function exportScanResults() {
  if (!currentResults || currentResults.length === 0) {
    alert('No scan results available');
    return;
  }

  const allocation = appState.portfolio;
  const riskMetrics = appState.market;

  exportScanResultsToExcel(currentResults, allocation, riskMetrics);
}
```

El botón se muestra automáticamente después de completar un scan:
```javascript
const exportButtons = document.getElementById('scanExportButtons');
if (exportButtons && currentResults.length > 0) {
  exportButtons.style.display = 'block';
}
```

### Portfolio Dashboard

**Ubicación**: `src/dashboard/portfolio-dashboard.js`

**Funciones globales disponibles**:
```javascript
window.exportPortfolioExcel()              // Excel completo
window.exportAuditReport()                 // PDF auditoría
window.exportInvestmentCommitteeReport()   // PDF comité
window.exportClientReport()                // PDF clientes
```

**Ejemplo de uso desde HTML**:
```html
<button onclick="exportPortfolioExcel()">📊 Export to Excel</button>
<button onclick="exportAuditReport()">📋 Audit Report</button>
<button onclick="exportInvestmentCommitteeReport()">💼 Investment Committee</button>
<button onclick="exportClientReport()">👤 Client Report</button>
```

## Guía de Uso

### Exportar Backtest Results

```javascript
// Opción 1: Excel multi-hoja
exportBacktestToExcel(backtestResults);

// Opción 2: PDF profesional
generateBacktestPDF(backtestResults);

// Opción 3: Análisis comparativo
generateComparativePDF(backtestResults, 'Strategy Comparison');
// o
generateComparativeExcel(backtestResults, 'Strategy Comparison');
```

### Exportar Portfolio

```javascript
// Preparar datos
const pnlData = await performanceTracker.calculatePnL(portfolio);
const equityCurve = await performanceTracker.calculateEquityCurve(portfolio);
const perfMetrics = performanceTracker.calculatePerformanceMetrics(equityCurve);
const benchmarkComp = await performanceTracker.compareToBenchmark(portfolio, equityCurve);

const performanceData = { ...pnlData, ...perfMetrics, ...benchmarkComp };
const riskData = {
  var95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65,
  cvar95: perfMetrics.annualized_volatility_pct / Math.sqrt(252) * 1.65 * 1.3
};

// Exportar
exportPortfolioToExcel(portfolio, performanceData, riskData);

// O generar reportes PDF
generateAuditReport(portfolio, governance, riskData, performanceData);
generateInvestmentCommitteeReport(portfolio, performanceData, riskData, marketContext);
generateClientReport(portfolio, performanceData, riskData);
```

### Análisis Comparativo

```javascript
// Comparar estrategias
const comparison = compareBacktestStrategies(backtestResults);
console.log(comparison.rankings);          // Rankings por métrica
console.log(comparison.summary.bestOverall); // Mejor estrategia global

// Comparar dos períodos
const ytd = { cagr: 0.15, sharpeRatio: 1.2, ... };
const lastYear = { cagr: 0.12, sharpeRatio: 1.0, ... };
const periodComp = compareTwoPeriods(ytd, lastYear, ['YTD 2024', '2023']);

// Generar reporte comparativo
generatePeriodComparisonPDF([periodComp]);
```

### Executive Summary

```javascript
const summaryGen = new ExecutiveSummaryGenerator({
  strategyName: 'Momentum Growth',
  metrics: perfMetrics,
  positions: portfolio.positions
});

const summary = summaryGen.generate();

console.log(summary.overview);           // Párrafo descriptivo
console.log(summary.keyMetrics);         // Métricas principales
console.log(summary.topSignals);         // Top 5 señales
console.log(summary.mainRisks);          // Riesgos identificados
console.log(summary.recommendations);    // Recomendaciones
console.log(summary.marketContext);      // Contexto de mercado
```

## Personalización

### Crear un Template PDF Personalizado

```javascript
import { PDFReportGenerator } from './report-generator.js';

export function generateCustomReport(data) {
  const pdf = new PDFReportGenerator(data);

  // Título
  pdf.addTitle('MI REPORTE PERSONALIZADO');
  pdf.addSubtitle(`Generado: ${pdf.generatedAt}`);
  pdf.currentY += 10;

  // Sección con métricas
  pdf.addSectionHeader('Métricas Clave');
  const metrics = [
    { label: 'Métrica 1', value: '100%' },
    { label: 'Métrica 2', value: '$1,000' },
    { label: 'Métrica 3', value: '2.5' }
  ];
  pdf.addMetricsBox(metrics, 3);

  // Tabla
  pdf.addSectionHeader('Detalles');
  const headers = ['Columna 1', 'Columna 2', 'Columna 3'];
  const rows = [
    ['Dato 1', 'Dato 2', 'Dato 3'],
    ['Dato 4', 'Dato 5', 'Dato 6']
  ];
  pdf.addTable(headers, rows);

  // Descargar
  pdf.download(pdf.getFilename('custom_report', 'pdf'));
}
```

### Añadir Nueva Hoja a Excel

```javascript
import { ExcelReportGenerator } from './report-generator.js';

const excel = new ExcelReportGenerator(data);

// Hoja personalizada
const customData = [
  ['Header 1', 'Header 2', 'Header 3'],
  ['Value 1', 'Value 2', 'Value 3'],
  ['Value 4', 'Value 5', 'Value 6']
];

excel.addWorksheet('Custom Sheet', customData, {
  columnWidths: [20, 15, 15]  // Anchos en caracteres
});

excel.download(excel.getFilename('custom_excel', 'xlsx'));
```

## Dependencias

### NPM Packages

```json
{
  "xlsx": "^0.18.5",           // Excel export
  "jspdf": "^3.0.4",           // PDF generation
  "jspdf-autotable": "^5.0.2"  // PDF tables
}
```

### Browser APIs Utilizadas

- **Blob API**: Para crear archivos descargables
- **URL.createObjectURL()**: Para generar URLs de descarga
- **document.createElement('a')**: Para trigger de descargas

### Compatibilidad

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ IE11 (no soportado)

## Testing

### Tests Incluidos

Ver `src/tests/tests.js` para tests del módulo de reportes:

```javascript
// Test de generación de Excel
testExcelExport()

// Test de generación de PDF
testPDFGeneration()

// Test de análisis comparativo
testComparativeAnalysis()

// Test de executive summary
testExecutiveSummary()
```

### Testing Manual

1. **Backtest Export**:
   - Ejecutar backtest en UI
   - Click en cada botón de export
   - Verificar descarga y contenido

2. **Portfolio Export**:
   - Crear portfolio en dashboard
   - Cargar portfolio
   - Probar cada función de export
   - Verificar datos en archivos generados

3. **Scan Export**:
   - Ejecutar scan de mercado
   - Verificar aparición del botón
   - Exportar y verificar datos

### Verificación de Datos

Cada export debe incluir:
- ✅ Timestamp de generación
- ✅ Nombres correctos de estrategia/portfolio
- ✅ Métricas con precisión correcta
- ✅ Formato de números coherente
- ✅ Sin valores null/undefined visibles

## Troubleshooting

### Error: "No backtest results available"
**Causa**: No hay datos de backtest en memoria
**Solución**: Ejecutar backtest antes de exportar

### Error: "Cannot read property 'positions' of undefined"
**Causa**: Portfolio no cargado correctamente
**Solución**: Seleccionar portfolio en dashboard primero

### PDF no se descarga
**Causa**: Bloqueador de popups del browser
**Solución**: Permitir descargas para el sitio

### Excel vacío o corrupto
**Causa**: Datos con formato incorrecto
**Solución**: Verificar que los datos tengan la estructura esperada

### Tablas PDF cortadas
**Causa**: Auto-paginación fallando
**Solución**: El sistema debería manejar esto automáticamente. Reportar bug si persiste.

## Mejoras Futuras

- [ ] Charts embebidos en Excel (usando xlsx chart plugin)
- [ ] Charts en PDFs (usando canvas2image + jsPDF)
- [ ] Exportación a PowerPoint (pptxgenjs)
- [ ] Email directo de reportes (integración con backend)
- [ ] Scheduling de reportes automáticos
- [ ] Templates personalizables por usuario
- [ ] Watermarks y branding personalizado
- [ ] Firma digital de PDFs
- [ ] Exportación a Google Sheets
- [ ] Integración con BI tools (Tableau, Power BI)

## Referencias

- [xlsx Documentation](https://docs.sheetjs.com/)
- [jsPDF Documentation](https://artskydj.github.io/jsPDF/docs/jsPDF.html)
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [Blob API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Blob)

## Soporte

Para issues, bugs o feature requests relacionados con el módulo de reportes:
- Abrir issue en GitHub: https://github.com/JP-Fernando/global-scanner-pro/issues
- Label: `reports` o `export`
- Incluir: Tipo de export, browser, datos de ejemplo

---

**Última actualización**: 2026-01-04
**Versión del módulo**: 1.0.0
**Autor**: JP-Fernando