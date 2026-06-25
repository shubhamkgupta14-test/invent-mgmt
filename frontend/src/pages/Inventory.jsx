import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/SearchBar";
import ProductTable from "../components/ProductTable";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);

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
        <h1 className="text-xl font-bold">Purchases</h1>
        <Loader />
      </MainLayout>
    );
  }

  const handleAddProduct = () => {
    navigate("/products/add");
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.supplier_id.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <MainLayout>
      <h1 className="text-xl font-bold">Purchases</h1>
      <div className="my-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search SKU, Product Name, Category, or Supplier Name"
        />
      </div>

      <button
        onClick={handleAddProduct}
        className="bg-blue-600 text-white px-4 py-2 mb-5 rounded"
      >
        + Add Product
      </button>

      {<ProductTable products={filteredProducts} />}
      <div className="bg-white p-4 my-3 rounded">
        <p>Total Purchases: {filteredProducts.length}</p>
      </div>
    </MainLayout>
  );
}

export default Inventory;
