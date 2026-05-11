import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentRouter from './routes/documentRoutes.js';
import AuthRouter from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
// Sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, removes X-Powered-By
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],   // allow inline styles
      imgSrc:      ["'self'", "data:", "https:"],
      connectSrc:  ["'self'", "https://*.supabase.co"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"],  // blocks clickjacking (like X-Frame-Options DENY)
    },
  },
  hsts: {
    maxAge: 31536000,          // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard:       { action: 'deny' },
  noSniff:          true,      // X-Content-Type-Options: nosniff
  xssFilter:        true,      // Legacy X-XSS-Protection header
  referrerPolicy:   { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy:    true,      // removes X-Powered-By: Express
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Auth routes: max 20 requests per 15 min per IP (blocks brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

// General API: max 200 requests per 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

// ─── Block Common Scanner / Attack Paths ─────────────────────────────────────
// Bots scan every site for these paths regardless of your tech stack.
// Returning 404 immediately stops them from wasting server resources.
const BLOCKED_PATHS = [
  '/wp-admin', '/wp-login.php', '/wp-content', '/wordpress',
  '/phpmyadmin', '/pma', '/myadmin',
  '/cpanel', '/whm', '/plesk',
  '/admin', '/administrator',
  '/env', '/.env', '/.git',
  '/config', '/setup.php', '/install.php',
  '/xmlrpc.php', '/shell.php', '/eval.php',
];
app.use((req, res, next) => {
  const lowerPath = req.path.toLowerCase();
  const isBlocked = BLOCKED_PATHS.some(p => lowerPath.startsWith(p));
  if (isBlocked) {
    console.warn(`[BLOCKED] Scan attempt: ${req.method} ${req.path} from ${req.ip}`);
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
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

// ─── Static Files ─────────────────────────────────────────────────────────────
// Ensure generated directory exists
const generatedDir = path.join(__dirname, 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
  console.log('📁 Created generated directory');
}
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, AuthRouter);   // stricter limit on auth
app.use('/api', generalLimiter, DocumentRouter);

// Health check (no rate limit — used by keep-alive cronjob)
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔒 Security headers: Helmet enabled`);
  console.log(`🛡️  Rate limiting: Auth=20/15min, API=200/15min`);
});
