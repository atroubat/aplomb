import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import staticPlugin from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { getDb } from './db/migrate';
import { personsRoutes } from './routes/persons';
import { accountsRoutes } from './routes/accounts';
import { incomesRoutes } from './routes/incomes';
import { fixedChargesRoutes } from './routes/fixed-charges';
import { personalChargesRoutes } from './routes/personal-charges';
import { savingsRoutes } from './routes/savings';
import { dashboardRoutes } from './routes/dashboard';
import { adviceRoutes } from './routes/advice';
import { dataRoutes } from './routes/data';
import { seedDemoDataIfEmpty } from './db/demo-seed';

const app = Fastify({ logger: true });

async function start() {
  const db = getDb();
  const demoDbPath = process.env.DEMO_DATABASE_PATH || path.join(path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'budget.db')), 'demo.db');
  const demoDb = getDb(demoDbPath);
  seedDemoDataIfEmpty(demoDb);

  // CORS: restrict to known origins in production, open in dev
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : true; // allow all in dev

  await app.register(cors, { origin: allowedOrigins });

  // Serve static files in production
  const publicPath = path.join(__dirname, '..', 'public');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(publicPath)) {
    await app.register(staticPlugin, {
      root: publicPath,
      prefix: '/',
    });
    app.setNotFoundHandler((req, reply) => {
      if (!req.url.startsWith('/api')) {
        reply.sendFile('index.html');
      } else {
        reply.code(404).send({ error: 'Not found' });
      }
    });
  }

  // Register routes
  await personsRoutes(app, db);
  await accountsRoutes(app, db);
  await incomesRoutes(app, db);
  await fixedChargesRoutes(app, db);
  await personalChargesRoutes(app, db);
  await savingsRoutes(app, db);
  await dashboardRoutes(app, db);
  await adviceRoutes(app, db);
  await dataRoutes(app, db);

  // Same application, fully isolated demo data under /demo/api.
  await app.register(async (demoApp) => {
    await personsRoutes(demoApp, demoDb);
    await accountsRoutes(demoApp, demoDb);
    await incomesRoutes(demoApp, demoDb);
    await fixedChargesRoutes(demoApp, demoDb);
    await personalChargesRoutes(demoApp, demoDb);
    await savingsRoutes(demoApp, demoDb);
    await dashboardRoutes(demoApp, demoDb);
    await adviceRoutes(demoApp, demoDb);
    await dataRoutes(demoApp, demoDb);
  }, { prefix: '/demo' });

  // Global error handler
  app.setErrorHandler((error: FastifyError, req, reply) => {
    app.log.error(error);
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.message });
    }
    reply.code(500).send({ error: error.message || 'Internal server error' });
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 BudgetFoyer running on http://localhost:${port}`);
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
