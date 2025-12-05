export interface Product {
  id: string;
  name: string;
  category: string;
}

const products: Product[] = [
  { id: "loan", name: "Business Loan", category: "term-loan" },
  { id: "loc", name: "Line of Credit", category: "loc" },
];

const productsRepo = {
  async findMany(_filter?: any): Promise<Product[]> {
    return products;
  },
};

export default productsRepo;
