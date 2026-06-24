import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/SearchBar";
import SaleTable from "../components/SaleTable";
import Loader from "../components/Loader";
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

  // const filteredSales = sales.filter(
  //   (sale) =>
  //     sale.supplier_id?.toLowerCase().includes(search.toLowerCase()) ||
  //     sale.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
  //     sale.final_total_amount?.toString().includes(search),
  // );

  return (
    <MainLayout>
      <div className="mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search Invoice Id, Supplier Id, or Total amount"
        />
      </div>

      {<SaleTable sales={sales} />}
    </MainLayout>
  );
}

export default Sales;
