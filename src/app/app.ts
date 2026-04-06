import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { authRoutes } from '../routes/auth.routes';
import { rateLimiter } from '../middleware/rateLimit';
import { errorHandler } from '../middleware/error';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());

app.use(express.json());
app.use(rateLimiter);

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.use(errorHandler);

export default app;
