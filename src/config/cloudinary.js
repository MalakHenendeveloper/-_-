const cloudinary = require("cloudinary").v2;
const config = require("./env");

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Upload image to Cloudinary with transformations
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<Object>} Cloudinary upload response
 */
const uploadImage = async (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        format: "webp",
        quality: 80,
        transformation: [{ width: 1200, crop: "limit" }],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );

    stream.end(fileBuffer);
  });
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Cloudinary delete response
 */
const deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
};
