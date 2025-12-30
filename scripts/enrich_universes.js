import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
// Configuración de rutas para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UNIVERSES_DIR = path.join(__dirname, '../universes/');

// Mapa de sufijos coincidente con tu index.html
const MARKET_SUFFIX_MAP = {
    'bme_universe.json': '.MC',
    'euronext_universe.json': '.PA',
    'frankfurt_universe.json': '.DE',
    'lse_universe.json': '.L',
    'milan_universe.json': '.MI',
    'us_universe.json': '',
    'brazil_universe.json': '.SA',
    'mexico_universe.json': '.MX',
    'toronto_universe.json': '.TO',
    'tokyo_universe.json': '.T',
    'china_hongkong.json': '.HK',
    'china_shanghai.json': '.SS',
    'china_shenzhen.json': '.SZ',
    'korea_universe.json': '.KS'
};

async function safeQuoteSummary(symbol, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await yahooFinance.quoteSummary(symbol, {
        modules: ['assetProfile']
      });
    } catch (e) {
      // Si es 429 y quedan reintentos, espera exponencial
      if (e.message.includes('429') && attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 10000; // 10s, 20s, 40s
        console.log(`\n⏳ Rate limit. Reintentando en ${waitTime/1000}s...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      // Otros errores o último reintento
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
async function enrichAll() {
    try {
        const files = fs.readdirSync(UNIVERSES_DIR).filter(f => f.endsWith('.json'));
        console.log(`\n🚀 Iniciando enriquecimiento en entorno ESM (Node ${process.version})\n`);

        for (const file of files) {
            const filePath = path.join(UNIVERSES_DIR, file);
            const suffix = MARKET_SUFFIX_MAP[file] ?? "";
            const rawData = fs.readFileSync(filePath, 'utf-8');
            let symbols = JSON.parse(rawData);
            let updatedCount = 0;

            console.log(`📂 Procesando: ${file} (Sufijo: "${suffix}")`);

            // **PROCESAR EN LOTES DE 10 CON PAUSAS**
            const BATCH_SIZE = 10;
            const BATCH_DELAY = 30000; // 30 segundos entre lotes

            for (let i = 0; i < symbols.length; i++) {
                const stock = symbols[i];

                if (stock.sector && stock.sector !== "Unknown") continue;

                try {
                    const fullSymbol = stock.ticker.includes('.')
                        ? stock.ticker
                        : `${stock.ticker}${suffix}`;

                    const result = await safeQuoteSummary(fullSymbol);
                    const profile = result?.assetProfile;

                    stock.sector = profile?.sector || "Unknown";
                    stock.industry = profile?.industry || "Unknown";
                    updatedCount++;

                    process.stdout.write(`  [${i+1}/${symbols.length}] ${fullSymbol} ✅          \r`);

                    // Delay aleatorio entre peticiones
                    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));

                    // **PAUSA LARGA CADA 10 PETICIONES**
                    if ((i + 1) % BATCH_SIZE === 0) {
                        console.log(`\n⏸️  Pausa de ${BATCH_DELAY/1000}s tras ${BATCH_SIZE} peticiones...`);
                        await new Promise(r => setTimeout(r, BATCH_DELAY));
                    }

                } catch (e) {
                    console.log(`\n  ❌ Error en ${stock.ticker}: ${e.message}`);

                    // **SI ES 429, PAUSA EXTRA LARGA**
                    if (e.message.includes('429')) {
                        console.log('⚠️  Rate limit alcanzado. Pausa de 60s...');
                        await new Promise(r => setTimeout(r, 60000));
                    }
                }
            }

            // Guardar después de cada archivo
            fs.writeFileSync(filePath, JSON.stringify(symbols, null, 2));
            console.log(`\n✨ Mercado finalizado. ${updatedCount} activos actualizados.\n`);
        }

        console.log("🏁 PROCESO GLOBAL COMPLETADO.");
    } catch (err) {
        console.error("🚨 Error crítico:", err.message);
    }
}
enrichAll();
