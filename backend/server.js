import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentRouter from './routes/documentRoutes.js';
import AuthRouter from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure generated directory exists for storing documents
const generatedDir = path.join(__dirname, 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
  console.log('📁 Created generated directory');
}

// Middleware
// Middleware - Smart CORS that self-configures for new domains
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // 2. Automatically allow any .onrender.com subdomain
    if (origin.endsWith('.onrender.com')) return callback(null, true);

    // 3. Automatically allow your custom domain (Self-healing root fix)
    // This looks for 'soldocs' in your domain name
    if (origin.toLowerCase().includes('soldocs')) return callback(null, true);

    // 4. Fallback to environment variables
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn(`CORS blocked: ${origin}`);
    return callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from generated folder
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// Routes
app.use('/api', DocumentRouter);
app.use('/api/auth', AuthRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log(` POST /api/generate-document - Generate Word document from template`);
  console.log(` GET /health - Health check`);
});
