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
    const { runAllTests } = await import('./src/tests/tests.js');
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
    version: '0.0.4'
  });
});

const BASE_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10;

const logServerStart = (port) => {
console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   🎯 GLOBAL QUANT SCANNER PRO                              ║');
  console.log('║   Professional Edition                                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('  ✅ Scanner iniciado correctamente\n');
  console.log('  📊 Interfaz principal:');
  console.log(`     → http://localhost:${port}/index.html\n`);
  console.log('  🧪 Ejecutar tests:');
  console.log(`     → http://localhost:${port}/api/run-tests\n`);
  console.log('  💡 Tip: Ctrl+Click en las URLs para abrirlas\n');
};

const startServer = (port, attempt = 0) => {
  const server = app.listen(port, () => logServerStart(port));

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS - 1) {
      const nextPort = port + 1;
      console.warn(
        `⚠️  Puerto ${port} en uso. Intentando iniciar en el puerto ${nextPort}...`
      );
      startServer(nextPort, attempt + 1);
      return;
    }

    console.error('❌ No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  });
};

startServer(BASE_PORT);

export default app;
