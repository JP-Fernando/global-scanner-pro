import { describe, it, expect } from 'vitest';
import { createSimulationRouter } from '../../simulation/simulation-router.js';

function buildYahooPayload(symbol, closes) {
  return {
    chart: {
      result: [{
        meta: { symbol, currency: 'USD' },
        indicators: { quote: [{ close: closes }] }
      }]
    }
  };
}

function createRouter() {
  const closesA = Array.from({ length: 90 }, (_, i) => 100 + (i * 1.5));
  const closesB = Array.from({ length: 90 }, (_, i) => 120 + (i * 1.1));

  const fetchMock = async (url) => {
    const input = String(url);
    if (input.includes('AAPL')) {
      return { ok: true, json: async () => buildYahooPayload('AAPL', closesA) };
    }
    if (input.includes('MSFT')) {
      return { ok: true, json: async () => buildYahooPayload('MSFT', closesB) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  return createSimulationRouter({ fetchImpl: fetchMock });
}

async function callRouter(router, { body, authorization }) {
  return new Promise((resolve, reject) => {
    const headers = {};

    const req = {
      method: 'POST',
      url: '/simulate',
      body,
      headers: {
        'content-type': 'application/json',
        ...(authorization ? { authorization } : {})
      },
      get(name) {
        return this.headers[String(name).toLowerCase()];
      }
    };

    const res = {
      statusCode: 200,
      setHeader(name, value) {
        headers[String(name).toLowerCase()] = value;
      },
      getHeader(name) {
        return headers[String(name).toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload, headers });
        return this;
      }
    };

    router.handle(req, res, (err) => {
      if (err) reject(err);
    });
  });
}

describe('POST /api/v1/simulate', () => {
  it('returns 200 on happy path with per-ticker investments', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: {
        tickers: ['AAPL', 'MSFT'],
        tickerInvestments: { AAPL: 300, MSFT: 200 },
        horizonMonths: 60
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.monthlyProjection.length).toBe(60);
    expect(response.body.totalInvested).toBe(30000);
    expect(response.body.totalMonthlyInvestment).toBe(500);
  });

  it('returns 400 if tickers is empty', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: { tickers: [], tickerInvestments: {}, horizonMonths: 60 }
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 if tickers has 5 elements', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: {
        tickers: ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'META'],
        tickerInvestments: { AAPL: 100, MSFT: 100, GOOG: 100, AMZN: 100, META: 100 },
        horizonMonths: 60
      }
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 for negative tickerInvestment amount', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: { tickers: ['AAPL'], tickerInvestments: { AAPL: -100 }, horizonMonths: 60 }
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 when total monthly investment is zero', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: { tickers: ['AAPL'], tickerInvestments: { AAPL: 0 }, horizonMonths: 60 }
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid horizonMonths', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: { tickers: ['AAPL'], tickerInvestments: { AAPL: 500 }, horizonMonths: 0 }
    });

    expect(response.status).toBe(400);
  });

  it('supports custom horizons', async () => {
    const router = createRouter();
    const response18 = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: { tickers: ['AAPL'], tickerInvestments: { AAPL: 500 }, horizonMonths: 18 }
    });
    const response24 = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: { tickers: ['AAPL'], tickerInvestments: { AAPL: 500 }, horizonMonths: 24 }
    });

    expect(response18.status).toBe(200);
    expect(response24.status).toBe(200);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      body: { tickers: ['AAPL'], tickerInvestments: { AAPL: 500 }, horizonMonths: 60 }
    });

    expect(response.status).toBe(401);
  });

  it('returns expected.finalValue > totalInvested for positive trend', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: { tickers: ['AAPL'], tickerInvestments: { AAPL: 500 }, horizonMonths: 60 }
    });

    expect(response.status).toBe(200);
    expect(response.body.scenarios.expected.finalValue).toBeGreaterThan(response.body.totalInvested);
  });

  it('returns X-Cache: HIT on second identical request', async () => {
    const router = createRouter();
    const requestBody = {
      tickers: ['AAPL', 'MSFT'],
      tickerInvestments: { AAPL: 300, MSFT: 200 },
      horizonMonths: 60
    };

    const first = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: requestBody
    });

    const second = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: requestBody
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.headers['x-cache']).toBe('HIT');
  });

  it('accepts zero amount for one ticker when another has positive amount', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: {
        tickers: ['AAPL', 'MSFT'],
        tickerInvestments: { AAPL: 500, MSFT: 0 },
        horizonMonths: 24
      }
    });

    expect(response.status).toBe(200);
    expect(response.body.totalMonthlyInvestment).toBe(500);
    const msftItem = response.body.perTicker.find(p => p.ticker === 'MSFT');
    expect(msftItem.monthlyAmount).toBe(0);
  });

  it('response includes per-ticker scenarios', async () => {
    const router = createRouter();
    const response = await callRouter(router, {
      authorization: 'Bearer test-token',
      body: {
        tickers: ['AAPL'],
        tickerInvestments: { AAPL: 300 },
        horizonMonths: 12
      }
    });

    expect(response.status).toBe(200);
    const item = response.body.perTicker[0];
    expect(item.scenarios).toBeDefined();
    expect(item.scenarios.expected).toBeDefined();
    expect(item.scenarios.optimistic).toBeDefined();
    expect(item.scenarios.pessimistic).toBeDefined();
  });
});
