import { useCallback, useEffect, useRef, useState } from "react";
import { FaChevronDown, FaDownload, FaUpload } from "react-icons/fa";
import * as XLSX from "xlsx";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import ProductTable from "../components/pages/product/ProductTable";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import ExportMenu from "../components/common/ExportMenu";
import Modal from "../components/common/Modal";
import ProductForm from "../components/pages/product/ProductForm";
import DetailModal from "../components/common/DetailModal";
import TablePagination from "../components/common/TablePagination";
import {
  addProduct,
  bulkUploadProducts,
  deleteProduct,
  getProductFormOptions,
  getProducts,
  updateProduct,
} from "../api/productApi";
import { getMyDetails } from "../api/userApi";
import { useToast } from "../context/useToast";
import { toggleSort } from "../utils/sortUtils";
import { defaultPagination, listParams, parseListResponse } from "../utils/tableQuery";

const BULK_UPLOAD_HEADERS = [
  "SKU",
  "Product Name",
  "Category",
  "Description",
  "Unit of Measure",
  "Tax Rate",
  "Reorder Level",
  "Supplier",
  "In-House",
  "Color",
  "Material",
  "Weight",
  "Size",
  "Dimension",
];
const BULK_UPLOAD_MAX_FILE_SIZE_MB = 5;
const BULK_UPLOAD_MAX_FILE_SIZE = BULK_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;
const BULK_UPLOAD_MAX_ROWS = Number(import.meta.env.VITE_BULK_UPLOAD_MAX_ROWS || 51);
const BULK_UPLOAD_SAMPLE_ROWS = [
  {
    SKU: "SKU-001",
    "Product Name": "Cotton T-Shirt",
    Category: "Apparel",
    Description: "Basic cotton round neck t-shirt",
    "Unit of Measure": "pcs",
    "Tax Rate": 5,
    "Reorder Level": 10,
    Supplier: "SUP-001",
    "In-House": "No",
    Color: "Blue",
    Material: "Cotton",
    Weight: "180g",
    Size: "M",
    Dimension: "30 x 20 x 2 cm",
  },
];
const inventoryExportColumns = [
  { header: "SKU", key: "sku" },
  { header: "Name", key: "name" },
  { header: "Category", key: "category" },
  { header: "Supplier", key: "supplier_id" },
  { header: "Unit", key: "unit_of_measure" },
  { header: "Tax Rate", value: (item) => `${item.tax_rate ?? 0}%` },
  { header: "Reorder Level", key: "reorder_level" },
  { header: "Manufactured", value: (item) => (item.is_manufactured ? "Yes" : "No") },
  { header: "Active", value: (item) => (item.is_active ? "Yes" : "No") },
  { header: "Description", key: "description" },
];

function Inventory() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ field: "created_at", order: "desc" });
  const [pagination, setPagination] = useState(defaultPagination);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState(null);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const bulkUploadInputRef = useRef(null);
  const bulkUploadInFlightRef = useRef("");
  const { addToast } = useToast();
  const { page, limit } = pagination;

  const loadProducts = useCallback(async (next = {}) => {
    const nextPagination = next.pagination || pagination;
    const nextSort = next.sortConfig || sortConfig;
    const nextSearch = next.search ?? search;

    const productsResponse = await getProducts(listParams({
      search: nextSearch,
      sortConfig: nextSort,
      pagination: { page: nextPagination.page, limit: nextPagination.limit },
    }));
    const parsed = parseListResponse(productsResponse);
    setProducts(parsed.items);
    setPagination(parsed.pagination);
  }, [pagination, search, sortConfig]);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      getProducts(listParams({ search, sortConfig, pagination: { page, limit } })),
      getMyDetails(),
    ])
      .then(([productsResponse, userResponse]) => {
        if (!isActive) return;
        const parsed = parseListResponse(productsResponse);
        setProducts(parsed.items);
        setPagination(parsed.pagination);
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
  }, [limit, page, search, sortConfig]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading inventory..." />
        </div>
      </MainLayout>
    );
  }

  const loadProductFormOptions = async () => {
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

  const handleAddProduct = async () => {
    setEditingProduct(null);
    setProductFormOpen(true);
    await loadProductFormOptions();
  };

  const handleBulkUploadClick = () => {
    if (bulkUploading) return;
    setBulkMenuOpen(false);
    bulkUploadInputRef.current?.click();
  };

  const handleDownloadBulkSample = () => {
    const worksheet = XLSX.utils.json_to_sheet(BULK_UPLOAD_SAMPLE_ROWS, {
      header: BULK_UPLOAD_HEADERS,
    });
    worksheet["!cols"] = BULK_UPLOAD_HEADERS.map((header) => ({
      wch: Math.max(header.length + 2, 14),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, "inventory-bulk-upload-sample.xlsx");
    setBulkMenuOpen(false);
  };

  const handleBulkUploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || bulkUploading) return;

    const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
    if (bulkUploadInFlightRef.current === fileKey) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      addToast("Only .xlsx Excel files are allowed", "error");
      return;
    }

    if (file.size > BULK_UPLOAD_MAX_FILE_SIZE) {
      addToast(`File size must be ${BULK_UPLOAD_MAX_FILE_SIZE_MB}MB or less`, "error");
      return;
    }

    try {
      setBulkUploading(true);
      bulkUploadInFlightRef.current = fileKey;
      const response = await bulkUploadProducts(file);
      const result = response.data?.data;
      setBulkUploadResult(result);
      setBulkUploadModalOpen(true);

      const summary = result?.summary || {};
      addToast(
        `Bulk upload completed: ${summary.created || 0} created, ${summary.failed || 0} failed`,
        summary.failed ? "warning" : "success",
      );

      if (summary.created) {
        await loadProducts();
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to upload products", "error");
    } finally {
      setBulkUploading(false);
      setBulkMenuOpen(false);
      bulkUploadInFlightRef.current = "";
    }
  };

  const handleEditProduct = async (product) => {
    setEditingProduct(product);
    setProductFormOpen(true);
    await loadProductFormOptions();
  };

  const canMutateProducts = ["admin", "superadmin"].includes(currentUser?.role);
  const handleSearchChange = (value) => {
    setSearch(value);
    setPagination((current) => ({ ...current, page: 1 }));
  };
  const handleSort = (field) => {
    setSortConfig((current) => toggleSort(current, field));
    setPagination((current) => ({ ...current, page: 1 }));
  };
  const handlePageChange = (page) => setPagination((current) => ({ ...current, page }));
  const handleLimitChange = (limit) => setPagination((current) => ({ ...current, limit, page: 1 }));

  const handleSubmitProduct = async (payload) => {
    try {
      if (editingProduct) {
        const updatePayload = { ...payload };
        delete updatePayload.sku;
        delete updatePayload.id;
        delete updatePayload.created_at;
        delete updatePayload.updated_at;

        await updateProduct(editingProduct.sku, updatePayload);
        addToast("Product updated successfully", "success");
      } else {
        await addProduct(payload);
        addToast("Product added successfully", "success");
      }

      setEditingProduct(null);
      setProductFormOpen(false);
      await loadProducts();
    } catch (error) {
      addToast(
        error.response?.data?.message || "Failed to save product",
        "error",
      );
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct({ sku: productToDelete.sku });
      addToast(
        currentUser?.role === "superadmin" && !productToDelete.is_active
          ? "Product permanently deleted successfully"
          : "Product deactivated successfully",
        "success",
      );
      setProductToDelete(null);
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
        <div className="flex flex-wrap items-center gap-3">
          <ExportMenu
            rows={products}
            columns={inventoryExportColumns}
            filename="inventory"
            title="Inventory"
          />
          {canMutateProducts && (
            <>
            <input
              ref={bulkUploadInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handleBulkUploadFile}
              disabled={bulkUploading}
            />
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => setBulkMenuOpen((current) => !current)}
                size="md"
                icon={FaUpload}
                loading={bulkUploading}
                disabled={bulkUploading}
                className="border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
              >
                Bulk Upload
                {!bulkUploading && <FaChevronDown size={12} />}
              </Button>
              {bulkMenuOpen && (
                <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={handleDownloadBulkSample}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-[var(--surface-hover)]"
                  >
                    <FaDownload size={14} />
                    Download Sample
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkUploadClick}
                    className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-[var(--surface-hover)]"
                  >
                    <FaUpload size={14} />
                    Upload Excel
                  </button>
                </div>
              )}
            </div>
            <Button variant="primary" onClick={handleAddProduct} size="md">
              + Add Product
            </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search SKU, product name, category or supplier"
          />
        </div>
        <ProductTable
          products={products}
          onView={setSelectedProduct}
          onEdit={handleEditProduct}
          onDelete={setProductToDelete}
          onToggleActive={handleToggleProductActive}
          canEdit={canMutateProducts}
          canDelete={canMutateProducts}
          canToggleActive={currentUser?.role === "superadmin"}
          sortConfig={sortConfig}
          handleSort={handleSort}
        />
        <TablePagination
          pagination={pagination}
          label="products"
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          disabled={loading}
        />
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
              {
                label: "Manufactured",
                value: selectedProduct?.is_manufactured ? "Yes" : "No",
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
        isOpen={productFormOpen}
        onClose={() => {
          setProductFormOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? "Edit Product" : "Add Product"}
        size="2xl"
      >
        <ProductForm
          key={editingProduct?.sku || "new-product"}
          products={products}
          categories={categories}
          units={units}
          suppliers={suppliers}
          initialData={editingProduct}
          disabledFields={editingProduct ? ["sku"] : []}
          submitLabel={editingProduct ? "Update Product" : "Add Product"}
          onSubmit={handleSubmitProduct}
        />
      </Modal>

      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Confirm Delete Product"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700">
            This will{" "}
            {currentUser?.role === "superadmin" && !productToDelete?.is_active
              ? "permanently delete"
              : "deactivate"}{" "}
            product{" "}
            <span className="font-semibold text-slate-900">
              {productToDelete?.name} ({productToDelete?.sku})
            </span>
            .
          </p>
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setProductToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={confirmDeleteProduct}
            >
              Delete Product
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        title="Bulk Upload Result"
        size="6xl"
      >
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-slate-600">
            Upload limit: .xlsx files up to {BULK_UPLOAD_MAX_FILE_SIZE_MB}MB and {BULK_UPLOAD_MAX_ROWS} product rows.
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Total Rows</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">
                {bulkUploadResult?.summary?.total || 0}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Created</p>
              <p className="mt-0.5 text-lg font-bold text-emerald-800">
                {bulkUploadResult?.summary?.created || 0}
              </p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700">Failed</p>
              <p className="mt-0.5 text-lg font-bold text-rose-800">
                {bulkUploadResult?.summary?.failed || 0}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-[1200px] divide-y divide-[var(--border)] text-xs">
              <thead className="bg-[var(--surface-muted)] text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2.5 py-2">Row</th>
                  <th className="px-2.5 py-2">Status</th>
                  <th className="px-2.5 py-2">Reason</th>
                  {(bulkUploadResult?.headers || BULK_UPLOAD_HEADERS).map((header) => (
                    <th key={header} className="px-2.5 py-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-white">
                {(bulkUploadResult?.rows || []).map((row) => {
                  const isCreated = row.status === "created";
                  return (
                    <tr
                      key={row.row_number}
                      className={isCreated ? "bg-emerald-50/50" : "bg-rose-50/50"}
                    >
                      <td className="whitespace-nowrap px-2.5 py-2 font-semibold text-slate-700">
                        {row.row_number}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isCreated
                              ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                          }`}
                        >
                          {isCreated ? "Created" : "Failed"}
                        </span>
                      </td>
                      <td className="min-w-48 px-2.5 py-2 font-medium text-slate-700">
                        {row.reason || "-"}
                      </td>
                      {(bulkUploadResult?.headers || BULK_UPLOAD_HEADERS).map((header) => (
                        <td key={`${row.row_number}-${header}`} className="min-w-28 px-2.5 py-2 text-slate-700">
                          {row.data?.[header] || "-"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-[var(--border)] pt-5">
            <Button type="button" onClick={() => setBulkUploadModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default Inventory;
