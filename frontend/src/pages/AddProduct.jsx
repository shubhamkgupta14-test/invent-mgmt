import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ProductForm from "../components/pages/product/ProductForm";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import { useToast } from "../context/ToastContext";
import { addProduct, getProductFormOptions } from "../api/productApi";
import { getMyDetails } from "../api/userApi";

function AddProduct() {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    let isActive = true;

    Promise.all([getProductFormOptions(), getMyDetails()])
      .then(([response, userResponse]) => {
        if (!isActive) return;
        setSuppliers(response.data.data.suppliers || []);
        setCategories(response.data.data.categories || []);
        setUnits(response.data.data.units || []);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        addToast(
          error.response?.data?.message || "Failed to load product form options",
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
      await addProduct(payload);
      addToast("Product added successfully", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Something went wrong", "error");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading product form..." />
        </div>
      </MainLayout>
    );
  }

  if (currentUser?.role === "user") {
    return (
      <MainLayout>
        <Card>
          <p className="text-sm font-medium text-slate-700">
            You have view-only access and cannot add products.
          </p>
        </Card>
      </MainLayout>
    );
  }

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
            categories={categories}
            units={units}
            suppliers={suppliers}
            onSubmit={handleSubmit}
          />
        </Card>
      </div>
    </MainLayout>
  );
}
export default AddProduct;
