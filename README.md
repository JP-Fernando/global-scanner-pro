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
8. Revisa el **régimen de mercado** detectado automáticamente


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

## 📚 Documentación

Toda la documentación detallada se encuentra en la carpeta [`docs/`](docs/README.md).

Documentos destacados:
- [Guía para principiantes](docs/guia-principiantes.md)
- [Interpretación de señales](docs/interpretacion-senales.md)
- [Construcción de cartera y análisis de riesgo](docs/cartera-riesgo.md)
- [Sección técnica](docs/arquitectura-tecnica.md)
- [Sistema de internacionalización (i18n)](src/i18n/README.md)
- [Módulo de reportes avanzados](docs/reports_module.md) 🆕
- [Roadmap](docs/roadmap.md)

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
│   ├── reports/                 # 🆕 Sistema de exportación y reportes
│   │   ├── report-generator.js  # Clases base para generación
│   │   ├── excel-exporter.js    # Exportadores Excel especializados
│   │   ├── pdf-templates.js     # Templates PDF por audiencia
│   │   ├── comparative-analysis.js  # Análisis comparativo
│   │   ├── index.js             # Exports centralizados
│   │   └── README.md            # Documentación técnica
│   │
│   ├── portfolio/               # Gestión y tracking de portfolios
│   │   ├── portfolio-manager.js # CRUD de portfolios
│   │   └── performance-tracker.js  # Métricas y análisis
│   │
│   ├── dashboard/               # Dashboard interactivo
│   │   └── portfolio-dashboard.js  # Controller del dashboard
│   │
│   ├── storage/                 # Persistencia de datos
│   │   └── indexed-db-store.js  # IndexedDB wrapper
│   │
│   ├── indicators/              # Indicadores técnicos y scoring
│   ├── allocation/              # Métodos de asignación de capital
│   ├── analytics/               # Backtesting, risk, governance, regime
│   ├── data/                    # Sectores y anomalías
│   └── tests/                   # Suite de testing
│
├── docs/                        # Documentación completa
│   ├── README.md                # Índice de documentación
│   ├── guia-principiantes.md    # Guía para nuevos usuarios
│   ├── interpretacion-senales.md  # Cómo interpretar señales
│   ├── cartera-riesgo.md        # Construcción de cartera
│   ├── arquitectura-tecnica.md  # Detalles técnicos
│   ├── reports_module.md        # 🆕 Módulo de reportes
│   ├── roadmap.md               # Roadmap del proyecto
│   └── disclaimer.md            # Descargo de responsabilidad
│
└── universes/                   # Datos de mercados (18 mercados)
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