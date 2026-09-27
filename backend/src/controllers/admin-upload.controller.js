import { getCloudinary } from "../config/cloudinary.js";

function uploadImage(cloudinary, file) {
  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: "cartify/products",
          resource_type: "image",

          transformation: [
            {
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(result);
        },
      );

    uploadStream.end(file.buffer);
  });
}

async function removeUploadedImages(
  cloudinary,
  uploadedImages,
) {
  await Promise.allSettled(
    uploadedImages.map((image) =>
      cloudinary.uploader.destroy(
        image.public_id,
        {
          resource_type: "image",
        },
      ),
    ),
  );
}

export async function uploadAdminProductImages(
  request,
  response,
) {
  const files = Array.isArray(request.files)
    ? request.files
    : [];

  if (files.length === 0) {
    return response.status(400).json({
      error: "Select at least one image to upload",
      fields: {
        images: [
          "Select at least one JPEG, PNG or WebP image",
        ],
      },
    });
  }

  const cloudinary = getCloudinary();
  const uploadedImages = [];

  try {
    for (const file of files) {
      const uploadedImage = await uploadImage(
        cloudinary,
        file,
      );

      uploadedImages.push(uploadedImage);
    }

    return response.status(201).json({
      message:
        uploadedImages.length === 1
          ? "Image uploaded successfully"
          : `${uploadedImages.length} images uploaded successfully`,

      images: uploadedImages.map((image) => ({
        url: image.secure_url,
        publicId: image.public_id,
        width: image.width,
        height: image.height,
        format: image.format,
        bytes: image.bytes,
      })),
    });
  } catch (error) {
    if (uploadedImages.length > 0) {
      await removeUploadedImages(
        cloudinary,
        uploadedImages,
      );
    }

    console.error(
      "Cloudinary image upload failed:",
      error,
    );

    return response.status(500).json({
      error:
        "One or more images could not be uploaded",
    });
  }
}