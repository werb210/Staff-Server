import express from 'express';
import internalRoutes from './routes/internal';

const app = express();

app.use(express.json());

app.use('/internal', internalRoutes);

export default app;
