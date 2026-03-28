import 'dotenv/config';

const required = (name) => {
  const val = process.env[name];
  if (!val) {
    console.error(`❌ Missing required environment variable: ${name}`);
    console.error(`   Copy .env.example to .env and fill in the values.`);
    process.exit(1);
  }
  return val;
};

const config = {
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: required('GEMINI_API_KEY'),
  weatherApiKey: process.env.OPENWEATHERMAP_API_KEY || '',

  // Google Cloud Platform
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcsBucket: process.env.GCS_BUCKET || '',

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
  },
};

export default config;
