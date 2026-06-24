import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/SearchBar";
import ProductTable from "../components/ProductTable";
import Loader from "../components/Loader";
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../api/productApi";

function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const loadProducts = async () => {
    try {
      setLoading(true);

      await sleep(1000); // 3 seconds

      const products_response = await getProducts();

      setProducts(products_response.data.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Loader />
      </MainLayout>
    );
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.supplier_id.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <MainLayout>
      <div className="mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search SKU, Product Name, Category, or Supplier Name"
        />
      </div>

      {<ProductTable products={filteredProducts} />}
    </MainLayout>
  );
}

export default Inventory;
