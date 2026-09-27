export function getProductContent(product) {
  const description = product?.description ?? "";
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Products saved before the separate fields existed used one text box.
  if (
    Array.isArray(product?.features) ||
    Array.isArray(product?.specifications)
  ) {
    return {
      paragraphs: lines,
      features: product.features ?? [],
      specifications: product.specifications ?? [],
    };
  }

  const paragraphs = [];
  const features = [];
  const specifications = [];

  for (const line of lines) {
    const feature = line.match(/^(?:[-*•])\s+(.+)$/);
    const specification = line.match(/^([^:]{1,45}):\s*(.+)$/);

    if (feature) {
      features.push(feature[1]);
    } else if (specification) {
      specifications.push({
        label: specification[1].trim(),
        value: specification[2].trim(),
      });
    } else {
      paragraphs.push(line);
    }
  }

  return { paragraphs, features, specifications };
}
