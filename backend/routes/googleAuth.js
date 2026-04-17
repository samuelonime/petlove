const express  = require('express');
const router   = express.Router();
const passport = require('../config/passport');
const jwt      = require('jsonwebtoken');

// Step 1 — redirect user to Google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Step 2 — Google redirects back here
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  (req, res) => {
    const user = req.user;

    // Issue a JWT just like the normal login flow
    const token = jwt.sign(
      { id: user.id, email: user.email, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token + user info as query params
    // The frontend will pick these up and store them
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

module.exports = router;

