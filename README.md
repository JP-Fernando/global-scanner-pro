Demo: https://jp-fernando.github.io/global-scanner-pro/
# 🎯 Global Quant Scanner Pro

**Global Quant Scanner Pro** es una plataforma profesional de *market scanning*, *portfolio construction* y *risk analytics*
que analiza miles de datos por segundo para identificar oportunidades de
inversión basadas en modelos cuantitativos robustos, eliminando el sesgo emocional del trading.

Diseñado con principios de arquitectura defensiva, gobernanza de inversión y análisis de riesgo institucional.

---

## 🚀 Inicio Rápido

### Instalación en Linux (Terminal)

1. Abre una terminal y clona el repositorio:

```bash
git clone https://github.com/JP-Fernando/global-scanner-pro.git
cd global-scanner-pro
```

2. Instala dependencias e inicia el servidor:

```bash
npm install
node server.js
```

### Instalación en Windows (PowerShell)

1. Instala **Git for Windows** y **Node.js LTS** (ejemplos con `winget`):

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
```

2. Abre PowerShell y clona el repositorio:

```powershell
git clone https://github.com/JP-Fernando/global-scanner-pro.git
cd global-scanner-pro
```

3. Instala dependencias e inicia el servidor:

```powershell
npm install
node server.js
```

4. Abre la interfaz en tu navegador: `http://localhost:3000/index.html`.

#### Solución de problemas de permisos en Windows

En algunos entornos, **Windows puede bloquear la instalación global o la ejecución de scripts**. Si te ocurre, prueba lo siguiente:

1. **Ejecuta PowerShell como Administrador** (clic derecho → "Ejecutar como administrador").
2. **Permite scripts en la sesión actual** (solo para esa terminal):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

3. **Evita instalaciones globales** y fuerza dependencias en el proyecto:

```powershell
npm install --no-audit --no-fund
```

4. Si recibes errores de permisos con npm, usa una **carpeta de usuario** para el caché:

```powershell
npm config set cache "$env:USERPROFILE\AppData\Local\npm-cache" --global
```

5. Como alternativa, puedes usar **Windows Terminal + Git Bash** y repetir los pasos de instalación.

---

### Uso Básico

1. Abre la interfaz: `http://localhost:3000/index.html`
2. **Selecciona el idioma** (🇪🇸 Español o 🇬🇧 English) en el selector superior derecho
3. Selecciona un mercado (España, USA, Alemania, etc.)
4. Elige una estrategia según tu perfil de riesgo
5. Haz clic en "Ejecutar Análisis"
6. Explora los resultados ordenando por *scores* y factores
7. **Opcional**: Construye una cartera profesional con los mejores activos
8. **Opcional**: Configura alertas automáticas para eventos de riesgo y señales fuertes
9. Revisa el **régimen de mercado** detectado automáticamente


---

### Cómo cambiar el idioma:

1. Haz clic en el selector de idioma en la esquina superior derecha
2. Selecciona 🇪🇸 Español o 🇬🇧 English
3. La interfaz se actualizará automáticamente

El sistema traduce:
- Nombres de mercados y estrategias
- Mensajes de estado y progreso
- Botones y controles
- Errores y advertencias
- Resultados de análisis y backtesting

---

## 🔒 Phase 1: Security & Infrastructure (COMPLETED!)

**Status**: ✅ COMPLETADO - Enero 2026

La Phase 1 del [roadmap profesional](docs/roadmap.md) ha sido implementada completamente, estableciendo una base enterprise-grade de seguridad e infraestructura:

### 🛡️ Security Hardening
- ✅ **Input Validation**: Validación Zod en todos los endpoints API
- ✅ **Security Headers**: Helmet.js con CSP, XSS protection, clickjacking prevention
- ✅ **Rate Limiting**: Protección contra abuso y DDoS (100 req/15min global, 20 req/min Yahoo Finance)
- ✅ **CORS**: Política de whitelist configurable
- ✅ **Environment Secrets**: Variables de entorno validadas con dotenv + Zod
- ✅ **HTTPS Enforcement**: Redirección automática en producción

### 📊 Logging & Monitoring
- ✅ **Winston Logging**: Sistema estructurado con 6 niveles (error, warn, info, http, debug, silly)
- ✅ **Log Rotation**: Archivos rotados automáticamente (5MB, 7 días retención)
- ✅ **Sentry Integration**: Error tracking y performance monitoring
- ✅ **Request Tracing**: Request ID tracking para debugging
- ✅ **Sanitization**: Datos sensibles automáticamente redactados

### 🛠️ Code Quality
- ✅ **ESLint**: Airbnb style guide + security plugin + JSDoc enforcement
- ✅ **Prettier**: Formateo consistente de código
- ✅ **Husky**: Pre-commit hooks (lint + format)
- ✅ **lint-staged**: Solo archivos modificados procesados

### 🔄 CI/CD Pipeline
- ✅ **GitHub Actions CI**: Lint, tests, security audit en cada PR
- ✅ **Security Scanning**: CodeQL, Snyk, TruffleHog, dependency review
- ✅ **Automated Testing**: Test suite ejecutada en cada push

### 📚 Documentación Detallada

La documentación de Phase 1 se ha organizado en guías especializadas:

- 🔒 [Security Implementation Guide](docs/security-implementation.md) - Input validation, security headers, rate limiting, CORS
- 📊 [Logging and Monitoring Guide](docs/logging-monitoring.md) - Winston logging, error handling, Sentry
- 🎨 [Code Quality Guide](docs/code-quality.md) - ESLint, Prettier, Husky
- 🔄 [CI/CD Pipeline Guide](docs/ci-cd-pipeline.md) - GitHub Actions workflows
- 🧪 [Testing Strategy Guide](docs/testing-strategy.md) - Tests actuales y roadmap Phase 2
- 📄 [.env.example](.env.example) - Template de configuración con 40+ variables

---

## ✨ Características Principales

- 📊 **Portfolio Tracking**: Dashboard en tiempo real con curvas de equity, drawdown y métricas de riesgo (VaR, CVaR, Sharpe, Sortino)
- 🔔 **Alertas Inteligentes**: Notificaciones automáticas por email, Slack, Teams o Zapier para señales fuertes y eventos de riesgo
- 📈 **Market Scanning**: Análisis cuantitativo de 14 mercados globales con 4 estrategias profesionales
- 📑 **Reportes Avanzados**: Exportación a Excel/PDF con plantillas para auditoría, comité de inversión y clientes
- 🎯 **Risk Analytics**: Motor de riesgo con VaR paramétrico, CVaR, matrices de correlación y tests de estrés multi-factor
- 🎲 **Simulación Monte Carlo**: Tests de robustez con simulaciones estocásticas y escenarios históricos
- ⚙️ **Optimización de Portfolio**: Máximo Sharpe, mínima varianza y risk parity con restricciones de gobernanza
- 🌐 **Multiidioma**: Interfaz completa en español e inglés
- 🔐 **Gobernanza Dinámica**: Límites adaptativos según volatilidad y correlación de mercado
- ♿ **Accesibilidad Completa**: WCAG 2.1 AA, navegación por teclado, screen readers
- 💡 **Documentación Interactiva**: Tooltips contextuales y panel de ayuda integrado
- ⚡ **Optimización de Rendimiento**: Lazy loading, virtual scrolling, debouncing
- 🤖 **Machine Learning**: Ponderación dinámica de factores, adaptive scoring, predicción de regímenes 🆕
- 🎯 **AI Recommendations**: Sistema de recomendaciones proactivas con IA 🆕
- 🔍 **Anomaly Detection**: Detección de patrones y anomalías con unsupervised learning 🆕

---

## 📚 Documentación

Toda la documentación detallada se encuentra en la carpeta [`docs/`](docs/README.md).

### Guías de Usuario
- [Guía para principiantes](docs/guia-principiantes.md)
- [Interpretación de señales](docs/interpretacion-senales.md)
- [Construcción de cartera y análisis de riesgo](docs/cartera-riesgo.md)
- [Dashboard de portfolio tracking](docs/portfolio_dashboard.md)
- [Sistema de alertas online](docs/alertas-online.md)
- [Análisis de atribución](docs/attribution-analysis.md)
- [Tests de estrés multi-factor](docs/stress-testing.md)
- [Simulación Monte Carlo y optimización](docs/monte-carlo-optimization.md)

### Documentación Técnica

**Arquitectura y Sistemas**:
- [Arquitectura técnica](docs/arquitectura-tecnica.md)
- [Sistema de internacionalización (i18n)](src/i18n/README.md)
- [Módulo de reportes avanzados](docs/reports-module.md)
- [Mejoras de experiencia de usuario](docs/ux-improvements.md)
- [Machine Learning y optimización avanzada](docs/machine-learning.md) 🆕

**Infrastructure y DevOps** (Phase 1):
- [Security Implementation Guide](docs/security-implementation.md)
- [Logging and Monitoring Guide](docs/logging-monitoring.md)
- [Code Quality Guide](docs/code-quality.md)
- [CI/CD Pipeline Guide](docs/ci-cd-pipeline.md)
- [Testing Strategy Guide](docs/testing-strategy.md)

**Roadmap**:
- [Roadmap del proyecto](docs/roadmap.md)

---

## 🏗️ Arquitectura Técnica

### Estructura del Proyecto

```
global-scanner-pro/
├── index.html                    # Interfaz principal
├── server.js                     # Servidor Express
├── package.json                  # Dependencias
│
├── src/
│   ├── core/
│   │   ├── scanner.js           # Motor principal (con i18n integrado)
│   │   └── config.js            # Configuración (con traducciones dinámicas)
│   │
│   ├── i18n/                    # Sistema de internacionalización
│   │   ├── i18n.js              # Motor de traducciones
│   │   ├── ui-translator.js     # Helper para actualización automática del DOM
│   │   ├── translations/
│   │   │   ├── es.js            # Español Europeo (por defecto)
│   │   │   └── en.js            # Inglés Británico
│   │   ├── README.md            # Documentación completa del sistema i18n
│   │   └── example-integration.html  # Ejemplo funcional
│   │
│   ├── ui/                      # 🆕 Sistema de UX mejorado (Fase 6)
│   │   ├── tooltip-manager.js   # Tooltips interactivos
│   │   ├── help-panel.js        # Panel de ayuda contextual
│   │   ├── accessibility-manager.js  # Accesibilidad (WCAG 2.1 AA)
│   │   ├── performance-optimizer.js  # Optimización de rendimiento
│   │   ├── ui-init.js           # Inicialización de componentes UI
│   │   └── ui-enhancements.css  # Estilos mejorados
│   │
│   ├── reports/                 # Sistema de exportación y reportes
│   │   ├── report-generator.js  # Clases base para generación
│   │   ├── excel-exporter.js    # Exportadores Excel especializados
│   │   ├── pdf-templates.js     # Templates PDF por audiencia
│   │   ├── comparative-analysis.js  # Análisis comparativo
│   │   ├── index.js             # Exports centralizados
│   │   └── README.md            # Documentación técnica
│   │
│   ├── alerts/                  # Sistema de alertas online
│   │   └── alert-manager.js     # Gestión de alertas y notificaciones
│   │
│   ├── portfolio/               # Gestión y tracking de portfolios
│   │   ├── portfolio-manager.js # CRUD de portfolios
│   │   └── performance-tracker.js  # Métricas y análisis
│   │
│   ├── dashboard/               # Dashboard interactivo
│   │   ├── portfolio-dashboard.js  # Controller del dashboard
│   │   └── attribution-dashboard.js # Dashboard de atribución
│   │
│   ├── storage/                 # Persistencia de datos
│   │   └── indexed-db-store.js  # IndexedDB wrapper (portfolios + alertas)
│   │
│   ├── indicators/              # Indicadores técnicos y scoring
│   ├── allocation/              # Métodos de asignación de capital
│   ├── analytics/               # Backtesting, risk, governance, regime
│   │   ├── stress-testing.js    # Tests de estrés multi-factor
│   │   ├── monte-carlo.js       # Simulación Monte Carlo
│   │   ├── portfolio-optimizer.js  # Optimización de portfolio
│   │   ├── attribution-analysis.js # Análisis de atribución
│   │   ├── dynamic-governance.js   # 🆕 Gobernanza dinámica
│   │   └── governance.js        # Reglas de gobernanza estáticas
│   │
│   ├── ml/                      # 🆕 Machine Learning (Integrado)
│   │   ├── ml-engine.js         # Core ML: Linear Regression, Random Forest, K-Means
│   │   ├── factor-weighting.js  # Optimización dinámica de pesos
│   │   ├── adaptive-scoring.js  # Ajuste adaptativo de scores
│   │   ├── regime-prediction.js # Predicción de régimen con ML
│   │   ├── recommendation-engine.js  # Recomendaciones con IA
│   │   ├── anomaly-detection.js # Detección de anomalías
│   │   └── index.js             # Exports centralizados
│   │
│   ├── data/                    # Sectores y anomalías
│   └── tests/                   # Suite de testing (con tests ML)
│
├── docs/                        # Documentación completa
│   ├── README.md                # Índice de documentación
│   ├── guia-principiantes.md    # Guía para nuevos usuarios
│   ├── interpretacion-senales.md  # Cómo interpretar señales
│   ├── cartera-riesgo.md        # Construcción de cartera
│   ├── portfolio_dashboard.md   # Dashboard de tracking
│   ├── alertas-online.md        # Sistema de alertas
│   ├── attribution-analysis.md  # Análisis de atribución
│   ├── stress-testing.md        # Tests de estrés
│   ├── monte-carlo-optimization.md  # Monte Carlo y optimización
│   ├── arquitectura-tecnica.md  # Detalles técnicos
│   ├── reports-module.md        # Módulo de reportes
│   ├── ux-improvements.md       # 🆕 Mejoras UX
│   ├── machine-learning.md      # 🆕 Machine Learning integrado
│   ├── roadmap.md               # Roadmap del proyecto
│   └── disclaimer.md            # Descargo de responsabilidad
│
└── universes/                   # Datos de mercados (14 mercados)
```

### Tecnologías Utilizadas

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Backend**: Node.js + Express
- **Datos**: Yahoo Finance API
- **Exportación**: xlsx, jsPDF, jsPDF-AutoTable
- **Persistencia**: IndexedDB (client-side)
- **Charts**: Chart.js

---

## 📄 Licencia

MIT License - Uso libre para fines educativos y comerciales.
Consulta el texto completo en [LICENSE](LICENSE).

---

## ⚠️ Descargo de Responsabilidad (Disclaimer)

Este software ha sido desarrollado con fines **estrictamente educativos y de entretenimiento personal**.

El autor no se hace responsable de la exactitud de los datos proporcionados
 por terceros ni de las decisiones financieras tomadas por los usuarios del software.

La versión completa del descargo de responsabilidad está en [docs/disclaimer.md](docs/disclaimer.md).

---

**Desarrollado con ❤️ para traders cuantitativos profesionales**
