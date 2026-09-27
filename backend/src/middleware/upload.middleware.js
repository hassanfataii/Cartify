import multer from "multer";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const storage = multer.memoryStorage();

function imageFileFilter(
  request,
  file,
  callback,
) {
  if (!allowedMimeTypes.has(file.mimetype)) {
    const error = new Error(
      "Only JPEG, PNG and WebP images are allowed",
    );

    error.status = 400;
    callback(error);
    return;
  }

  callback(null, true);
}

export const uploadProductImages = multer({
  storage,
  fileFilter: imageFileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8,
  },
}).array("images", 8);