import { getDatabase } from "../config/database.js";

export async function getCategories(request, response) {
  const database = getDatabase();

  const categories = await database
    .collection("categories")
    .find({ isActive: true })
    .sort({ name: 1 })
    .toArray();

  response.status(200).json({
    data: categories,
  });
}