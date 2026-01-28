const fileUpload = require('express-fileupload');

// Middleware for handling file uploads
const upload = (options = {}) => {
  return fileUpload({
    createParentPath: true,       // automatically create folders if not exist
    limits: { fileSize: options.maxSize || 5 * 1024 * 1024 }, // default 5MB
    abortOnLimit: true,           // reject if file is too big
    safeFileNames: true,          // sanitize filenames
    preserveExtension: true,      // keep original extension
    ...options,
  });
};

module.exports = upload;
