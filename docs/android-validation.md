# Validación Android — C4 y Fase D

Estado (2026-11-01): implementación web C4 validada en navegador y en **Android 15 emulado con
Chrome real**. **Decisión de Fase D: la PWA es el canal de entrega Android**; no se añade
wrapper nativo. Siguen pendientes las comprobaciones que solo un teléfono físico o un despliegue
HTTPS público pueden confirmar (ver al final).

## Evidencia automatizada (Chromium de escritorio)

- Chromium a 360/390/430 px: Analizar, Resultados, Detalle, Simulador, construcción y revisión
  de carteras, detalle de posición y alertas. Auditorías axe WCAG 2 A/AA y 2.1 AA sin desactivar
  reglas, navegación con teclado, enlace para saltar al contenido, foco y ausencia de desbordamiento.
- Texto ampliado: con la fuente raíz al 200 % (32 px) no hay desbordamiento horizontal en
  ninguna pantalla, y `android.html` declara la adhesión al tamaño de texto del sistema.
- Contracción simulada del viewport visual: se ocultan los controles inferiores mientras está
  activo el teclado; se conserva el campo editado.
- Recarga y reapertura: ruta explícita con prioridad sobre la última visitada, borradores,
  desplegables, contexto de foco y scroll; revisión local sin cálculos ni peticiones implícitas.
- Operaciones interrumpidas: aviso al reabrir, conservación de la revisión anterior y reintento
  explícito. Perder la conexión durante un escaneo impide reemplazar la revisión completa anterior.
- IndexedDB bloqueado por otra pestaña: el arranque termina y presenta un error recuperable;
  los borradores siguen editables. Las conexiones se cierran ante cambios de versión.
- Instalación: manifiesto Android independiente, identificador estable y consumo único del
  evento de instalación (eventos simulados en Chromium; la instalación real se validó en el emulador).
- Build con prefijo: manifiestos, iconos, arranque Android/escritorio separados, precarga del
  grafo completo, recarga offline inmediata, carteras/alertas locales y actualización real
  del service worker pendiente de una acción explícita. Activar la actualización restaura borradores.
- Caché: versión derivada del build, HTML vinculado al grafo de la misma versión, escrituras
  de caché fallidas sin romper respuestas online y limpieza limitada al prefijo del despliegue.
  Las navegaciones a páginas del servidor (`/api-docs`, `/metrics`, `/api/**`) no reciben el
  HTML cacheado de la app.
- Foco: el objetivo guardado solo se reaplica mientras la pantalla espera datos locales; un
  redibujado posterior no devuelve el foco a un campo que el usuario ya ha abandonado.

Comandos reproducibles:

```bash
npm run build
npm run test:coverage
npm run test:e2e:android
npm run test:e2e:chromium
npm run test:e2e:build
```

`test:e2e:build` restaura el build de raíz al terminar. Las pruebas Express usan los módulos
sin empaquetar y una recarga online bajo control del worker antes de comprobarlos offline.
La prueba de producción comprueba la recarga offline inmediata con los assets precargados.

Validación automatizada (2026-11-01): **1375 tests unitarios/integración en 81 archivos**;
**114 E2E Chromium en 16 specs** (87 escritorio + 27 Android) y **2 pruebas del build de
producción con prefijo**. TypeScript y ESLint (0 errores) pasan. Cobertura medida antes de la
auditoría C4: global **94.89 / 82.55 / 95.99 / 96.26%** y frontend compartido
**95.27 / 90.66 / 92.50 / 96.52%** (sentencias / ramas / funciones / líneas).

## Validación en Android emulado (Fase D)

Entorno: AVD Pixel 7a (`sdk_gphone64_x86_64`), Android 15 (API 35, imagen Google Play),
**Chrome 149.0.7827.200**, pantalla 1080×2400 a 420 dpi (411×845 px CSS en modo standalone),
teclado Gboard. El AVD se arrancó con `-read-only -no-snapshot`, de modo que no conserva cambios.

Servidor: build de producción (`npm run build`, `node dist/server.js`) en el host, con
`adb reverse tcp:3000 tcp:3000` para que el emulador abra `http://localhost:3000`, que es un
contexto seguro (service worker e instalación disponibles). Control: CDP a través de
`adb forward tcp:9333 localabstract:chrome_devtools_remote` (`chromium.connectOverCDP`) más
toques, teclado, rotación, modo avión y cierres de proceso con `adb`. Los datos de mercado son
reales (Yahoo a través del backend): un escaneo de España devolvió 76 activos en ~9 s.

| Comprobación | Resultado en el emulador |
| --- | --- |
| Instalación | ✅ `beforeinstallprompt` se dispara; el botón de la app abre el diálogo nativo con el nombre del manifiesto Android. El icono «Scanner Touch» abre `WebappActivity` en standalone sobre `android.html`, controlado por el worker. Con `localhost` Chrome crea un acceso directo y no un WebAPK (el servidor de Google no puede descargar el manifiesto); el WebAPK queda pendiente de un despliegue HTTPS. |
| Teclado | ✅ Gboard real: el viewport pasa de 845 a 469 px (`interactive-widget=resizes-content`), el campo editado queda visible sobre el teclado y la navegación inferior se oculta. |
| Rotación y áreas seguras | ✅ Horizontal a 869×359 px sin desbordamiento; la navegación inferior deja de ser fija y el contenido respeta la barra del sistema. |
| Texto ampliado | ✅ tras corrección. Chrome 149 **ignoraba** el tamaño de texto del sistema (130 % sin efecto). Con `<meta name="text-scale" content="scale">` la raíz sigue al sistema: 21 px al 130 % y 32 px al 200 %, sin desbordamiento en seis pantallas. Verificado tras aplicar la actualización desde la app. |
| Nombres accesibles | ✅ El árbol de accesibilidad de Chrome en el dispositivo da nombre a todos los campos (13 en Alertas, 7 en Carteras, 2 en Resultados). Las casillas miden 24×24 px, el mínimo de WCAG 2.2. No se ha probado el habla de TalkBack. |
| Segundo plano y cierre por el sistema | ✅ Tras `am kill` en segundo plano y reapertura desde el icono se restauran ruta y borradores, y no se ejecuta ningún escaneo, simulación ni petición de precios. Ver la limitación de `localStorage` más abajo. |
| Modo avión y reconexión | ✅ Arranque en frío sin red ni servidor: página controlada por el worker, 76 resultados guardados, análisis desactivado, ajustes de alertas guardados localmente. Al reconectar se oculta el aviso y se conserva el campo editado; la instancia no hizo ninguna petición a `/api` ni a `/universes`. |
| Actualización instalada | ✅ Con una nueva versión del worker aparece «Actualizar aplicación conservando los borradores»; al pulsarla se recarga en `#/alerts` con los borradores y se eliminan las cachés anteriores. |

### Limitación encontrada: escritura diferida de `localStorage`

Chrome guarda `localStorage` en disco con retraso. Una edición hecha **0,5 s** antes de que el
proceso muriera (`am force-stop`) se perdió; con **3 s** se conservó. El riesgo afecta solo a la
última edición de borradores, ruta y scroll antes de un cierre inmediato. No depende del
empaquetado: una TWA usa el mismo Chrome. Si se considera necesario, la mitigación es guardar
también los borradores en IndexedDB, cuyas transacciones completadas sobreviven al cierre del
proceso.

### Otras observaciones

- Con el acceso directo instalado, Chrome sigue ofreciendo instalar desde la pestaña, porque
  no es un WebAPK. La sección «Instalación y uso sin conexión» se muestra también en standalone.
- Si la pestaña y la app instalada están abiertas a la vez, comparten borradores en
  `localStorage`; en las pruebas no se produjo sobrescritura entre instancias.

## Decisión de Fase D: PWA

La pregunta de Fase D era si la PWA basta en Android o si hace falta un proyecto Android Studio.
La evidencia anterior cubre los flujos de C2–C4 (instalación, arranque standalone, uso sin
conexión, teclado, rotación, texto ampliado, ciclo de vida y actualización) sin capacidades
nativas. Ningún flujo actual necesita APIs que la web no ofrezca: no hay notificaciones push,
sincronización en segundo plano ni integración con el sistema; guardar alertas no envía avisos.

Por eso **no se añade wrapper**. Un proyecto Capacitor/Android Studio duplicaría el shell, la
firma y el ciclo de publicación sin requisito que lo justifique.

Condiciones que reabrirían la decisión:

| Necesidad | Opción |
| --- | --- |
| Publicar en Google Play | Trusted Web Activity generada con Bubblewrap sobre la misma PWA. Requiere un dominio HTTPS propio que sirva `/.well-known/assetlinks.json` en la raíz (un proyecto de GitHub Pages con subruta no puede hacerlo sin dominio propio) y una clave de firma gestionada. |
| Capacidades nativas (avisos en segundo plano, widgets, integración del sistema) | Evaluar Capacitor solo para esa capacidad, manteniendo la lógica compartida. |
| Fallos de la PWA en dispositivos físicos | Corregirlos en la web primero; un wrapper solo si el fallo es propio del navegador y no tiene solución web. |

## Comprobaciones pendientes en dispositivo físico o despliegue HTTPS

El emulador no sustituye estos puntos. Registrar modelo, versión de Android, navegador, fecha
y resultado.

| Comprobación | Condición para cerrar |
| --- | --- |
| WebAPK en despliegue HTTPS | Instalar desde el despliegue real: aparece en el cajón de aplicaciones sin insignia de Chrome y abre `android.html` con el prefijo correcto. |
| TalkBack con voz | Recorrer Analizar → Resultados → Simulador, Carteras y Alertas; el orden y los anuncios son coherentes. |
| Cierre por falta de memoria | Con otras apps abiertas, Android cierra la PWA y al volver conserva ruta y borradores. |
| Otros navegadores/fabricantes | Al menos un navegador o capa de fabricante distinto (por ejemplo Samsung Internet). |

## Reproducir la validación en el emulador

```bash
npm run build
NODE_ENV=production PORT=3000 ALLOWED_ORIGINS=http://localhost:3000 \
  SESSION_SECRET=... JWT_SECRET=... node dist/server.js
emulator -avd <AVD con Google Play> -read-only -no-snapshot
adb reverse tcp:3000 tcp:3000
adb shell am start -a android.intent.action.VIEW \
  -d "http://localhost:3000/android.html#/scan" com.android.chrome
adb forward tcp:9333 localabstract:chrome_devtools_remote   # para Playwright connectOverCDP
```

El primer arranque de Chrome muestra pantallas de bienvenida que hay que cerrar a mano.
`adb shell settings put system font_scale 2.0`, `adb emu rotate`,
`adb shell cmd connectivity airplane-mode enable` y `adb shell am kill com.android.chrome`
(con la app en segundo plano) reproducen el resto de comprobaciones.
