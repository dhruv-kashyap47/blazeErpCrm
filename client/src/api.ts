/// <reference types="vite/client" />
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export type User = {
  id: string;
  name: string;
  role: "ADMIN" | "SALES" | "WAREHOUSE" | "ACCOUNTS";
};
export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: string | number;
  currentStock: number;
  minimumStock: number;
  location: string;
  isLowStock?: boolean;
};
export type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  businessName: string;
  type: string;
  address: string;
  status: string;
  followUpDate?: string;
  notes?: string;
};
export type Challan = {
  id: string;
  challanNumber: string;
  status: string;
  totalQuantity: number;
  createdAt: string;
  customer: { name: string };
  items: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: string | number;
  }[];
};
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("blaze_token");
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body;
}
