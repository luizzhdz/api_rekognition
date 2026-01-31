const REQUIRED = [];

function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value;
}

function getEnvInt(name, fallback) {
  const raw = getEnv(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCorsOrigins() {
  const raw = getEnv('CORS_ORIGINS', '*');
  if (raw === '*') return '*';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  port: getEnvInt('PORT', 3000),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  corsOrigins: getCorsOrigins(),
  apiKey: getEnv('API_KEY', ''),

  awsRegion: getEnv('AWS_REGION', 'us-east-1'),
  collectionId: getEnv('REKOGNITION_COLLECTION_ID', 'constructora-faces'),

  // Limits
  maxImageBytes: 5 * 1024 * 1024, // 5MB
};

for (const name of REQUIRED) {
  if (!getEnv(name)) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

module.exports = { config };
