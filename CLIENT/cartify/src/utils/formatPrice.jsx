function toPounds(v) {
  if (v == null) return 0;

  if (typeof v === "number") {
    return Number.isInteger(v) ? v / 100 : v;
  }

  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.]/g, "");
    if (!cleaned) return 0;
    const num = Number(cleaned);
    if (!isFinite(num)) return 0;
    return v.includes(".") ? num : num / 100;
  }

  if (typeof v === "object") {
    if (typeof v.$numberLong === "string") return Number(v.$numberLong) / 100;
    if (typeof v.$numberInt === "string") return Number(v.$numberInt) / 100;
    if (typeof v.$numberDecimal === "string") {
      const n = Number(v.$numberDecimal);
      return isFinite(n) ? n : 0;
    }
    if (v._bsontype === "Decimal128" && typeof v.toString === "function") {
      const n = Number(v.toString());
      return isFinite(n) ? n : 0;
    }
    if ("amount" in v) return toPounds(v.amount);
    if ("value" in v) return toPounds(v.value);
    if ("price" in v) return toPounds(v.price);
    return 0;
  }

  return 0;
}

export const formatPrice = (priceLike, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    toPounds(priceLike)
  );
