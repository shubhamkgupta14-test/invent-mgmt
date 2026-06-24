import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import SearchBar from "../components/SearchBar";
import StockTable from "../components/StockTable";
import Loader from "../components/Loader";
import { getStocks } from "../api/stockApi";

function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    field: "sku",
    order: "asc",
  });

  useEffect(() => {
    loadStock();
  }, []);

  const loadStock = async () => {
    try {
      setLoading(true);

      const stocks_response = await getStocks();

      setStocks(stocks_response.data.data);
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

  const searchText = search.toLowerCase().replace(/[_\s]/g, "");

  const filteredStocks = stocks.filter((stock) => {
    const normalizedStatus = stock.stock_status
      ?.toLowerCase()
      .replace(/[_\s]/g, "");

    return (
      stock.sku?.toLowerCase().includes(search.toLowerCase()) ||
      stock.name?.toLowerCase().includes(search.toLowerCase()) ||
      normalizedStatus?.includes(searchText)
    );
  });

  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,

      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const sortedStocks = [...filteredStocks].sort((a, b) => {
    const { field, order } = sortConfig;

    let comparison = 0;

    if (field === "sku") {
      comparison = a.sku.localeCompare(b.sku);
    } else if (field === "inventory_value") {
      comparison = a.inventory_value - b.inventory_value;
    }

    return order === "desc" ? comparison : -comparison;
  });

  return (
    <MainLayout>
      <div className="mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search SKU, Product name, or Stock status"
        />
      </div>

      {
        <StockTable
          stocks={sortedStocks}
          sortConfig={sortConfig}
          handleSort={handleSort}
        />
      }
    </MainLayout>
  );
}

export default Stocks;
