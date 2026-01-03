# Sistema de Internacionalización (i18n)

## Descripción

Este módulo proporciona soporte multiidioma para Global Scanner Pro con:
- **Español Europeo** (idioma por defecto)
- **Inglés Británico**

El idioma seleccionado se guarda en `localStorage` y persiste entre sesiones.

---

## Estructura de Archivos

```
src/i18n/
├── i18n.js                 # Motor de internacionalización
├── ui-translator.js        # Helper para traducción automática del DOM
├── translations/
│   ├── es.js              # Traducciones en español europeo
│   └── en.js              # Traducciones en inglés británico
└── README.md              # Esta documentación
```

---

## Uso Básico

### 1. Importar el módulo i18n

```javascript
import i18n from './i18n/i18n.js';
```

### 2. Obtener traducciones

```javascript
// Traducción simple
const text = i18n.t('buttons.runScan');
// Resultado: "🚀 Ejecutar Análisis" (es) o "🚀 Run Analysis" (en)

// Traducción con parámetros
const text = i18n.t('status.analyzing', { current: 5, total: 10 });
// Resultado: "🔍 Analizando 5 de 10 activos..."
```

### 3. Cambiar idioma

```javascript
// Cambiar a inglés
i18n.setLanguage('en');

// Cambiar a español
i18n.setLanguage('es');

// Obtener idioma actual
const currentLang = i18n.getCurrentLanguage(); // 'es' o 'en'
```

---

## Integración en HTML

### Método 1: Atributos data-i18n (Recomendado)

Agrega el atributo `data-i18n` a los elementos HTML que deseas traducir:

```html
<!-- Texto simple -->
<label data-i18n="markets.label">📍 Mercado</label>

<!-- Botones -->
<button data-i18n="buttons.runScan" onclick="runScan()">
  🚀 Ejecutar Análisis
</button>

<!-- Para contenido HTML -->
<div data-i18n-html="filters.info"></div>

<!-- Para atributos title -->
<button data-i18n-title="buttons.runScan">▶</button>
```

**Ventaja:** La traducción se actualiza automáticamente al cambiar el idioma.

### Método 2: Traducción Manual en JavaScript

```javascript
import i18n from './i18n/i18n.js';

// En funciones de renderizado
function renderButton() {
  const button = document.createElement('button');
  button.textContent = i18n.t('buttons.runScan');
  return button;
}

// Actualizar al cambiar idioma
window.addEventListener('languageChanged', () => {
  document.getElementById('myButton').textContent = i18n.t('buttons.runScan');
});
```

---

## Selector de Idioma

### HTML del Selector

```html
<div class="language-selector">
  <select id="languageSelect" onchange="changeLanguage(this.value)">
    <option value="es">🇪🇸 Español</option>
    <option value="en">🇬🇧 English</option>
  </select>
</div>
```

### JavaScript para Cambiar Idioma

```javascript
import i18n from './i18n/i18n.js';

window.changeLanguage = function(lang) {
  i18n.setLanguage(lang);
  // El evento 'languageChanged' se dispara automáticamente
  // y actualiza todos los elementos con data-i18n
};

// Establecer el idioma inicial en el selector
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('languageSelect');
  if (selector) {
    selector.value = i18n.getCurrentLanguage();
  }
});
```

---

## Integración en scanner.js

### Importar al inicio del archivo

```javascript
import i18n from '../i18n/i18n.js';
```

### Reemplazar strings hardcodeados

**Antes:**
```javascript
statusNode.innerText = '⏳ Iniciando escaneo...';
```

**Después:**
```javascript
statusNode.innerText = i18n.t('status.initializing');
```

**Con parámetros:**
```javascript
// Antes
filterInfo.innerHTML = `✅ ${analyzed} aprobados | ❌ ${filtered} filtrados`;

// Después
filterInfo.innerHTML = i18n.t('filters.info', {
  approved: analyzed,
  filtered: filtered
});
```

---

## Agregar Nuevas Traducciones

### 1. Editar es.js

```javascript
export default {
  // ...
  myNewSection: {
    title: 'Mi Nuevo Título',
    description: 'Descripción en español',
    message: 'Mensaje con {param}'
  }
}
```

### 2. Editar en.js

```javascript
export default {
  // ...
  myNewSection: {
    title: 'My New Title',
    description: 'Description in English',
    message: 'Message with {param}'
  }
}
```

### 3. Usar en el código

```javascript
const title = i18n.t('myNewSection.title');
const msg = i18n.t('myNewSection.message', { param: 'value' });
```

---

## Claves de Traducción Disponibles

### Principales secciones:

- `markets.*` - Nombres de mercados
- `strategies.*` - Perfiles de estrategia
- `allocation.*` - Métodos de asignación
- `risk.*` - Perfiles de riesgo
- `buttons.*` - Texto de botones
- `status.*` - Mensajes de estado
- `filters.*` - Información de filtros
- `table.*` - Encabezados de tabla
- `signals.*` - Señales de trading
- `sectors.*` - Nombres de sectores
- `portfolio.*` - Información de cartera
- `backtest.*` - Resultados de backtesting
- `errors.*` - Mensajes de error
- `modal.*` - Contenido de modales

Consulta los archivos `es.js` y `en.js` para la lista completa.

---

## Ejemplo Completo de Integración

### En index.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <title>Global Quant Scanner Pro</title>
</head>
<body>
  <div class="header">
    <!-- Selector de idioma -->
    <div class="language-selector">
      <select id="languageSelect" onchange="changeLanguage(this.value)">
        <option value="es">🇪🇸 Español</option>
        <option value="en">🇬🇧 English</option>
      </select>
    </div>

    <h1>Global Quant Scanner Pro</h1>
  </div>

  <div class="controls">
    <div class="control-group">
      <label data-i18n="markets.label">📍 Mercado</label>
      <select id="marketSelect">
        <option value="es" data-i18n="markets.spain">España (BME)</option>
        <option value="us" data-i18n="markets.usa">Estados Unidos</option>
      </select>
    </div>

    <button data-i18n="buttons.runScan" onclick="runScan()">
      🚀 Ejecutar Análisis
    </button>
  </div>

  <div id="status" data-i18n="status.initializing"></div>

  <script type="module" src="src/core/scanner.js"></script>
</body>
</html>
```

### En scanner.js

```javascript
import i18n from '../i18n/i18n.js';
import uiTranslator from '../i18n/ui-translator.js';

// Función global para cambiar idioma
window.changeLanguage = function(lang) {
  i18n.setLanguage(lang);
};

// Función que usa traducciones
async function runScan() {
  const statusNode = document.getElementById('status');

  statusNode.innerText = i18n.t('status.initializing');

  try {
    // ... lógica de escaneo ...

    statusNode.innerText = i18n.t('status.complete', { time: elapsed });
  } catch (error) {
    statusNode.innerText = i18n.t('status.error', { message: error.message });
  }
}

// Actualizar idioma del selector al cargar
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('languageSelect');
  if (selector) {
    selector.value = i18n.getCurrentLanguage();
  }
});

window.runScan = runScan;
```

---

## Mantenimiento

### Añadir un nuevo idioma (ej: francés)

1. Crear `src/i18n/translations/fr.js` siguiendo la estructura de `es.js`
2. Importar en `src/i18n/i18n.js`:
   ```javascript
   import fr from './translations/fr.js';
   const translations = { es, en, fr };
   ```
3. Agregar opción al selector:
   ```html
   <option value="fr">🇫🇷 Français</option>
   ```

---

## Notas Importantes

1. **Idioma por defecto:** Español europeo (`es`)
2. **Persistencia:** El idioma se guarda en `localStorage`
3. **Formato de parámetros:** Usar `{nombreParametro}` en strings
4. **Fallback:** Si falta una clave, se devuelve la clave misma
5. **Eventos:** Se dispara `languageChanged` al cambiar idioma

---

## Soporte

Para añadir nuevas traducciones o reportar problemas, edita los archivos en `src/i18n/translations/`.
