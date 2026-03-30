import express from 'express';

console.log('BOOT: START');

const app = express();

app.get('/health', (_req, res) => {
  res.send('OK');
});

const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
  console.log('BOOT: LISTENING ON', port);
});
