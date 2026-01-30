require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { config } = require('./config');
const { apiKeyAuth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');
const { rekognitionRouter } = require('./routes/rekognition');

function makeCorsOptions() {
  // En desarrollo, permitir cualquier origen para evitar problemas con
  // Flutter Web (puerto aleatorio en localhost) y herramientas locales.
  if (config.nodeEnv !== 'production') {
    return { origin: true };
  }

  if (config.corsOrigins === '*') {
    return { origin: true };
  }

  const allowed = new Set(config.corsOrigins);
  return {
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header)
      if (!origin) return callback(null, true);
      if (allowed.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  };
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    })
  );

  app.use(cors(makeCorsOptions()));

  // JSON payloads (base64 use-case)
  app.use(express.json({ limit: '7mb' }));
  app.use(express.urlencoded({ extended: true, limit: '7mb' }));

  // Auth (optional)
  app.use(apiKeyAuth(config.apiKey));

  app.get('/health', (req, res) => {
    return res.json({
      ok: true,
      service: 'constructora-app-backend',
      env: config.nodeEnv,
    });
  });

  app.use('/rekognition', rekognitionRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
