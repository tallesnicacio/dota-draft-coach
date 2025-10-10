import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import heroesRouter from './routes/heroes.js';

// Carregar variáveis de ambiente
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Dota 2 Coach Backend rodando na porta ${PORT}`);
  console.log(`📊 Patch padrão: ${process.env.PATCH_PADRAO || '7.39e'}`);
  console.log(`🎮 MMR padrão: ${process.env.MMR_PADRAO || '3000'}`);
  console.log(`💾 Cache TTL: ${process.env.CACHE_TTL || '21600'}s (${(parseInt(process.env.CACHE_TTL || '21600') / 3600).toFixed(1)}h)`);
});

export default app;
