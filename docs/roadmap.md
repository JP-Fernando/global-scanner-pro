# 📅 Roadmap de Mejoras y Futuras Funcionalidades

**Fase 1 completada**:

[x] Motor de Scoring Multi-factor (Trend, Momentum, Risk, Liquidity).

[x] Detector de Régimen de Mercado (Risk-On / Risk-Off).

[x] Análisis Sectorial y Taxonomía GICS.

[x] Detección de Anomalías de Volumen (Z-Score).

[x] Gobernanza y reglas de concentración (Max 15% por activo).

## Fase 2: Simulación y Evaluación
4. **Backtesting de estrategias (Completado)** ✅
   - Evaluación histórica de estrategias existentes usando datos completos  
   - Comparación de métricas: rendimiento, volatilidad, drawdown  
   - Paneles de riesgo, trading, equity curve y análisis profundo de drawdowns  
   - Comparativa con benchmark (alpha/beta e information ratio)  
   - Costos de transacción y rotación de cartera incluidos en el análisis  
   - Exportación a CSV para reporting rápido  
   - Base para optimización futura y validación de métodos de asignación

5. **Simulación de capital inicial variable** *(opcional)*  
   - Permitir probar carteras con distintos montos antes de construir la real  
   - Ayuda a planificar la gestión de riesgo

## Fase 3: Visualización y Reporting
6. **Dashboard de portfolio tracking**  
   - Visualización en tiempo real de carteras construidas  
   - Métricas de riesgo, VaR, CVaR, correlaciones y stress tests  
   - Comparación con benchmark y seguimiento histórico  
   - Permite tomar decisiones informadas de rebalanceo

7. **Exportación a Excel/CSV**  
   - Reportes de resultados de escaneo y carteras  
   - Incluye métricas de riesgo, scores y asignación de capital  
   - Facilita auditoría, presentación a clientes y análisis externo

8. **Alertas por email/webhook**  
   - Notificación de señales fuertes, rebalanceos y eventos de mercado  
   - Automatización de seguimiento y gestión de cartera

9. **Análisis de Atribución**  
   - Explica por qué la cartera gana o pierde dinero  
   - Desglosa el impacto de selección de activos (Stock Picking) vs. asignación sectorial (Sector Allocation)  

## Fase 4: Optimización Avanzada
10. **Machine Learning para ponderación dinámica**  
    - Optimización de asignación de capital según patrones históricos  
    - Predicción de riesgo y ajuste automático de scores  
    - Mejora el rendimiento esperado ajustado a volatilidad real

11. **Test de estrés multi-factor**  
    - Escenarios sectoriales, geopolíticos o de divisa  
    - Evaluación del impacto de crisis combinadas sobre la cartera  

## Fase 5: Futuras Ideas Avanzadas
- **Documentación interactiva de estrategia**: Explicación visual de cada score y métrica al pulsar sobre un activo.  
- **Optimización de gobernanza dinámica**: Ajuste automático de límites según volatilidad y correlación del mercado.  
- **Integración de alertas con IA**: Detectar patrones de riesgo emergente y recomendar ajustes proactivos.  
