import { Link } from "react-router-dom";

import {
  formatCurrency,
} from "../../utils/formatCurrency";

import AddToCartButton from "./AddToCartButton";
import WishlistButton from "./WishlistButton";

export default function ProductCard({
  product,
  compact = false,
}) {
  const image =
    product.images?.[0] ||
    "/images/product-placeholder.jpg";

  const productId = product._id ?? product.id;

  return (
    <article
      className={`product-card ${
        compact ? "product-card--compact" : ""
      }`}
    >
      <Link
        className="product-card__image-link"
        to={`/products/${product.slug}`}
      >
        <img
          className="product-card__image"
          src={image}
          alt={product.title}
        />

        <div className="product-card__badges">
          {product.isBestSeller && (
            <span className="product-badge product-badge--bestseller">
              Best seller
            </span>
          )}

          {!product.isBestSeller && product.isFeatured && (
            <span className="product-badge">Featured</span>
          )}
        </div>
      </Link>

      <div className="product-card__content">
        <span className="product-card__category">
          {product.category?.name || "Uncategorised"}
        </span>

        <h2 className="product-card__title">
          <Link to={`/products/${product.slug}`}>
            {product.title}
          </Link>
        </h2>

        <p className="product-card__price">
          {formatCurrency(product.priceInPence)}
        </p>

        <p className="product-card__stock">
          {product.stock > 0
            ? `${product.stock} available`
            : "Out of stock"}
        </p>

        {compact ? (
          <Link
            className="product-card__compact-link"
            to={`/products/${product.slug}`}
          >
            View product
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <div className="product-card__actions">
            <Link
              className="product-card__link"
              to={`/products/${product.slug}`}
            >
              View product
            </Link>

            <AddToCartButton
              productId={productId}
              stock={product.stock}
              className="secondary-button"
            />

            <WishlistButton productId={productId} />
          </div>
        )}
      </div>
    </article>
  );
}
