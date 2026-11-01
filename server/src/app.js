import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import formRoutes from './routes/formRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Reverse proxy configuration: trust 1 hop on Render / production
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Log only request outcome and duration; never log request bodies, query values, or IPs.
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.info(`[HTTP] ${req.method} status=${res.statusCode} duration_ms=${durationMs.toFixed(1)}`);
  });
  next();
});

// Security HTTP headers
app.use(helmet());

// CORS configuration - allow designated frontend origin
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [clientOrigin]
  : [clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server) or matched origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Body parser with size limits
app.use(express.json({ limit: '50kb' }));

// Health check endpoint for testing server readiness
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount application routes
app.use('/api', formRoutes);

// Catch-all 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found.'
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
