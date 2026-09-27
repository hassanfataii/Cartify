export function formatCurrency(priceInPence) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(priceInPence || 0) / 100);
}