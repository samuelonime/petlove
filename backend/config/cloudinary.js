const dotenv = require('dotenv');
dotenv.config();

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

// If any credential is missing or left as placeholder, export a stub that fails with a clear message.
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET ||
    CLOUDINARY_CLOUD_NAME.includes('your_') || CLOUDINARY_API_KEY.includes('your_') || CLOUDINARY_API_SECRET.includes('your_')) {
  const msg = `Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your backend .env (currently: CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}, CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}).`;
  console.error('[CONFIG] ' + msg);

  // Export a stub with same shape so callers can call uploader.upload but get a clear error.
  module.exports = {
    uploader: {
      upload: async () => {
        const err = new Error(msg);
        err.code = 'CLOUDINARY_NOT_CONFIGURED';
        throw err;
      }
    }
  };
} else {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
  module.exports = cloudinary;
}