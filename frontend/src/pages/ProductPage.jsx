import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getProductBySlug,
} from "../api/products";

import AddToCartButton from "../components/products/AddToCartButton";
import WishlistButton from "../components/products/WishlistButton";

import {
  formatCurrency,
} from "../utils/formatCurrency";

import { getProductContent } from "../utils/productContent";


export default function ProductPage() {
  const { slug } = useParams();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await getProductBySlug(
          slug,
          controller.signal,
        );

        setProduct(response.data);
        setSelectedImage(response.data.images?.[0] || "");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError.message || "Unable to load this product",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      controller.abort();
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="product-page">
        <p role="status">Loading product…</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="message-page">
        <p className="eyebrow">Product catalogue</p>
        <h1>Product unavailable</h1>
        <p role="alert">{error}</p>

        <Link className="primary-button" to="/shop">
          Return to the shop
        </Link>
      </main>
    );
  }

  const productId = product._id ?? product.id;

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : ["/images/product-placeholder.jpg"];

  const currentImage = selectedImage || images[0];
  const { paragraphs, features, specifications } =
    getProductContent(product);
  const hasMoreDetails =
    paragraphs.length > 1 || features.length > 0 ||
    specifications.length > 0;

  return (
    <main className="product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.title}</span>
      </nav>

      <section className="product-details">
        <div className="product-gallery">
          <div className="product-gallery__main">
            <img src={currentImage} alt={product.title} />
          </div>

          {images.length > 1 && (
            <div
              className="product-gallery__thumbnails"
              aria-label="Product images"
            >
              {images.map((image, index) => {
                const selected = image === currentImage;

                return (
                  <button
                    className={
                      selected
                        ? "product-thumbnail product-thumbnail--active"
                        : "product-thumbnail"
                    }
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setSelectedImage(image)}
                    aria-label={`View image ${index + 1} of ${product.title}`}
                    aria-pressed={selected}
                  >
                    <img src={image} alt="" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="product-information">
          <Link
            className="product-information__category"
            to={`/shop?category=${product.category?.slug || ""}`}
          >
            {product.category?.name || "Uncategorised"}
          </Link>

          <h1>{product.title}</h1>

          {product.productNumber && (
            <p className="product-information__number">
              Product number: <strong>{product.productNumber}</strong>
            </p>
          )}

          <p className="product-information__price">
            {formatCurrency(product.priceInPence)}
          </p>

          {paragraphs[0] && (
            <p className="product-information__intro">
              {paragraphs[0]}
            </p>
          )}

          <div
            className={`product-stock ${
              product.stock > 10
                ? "product-stock--available"
                : product.stock > 0
                  ? "product-stock--low"
                  : "product-stock--empty"
            }`}
          >
            <span aria-hidden="true" />
            <p>
              {product.stock > 10
                ? `${product.stock} currently in stock`
                : product.stock > 0
                  ? `Only ${product.stock} remaining`
                  : "Currently out of stock"}
            </p>
          </div>

          <div className="product-information__actions">
            <AddToCartButton
              productId={productId}
              stock={product.stock}
            />

            <WishlistButton productId={productId} />
          </div>
        </div>
      </section>

      {hasMoreDetails && (
        <section className="product-extra" aria-label="Product details">
          {paragraphs.length > 1 && (
            <div className="product-extra__section">
              <h2>Description</h2>
              {paragraphs.slice(1).map((paragraph, index) => (
                <p key={`${index}-${paragraph}`}>{paragraph}</p>
              ))}
            </div>
          )}

          {features.length > 0 && (
            <div className="product-extra__section">
              <h2>Key features</h2>
              <ul className="product-feature-list">
                {features.map((feature, index) => (
                  <li key={`${index}-${feature}`}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {specifications.length > 0 && (
            <div className="product-extra__section">
              <h2>Specifications</h2>
              <dl className="product-specification-list">
                {specifications.map(({ label, value }, index) => (
                  <div key={`${index}-${label}`}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
