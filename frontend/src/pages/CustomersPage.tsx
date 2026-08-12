import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Customer, PaginatedResponse } from "../types";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";

export function CustomersPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResponse<Customer> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (customerType) params.set("customerType", customerType);

    api.get(`/customers?${params.toString()}`).then((res) => {
      if (active) setResult(res.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [search, status, customerType, page]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Customers</h2>
        {canEdit && (
          <Link to="/customers/new" className="btn-primary">
            + Add Customer
          </Link>
        )}
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search name, mobile, email, business..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select value={customerType} onChange={(e) => { setPage(1); setCustomerType(e.target.value); }}>
          <option value="">All types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}

      {result && (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/customers/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{c.businessName || "-"}</td>
                  <td>{c.mobile}</td>
                  <td>{c.customerType}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>{c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">No customers found.</td>
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
