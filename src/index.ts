import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

/* ---------- CORE MIDDLEWARE ---------- */
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

/* ---------- HEALTH (AZURE) ---------- */
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

/* ---------- AUTH (RESTORED) ---------- */
app.get('/api/auth/status', (_req, res) => {
  res.status(200).json({
    authenticated: false,
    message: 'Auth route alive',
  });
});

/* ---------- ROOT (PREVENT CANNOT GET /) ---------- */
app.get('/', (_req, res) => {
  res.status(200).send('Staff Server Online');
});

/* ---------- HARD FAIL PROTECTION ---------- */
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

/* ---------- START ---------- */
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
