import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './src/server/config/env.ts';
import type { AuthRequest } from './src/server/middleware/auth.ts';
import { errorHandler } from './src/server/middleware/errorHandler.ts';
import apiRouter from './src/server/routes/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  const allowedOrigins = new Set<string>([
    env.appUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin) || origin.endsWith('.run.app')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as AuthRequest).rawBody = buf;
      },
    })
  );

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nexora' });
  });

  // REST API routes
  app.use('/api', apiRouter);

  // Centralized error handler
  app.use(errorHandler);

  if (env.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(env.port, '0.0.0.0', () => {
    console.log(`NEXORA server running on http://0.0.0.0:${env.port}`);
  });
}

startServer();
