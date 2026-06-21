const dotenv   = require('dotenv');
dotenv.config(); // ← MUST be first, before any other require

const express  = require('express');
const cors     = require('cors');
const supabase = require('./config/supabase');

const app = express();

// ─── Middleware ───────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://gharfix.netlify.app',
  'https://harmonious-meerkat-2f29f3.netlify.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
].filter(Boolean); // drops undefined if CLIENT_URL isn't set

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth.routes'));
app.use('/api/users',     require('./routes/user.routes'));
app.use('/api/providers', require('./routes/provider.routes'));
app.use('/api/bookings',  require('./routes/booking.routes'));
app.use('/api/reviews',   require('./routes/review.routes'));
app.use('/api/services',  require('./routes/service.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// ─── Health check ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '✅ GharFix API is running (Supabase)', version: '2.0.0' });
});

// ─── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ─── Server Start (verify Supabase connection) ────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;

    console.log('✅ Supabase connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    process.exit(1);
  }
}

startServer();