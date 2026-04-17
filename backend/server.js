const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const dotenv       = require('dotenv');
const fileUpload   = require('express-fileupload');
const session      = require('express-session');
const passport     = require('./config/passport');

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://petlove-liart.vercel.app',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ useTempFiles: true, tempFileDir: '/tmp/' }));

// Session — needed only for the brief OAuth redirect handshake
app.use(session({
  secret:            process.env.SESSION_SECRET || process.env.JWT_SECRET || 'pethub_session_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 } // 5-min session
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ──────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const productRoutes    = require('./routes/products');
const orderRoutes      = require('./routes/orders');
const paymentRoutes    = require('./routes/payments');
const adminRoutes      = require('./routes/admin');
const reviewRoutes     = require('./routes/reviews');

app.use('/api/auth',   authRoutes);
app.use('/auth',       googleAuthRoutes);   // /auth/google  and  /auth/google/callback
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/reviews',  reviewRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🐾 PetHub backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
