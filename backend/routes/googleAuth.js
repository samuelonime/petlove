const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');

// Only wire up Google OAuth if credentials are configured.
// This prevents a crash when GOOGLE_CLIENT_ID is not set yet.
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (googleEnabled) {
  const passport = require('../config/passport');

  // Step 1 — redirect to Google
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  // Step 2 — Google redirects back here
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
    }),
    (req, res) => {
      const user  = req.user;
      const token = jwt.sign(
        { id: user.id, email: user.email, user_type: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const params = new URLSearchParams({
        token,
        id:        user.id,
        name:      user.name,
        email:     user.email,
        user_type: user.user_type,
      });

      res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?${params}`);
    }
  );
} else {
  // Google not configured — return a clear message instead of crashing
  router.get('/google', (req, res) => {
    res.status(503).json({ error: 'Google OAuth is not configured on this server.' });
  });

  router.get('/google/callback', (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_not_configured`);
  });
}

module.exports = router;
                         
