# ⚖️ Reglas y Gobernanza de Inversión

El sistema incluye un módulo de **gobernanza y cumplimiento** que garantiza que las carteras construidas cumplan con buenas prácticas de inversión profesional.

## Reglas de Inversión

El sistema aplica automáticamente las siguientes reglas para proteger tu capital:

**Límites de Concentración**
- **Máximo por activo**: 15% del capital total
- **Máximo por sector**: 30% del capital total (si se implementa análisis sectorial)
- **Máximo por país**: 40% del capital total
- **Concentración Top 3**: Los 3 activos más grandes no pueden sumar más del 40%

**Control de Liquidez**
- **Volumen diario mínimo**: 50,000 unidades negociadas
- Excluye automáticamente activos con liquidez insuficiente

**Control de Riesgo**
- **Correlación máxima entre pares**: No permite dos activos con correlación > 0.85
- **Volatilidad máxima de cartera**: 25% anual
- **Drawdown máximo estimado**: 35%
- **Exclusión de activos de alto riesgo**: Elimina automáticamente activos con volatilidad > 50%

**Rebalanceo**
- **Umbral de rebalanceo**: Si un activo se desvía más del 5% de su peso objetivo, se recomienda rebalancear.

## Perfiles de Riesgo

El sistema define 3 perfiles de riesgo que ajustan las reglas según tu tolerancia:

**🛡️ Conservador**
- Peso máximo por activo: 10%
- Volatilidad máxima: 15%
- Drawdown máximo: 20%
- Score mínimo requerido: 70
- **Ideal para**: Inversores cerca de jubilación, baja tolerancia al riesgo

**⚖️ Moderado**
- Peso máximo por activo: 15%
- Volatilidad máxima: 20%
- Drawdown máximo: 30%
- Score mínimo requerido: 60
- **Ideal para**: Horizonte medio (5-10 años)

**🚀 Agresivo**
- Peso máximo por activo: 20%
- Volatilidad máxima: 30%
- Drawdown máximo: 45%
- Score mínimo requerido: 50
- **Ideal para**: Inversores jóvenes con horizonte largo (10+ años)

## Validación y Correcciones Automáticas

Cuando construyes una cartera, el sistema:
1. **Valida el cumplimiento** de todas las reglas aplicables
2. **Genera alertas** si hay violaciones o advertencias
3. **Aplica correcciones automáticas** (si se habilita):
   - Reduce pesos que exceden el máximo
   - Elimina activos por debajo del mínimo (2%)
   - Re-normaliza los pesos para sumar 100%

## Documentación de Estrategias

Cada estrategia incluye documentación detallada con:
- **Objetivo**: Qué busca lograr la estrategia
- **Horizonte temporal**: Período recomendado de inversión
- **Rendimiento esperado**: Rango de retornos anuales
- **Volatilidad esperada**: Rango de volatilidad
- **Max Drawdown**: Pérdida máxima esperada
- **Perfil de inversor**: Para quién es adecuada
- **Condiciones ideales**: Cuándo funciona mejor
- **Riesgos identificados**: Qué puede salir mal
