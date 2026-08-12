import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { PaginatedResponse, Product } from "../types";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";

export function ProductsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState(searchParams.get("lowStock") === "true");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResponse<Product> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (search) params.set("search", search);
    if (lowStock) params.set("lowStock", "true");
    api.get(`/products?${params.toString()}`).then((res) => setResult(res.data));
  }, [search, lowStock, page]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Products & Inventory</h2>
        {canEdit && (
          <Link to="/products/new" className="btn-primary">
            + Add Product
          </Link>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search name, SKU, category..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => {
              setPage(1);
              setLowStock(e.target.checked);
              setSearchParams(e.target.checked ? { lowStock: "true" } : {});
            }}
          />
          Low stock only
        </label>
      </div>

      {result && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/products/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.sku}</td>
                  <td>{p.category || "-"}</td>
                  <td>₹{p.unitPrice}</td>
                  <td>
                    <span className={p.currentStock <= p.minStockAlert ? "stock-low" : ""}>
                      {p.currentStock}
                    </span>
                    {p.currentStock <= p.minStockAlert && <span className="badge badge-warn"> Low</span>}
                  </td>
                  <td>{p.location || "-"}</td>
                </tr>
              ))}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination page={result.meta.page} totalPages={result.meta.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
