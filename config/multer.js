const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

/**
 * Optimized Cloudinary storage configuration
 * - Reduced image dimensions for faster uploads
 * - Auto format conversion for optimal compression
 * - Progressive loading for better perceived performance
 * - Async thumbnail generation
 */
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine if file is an image or document
    const isImage = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif'].includes(file.mimetype);
    const isDocument = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype);

    const baseParams = {
      folder: 'nursify_uploads',
      allowed_formats: ['jpg', 'png', 'jpeg', 'heic', 'heif', 'pdf', 'doc', 'docx'],
      resource_type: 'auto',
    };

    if (isImage) {
      return {
        ...baseParams,
        transformation: [
          { width: 800, height: 800, crop: 'limit' },  // Reduced from 1000px
          { quality: 'auto:low' },                      // Aggressive compression
          { fetch_format: 'auto' },                     // Auto convert to webp/avif
          { flags: 'progressive' },                     // Progressive loading
        ],
        eager: [
          { width: 200, height: 200, crop: 'thumb', gravity: 'face' }  // Generate thumbnail
        ],
        eager_async: true,  // Don't wait for thumbnail generation
      };
    }

    // For documents, no transformation needed
    return baseParams;
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Reduced to 5MB for faster uploads
  },
  fileFilter: (req, file, cb) => {
    // Validate file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: jpg, png, jpeg, heic, heif, pdf, doc, docx`), false);
    }
  }
});

module.exports = upload;
