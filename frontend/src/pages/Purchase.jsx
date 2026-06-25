import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/SearchBar";
import PurchaseTable from "../components/PurchaseTable";
import Loader from "../components/Loader";
import { getPurchases } from "../api/purchaseApi";
import { useNavigate } from "react-router-dom";

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
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Loader />
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
      <h1 className="text-xl font-bold">Purchases</h1>

      <div className="my-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search Invoice Id, Supplier Id, or Total amount"
        />
      </div>

      <button
        onClick={handleAddPurchase}
        className="bg-blue-600 text-white px-4 py-2 mb-5 rounded"
      >
        + Add Purchase
      </button>

      {<PurchaseTable purchases={filteredPurchases} />}

      <div className="bg-white p-4 my-3 rounded">
        <p>Total Purchases: {filteredPurchases.length}</p>
      </div>
    </MainLayout>
  );
}

export default Purchases;
