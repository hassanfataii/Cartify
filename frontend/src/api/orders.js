import { apiRequest } from "./client";

export function getOrders(page = 1) {
  return apiRequest(`/orders?page=${page}&limit=10`);
}

export function getOrderById(orderId) {
  return apiRequest(`/orders/${orderId}`);
}