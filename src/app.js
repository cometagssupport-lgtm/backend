import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/userRoutes.js';

const app = express();

app.use(helmet());

// CORS + Middlewares (same as before)
const raw = process.env.FRONTEND_URL || '';
const whitelist = raw.split(',').map(s => s.trim()).filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  whitelist.push('http://localhost:4200');
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (whitelist.length === 0 || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

import { payloadEncryptionMiddleware } from './middleware/payloadEncryption.js';

app.use(cors(corsOptions));
app.use(express.json());
app.use(payloadEncryptionMiddleware);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', userRoutes);

export default app;
