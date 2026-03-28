import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config.js';
import { securityMiddleware } from './middleware/security.js';
import logger from './services/logger.js';
import healthRouter from './routes/health.js';
import weatherRouter from './routes/weather.js';
import analyzeRouter from './routes/analyze.js';
import historyRouter from './routes/history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ── Request ID Middleware ────────────────────────────────
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  next();
});

// ── Security ────────────────────────────────────────────
app.use(securityMiddleware);

// ── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Static Frontend ─────────────────────────────────────
app.use(express.static(join(__dirname, '..', 'client'), {
  maxAge: config.nodeEnv === 'production' ? '1d' : 0,
  etag: true,
}));

// ── API Routes ──────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/history', historyRouter);

// ── Error Handler ───────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', {
    error: err.message,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
  }, req.id);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum is 5.' });
  }

  // Custom AppError instances
  if (err.statusCode && err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    details: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// ── Start Server ────────────────────────────────────────
if (config.nodeEnv !== 'test') {
app.listen(config.port, () => {
  logger.info('Eco-Pulse server started', {
    port: config.port,
    mode: config.nodeEnv,
    gcpProject: config.gcpProjectId || 'not configured',
    gcsBucket: config.gcsBucket || 'not configured',
    weather: config.weatherApiKey ? 'configured' : 'demo mode',
  });

  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║           🌿  E C O - P U L S E  🌿             ║
  ║     Hyper-Local Climate Resilience Engine      ║
  ╠═══════════════════════════════════════════════╣
  ║  Server:    http://localhost:${config.port}             ║
  ║  Mode:      ${config.nodeEnv.padEnd(32)} ║
  ║  GCP:       ${(config.gcpProjectId || 'not configured').padEnd(32)} ║
  ║  Storage:   ${(config.gcsBucket || 'local only').padEnd(32)} ║
  ║  Weather:   ${(config.weatherApiKey ? 'API ✅' : 'Demo mode ⚠️').padEnd(32)} ║
  ╠═══════════════════════════════════════════════╣
  ║  Google Cloud Services:                        ║
  ║    • Gemini 2.5 Flash (Multimodal + FC)       ║
  ║    • Cloud Run (Deployment)                    ║
  ║    • Cloud Text-to-Speech (Voice Alerts)       ║
  ║    • Cloud Speech-to-Text (Voice Input)        ║
  ║    • Cloud Storage (Images + Audio)            ║
  ║    • Cloud Firestore (History)                 ║
  ║    • Cloud Logging (Structured Logs)           ║
  ╚═══════════════════════════════════════════════╝
  `);
});
}

export default app;
