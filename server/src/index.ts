import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// 🔴 DB INIT — MUST EXIST
import './db/init';

// 🔴 ROUTES — MUST EXIST
import authRoutes from './routes/auth';
import internalRoutes from './routes/internal';
import publicRoutes from './routes/public';

const app = express();

/* =========================
   🔴 CORS — DO NOT MOVE 🔴
   MUST BE IMMEDIATELY AFTER
   const app = express()
   ========================= */

const rawOrigins = process.env.CORS_ORIGINS || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // curl / health checks
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* =========================
   MIDDLEWARE
   ========================= */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

/* =========================
   ROUTES
   ========================= */

app.use('/api/auth', authRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/public', publicRoutes);

/* =========================
   ROOT + FALLBACK
   ========================= */

app.get('/api', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* =========================
   START SERVER
   ========================= */

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`Staff Server running on port ${PORT}`);
});
