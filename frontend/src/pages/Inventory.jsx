import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import ProductTable from "../components/pages/product/ProductTable";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Modal from "../components/common/Modal";
import ProductForm from "../components/pages/product/ProductForm";
import DetailModal from "../components/common/DetailModal";
import {
  deleteProduct,
  getProductFormOptions,
  getProducts,
  updateProduct,
} from "../api/productApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/ToastContext";

function Inventory() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    let isActive = true;

    Promise.all([getProducts(), getMyDetails()])
      .then(([productsResponse, userResponse]) => {
        if (!isActive) return;
        setProducts(productsResponse.data.data);
        setCurrentUser(userResponse.data.data);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
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

  const handleEditProduct = async (product) => {
    setEditingProduct(product);

    if (suppliers.length || categories.length || units.length) return;

    try {
      const response = await getProductFormOptions();
      setSuppliers(response.data.data.suppliers || []);
      setCategories(response.data.data.categories || []);
      setUnits(response.data.data.units || []);
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to load product form options",
        "error",
      );
    }
  };

  const filteredProducts = products.filter(
    (product) => {
      const searchText = search.trim().toLowerCase();
      const productNameSearch = search
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ")
        .toLowerCase();

      return (
        product.name?.toLowerCase().includes(productNameSearch || searchText) ||
        product.sku?.toLowerCase().includes(searchText) ||
        product.supplier_id?.toLowerCase().includes(searchText) ||
        product.category?.toLowerCase().includes(searchText)
      );
    },
  );

  const canMutateProducts = ["admin", "superadmin"].includes(currentUser?.role);

  const handleUpdateProduct = async (payload) => {
    try {
      const updatePayload = { ...payload };
      delete updatePayload.sku;
      delete updatePayload.id;
      delete updatePayload.created_at;
      delete updatePayload.updated_at;

      await updateProduct(editingProduct.sku, updatePayload);
      addToast("Product updated successfully", "success");
      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to update product",
        "error",
      );
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete product ${product.sku}?`)) return;

    try {
      await deleteProduct({ sku: product.sku, permanent: false });
      addToast("Product deleted successfully", "success");
      await loadProducts();
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to delete product",
        "error",
      );
    }
  };

  const handleToggleProductActive = async (product, isActive) => {
    try {
      await updateProduct(product.sku, { is_active: isActive });
      addToast(
        isActive ? "Product activated successfully" : "Product deactivated successfully",
        "success",
      );
      await loadProducts();
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to update product status",
        "error",
      );
    }
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-600 mt-1">
            All products and stock details in one place.
          </p>
        </div>
        {canMutateProducts && (
          <Button variant="primary" onClick={handleAddProduct} size="md">
            + Add Product
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search SKU, product name, category or supplier"
          />
        </div>
        <ProductTable
          products={filteredProducts}
          onView={setSelectedProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onToggleActive={handleToggleProductActive}
          canEdit={canMutateProducts}
          canDelete={canMutateProducts}
          canToggleActive={currentUser?.role === "superadmin"}
        />
        <div className="mt-6 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing{" "}
          <span className="font-semibold">{filteredProducts.length}</span>{" "}
          products.
        </div>
      </Card>

      <DetailModal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || "Product Details"}
        sections={[
          {
            title: "Product",
            fields: [
              { label: "SKU", value: selectedProduct?.sku },
              { label: "Name", value: selectedProduct?.name },
              { label: "Category", value: selectedProduct?.category },
              { label: "Supplier", value: selectedProduct?.supplier_id },
              { label: "Unit", value: selectedProduct?.unit_of_measure },
              {
                label: "Tax Rate",
                value: `${selectedProduct?.tax_rate ?? 0}%`,
              },
              { label: "Reorder Level", value: selectedProduct?.reorder_level },
              {
                label: "Active",
                value: selectedProduct?.is_active ? "Yes" : "No",
              },
            ],
          },
          {
            title: "Description",
            fields: [
              { label: "Description", value: selectedProduct?.description },
            ],
          },
        ]}
      />

      <Modal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        title="Edit Product"
        size="2xl"
      >
        <ProductForm
          products={products}
          categories={categories}
          units={units}
          suppliers={suppliers}
          initialData={editingProduct}
          disabledFields={["sku"]}
          submitLabel="Update Product"
          onSubmit={handleUpdateProduct}
        />
      </Modal>
    </MainLayout>
  );
}

export default Inventory;
