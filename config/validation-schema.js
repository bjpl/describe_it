// Environment configuration validation schema
const Joi = require('joi');

const baseSchema = {
  // Application Configuration
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().port().default(3000),
  HOSTNAME: Joi.string().default('localhost'),

  // API Configuration
  API_BASE_URL: Joi.string().uri().required(),
  API_TIMEOUT: Joi.number().min(1000).max(60000).default(30000),
  API_RETRY_ATTEMPTS: Joi.number().min(0).max(5).default(3),

  // Database Configuration
  NEXT_PUBLIC_SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: Joi.string().required(),
  DATABASE_CONNECTION_POOL_MIN: Joi.number().min(1).default(5),
  DATABASE_CONNECTION_POOL_MAX: Joi.number().min(5).default(20),

  // Redis Configuration
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_DB: Joi.number().min(0).max(15).default(0),

  // Cache Configuration
  CACHE_TTL_DEFAULT: Joi.number().min(0).default(300),
  CACHE_TTL_STATIC: Joi.number().min(0).default(3600),
  CACHE_TTL_API: Joi.number().min(0).default(60),
  CACHE_ENABLED: Joi.boolean().default(true),

  // Security Configuration
  OPENAI_API_KEY: Joi.string().pattern(/^sk-/).required(),
  CORS_ORIGIN: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string().uri())
  ).required(),
  
  // Performance Configuration
  MEMORY_LIMIT: Joi.string().pattern(/^\d+mb$/).default('512mb'),
  REQUEST_SIZE_LIMIT: Joi.string().pattern(/^\d+mb$/).default('10mb'),
  REQUEST_TIMEOUT: Joi.number().min(1000).default(30000),

  // Feature Flags
  FEATURE_ANALYTICS: Joi.boolean().default(true),
  FEATURE_METRICS: Joi.boolean().default(true),
  FEATURE_DEBUG_MODE: Joi.boolean().default(false),
  
  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: Joi.number().min(60000).default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().min(1).default(100),
};

const developmentSchema = Joi.object({
  ...baseSchema,
  NODE_ENV: Joi.string().valid('development').required(),
  LOG_LEVEL: Joi.string().valid('debug', 'info').default('debug'),
  LOG_FORMAT: Joi.string().valid('pretty').default('pretty'),
  FEATURE_DEBUG_MODE: Joi.boolean().default(true),
  SOURCE_MAPS: Joi.boolean().default(true),
});

const stagingSchema = Joi.object({
  ...baseSchema,
  NODE_ENV: Joi.string().valid('staging').required(),
  LOG_LEVEL: Joi.string().valid('info', 'debug').default('info'),
  FEATURE_DEBUG_MODE: Joi.boolean().default(true),
  SOURCE_MAPS: Joi.boolean().default(true),
});

const productionSchema = Joi.object({
  ...baseSchema,
  NODE_ENV: Joi.string().valid('production').required(),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info').default('info'),
  LOG_FORMAT: Joi.string().valid('json').default('json'),
  FEATURE_DEBUG_MODE: Joi.boolean().default(false),
  SOURCE_MAPS: Joi.boolean().default(false),
  TRUST_PROXY: Joi.boolean().default(true),
  SESSION_SECURE: Joi.boolean().default(true),
  COOKIE_SECURE: Joi.boolean().default(true),
});

function getValidationSchema(environment) {
  switch (environment) {
    case 'development':
      return developmentSchema;
    case 'staging':
      return stagingSchema;
    case 'production':
      return productionSchema;
    default:
      throw new Error(`Unknown environment: ${environment}`);
  }
}

function validateEnvironment(config) {
  const environment = config.NODE_ENV || 'development';
  const schema = getValidationSchema(environment);
  
  const { error, value } = schema.validate(config, {
    allowUnknown: true,
    stripUnknown: false,
    abortEarly: false,
  });

  if (error) {
    const details = error.details.map(detail => detail.message).join(', ');
    throw new Error(`Environment validation failed: ${details}`);
  }

  return value;
}

module.exports = {
  getValidationSchema,
  validateEnvironment,
  developmentSchema,
  stagingSchema,
  productionSchema,
};