import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import ProductTable from "../components/pages/product/ProductTable";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { getProducts } from "../api/productApi";

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading inventory..." />
        </div>
      </MainLayout>
    );
  }

  const handleAddProduct = () => {
    navigate("/products/add");
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(search.toLowerCase()) ||
      product.sku?.toLowerCase().includes(search.toLowerCase()) ||
      product.supplier_id?.toLowerCase().includes(search.toLowerCase()) ||
      product.category?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-600 mt-1">
            All products and stock details in one place.
          </p>
        </div>
        <Button variant="primary" onClick={handleAddProduct} size="md">
          + Add Product
        </Button>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search SKU, product name, category or supplier"
          />
        </div>
        <ProductTable products={filteredProducts} />
        <div className="mt-6 rounded-lg border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing{" "}
          <span className="font-semibold">{filteredProducts.length}</span>{" "}
          products.
        </div>
      </Card>
    </MainLayout>
  );
}

export default Inventory;
