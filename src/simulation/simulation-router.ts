import express from 'express';
import { validate } from '../middleware/validation.js';
import { simulationRequestSchema } from '../security/validation-schemas.js';
import { simulateInvestment, SimulationInputError } from './simulation-service.js';

interface RouterOptions {
  fetchImpl?: any;
}

export function createSimulationRouter(options: RouterOptions = {}): express.Router {
  const router = express.Router();

  // Keep the simulator publicly callable so the deployed web/PWA frontend can
  // use it without a login flow. Future account-aware simulator features should
  // layer on top of this route or introduce a protected variant.
  router.post('/simulate', validate(simulationRequestSchema, 'body'), async (req, res) => {
    try {
      const body = req.body as {
        tickers: string[];
        tickerInvestments: Record<string, number>;
        horizonMonths: number;
      };

      const result = await simulateInvestment(body, { fetchImpl: options.fetchImpl });

      if (result.meta.cacheHits > 0 && result.meta.cacheMisses === 0) {
        res.setHeader('X-Cache', 'HIT');
      } else {
        res.setHeader('X-Cache', 'MISS');
      }

      res.status(200).json(result.data);
    } catch (error) {
      if (error instanceof SimulationInputError) {
        res.status(error.statusCode).json({
          error: error.message,
          statusCode: error.statusCode,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const err = error as { statusCode?: number; message?: string };
      const statusCode = Number(err?.statusCode) || 500;
      res.status(statusCode).json({
        error: err?.message || 'Simulation failed',
        statusCode,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}

const simulationRouter = createSimulationRouter();

export { simulationRouter };
