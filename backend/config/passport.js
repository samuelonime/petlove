const passport = require('passport');
const User = require('../models/User');

// ✅ Only load Google strategy if credentials exist
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:5000/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'), null);

          let user = await User.findByEmail(email);

          if (!user) {
            const userId = await User.createFromGoogle({
              name: profile.displayName || email.split('@')[0],
              email,
              google_id: profile.id,
              avatar: profile.photos?.[0]?.value || null,
              user_type: 'buyer',
            });
            user = await User.findById(userId);
          } else if (!user.google_id) {
            await User.linkGoogle(user.id, profile.id);
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('⚠️ Google OAuth not configured. Skipping...');
}

// Session (safe)
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
