import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api";
import { Lender, LenderProduct } from "../types/api";

interface LenderWithProducts extends Lender {
  products: LenderProduct[];
}

export function useLenders() {
  const [lenders, setLenders] = useState<LenderWithProducts[]>([]);
  const [products, setProducts] = useState<LenderProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [lenderList, productList] = await Promise.all([
        apiClient.getLenders(),
        apiClient.getLenderProducts(),
      ]);
      setProducts(productList);
      setLenders(
        lenderList.map((lender) => ({
          ...lender,
          products: productList.filter((product) => product.lenderId === lender.id),
        })),
      );
    } catch (err) {
      const message = (err as { message?: string })?.message ?? "Unable to load lenders.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createLender = useCallback(async (payload: Partial<Lender> & { name: string; contactEmail: string }) => {
    const lender = await apiClient.createLender(payload);
    setLenders((prev) => [{ ...lender, products: [] }, ...prev]);
    return lender;
  }, []);

  const updateLender = useCallback(async (id: string, payload: Partial<Lender>) => {
    const lender = await apiClient.updateLender(id, payload);
    setLenders((prev) =>
      prev.map((item) => (item.id === lender.id ? { ...lender, products: item.products } : item)),
    );
    return lender;
  }, []);

  const deleteLender = useCallback(async (id: string) => {
    await apiClient.deleteLender(id);
    setLenders((prev) => prev.filter((lender) => lender.id !== id));
    setProducts((prev) => prev.filter((product) => product.lenderId !== id));
  }, []);

  const createProduct = useCallback(
    async (
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
    ) => {
      const product = await apiClient.createLenderProduct(lenderId, payload);
      setProducts((prev) => [product, ...prev]);
      setLenders((prev) =>
        prev.map((lender) =>
          lender.id === lenderId
            ? { ...lender, products: [product, ...lender.products] }
            : lender,
        ),
      );
      return product;
    },
    [],
  );

  const updateProduct = useCallback(
    async (lenderId: string, productId: string, payload: Partial<LenderProduct>) => {
      const product = await apiClient.updateLenderProduct(lenderId, productId, payload);
      setProducts((prev) => prev.map((item) => (item.id === product.id ? product : item)));
      setLenders((prev) =>
        prev.map((lender) =>
          lender.id === lenderId
            ? {
                ...lender,
                products: lender.products.map((item) => (item.id === product.id ? product : item)),
              }
            : lender,
        ),
      );
      return product;
    },
    [],
  );

  const deleteProduct = useCallback(async (lenderId: string, productId: string) => {
    await apiClient.deleteLenderProduct(lenderId, productId);
    setProducts((prev) => prev.filter((product) => product.id !== productId));
    setLenders((prev) =>
      prev.map((lender) =>
        lender.id === lenderId
          ? {
              ...lender,
              products: lender.products.filter((product) => product.id !== productId),
            }
          : lender,
      ),
    );
  }, []);

  const lenderMap = useMemo(() => new Map(lenders.map((lender) => [lender.id, lender])), [lenders]);

  return {
    lenders,
    products,
    lenderMap,
    loading,
    error,
    refresh,
    createLender,
    updateLender,
    deleteLender,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

export type UseLendersReturn = ReturnType<typeof useLenders>;
