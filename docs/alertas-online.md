# Sistema de Alertas Online

## Descripción General

El sistema de alertas permite notificar automáticamente eventos relevantes del mercado y de la cartera a través de múltiples canales de comunicación (email, webhook, Slack, Teams, Zapier). Las alertas se generan en base a umbrales configurables por usuario y estrategia, con deduplicación temporal para evitar spam.

## Arquitectura

### Componentes Principales

```
src/alerts/
  └── alert-manager.js           # Motor de alertas y configuración

src/storage/
  └── indexed-db-store.js        # Persistencia de alertas y settings
      ├── alerts                  # Object store: logs de alertas
      └── alert_settings          # Object store: configuración por usuario/estrategia

src/dashboard/
  └── portfolio-dashboard.js     # UI de configuración y visualización

src/core/
  └── scanner.js                 # Integración: notifyStrongSignals()

src/portfolio/
  └── portfolio-manager.js       # Integración: notifyRebalance()
```

### Modelo de Datos

#### Alert Settings
```javascript
{
  id: "user_id:strategy",          // e.g., "default:balanced"
  user_id: "default",
  strategy: "balanced",
  thresholds: {
    volatility_pct: 25,            // Umbral de volatilidad anualizada (%)
    drawdown_pct: -15,             // Umbral de drawdown máximo (%)
    score: 80                      // Puntuación mínima para señales fuertes
  },
  channels: {
    email: "alerts@example.com",
    webhook: "https://hooks.example.com/webhook",
    slack: "https://hooks.slack.com/services/...",
    teams: "https://outlook.office.com/webhook/...",
    zapier: "https://hooks.zapier.com/..."
  },
  notifyOn: {
    strongSignals: true,           // Notificar señales de alta puntuación
    rebalances: true,              // Notificar rebalanceos de cartera
    riskEvents: true               // Notificar eventos de riesgo (volatilidad, drawdown, concentración)
  },
  created_at: "2026-01-04T...",
  updated_at: "2026-01-04T..."
}
```

#### Alert Log
```javascript
{
  id: "timestamp-random",
  user_id: "default",
  strategy: "balanced",
  type: "signal" | "rebalance" | "risk",
  severity: "info" | "warning" | "error",
  title: "🔥 Señales fuertes detectadas",
  message: "Top señales para balanced: AAPL (95.0), MSFT (92.3)",
  metadata: {
    count: 2,
    threshold: 80
  },
  created_at: "2026-01-04T...",
  delivery_status: "delivered" | "partial" | "failed" | "queued" | "skipped",
  delivery_results: [
    {
      channel: "slack",
      status: "delivered",
      status_code: 200,
      response: "ok",
      delivered_at: "2026-01-04T..."
    }
  ],
  delivered_at: "2026-01-04T..."
}
```

## Flujo de Trabajo

### 1. Configuración de Alertas

**Ubicación:** Portfolio Dashboard → "📨 Alert Configuration"

**Pasos:**
1. Seleccionar la estrategia (o portfolio activo)
2. Configurar umbrales de riesgo:
   - **Volatility (%):** Umbral de volatilidad anualizada (ej: 25%)
   - **Drawdown (%):** Umbral de pérdida máxima (ej: -15%)
   - **Minimum score:** Puntuación mínima para alertas de señales (ej: 80)

3. Configurar canales de entrega (al menos uno):
   - **Email:** Abre el cliente de correo local con plantilla pre-rellenada
   - **Webhook:** POST JSON a URL personalizada
   - **Slack:** Webhook de Slack (formato `text`)
   - **Teams:** Webhook de Microsoft Teams (formato `text`)
   - **Zapier:** Webhook de Zapier (formato JSON completo)

4. Seleccionar tipos de notificaciones:
   - ✅ Notify strong signals
   - ✅ Notify rebalances
   - ✅ Notify risk events

5. Guardar configuración → se persiste en IndexedDB por estrategia

**Función clave:** [portfolio-dashboard.js:333-365](../src/dashboard/portfolio-dashboard.js#L333-L365) `loadAlertSettingsUI()`

### 2. Generación de Alertas

#### 2.1. Señales Fuertes (Strong Signals)

**Trigger:** Al ejecutar un scan (`scanner.js`)

**Lógica:** [alert-manager.js:230-263](../src/alerts/alert-manager.js#L230-L263)
```javascript
await notifyStrongSignals(scanResults, strategy, userId)
```

**Condiciones:**
- `settings.notifyOn.strongSignals === true`
- Al menos un resultado con `scoreTotal >= settings.thresholds.score`
- Deduplicación: una alerta cada 12 horas por estrategia/día

**Ejemplo de alerta:**
```
📌 Título: "🔥 Señales fuertes detectadas"
📝 Mensaje: "Top señales para balanced: AAPL (95.0), MSFT (92.3), GOOGL (88.5)"
🔖 Metadata: { count: 3, threshold: 80 }
```

#### 2.2. Rebalanceos (Rebalances)

**Trigger:** Al ejecutar un rebalanceo de cartera (`portfolio-manager.js`)

**Lógica:** [alert-manager.js:265-292](../src/alerts/alert-manager.js#L265-L292)
```javascript
await notifyRebalance(portfolio, rebalanceRecord, userId)
```

**Condiciones:**
- `settings.notifyOn.rebalances === true`
- Cualquier cambio de pesos en la cartera

**Ejemplo de alerta:**
```
📌 Título: "🔄 Rebalanceo ejecutado"
📝 Mensaje: "Tech Growth rebalanceado. Motivo: periodic. Cambios: AAPL (10.00% → 12.50%), MSFT (8.00% → 9.50%)"
🔖 Metadata: { portfolio_id: "abc123", rebalance_id: "xyz789", changes: 5 }
```

#### 2.3. Eventos de Riesgo (Risk Events)

**Trigger:** Al refrescar el dashboard (`portfolio-dashboard.js` → `checkAlerts()`)

**Lógica:** [alert-manager.js:294-317](../src/alerts/alert-manager.js#L294-L317)
```javascript
await notifyRiskEvent({ strategy, title, message, metadata, dedupeKey })
```

**Tipos de eventos:**

##### Drawdown Excesivo
- **Condición:** `max_drawdown_pct <= thresholds.drawdown_pct`
- **Ejemplo:** Drawdown de -18% cuando el umbral es -15%
- **Deduplicación:** Por portfolio (una alerta hasta que se recupere)

##### Volatilidad Alta
- **Condición:** `annualized_volatility_pct >= thresholds.volatility_pct`
- **Ejemplo:** Volatilidad de 28% cuando el umbral es 25%
- **Deduplicación:** Por portfolio (throttling de 30 minutos)

##### Concentración Excesiva
- **Condición:** Una posición supera el 25% del portfolio
- **Ejemplo:** AAPL representa el 32% de la cartera
- **Deduplicación:** Por portfolio+ticker (throttling de 30 minutos)

##### Underperformance vs Benchmark
- **Condición:** Rendimiento excesivo vs benchmark < -5%
- **Ejemplo:** Cartera -8% vs S&P500
- **Deduplicación:** Por portfolio (throttling de 30 minutos)

### 3. Deduplicación y Throttling

**Implementación:** [alert-manager.js:34-43](../src/alerts/alert-manager.js#L34-L43)

```javascript
const shouldThrottleAlert = (key, ttlMs = 30 * 60 * 1000) => {
  const last = alertThrottleCache.get(key);
  const now = Date.now();
  if (last && now - last < ttlMs) {
    return true; // Silenciar alerta
  }
  alertThrottleCache.set(key, now);
  return false;
}
```

**Claves de deduplicación (dedupeKey):**
- Señales fuertes: `strong-signals:{strategy}:{YYYY-MM-DD}` (12h TTL)
- Rebalanceos: `rebalance:{portfolio_id}:{rebalance_id}` (único)
- Drawdown: `portfolio:{portfolio_id}:drawdown` (30min TTL)
- Volatilidad: `portfolio:{portfolio_id}:volatility` (30min TTL)
- Concentración: `portfolio:{portfolio_id}:concentration:{ticker}` (30min TTL)

**Objetivo:** Evitar spam de alertas repetidas en cortos períodos de tiempo.

### 4. Entrega a Canales

**Implementación:** [alert-manager.js:150-228](../src/alerts/alert-manager.js#L150-L228)

#### Email
```javascript
// Abre el cliente de correo local con plantilla
const mailto = `mailto:${email}?subject=${title}&body=${message}`;
window.open(mailto, '_blank');
```

**Estado:** `queued` (no hay confirmación de envío real)

#### Webhook, Slack, Teams, Zapier
```javascript
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

**Payload para Slack/Teams:**
```json
{
  "text": "🔥 Señales fuertes detectadas\nTop señales para balanced: AAPL (95.0)"
}
```

**Payload para Webhook/Zapier:**
```json
{
  "alert": {
    "id": "1736023972-abc123",
    "strategy": "balanced",
    "type": "signal",
    "severity": "info",
    "title": "🔥 Señales fuertes detectadas",
    "message": "Top señales para balanced: AAPL (95.0)",
    "created_at": "2026-01-04T22:52:52Z",
    "metadata": { "count": 1, "threshold": 80 }
  }
}
```

**Estados de entrega:**
- `delivered`: Todos los canales respondieron OK (status 2xx)
- `partial`: Algunos canales OK, otros fallaron
- `failed`: Todos los canales fallaron
- `queued`: Email abierto en cliente (no confirmado)
- `skipped`: No hay canales configurados

### 5. Logs y Auditoría

**Ubicación:** Portfolio Dashboard → "📬 Alerts log"

**Visualización:**
- **Últimas 20 alertas** por estrategia seleccionada
- **Información mostrada:**
  - Título y mensaje
  - Timestamp de creación
  - Estado de entrega
  - Canales utilizados (tags: slack, webhook, email, etc.)

**Función clave:** [portfolio-dashboard.js:393-425](../src/dashboard/portfolio-dashboard.js#L393-L425) `loadAlertLogsUI()`

**Persistencia:** IndexedDB → Object store `alerts`

**Consulta:**
```javascript
const logs = await getAlertLogs({
  strategy: 'balanced',
  userId: 'default',
  limit: 50
});
```

## Configuración de Webhooks

### Slack

1. Ir a: https://api.slack.com/messaging/webhooks
2. Crear "Incoming Webhook" para tu workspace
3. Seleccionar canal destino (ej: `#trading-alerts`)
4. Copiar URL: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
5. Pegar en campo "Slack" de configuración de alertas

**Formato esperado:**
```json
{
  "text": "🔥 Título\nMensaje"
}
```

### Microsoft Teams

1. Ir a tu canal → "Connectors" → "Incoming Webhook"
2. Configurar nombre e icono
3. Copiar URL: `https://outlook.office.com/webhook/...`
4. Pegar en campo "Teams"

**Formato esperado:**
```json
{
  "text": "🔥 Título\nMensaje"
}
```

### Zapier

1. Crear un nuevo Zap
2. Trigger: "Webhooks by Zapier" → "Catch Hook"
3. Copiar Webhook URL: `https://hooks.zapier.com/hooks/catch/...`
4. Pegar en campo "Zapier"
5. Configurar acciones (ej: enviar a email, Telegram, Discord, base de datos, etc.)

**Formato enviado:**
```json
{
  "alert": {
    "id": "...",
    "strategy": "balanced",
    "type": "signal",
    "severity": "info",
    "title": "🔥 Título",
    "message": "Mensaje detallado",
    "created_at": "2026-01-04T...",
    "metadata": { ... }
  }
}
```

### Webhook Personalizado

Para implementar tu propio endpoint:

```javascript
// Endpoint: POST https://your-domain.com/alerts
app.post('/alerts', (req, res) => {
  const { alert } = req.body;

  // Validar estructura
  if (!alert || !alert.id || !alert.title) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Procesar alerta (guardar en DB, enviar notificación, etc.)
  console.log(`[${alert.severity}] ${alert.title}: ${alert.message}`);

  // Responder OK
  res.status(200).json({ status: 'received' });
});
```

**Recomendaciones:**
- Validar el payload antes de procesarlo
- Responder rápidamente (< 5s) para evitar timeouts
- Implementar idempotencia usando `alert.id` como clave única
- Registrar logs de auditoría

## Testing

### Tests Implementados

**Ubicación:** [tests.js:842-924](../src/tests/tests.js#L842-L924)

#### 1. `testAlertSettingsDefaults`
- Verifica que se aplican valores por defecto al obtener configuración inexistente
- Mock de `dbStore.getAlertSettings` → `null`
- Mock de `dbStore.saveAlertSettings` → guarda defaults
- **Validación:** Umbrales, canales y notifyOn tienen valores por defecto

#### 2. `testAlertWebhookDelivery`
- Simula envío exitoso a webhook
- Mock de `fetch` → `{ ok: true, status: 200 }`
- **Validación:**
  - `delivery_status === 'delivered'`
  - `delivery_results.length === 1`
  - Alerta guardada antes y después de entrega

#### 3. `testStrongSignalsAlert`
- Simula detección de señales fuertes
- Resultados con scores: `[95, 85]` vs umbral `90`
- **Validación:**
  - Solo filtra señales con score >= 90 (1 señal)
  - `metadata.count === 1`
  - Alerta creada y guardada

**Ejecución:**
```bash
# Abrir index.html en el navegador
# Ir a consola → ejecutar:
runAllTests();
```

### Limitaciones de los Tests

- Los tests son **mockeados** (no usan IndexedDB real ni `fetch` real)
- No prueban la UI de configuración (solo lógica de negocio)
- No prueban integración completa end-to-end
- Runner es asíncrono pero sin framework de tests (no hay describe/it)

### Pruebas Manuales Recomendadas

1. **Configuración de umbrales:**
   - Configurar umbral de drawdown en -10%
   - Crear cartera con posiciones que generen drawdown > -10%
   - Verificar que se genera alerta de drawdown

2. **Webhook delivery:**
   - Configurar webhook de Slack/Zapier
   - Ejecutar scan con señales fuertes
   - Verificar recepción de mensaje en canal destino

3. **Deduplicación:**
   - Generar la misma alerta 2 veces en < 30 minutos
   - Verificar que solo se envía una vez

4. **Logs:**
   - Generar varias alertas de diferentes tipos
   - Consultar "📬 Alerts log" en dashboard
   - Verificar historial completo con estados de entrega

## Mejoras Futuras

### Prioridad Alta
- [ ] **Retry logic para webhooks:** Reintentar envíos fallidos (3 intentos con exponential backoff)
- [ ] **Rate limiting global:** Máximo de alertas por hora/día para evitar spam masivo
- [] **Plantillas de mensajes personalizables:** Permitir al usuario editar formato de alertas

### Prioridad Media
- [ ] **Soporte de SMS/Twilio:** Canal adicional para alertas críticas
- [ ] **Filtros avanzados:** Permitir filtrar por severidad, tipo, metadata específico
- [ ] **Alertas programadas:** Digest diario/semanal de resumen de cartera
- [ ] **Webhooks firmados:** HMAC signature para validar autenticidad de payloads

### Prioridad Baja
- [ ] **Dashboard de estadísticas:** Tasa de entrega, canales más usados, alertas más frecuentes
- [ ] **Exportar logs a CSV:** Para auditoría externa
- [ ] **Integración con PagerDuty/Opsgenie:** Para equipos de trading profesionales

## Referencias

### Archivos Clave

- [src/alerts/alert-manager.js](../src/alerts/alert-manager.js) - Motor de alertas (317 líneas)
- [src/storage/indexed-db-store.js](../src/storage/indexed-db-store.js) - Persistencia (415 líneas)
- [src/dashboard/portfolio-dashboard.js](../src/dashboard/portfolio-dashboard.js) - UI de configuración
- [src/tests/tests.js](../src/tests/tests.js) - Tests de alertas
- [src/i18n/translations/es.js](../src/i18n/translations/es.js) - Traducciones español
- [src/i18n/translations/en.js](../src/i18n/translations/en.js) - Traducciones inglés

### Commit de Implementación

**Commit:** `15c7d9a` - "Implemented alerts and configuration."
- +964 líneas añadidas
- 9 archivos modificados
- Incluye: lógica de alertas, UI, storage, tests, traducciones

### Dependencias

- **IndexedDB:** Persistencia local (sin dependencias externas)
- **Fetch API:** Envío de webhooks (nativo en navegadores modernos)
- **i18n:** Sistema de traducciones interno (`src/i18n/i18n.js`)

---

**Documentación actualizada:** 2026-01-04
**Versión del sistema:** v2.0 (commit `15c7d9a`)
