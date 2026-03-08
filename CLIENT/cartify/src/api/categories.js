import { get } from "./client";
export const fetchCategories = () => get("/api/categories");
