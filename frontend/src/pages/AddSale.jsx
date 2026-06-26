import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import SaleForm from "../components/pages/sale/SaleForm";
import { createSale } from "../api/salesApi";
import { getMyDetails } from "../api/userApi";
import { getProductOptions } from "../api/productApi";
import { useToast } from "../context/ToastContext";
import MainLayout from "../layouts/MainLayout";

function AddSale() {
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    let isActive = true;

    Promise.all([getProductOptions({ activeOnly: true }), getMyDetails()])
      .then(([productsResponse, userResponse]) => {
        if (!isActive) return;
        setProducts(productsResponse.data.data || []);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        addToast(
          error.response?.data?.message || "Failed to load sale form options",
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
      await createSale(payload);
      addToast("Sale created successfully", "success");
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to create sale", "error");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading sale form..." />
        </div>
      </MainLayout>
    );
  }

  if (currentUser?.role === "user") {
    return (
      <MainLayout>
        <Card>
          <p className="text-sm font-medium text-slate-700">
            You have view-only access and cannot create sales.
          </p>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add Sale</h1>
          <p className="mt-1 text-slate-600">
            Create a sale order and update inventory stock.
          </p>
        </div>

        <Card>
          <SaleForm products={products} onSubmit={handleSubmit} />
        </Card>
      </div>
    </MainLayout>
  );
}

export default AddSale;
