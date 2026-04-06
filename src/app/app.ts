import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { rateLimiter } from '../middleware/rateLimit';
import { errorHandler } from '../middleware/error';
import { authRoutes } from '../routes/auth.routes';
import { userRoutes } from '../routes/user.routes';

const app = express();

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true
}));

app.use(express.json());
app.use(morgan('combined'));
app.use(rateLimiter);

// HEALTH CHECK (REQUIRED)
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ERROR HANDLER LAST
app.use(errorHandler);

export default app;
