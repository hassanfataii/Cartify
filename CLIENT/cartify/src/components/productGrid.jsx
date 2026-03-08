import React from "react";
import ProductCard from "./productCard.jsx";

export default function ProductGrid({
  products = [],
  containerClass = "products",
  ...rest
}) {
  if (!products.length) {
    return (
      <div className={`${containerClass} empty`}>
        <p>No products found.</p>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {products.map((p) => (
        <ProductCard
          key={p._id ?? p.title}
          product={p}
          quantity={p.__qty}
          {...rest}
        />
      ))}
    </div>
  );
}
