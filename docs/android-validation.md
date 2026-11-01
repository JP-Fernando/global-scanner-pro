# Validación Android — C4

Estado (2026-11-01): implementación web y pruebas automatizadas disponibles; **validación física
pendiente**. `adb devices -l` no mostró dispositivos conectados durante esta entrega.
No se ha generado un APK ni se ha tomado la decisión de empaquetado de Fase D.

## Evidencia automatizada

- Chromium a 360/390/430 px: Analizar, Resultados, Detalle, Simulador, construcción y revisión
  de carteras, detalle de posición y alertas. Auditorías axe WCAG 2 A/AA y 2.1 AA sin desactivar
  reglas, navegación con teclado, enlace para saltar al contenido, foco y ausencia de desbordamiento.
- Contracción simulada del viewport visual: se ocultan los controles inferiores mientras está
  activo el teclado; se conserva el campo editado. Esta emulación no reproduce un teclado físico.
- Recarga y reapertura: ruta explícita con prioridad sobre la última visitada, borradores,
  desplegables, contexto de foco y scroll; revisión local sin cálculos ni peticiones implícitas.
- Operaciones interrumpidas: aviso al reabrir, conservación de la revisión anterior y reintento
  explícito. Perder la conexión durante un escaneo impide reemplazar la revisión completa anterior.
- IndexedDB bloqueado por otra pestaña: el arranque termina y presenta un error recuperable;
  los borradores siguen editables. Las conexiones se cierran ante cambios de versión.
- Instalación: manifiesto Android independiente, identificador estable y consumo único del
  evento de instalación. Las pruebas de `beforeinstallprompt` usan eventos simulados, sin
  confirmar la interfaz de instalación del sistema operativo.
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

Validación automatizada de C4: **1375 tests unitarios/integración en 81 archivos**;
cobertura global **94.89 / 82.55 / 95.99 / 96.26%** y frontend compartido
**95.27 / 90.66 / 92.50 / 96.52%** (sentencias / ramas / funciones / líneas; medida antes de las
dos correcciones de la auditoría, que añaden 2 tests).
**111 E2E Chromium en 16 specs** (87 escritorio + 24 Android), incluidos 9 escenarios C4,
pasan. TypeScript y ESLint de los archivos modificados pasan sin errores.

## Comprobación física pendiente

Usar un despliegue HTTPS con el frontend y la API configurados para el mismo entorno. Abrir
la vista táctil mediante su enlace o `android.html`, conservando el prefijo del despliegue.
Registrar modelo, versión de Android, navegador/versión, fecha y resultado de cada punto.

| Comprobación | Resultado actual | Condición para cerrar |
| --- | --- | --- |
| Instalar desde Android | Pendiente | La entrada instalada abre Android; la instalación de escritorio conserva su identidad y entrada. |
| Teclado y áreas seguras | Pendiente | Editar importes, nombre y correo sin campos tapados; rotar el dispositivo y probar recortes/barras del sistema. |
| Texto ampliado y TalkBack | Pendiente | Contenido legible con texto ampliado; controles anunciados, foco y retorno coherentes en todos los flujos. |
| Segundo plano y cierre por el sistema | Pendiente | Reabrir conserva borradores y la revisión guardada; una operación no terminada no se reinicia automáticamente. |
| Modo avión y reconexión | Pendiente | Revisar carteras/simulación, guardar ajustes locales, recuperar conexión y ejecutar únicamente acciones explícitas. |
| Actualización instalada | Pendiente | Aparece la opción de actualizar, se activa al pulsarla y se conservan la ruta y los borradores. |

Conectar un dispositivo autorizado y comprobarlo con `adb devices -l` permite continuar la
validación; no se ha interactuado con ningún teléfono durante esta entrega.

## Salida hacia Fase D

La implementación C4 web puede revisarse con la evidencia automatizada. La validación física
anterior sigue siendo necesaria para dar por cerrado Android y decidir si la PWA cubre el uso
real o si hay necesidades concretas que justifiquen un wrapper nativo. Las auditorías automáticas
no equivalen a una certificación WCAG completa ni a validar la instalación del sistema operativo.
