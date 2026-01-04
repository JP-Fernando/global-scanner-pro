# 📊 Advanced Reports Module

Sistema completo de exportación y generación de reportes profesionales para Global Scanner Pro.

## 🎯 Características Implementadas

### 1. Exportación a Excel (XLSX)
- ✅ **Multi-hoja con formato profesional**
- ✅ **Resultados de Backtest**: Performance Summary, Risk Metrics, Trading Metrics, Strategy Comparison
- ✅ **Portfolio Tracking**: Overview, Positions, Performance, Risk Analysis, Rebalance History
- ✅ **Scan Results**: Top Assets, Allocation, Risk Metrics, Detailed Scores

### 2. Exportación a PDF
- ✅ **Templates profesionales** con auto-paginación y footers
- ✅ **Tablas formateadas** con jspdf-autotable
- ✅ **Métricas visuales** en cajas de colores
- ✅ **Múltiples audiencias**: Auditoría, Comité de Inversión, Clientes

### 3. Templates Específicos

#### 📋 Audit Report
- Compliance status y governance rules
- Position details y rebalance history
- Risk assessment completo
- Audit trail con timestamps

#### 💼 Investment Committee Report
- Executive summary automático
- Key performance metrics
- Market context y positioning estratégico
- Risk analysis y recommendations

#### 👤 Client Report
- Lenguaje simplificado para clientes
- Portfolio snapshot visual
- Comparison to market (benchmark)
- Glosario de términos

### 4. Análisis Comparativo
- ✅ **Comparación multi-estrategia** con rankings
- ✅ **Comparación por períodos** (YTD, Last Year, etc.)
- ✅ **Best overall strategy** basado en rank promedio
- ✅ **Exportación en PDF y Excel**

### 5. Executive Summary Generator
- ✅ **Generación automática** de resúmenes
- ✅ **Identificación de señales principales**
- ✅ **Análisis de riesgos principales**
- ✅ **Recomendaciones automáticas**
- ✅ **Market context** integration

## 📁 Estructura de Archivos

```
src/reports/
├── report-generator.js          # Clases base para generación
├── excel-exporter.js             # Exportadores Excel especializados
├── pdf-templates.js              # Templates PDF por audiencia
├── comparative-analysis.js       # Análisis comparativo multi-dataset
├── index.js                      # Punto de exportación central
└── README.md                     # Esta documentación
```

## 🚀 Uso

### Desde Scanner (Backtest Results)

```javascript
import { exportBacktestToExcel, generateBacktestPDF, generateComparativePDF } from '../reports/index.js';

// Exportar a Excel
exportBacktestToExcel(backtestResults);

// Exportar a PDF
generateBacktestPDF(backtestResults);

// Análisis comparativo
generateComparativePDF(backtestResults, 'Strategy Comparison');
```

### Desde Portfolio Dashboard

```javascript
import {
  exportPortfolioToExcel,
  generateAuditReport,
  generateInvestmentCommitteeReport,
  generateClientReport
} from '../reports/index.js';

// Exportar portfolio a Excel
exportPortfolioToExcel(portfolio, performanceData, riskData);

// Generar reportes PDF
generateAuditReport(portfolio, governance, riskData, performanceData);
generateInvestmentCommitteeReport(portfolio, performanceData, riskData, marketContext);
generateClientReport(portfolio, performanceData, riskData);
```

### Desde Scan Results

```javascript
import { exportScanResultsToExcel } from '../reports/index.js';

exportScanResultsToExcel(scanResults, allocation, riskMetrics);
```

## 🎨 Botones en la UI

### Backtest Section
- 📄 Export CSV (básico, mantiene compatibilidad)
- 📊 Export Excel (multi-hoja, completo)
- 📑 Export PDF (reporte profesional)
- 📈 Comparative Report (análisis comparativo)

### Scanner Results
- 📊 Export Results to Excel (aparece después del scan)

### Portfolio Dashboard
- 📊 Export to Excel (llamar `exportPortfolioExcel()`)
- 📋 Audit Report (llamar `exportAuditReport()`)
- 💼 Investment Committee (llamar `exportInvestmentCommitteeReport()`)
- 👤 Client Report (llamar `exportClientReport()`)

## 📊 Formatos de Datos

### Excel Sheets Structure

#### Backtest Export
1. **Performance Summary**: Strategy, Capital, CAGR, Sharpe, Max DD, Win Rate
2. **Risk Metrics**: Volatility, Drawdowns, Sortino Ratio
3. **Trading Metrics**: Profit Factor, Avg Win/Loss, Costs
4. **Strategy Comparison**: Detailed side-by-side comparison

#### Portfolio Export
1. **Portfolio Overview**: Summary metrics and details
2. **Current Positions**: Full position table
3. **Performance**: Returns, risk-adjusted metrics, benchmark comparison
4. **Risk Analysis**: VaR, CVaR, diversification
5. **Rebalance History**: Recent rebalancing activity

## 🔧 Personalización

### Añadir un nuevo template PDF

```javascript
export function generateCustomReport(data) {
  const pdf = new PDFReportGenerator(data);

  pdf.addTitle('CUSTOM REPORT');
  pdf.addSectionHeader('Section 1');
  pdf.addText('Your content here...');

  const metrics = [
    { label: 'Metric 1', value: '100%' },
    { label: 'Metric 2', value: '$1000' }
  ];
  pdf.addMetricsBox(metrics, 2);

  pdf.addTable(['Header1', 'Header2'], [
    ['Row1Col1', 'Row1Col2'],
    ['Row2Col1', 'Row2Col2']
  ]);

  pdf.download(pdf.getFilename('custom_report', 'pdf'));
}
```

### Añadir nueva hoja Excel

```javascript
const generator = new ExcelReportGenerator(data);

const sheetData = [
  ['Header1', 'Header2', 'Header3'],
  ['Value1', 'Value2', 'Value3']
];

generator.addWorksheet('New Sheet', sheetData, {
  columnWidths: [20, 15, 15]
});

generator.download(generator.getFilename('report', 'xlsx'));
```

## 🧪 Testing

Para probar las exportaciones:

1. Ejecuta un backtest en la UI
2. Click en "Export Excel" o "Export PDF"
3. Verifica que el archivo se descargue correctamente
4. Abre el archivo y verifica los datos

Para reportes de portfolio:
1. Crea un portfolio en el dashboard
2. Usa los botones de exportación
3. Verifica compliance, métricas y formato

## 📝 Notas de Implementación

- **Librerías usadas** (cargadas vía CDN en index.html):
  - `xlsx` (v0.18.5) para Excel - `window.XLSX`
  - `jspdf` (v2.5.1) para PDF - `window.jspdf`
  - `jspdf-autotable` (v3.8.2) para tablas en PDF

- **IMPORTANTE**: Las bibliotecas se cargan desde CDN mediante tags `<script>` en el HTML:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script>
  ```

- **Acceso a las bibliotecas**: Las clases de generadores acceden a las bibliotecas vía `window`:
  - Excel: `window.XLSX`
  - PDF: `window.jspdf.jsPDF`

- **Compatibilidad**: Browser-only (usa Blob API)

- **Límites**:
  - Excel: Sin límite práctico de filas
  - PDF: Auto-paginación implementada
  - CSV: Mantiene exportación legacy

- **Formato de números**:
  - Decimales: 2 por defecto
  - Porcentajes: Automático (× 100)
  - Currency: $ prefix, 2 decimales

## 🎯 Roadmap Completado

✅ Exportación a Excel/CSV con métricas de riesgo, scores, allocation y pesos
✅ Plantillas listas para auditoría, comité de inversión y clientes
✅ Reportes comparativos entre estrategias y períodos
✅ Resúmenes ejecutivos con principales señales y riesgos

## 🤝 Contribuciones

Para añadir nuevos templates o formatos de export:
1. Crea una nueva función en el archivo correspondiente
2. Exporta desde `index.js`
3. Añade el botón en la UI
4. Conecta con `window.functionName` si es necesario
5. Actualiza esta documentación

## 📧 Soporte

Para issues o sugerencias, abrir un issue en el repositorio del proyecto.