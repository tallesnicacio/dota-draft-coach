import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import heroesRouter from './routes/heroes.js';
import gsiRouter from './routes/gsi.js';
import { logger } from './utils/logger.js';

// Carregar variáveis de ambiente
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Structured logging with Pino
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health', // Don't log health checks
    },
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      patch: process.env.PATCH_PADRAO,
      mmr: process.env.MMR_PADRAO,
      cacheEnabled: true,
    },
  });
});

// Routes
app.use('/api/heroes', heroesRouter);
app.use('/api', gsiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ err, path: req.path, method: req.method }, 'Erro no servidor');
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      patch: process.env.PATCH_PADRAO || '7.39e',
      mmr: process.env.MMR_PADRAO || '3000',
      cacheTTL: `${process.env.CACHE_TTL || '21600'}s`,
      gsiEnabled: true,
    },
    '🚀 Dota 2 Coach Backend rodando'
  );
});

export default app;
