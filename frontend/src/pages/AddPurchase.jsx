import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import PurchaseForm from "../components/PurchaseForm";
// import { getSuppliers } from "../api/supplierApi";
import { getProducts } from "../api/productApi";
import { createPurchase } from "../api/purchaseApi";

function AddPurchase() {
//   const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // const s = await getSuppliers();
    const p = await getProducts();

    // setSuppliers(s.data.data);
    setProducts(p.data.data);
  };

  const handleSubmit = async (payload) => {
    await createPurchase(payload);

    alert("Purchase Created!");
  };

  return (
    <MainLayout>
      <div className="p-5">
        <PurchaseForm
        //   suppliers={suppliers}
          products={products}
          onSubmit={handleSubmit}
        />
      </div>
    </MainLayout>
  );
}

export default AddPurchase;
