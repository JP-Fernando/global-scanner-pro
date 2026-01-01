# 💼 Construcción de Cartera y Análisis de Riesgo

Una vez ejecutado el análisis de mercado y filtrados los activos según la estrategia seleccionada,
el sistema permite **construir carteras profesionales** de forma automática,
aplicando principios de diversificación, control de riesgo y gobernanza.

## 📊 Métodos de Asignación de Capital

El sistema ofrece **5 métodos profesionales** para distribuir el capital entre los activos seleccionados:

### 1️⃣ Equal Weight (Peso Igual)
- Cada activo recibe el mismo porcentaje de capital.
- **Ejemplo**: 5 activos → 20% cada uno.
- ✔ Fácil de entender  
- ✔ Alta diversificación  
- ❌ No distingue calidad entre activos  
- **Ideal para**: Principiantes.

### 2️⃣ Score-Weighted (Ponderado por Score)
- Los activos con mayor Quant Score reciben más capital.
- Se basa en la “calidad cuantitativa” detectada por el sistema.
- ✔ Premia mejores métricas técnicas  
- ❌ Puede concentrar más riesgo  
- **Ideal para**: Confiar en las señales del scanner.

### 3️⃣ Equal Risk Contribution (ERC)
- Cada activo contribuye **la misma cantidad de riesgo**, no de capital.
- Activos más volátiles reciben menos peso.
- ✔ Balancea el riesgo total  
- ✔ Reduce impacto de activos muy volátiles  
- **Ideal para**: Control de riesgo estructural.

### 4️⃣ Volatility Targeting
- Ajusta los pesos para que la cartera tenga una volatilidad objetivo (ej. 15% anual).
- Si el mercado es más volátil → reduce exposición.
- ✔ Muy usado en gestión profesional  
- ✔ Se adapta al entorno de mercado  
- **Ideal para**: Control dinámico del riesgo.

### 5️⃣ Hybrid (ERC + Score) ⭐ Recomendado
- Combina:
  - 50% diversificación por riesgo (ERC)
  - 50% calidad de señales (Score)
- ✔ Equilibrio óptimo entre rendimiento y control de riesgo  
- **Ideal para**: Uso general.

## 📊 Dashboard Avanzado de Riesgo

El **Dashboard Avanzado de Riesgo** traduce métricas cuantitativas complejas en una
visualización clara y comprensible, incluso para inversores sin formación técnica.

### 📉 Value at Risk (VaR)

El **VaR al 95%** responde a la pregunta:

> *¿Cuál es la pérdida máxima esperada en un día “normal” en el 95% de los casos?*

Ejemplo:
- VaR = −€2,500  
➡ En 95 de cada 100 días, la pérdida no debería superar esa cantidad.

El dashboard muestra:
- **VaR diversificado** (cartera real)
- **VaR no diversificado** (suma de riesgos individuales)
- **Beneficio de diversificación** (% de riesgo reducido)

### ⚠️ Activo Más Arriesgado

Identifica el activo que más contribuye al riesgo total de la cartera, considerando:
- Volatilidad
- Peso en cartera

Esto ayuda a responder:
> *¿Qué activo debería vigilar o reducir primero si quiero bajar el riesgo?*

### 🔥 Matriz de Correlaciones

Muestra cómo se mueven los activos entre sí:

- **Correlación alta (>0.7)**: se mueven juntos → menos diversificación
- **Correlación baja o negativa**: mejor diversificación

El dashboard incluye:
- Heatmap visual
- Correlación media
- Correlación máxima
- **Score de diversificación (0–100)**  
  (más alto = mejor diversificación)

### 🌪️ Stress Testing (Escenarios de Crisis)

Simula cómo se comportaría tu cartera en situaciones extremas:

| Escenario | Qué representa |
|---------|----------------|
| −5% | Corrección menor |
| −10% | Corrección fuerte |
| −20% | Crash tipo COVID |
| −40% | Crisis sistémica (2008) |

Para cada escenario se muestra:
- Pérdida estimada (€)
- % de la cartera
- Capital restante

Esto ayuda a responder:
> *¿Podría soportar emocional y financieramente una crisis así?*

### ⚠️ Análisis de Riesgo Degradado (Transparencia Total)

Si algunos activos no tienen suficiente histórico:

- Se **excluyen automáticamente** del análisis de riesgo
- El dashboard muestra una advertencia clara
- Se indica **qué activos fueron excluidos**

> El sistema prioriza **no engañar al usuario** frente a mostrar métricas incompletas.
