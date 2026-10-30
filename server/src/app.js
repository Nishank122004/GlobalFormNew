import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import formRoutes from './routes/formRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration - only allow requests from the designated frontend origin
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: clientOrigin,
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
