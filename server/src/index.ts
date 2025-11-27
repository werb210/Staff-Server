import dotenv from 'dotenv';

dotenv.config();

import express = require('express');
import path = require('path');
import cookieParser = require('cookie-parser');
import cors = require('cors');
import rateLimit = require('express-rate-limit');

import { Router } from 'express';
import authRouter = require('./routes/auth');
import userRouter = require('./routes/users');
import smsRouter = require('./routes/sms');
import documentsRouter = require('./routes/documents');
const internalRouter: Router = require('./routes/_int');
import { env } from './utils/env';
import { createLogger } from './utils/logger';

const app = express();
const logger = createLogger('server');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const limiter = rateLimit.default({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use('/_int', internalRouter);
app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/sms', smsRouter);
app.use('/documents', documentsRouter);
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.message);
  const statusCode = err.status || 500;
  res.status(statusCode).json({ error: err.message || 'Internal server error' });
});

const PORT = env.PORT;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});
