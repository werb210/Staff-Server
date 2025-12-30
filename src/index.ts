import express from 'express';

const app = express();
const PORT = process.env.PORT || 8080;

// fast, guaranteed root + health
app.get('/', (_req, res) => res.status(200).send('OK'));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// ---- API ROUTER (THIS IS THE FIX) ----
const api = express.Router();

api.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// placeholder mounts so CI does not explode
api.use('/auth', (_req, res) => res.status(501).json({ error: 'auth not wired yet' }));
api.use('/users', (_req, res) => res.status(501).json({ error: 'users not wired yet' }));
api.use('/system', (_req, res) => res.status(501).json({ error: 'system not wired yet' }));

app.use('/api', api);
// -------------------------------------

app.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});
