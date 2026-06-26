import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ProductForm from "../components/pages/product/ProductForm";
import Card from "../components/common/Card";
import { useToast } from "../context/ToastContext";
import { getProducts } from "../api/productApi";
import { addProduct } from "../api/productApi";
import { getSuppliers } from "../api/supplierApi";

function AddProduct() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getSuppliers();
    setSuppliers(s.data.data);

    const p = await getProducts();
    setProducts(p.data.data);
  };

  const handleSubmit = async (payload) => {
    try {
      await addProduct(payload);
      addToast("Product added successfully", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Something went wrong", "error");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add Product</h1>
          <p className="text-slate-600 mt-1">
            Create a new product and update its inventory details.
          </p>
        </div>

        <Card>
          <ProductForm
            products={products}
            suppliers={suppliers}
            onSubmit={handleSubmit}
          />
        </Card>
      </div>
    </MainLayout>
  );
}
export default AddProduct;
