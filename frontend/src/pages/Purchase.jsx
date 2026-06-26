import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import PurchaseTable from "../components/pages/purchase/PurchaseTable";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { getPurchases } from "../api/purchaseApi";

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadPurchase();
  }, []);

  const loadPurchase = async () => {
    try {
      setLoading(true);
      const purchases_response = await getPurchases();
      setPurchases(purchases_response.data.data);
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
          <Loader message="Loading purchases..." />
        </div>
      </MainLayout>
    );
  }

  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.supplier_id?.toLowerCase().includes(search.toLowerCase()) ||
      purchase.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
      purchase.final_total_amount?.toString().includes(search),
  );

  const handleAddPurchase = () => {
    navigate("/purchases/add");
  };

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Purchases</h1>
          <p className="text-slate-600 mt-1">
            Track and manage your purchase orders.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleAddPurchase}>
          + Add Purchase
        </Button>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoice, supplier, or total"
          />
        </div>

        <PurchaseTable purchases={filteredPurchases} />

        <div className="mt-6 rounded-lg border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing{" "}
          <span className="font-semibold">{filteredPurchases.length}</span>{" "}
          purchases.
        </div>
      </Card>
    </MainLayout>
  );
}

export default Purchases;
