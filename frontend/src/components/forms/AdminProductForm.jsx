import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createAdminProduct,
  updateAdminProduct,
  uploadAdminImages,
} from "../../api/admin";
import { useToast } from "../../context/ToastContext";
import { getProductContent } from "../../utils/productContent";


const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function createInitialValues(
  product,
  categories = [],
) {
  const content = getProductContent(product);
  const availableCategories = Array.isArray(categories)
    ? categories
    : [];

  return {
    title: product?.title ?? "",
    description: content.paragraphs.join("\n"),
    features: content.features.map((feature) => feature),
    specifications: content.specifications.map(({ label, value }) => ({
      label,
      value,
    })),

    categoryId:
      product?.category?.id ??
      product?.category?._id ??
      product?.categoryId ??
      availableCategories[0]?.id ??
      availableCategories[0]?._id ??
      "",

    images: Array.isArray(product?.images)
      ? [...product.images]
      : [],

    price:
      product?.priceInPence !== undefined
        ? (product.priceInPence / 100).toFixed(2)
        : "",

    stock:
      product?.stock !== undefined
        ? String(product.stock)
        : "0",

    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
  };
}

export default function AdminProductForm({
  product,
  categories,
  onSaved,
  onCancel,
}) {
  const toast = useToast();

  const availableCategories = Array.isArray(categories)
    ? categories
    : [];

  const [values, setValues] = useState(() =>
    createInitialValues(product, categories),
  );

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const editing = Boolean(product);

  const selectedImagePreviews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    [selectedFiles],
  );

  useEffect(() => {
    return () => {
      selectedImagePreviews.forEach(({ previewUrl }) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, [selectedImagePreviews]);

  useEffect(() => {
    setValues(
      createInitialValues(product, categories),
    );

    setSelectedFiles([]);
    setFieldErrors({});
    setGeneralError("");
  }, [product, categories]);

  function updateField(event) {
    const { name, value, type, checked } =
      event.target;

    setValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  }

  function updateFeature(index, value) {
    setValues((current) => ({
      ...current,
      features: current.features.map((feature, position) =>
        position === index ? value : feature,
      ),
    }));
    setFieldErrors((current) => ({ ...current, features: undefined }));
  }

  function updateSpecification(index, field, value) {
    setValues((current) => ({
      ...current,
      specifications: current.specifications.map((specification, position) =>
        position === index
          ? { ...specification, [field]: value }
          : specification,
      ),
    }));
    setFieldErrors((current) => ({ ...current, specifications: undefined }));
  }

  function handleImageSelection(event) {
    const incomingFiles = Array.from(
      event.target.files ?? [],
    );

    event.target.value = "";

    if (incomingFiles.length === 0) {
      return;
    }

    const invalidType = incomingFiles.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type),
    );

    if (invalidType) {
      const message =
        "Images must be JPEG, PNG or WebP files.";

      setFieldErrors((current) => ({
        ...current,
        images: [message],
      }));

      toast.error(message);
      return;
    }

    const oversizedFile = incomingFiles.find(
      (file) => file.size > MAX_FILE_SIZE,
    );

    if (oversizedFile) {
      const message =
        `${oversizedFile.name} is larger than 5 MB.`;

      setFieldErrors((current) => ({
        ...current,
        images: [message],
      }));

      toast.error(message);
      return;
    }

    const currentImageCount =
      values.images.length + selectedFiles.length;

    if (
      currentImageCount + incomingFiles.length >
      MAX_IMAGES
    ) {
      const remainingSlots =
        MAX_IMAGES - currentImageCount;

      const message =
        remainingSlots > 0
          ? `You can only select ${remainingSlots} more ${
              remainingSlots === 1 ? "image" : "images"
            }.`
          : `A product can have no more than ${MAX_IMAGES} images.`;

      setFieldErrors((current) => ({
        ...current,
        images: [message],
      }));

      toast.error(message);
      return;
    }

    setSelectedFiles((current) => [
      ...current,
      ...incomingFiles,
    ]);

    setFieldErrors((current) => ({
      ...current,
      images: undefined,
    }));
  }

  function removeExistingImage(imageIndex) {
    setValues((current) => ({
      ...current,
      images: current.images.filter(
        (_, index) => index !== imageIndex,
      ),
    }));

    setFieldErrors((current) => ({
      ...current,
      images: undefined,
    }));
  }

  function removeSelectedImage(imageIndex) {
    setSelectedFiles((current) =>
      current.filter(
        (_, index) => index !== imageIndex,
      ),
    );

    setFieldErrors((current) => ({
      ...current,
      images: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setFieldErrors({});
    setGeneralError("");

    const price = Number(values.price);
    const stock = Number(values.stock);

    if (!Number.isFinite(price) || price <= 0) {
      setFieldErrors({
        priceInPence: [
          "Enter a valid price greater than zero",
        ],
      });

      setSubmitting(false);
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setFieldErrors({
        stock: [
          "Stock must be a whole number of zero or more",
        ],
      });

      setSubmitting(false);
      return;
    }

    if (!values.categoryId) {
      setFieldErrors({
        categoryId: ["Select a product category"],
      });

      setSubmitting(false);
      return;
    }

    if (
      values.images.length === 0 &&
      selectedFiles.length === 0
    ) {
      setFieldErrors({
        images: ["Select at least one product image"],
      });

      setSubmitting(false);
      return;
    }

    const specifications = values.specifications
      .map(({ label, value }) => ({
        label: label.trim(),
        value: value.trim(),
      }))
      .filter(({ label, value }) => label || value);

    if (specifications.some(({ label, value }) => !label || !value)) {
      setFieldErrors({
        specifications: ["Each specification needs a name and a value"],
      });
      setSubmitting(false);
      return;
    }

    try {
      let uploadedImageUrls = [];

      if (selectedFiles.length > 0) {
        const uploadData =
          await uploadAdminImages(selectedFiles);

        uploadedImageUrls = (
          uploadData.images ?? []
        )
          .map((image) => image.url)
          .filter(Boolean);

        if (
          uploadedImageUrls.length !==
          selectedFiles.length
        ) {
          throw new Error(
            "One or more images could not be uploaded",
          );
        }
      }

      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        features: values.features.map((feature) => feature.trim()).filter(Boolean),
        specifications,
        categoryId: values.categoryId,

        images: [
          ...values.images,
          ...uploadedImageUrls,
        ],

        priceInPence: Math.round(price * 100),
        stock,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
      };

      const productId = product?.id ?? product?._id;

      const data = editing
        ? await updateAdminProduct(
            productId,
            payload,
          )
        : await createAdminProduct(payload);

      toast.success(
        data.message ||
          (editing
            ? "Product updated successfully"
            : "Product created successfully"),
      );

      setSelectedFiles([]);
      await onSaved();
    } catch (error) {
      setFieldErrors(error.fields || {});

      const message =
        error.message || "Unable to save product";

      setGeneralError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const totalImageCount =
    values.images.length + selectedFiles.length;

  return (
    <form
      className="admin-product-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="admin-form-heading">
        <div>
          <h2>
            {editing
              ? `Edit ${product.title}`
              : "Add new product"}
          </h2>

          <p>
            Prices are entered in pounds and stored
            securely as integer pence.
          </p>
        </div>

        <button
          className="admin-close-button"
          type="button"
          onClick={onCancel}
          disabled={submitting}
          aria-label="Close product form"
        >
          ×
        </button>
      </div>

      <div className="admin-form-grid">
        <label className="admin-field--wide">
          <span>Product title</span>

          <input
            name="title"
            type="text"
            value={values.title}
            onChange={updateField}
            required
          />

          {fieldErrors.title?.[0] && (
            <small className="field-error">
              {fieldErrors.title[0]}
            </small>
          )}
        </label>

        <label>
          <span>Category</span>

          <select
            name="categoryId"
            value={values.categoryId}
            onChange={updateField}
            required
          >
            <option value="">
              Select a category
            </option>

            {availableCategories.map((category) => {
              const categoryId =
                category.id ?? category._id;

              return (
                <option
                  key={categoryId}
                  value={categoryId}
                >
                  {category.name}
                </option>
              );
            })}
          </select>

          {fieldErrors.categoryId?.[0] && (
            <small className="field-error">
              {fieldErrors.categoryId[0]}
            </small>
          )}
        </label>

        <label>
          <span>Price (£)</span>

          <input
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            value={values.price}
            onChange={updateField}
            required
          />

          {fieldErrors.priceInPence?.[0] && (
            <small className="field-error">
              {fieldErrors.priceInPence[0]}
            </small>
          )}
        </label>

        <label>
          <span>Stock</span>

          <input
            name="stock"
            type="number"
            min="0"
            step="1"
            value={values.stock}
            onChange={updateField}
            required
          />

          {fieldErrors.stock?.[0] && (
            <small className="field-error">
              {fieldErrors.stock[0]}
            </small>
          )}
        </label>

        <label className="admin-field--wide">
          <span>Description</span>

          <textarea
            name="description"
            rows="5"
            value={values.description}
            onChange={updateField}
            required
          />

          {fieldErrors.description?.[0] && (
            <small className="field-error">
              {fieldErrors.description[0]}
            </small>
          )}
        </label>

        <section className="admin-field--wide admin-content-group" aria-label="Key features">
          <div className="admin-content-group__heading">
            <div>
              <h3>Key features</h3>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setValues((current) => ({
                ...current,
                features: [...current.features, ""],
              }))}
              disabled={submitting || values.features.length >= 12}
            >
              Add feature
            </button>
          </div>

          {values.features.map((feature, index) => (
            <div className="admin-content-row" key={index}>
              <label>
                <span>Feature {index + 1}</span>
                <input
                  type="text"
                  value={feature}
                  maxLength={200}
                  onChange={(event) => updateFeature(index, event.target.value)}
                />
              </label>
              <button
                className="admin-content-remove"
                type="button"
                onClick={() => setValues((current) => ({
                  ...current,
                  features: current.features.filter((_, position) => position !== index),
                }))}
                disabled={submitting}
                aria-label={`Remove feature ${index + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          {fieldErrors.features?.[0] && (
            <small className="field-error">{fieldErrors.features[0]}</small>
          )}
        </section>

        <section className="admin-field--wide admin-content-group" aria-label="Specifications">
          <div className="admin-content-group__heading">
            <div>
              <h3>Specifications</h3>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setValues((current) => ({
                ...current,
                specifications: [
                  ...current.specifications,
                  { label: "", value: "" },
                ],
              }))}
              disabled={submitting || values.specifications.length >= 20}
            >
              Add specification
            </button>
          </div>

          {values.specifications.map((specification, index) => (
            <div className="admin-content-row admin-content-row--spec" key={index}>
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={specification.label}
                  maxLength={60}
                  onChange={(event) => updateSpecification(index, "label", event.target.value)}
                />
              </label>
              <label>
                <span>Value</span>
                <input
                  type="text"
                  value={specification.value}
                  maxLength={300}
                  onChange={(event) => updateSpecification(index, "value", event.target.value)}
                />
              </label>
              <button
                className="admin-content-remove"
                type="button"
                onClick={() => setValues((current) => ({
                  ...current,
                  specifications: current.specifications.filter(
                    (_, position) => position !== index,
                  ),
                }))}
                disabled={submitting}
                aria-label={`Remove specification ${index + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          {fieldErrors.specifications?.[0] && (
            <small className="field-error">{fieldErrors.specifications[0]}</small>
          )}
        </section>

        <div className="admin-field--wide admin-image-upload">
          <div className="admin-image-upload__heading">
            <div>
              <span>Product images</span>

              <small className="form-help">
                JPEG, PNG or WebP. Maximum 5 MB each.
              </small>
            </div>

            <span className="admin-image-count">
              {totalImageCount}/{MAX_IMAGES}
            </span>
          </div>

          <label className="admin-image-picker">
            <span>
              {totalImageCount >= MAX_IMAGES
                ? "Image limit reached"
                : "Select images"}
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelection}
              disabled={
                submitting ||
                totalImageCount >= MAX_IMAGES
              }
            />
          </label>

          {totalImageCount > 0 && (
            <div className="admin-image-grid">
              {values.images.map((image, index) => (
                <div
                  className="admin-image-preview"
                  key={`${image}-${index}`}
                >
                  <img
                    src={image}
                    alt={`Existing product ${index + 1}`}
                  />

                  <span className="admin-image-badge">
                    Existing
                  </span>

                  <button
                    className="admin-image-remove"
                    type="button"
                    onClick={() =>
                      removeExistingImage(index)
                    }
                    disabled={submitting}
                    aria-label={`Remove existing image ${
                      index + 1
                    }`}
                  >
                    ×
                  </button>
                </div>
              ))}

              {selectedImagePreviews.map(
                ({ file, previewUrl }, index) => (
                  <div
                    className="admin-image-preview"
                    key={`${file.name}-${file.lastModified}-${index}`}
                  >
                    <img
                      src={previewUrl}
                      alt={`Selected ${file.name}`}
                    />

                    <span className="admin-image-badge admin-image-badge--new">
                      New
                    </span>

                    <button
                      className="admin-image-remove"
                      type="button"
                      onClick={() =>
                        removeSelectedImage(index)
                      }
                      disabled={submitting}
                      aria-label={`Remove ${file.name}`}
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
            </div>
          )}

          {fieldErrors.images?.[0] && (
            <small className="field-error">
              {fieldErrors.images[0]}
            </small>
          )}
        </div>

        <label className="admin-checkbox">
          <input
            name="isActive"
            type="checkbox"
            checked={values.isActive}
            onChange={updateField}
          />

          <span>Product is active</span>
        </label>

        <label className="admin-checkbox">
          <input
            name="isFeatured"
            type="checkbox"
            checked={values.isFeatured}
            onChange={updateField}
          />

          <span>Feature this product</span>
        </label>
      </div>

      {generalError && (
        <p className="auth-error" role="alert">
          {generalError}
        </p>
      )}

      <div className="admin-form-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>

        <button
          className="primary-button"
          type="submit"
          disabled={submitting}
        >
          {submitting
            ? selectedFiles.length > 0
              ? "Uploading and saving..."
              : "Saving..."
            : editing
              ? "Save changes"
              : "Create product"}
        </button>
      </div>
    </form>
  );
}