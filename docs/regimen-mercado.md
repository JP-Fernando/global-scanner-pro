# Régimen de Mercado

El sistema detecta automáticamente el **régimen de mercado actual** analizando:
- Tendencia del índice de referencia (vs EMA200)
- Volatilidad reciente vs histórica
- Momentum del mercado
- Amplitud de mercado (% de activos alcistas)

Esto permite **ajustar automáticamente** tu estrategia según las condiciones del mercado:
- Se **ajustan pesos** de factores
- Se **endurecen o relajan filtros** de riesgo
- Se **reordenan activos** para cartera

## Regímenes Detectados

**🟢 Risk-On (Mercado Alcista)**
- Mercado en tendencia alcista, baja volatilidad
- **Ajuste automático**: Aumenta peso de momentum, reduce restricciones por riesgo
- **Ideal para**: Estrategias agresivas, crecimiento

**🟡 Neutral (Mercado Lateral)**
- Sin tendencia clara, volatilidad normal
- **Ajuste automático**: Pesos equilibrados, estrategia estándar
- **Ideal para**: Estrategias balanceadas

**🔴 Risk-Off (Mercado Defensivo)**
- Mercado bajista o alta volatilidad
- **Ajuste automático**: Reduce momentum, aumenta restricciones por riesgo
- **Ideal para**: Protección de capital, activos defensivos
