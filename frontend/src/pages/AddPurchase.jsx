import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import PurchaseForm from "../components/pages/purchase/PurchaseForm";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import { useToast } from "../context/useToast";
import { getProductOptions } from "../api/productApi";
import { createPurchase } from "../api/purchaseApi";
import { getMyDetails } from "../api/userApi";

function AddPurchase() {
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    let isActive = true;

    Promise.all([getProductOptions(), getMyDetails()])
      .then(([productsResponse, userResponse]) => {
        if (!isActive) return;
        setProducts(productsResponse.data.data);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        addToast(
          error.response?.data?.message || "Failed to load product options",
          "error",
        );
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [addToast]);

  const handleSubmit = async (payload) => {
    try {
      await createPurchase(payload);
      addToast("Purchase created successfully", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Something went wrong", "error");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading purchase form..." />
        </div>
      </MainLayout>
    );
  }

  if (currentUser?.role === "user") {
    return (
      <MainLayout>
        <Card>
          <p className="text-sm font-medium text-slate-700">
            You have view-only access and cannot create purchases.
          </p>
        </Card>
      </MainLayout>
    );
  }

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
