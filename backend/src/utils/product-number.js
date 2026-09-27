import { randomInt } from "node:crypto";

const PRODUCT_NUMBER_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRandomSegment(length) {
  let segment = "";

  for (let index = 0; index < length; index += 1) {
    segment += PRODUCT_NUMBER_ALPHABET[
      randomInt(PRODUCT_NUMBER_ALPHABET.length)
    ];
  }

  return segment;
}

export function generateProductNumber() {
  return `CTF-${createRandomSegment(4)}-${createRandomSegment(4)}`;
}

export async function createUniqueProductNumber(
  products,
) {
  const maximumAttempts = 20;

  for (
    let attempt = 0;
    attempt < maximumAttempts;
    attempt += 1
  ) {
    const productNumber = generateProductNumber();

    const existingProduct = await products.findOne(
      { productNumber },
      {
        projection: {
          _id: 1,
        },
      },
    );

    if (!existingProduct) {
      return productNumber;
    }
  }

  throw new Error(
    "Unable to generate a unique product number",
  );
}