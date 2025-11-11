import { request } from "./http";
import { Lender, LenderProduct } from "../types/api";

export const listLenders = () =>
  request<Lender[]>({
    url: "/api/lenders",
    method: "GET",
  });

export const createLender = (payload: Partial<Lender> & { name: string; contactEmail: string }) =>
  request<Lender>({
    url: "/api/lenders",
    method: "POST",
    data: payload,
  });

export const updateLender = (id: string, payload: Partial<Lender>) =>
  request<Lender>({
    url: `/api/lenders/${id}`,
    method: "PUT",
    data: payload,
  });

export const deleteLender = (id: string) =>
  request<void>({
    url: `/api/lenders/${id}`,
    method: "DELETE",
  });

export const listProducts = (lenderId?: string) =>
  request<LenderProduct[]>({
    url: lenderId ? `/api/lenders/${lenderId}/products` : "/api/lender-products",
    method: "GET",
  });

export const createProduct = (
  lenderId: string,
  payload: Partial<LenderProduct> & {
    name: string;
    interestRate: number;
    minAmount: number;
    maxAmount: number;
    termMonths: number;
    documentation: LenderProduct["documentation"];
    recommendedScore: number;
  },
) =>
  request<LenderProduct>({
    url: `/api/lenders/${lenderId}/products`,
    method: "POST",
    data: payload,
  });

export const updateProduct = (lenderId: string, productId: string, payload: Partial<LenderProduct>) =>
  request<LenderProduct>({
    url: `/api/lenders/products/${productId}`,
    method: "PUT",
    data: { ...payload, lenderId },
  });

export const deleteProduct = (productId: string) =>
  request<void>({
    url: `/api/lenders/products/${productId}`,
    method: "DELETE",
  });

export const listRequirements = async (lenderId: string) => {
  const products = await listProducts(lenderId);
  const requirementMap = new Map<
    string,
    { documentType: string; required: boolean; description: string }
  >();

  for (const product of products) {
    for (const requirement of product.documentation) {
      if (!requirementMap.has(requirement.documentType) || requirement.required) {
        requirementMap.set(requirement.documentType, requirement);
      }
    }
  }

  return Array.from(requirementMap.values());
};

export const sendToLender = (applicationId: string, lenderId: string) =>
  request<Record<string, unknown>>({
    url: `/api/lenders/${lenderId}/send`,
    method: "POST",
    data: { applicationId },
  });

export const listReports = () =>
  request<Record<string, unknown>[]>({
    url: "/api/lenders/reports/summary",
    method: "GET",
  });
