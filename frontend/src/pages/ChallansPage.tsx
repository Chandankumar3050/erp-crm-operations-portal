import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Challan, PaginatedResponse } from "../types";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";

export function ChallansPage() {
  const { user } = useAuth();
  const canCreate = user?.role === "ADMIN" || user?.role === "SALES";
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResponse<Challan> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (status) params.set("status", status);
    api.get(`/challans?${params.toString()}`).then((res) => setResult(res.data));
  }, [status, page]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sales Challans</h2>
        {canCreate && (
          <Link to="/challans/new" className="btn-primary">
            + New Challan
          </Link>
        )}
      </div>

      <div className="filter-bar">
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {result && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Total Qty</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                  </td>
                  <td>{c.customer?.name}</td>
                  <td>{c.totalQuantity}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>{(c as any).createdBy?.name}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">No challans found.</td>
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
