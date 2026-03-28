import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config.js';
import { securityMiddleware } from './middleware/security.js';
import healthRouter from './routes/health.js';
import weatherRouter from './routes/weather.js';
import analyzeRouter from './routes/analyze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

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

// ── Error Handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum is 5.' });
  }

  res.status(500).json({
    error: 'Internal server error',
    details: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// ── Start Server ────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         🌿  E C O - P U L S E  🌿         ║
  ║   Hyper-Local Climate Resilience Engine   ║
  ╠══════════════════════════════════════════╣
  ║  Server:  http://localhost:${config.port}          ║
  ║  Mode:    ${config.nodeEnv.padEnd(28)}  ║
  ║  Weather: ${config.weatherApiKey ? 'Configured ✅'.padEnd(28) : 'Not configured ⚠️'.padEnd(28)}  ║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
