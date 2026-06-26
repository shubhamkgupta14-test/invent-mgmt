import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/common/SearchBar";
import SaleTable from "../components/pages/sale/SaleTable";
import Loader from "../components/common/Loader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { getSales } from "../api/salesApi";

function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSale();
  }, []);

  const loadSale = async () => {
    try {
      setLoading(true);
      const sales_response = await getSales();
      setSales(sales_response.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(
    (sale) =>
      sale.supplier_id?.toLowerCase().includes(search.toLowerCase()) ||
      sale.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
      sale.final_total_amount?.toString().includes(search),
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[calc(100vh-88px)] items-center justify-center">
          <Loader message="Loading sales..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales</h1>
          <p className="text-slate-600 mt-1">
            Review orders, revenue, and sales performance.
          </p>
        </div>
        <Button variant="secondary" size="md">
          Export Report
        </Button>
      </div>

      <Card>
        <div className="mb-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search invoice, supplier, or amount"
          />
        </div>

        {loading ? (
          <Loader fullScreen={false} message="Loading sales…" />
        ) : (
          <SaleTable sales={filteredSales} />
        )}

        <div className="mt-6 rounded-lg border border-border bg-slate-50 p-4 text-sm text-slate-700">
          Showing <span className="font-semibold">{filteredSales.length}</span>{" "}
          sales records.
        </div>
      </Card>
    </MainLayout>
  );
}

export default Sales;
