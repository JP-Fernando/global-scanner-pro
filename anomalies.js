/**
 * Utilidades matemáticas internas para evitar dependencias externas
 */
const math = {
  mean: (arr) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length,
  std: (arr, avg) => {
    if (arr.length < 2) return 0;
    const variance = arr.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / arr.length;
    return Math.sqrt(variance);
  }
};

export function detectAnomalies(asset, sectorStats, params = { thresholdZ: 3.0, sectorRatio: 5.0 }) {
  const anomalies = [];
  const warnings = [];

  // Validación de datos históricos
  if (!asset.history || asset.history.length < 5) return { hasAnomalies: false };

  const volumes = asset.history.map(h => h.volume);
  const closes = asset.history.map(h => h.close);

  const avgVol = math.mean(volumes);
  const stdVol = math.std(volumes, avgVol);

  // 1. Cálculo de Z-Score con protección contra división por cero
  // Si stdVol es 0, el volumen ha sido constante; cualquier volumen actual > avgVol es una anomalía infinita
  let volumeZScore = 0;
  if (stdVol > 0) {
    volumeZScore = (asset.volume - avgVol) / stdVol;
  } else if (asset.volume > avgVol) {
    volumeZScore = 10; // Valor arbitrario alto si rompe la constancia
  }

  // 2. Ratio Relativo al Sector
  const sectorAvgVol = sectorStats[asset.sectorId]?.avgVolume || avgVol;
  const sectorRelVolume = sectorAvgVol > 0 ? asset.volume / sectorAvgVol : 1;

  // 3. Retorno 1d
  const lastClose = closes[closes.length - 1];
  if (closes.length < 3) {
    return {
      hasAnomalies: false,
      anomalies: [],
      warnings: [],
      metrics: {}
    };
  }
  const prevClose = closes[closes.length - 2];
  const priceReturn1d = (lastClose - prevClose) / prevClose;

  // --- LÓGICA DE DETECCIÓN ---

  // PUMP: Volumen inusual + subida vertical + superior al sector
  if (volumeZScore > params.thresholdZ && priceReturn1d > 0.10) {
    if (sectorRelVolume > params.sectorRatio) {
      anomalies.push("CRITICAL_PUMP_RISK");
    } else {
      warnings.push("HIGH_VOLUME_SPIKE");
    }
  }

  // DUMP: Caída tras volumen inusual
  if (volumeZScore > 2.0 && priceReturn1d < -0.07) {
    warnings.push("POTENTIAL_DUMP_OR_PANIC");
  }

  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    warnings,
    metrics: {
      volumeZScore: parseFloat(volumeZScore.toFixed(2)),
      sectorRelVolume: parseFloat(sectorRelVolume.toFixed(2)),
      priceReturn1d: parseFloat((priceReturn1d * 100).toFixed(2)) + "%"
    }
  };
}
