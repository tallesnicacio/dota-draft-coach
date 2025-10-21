import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';
import { createServer } from 'http';
import gsiRouter from './routes/gsi.js';
import staticDataRouter from './routes/staticData.js';
import { logger } from './utils/logger.js';
import { LiveWebSocketServer } from './websocket/server.js';
import { StaticDataService } from './services/StaticDataService.js';

// Carregar variáveis de ambiente
dotenv.config({ path: '../.env' });

// Initialize Static Data Service
const staticData = StaticDataService.getInstance(process.env.PATCH_PADRAO || '7.39e');

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

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
// Static data routes (heroes, items from local files)
app.use('/api', staticDataRouter);

// Live Mode routes (feature flag)
const LIVE_MODE_ENABLED = process.env.LIVE_MODE_ENABLED !== 'false'; // Enabled by default
if (LIVE_MODE_ENABLED) {
  app.use('/api', gsiRouter);
  logger.info({ enabled: true }, 'Live Mode is ENABLED');
} else {
  logger.warn({ enabled: false }, 'Live Mode is DISABLED');
}

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

// Initialize WebSocket server (lazily, only when needed)
let _wsServer: LiveWebSocketServer | null = null;

export function getWsServer(): LiveWebSocketServer {
  if (!_wsServer) {
    _wsServer = new LiveWebSocketServer(httpServer);
  }
  return _wsServer;
}

// Export wsServer getter for backward compatibility
export const wsServer = {
  get instance() {
    return getWsServer();
  },
  broadcastSnapshot: (snapshot: any) => getWsServer().broadcastSnapshot(snapshot),
  broadcastRecommendations: (matchId: string, recommendations: any) =>
    getWsServer().broadcastRecommendations(matchId, recommendations),
  getStats: () => getWsServer().getStats(),
  shutdown: () => _wsServer?.shutdown(),
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Async initialization function
  (async () => {
    try {
      // Load static data first
      logger.info('🔄 Loading static data...');
      await staticData.load();
      logger.info('✅ Static data loaded successfully');

      // Initialize WebSocket server (only if Live Mode is enabled)
      if (LIVE_MODE_ENABLED) {
        getWsServer();
      }

      // Start HTTP server (with WebSocket attached)
      // Listen on 0.0.0.0 to accept both IPv4 and IPv6 connections
      httpServer.listen(PORT, '0.0.0.0', () => {
        logger.info(
          {
            port: PORT,
            host: '0.0.0.0 (IPv4)',
            wsPath: '/ws',
            patch: process.env.PATCH_PADRAO || '7.39e',
            mmr: process.env.MMR_PADRAO || '3000',
            cacheTTL: `${process.env.CACHE_TTL || '21600'}s`,
            gsiEnabled: true,
            wsEnabled: true,
          },
          '🚀 Dota 2 Coach Backend rodando'
        );
      });

      // Handle server errors (e.g., port already in use)
      httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(
            {
              port: PORT,
              error: error.message,
            },
            `❌ Porta ${PORT} já está em uso!`
          );
          console.error(`\n${'='.repeat(60)}`);
          console.error(`❌ ERRO: Porta ${PORT} já está em uso!`);
          console.error(`${'='.repeat(60)}`);
          console.error(`\nPara resolver:`);
          console.error(`1. Verifique processos usando a porta:`);
          console.error(`   lsof -ti:${PORT}`);
          console.error(`\n2. Mate o processo:`);
          console.error(`   kill $(lsof -ti:${PORT})`);
          console.error(`\n3. Ou use o script de diagnóstico:`);
          console.error(`   ./scripts/check-ports.sh`);
          console.error(`${'='.repeat(60)}\n`);
          process.exit(1);
        } else {
          logger.error({ error: error.message }, 'Erro ao iniciar servidor');
          process.exit(1);
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        wsServer.shutdown();
        httpServer.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });
    } catch (error) {
      logger.error({ error }, 'Failed to initialize server');
      process.exit(1);
    }
  })();
}

export default app;
