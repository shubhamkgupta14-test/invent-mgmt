import Loader from "./Loader";

function ProductTable({ products }) {
  // if (loading) {
  //   return <Loader />;
  // }

  if (!products?.length) {
    return (
      <div className="bg-white rounded-xl shadow p-5">
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">SKU</th>

            <th className="text-left p-3">Name</th>

            <th className="text-left p-3">Category</th>

            <th className="text-left p-3">GST</th>

            <th className="text-left p-3">Supplier</th>

            <th className="text-left p-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.sku} className="border-b">
              <td className="p-3">{product.sku}</td>

              <td className="p-3">{product.name}</td>

              <td className="p-3">{product.category}</td>

              <td className="p-3">{product.tax_rate}%</td>

              <td className="p-3">{product.supplier_id}</td>

              <td className="p-3">
                <button
                  className="
                      bg-blue-500
                      text-white
                      px-3
                      py-1
                      rounded
                    "
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductTable;
