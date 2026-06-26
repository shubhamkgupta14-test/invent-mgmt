import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import PurchaseForm from "../components/pages/purchase/PurchaseForm";
import Card from "../components/common/Card";
import { useToast } from "../context/ToastContext";
import { getProducts } from "../api/productApi";
import { createPurchase } from "../api/purchaseApi";

function AddPurchase() {
  const [products, setProducts] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const p = await getProducts();
    setProducts(p.data.data);
  };

  const handleSubmit = async (payload) => {
    try {
      await createPurchase(payload);
      addToast("Purchase created successfully", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Something went wrong", "error");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add Purchase</h1>
          <p className="text-slate-600 mt-1">
            Create a purchase order and add inventory details.
          </p>
        </div>

        <Card>
          <PurchaseForm products={products} onSubmit={handleSubmit} />
        </Card>
      </div>
    </MainLayout>
  );
}

export default AddPurchase;
