import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ProductForm from "../components/ProductForm";
import Alert from "../components/Alert";
import { getProducts } from "../api/productApi";
import { addProduct } from "../api/productApi";
import { getSuppliers } from "../api/supplierApi";

function AddProduct() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [alert, setAlert] = useState(null);
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
      console.log(payload);
      await addProduct(payload);

      setAlert({
        type: "success",
        message: "Product added successfully",
      });
    } catch (err) {
      setAlert({
        type: "error",
        message: err.response?.data?.message || "Something went wrong",

        details: err.response?.data?.data || [],
      });
    }
  };

  return (
    <MainLayout>
      <div className="p-5">
        <h1 className="text-xl font-bold">Add Products</h1>
        <Alert alert={alert} onClose={() => setAlert(null)} />
        <ProductForm
          products={products}
          suppliers={suppliers}
          onSubmit={handleSubmit}
        />
      </div>
    </MainLayout>
  );
}
export default AddProduct;
