import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Configurar MIME types para ES6 modules
app.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

// Servir archivos estáticos
app.use(express.static('.'));

// API proxy para Yahoo Finance
app.get('/api/yahoo', async (req, res) => {
  const { symbol, from, to } = req.query;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${from}&period2=${to}&interval=1d`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Yahoo Finance error for ${symbol}: ${response.status}`);
      return res.status(response.status).json({
        error: `Error fetching ${symbol}`,
        status: response.status
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Endpoint para ejecutar tests
app.get('/api/run-tests', async (req, res) => {
  try {
    const { runAllTests } = await import('./tests.js');
    const results = runAllTests();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.0.1'
  });
});

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   🎯 GLOBAL QUANT SCANNER PRO                             ║');
  console.log('║   Version 2.0 - Professional Edition                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('  ✅ Scanner iniciado correctamente\n');
  console.log('  📊 Interfaz principal:');
  console.log(`     → http://localhost:${PORT}/index_pro.html\n`);
  console.log('  🧪 Ejecutar tests:');
  console.log(`     → http://localhost:${PORT}/api/run-tests\n`);
  console.log('  💡 Tip: Ctrl+Click en las URLs para abrirlas\n');
});

export default app;
