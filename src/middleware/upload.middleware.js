const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");
const config = require("../config/env");

let storage;

const isCloudinaryConfigured =
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret &&
  !config.cloudinary.cloudName.includes("mock_") &&
  config.cloudinary.cloudName.length > 0;

if (isCloudinaryConfigured) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });

  // FIX #10: Consolidate Cloudinary upload paths - use consistent folder mapping
  const UPLOAD_FOLDERS = {
    "/avatar": "users/avatars",
    "/logo": "centers/logos",
    "/inspection": "inspections",
    "/pickup-photos": "orders/pickup",
    "/delivery-photos": "orders/delivery",
    "/drop-center": "orders/drop",
    "/pickup-center": "orders/pickup-return",
    default: "orders/device",
  };

  const getFolderFromPath = (url) => {
    for (const [key, folder] of Object.entries(UPLOAD_FOLDERS)) {
      if (key !== "default" && url.includes(key)) return folder;
    }
    return UPLOAD_FOLDERS.default;
  };

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // FIX #10: Consolidate path logic with consistent mapping
      const folder = getFolderFromPath(req.originalUrl);

      return {
        folder: folder,
        format: "webp",
        public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
        transformation: [{ width: 1200, crop: "limit", quality: 80 }],
      };
    },
  });
  console.log("Upload storage configured: Cloudinary with consolidated paths");
} else {
  // Local fallback storage
  const uploadDir = path.join(__dirname, "../../uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${Date.now()}${ext}`);
    },
  });
  console.log("Upload storage configured: Local disk fallback");
}

// File filter (accept images only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max size
  },
});

module.exports = upload;
