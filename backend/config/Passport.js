const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const db = require('./database');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL ||
                    'http://localhost:5000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), null);

        // Check if user already exists
        let user = await User.findByEmail(email);

        if (!user) {
          // Create new user from Google profile — no password needed
          const userId = await User.createFromGoogle({
            name:          profile.displayName || email.split('@')[0],
            email,
            google_id:     profile.id,
            avatar:        profile.photos?.[0]?.value || null,
            user_type:     'buyer',
          });
          user = await User.findById(userId);
        } else if (!user.google_id) {
          // Existing email user — link their Google account
          await User.linkGoogle(user.id, profile.id);
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Minimal session serialization (only used during the OAuth redirect flow)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;

