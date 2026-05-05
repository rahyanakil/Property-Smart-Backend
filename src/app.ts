import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler, notFound } from './middlewares/error.middleware';

// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import propertyRoutes from './modules/property/property.routes';
import bookingRoutes from './modules/booking/booking.routes';
import paymentRoutes from './modules/payment/payment.routes';
import reviewRoutes from './modules/review/review.routes';

const app = express();

// CORS
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing (webhook route uses raw body — handled in payment routes)
app.use((req, res, next) => {
  if (req.path === '/api/v1/payments/webhook') return next();
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Root + health check
app.get('/', (_req, res) => res.json({ status: 'ok', message: 'PropertySmart API', version: '1.0.0', endpoints: '/api/v1' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/properties`, propertyRoutes);
app.use(`${API}/properties/:propertyId/reviews`, reviewRoutes);
app.use(`${API}/bookings`, bookingRoutes);
app.use(`${API}/payments`, paymentRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
