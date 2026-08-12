import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { Customer } from "../types";
import { useAuth } from "../context/AuthContext";

export function CustomerDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SALES";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await api.get(`/customers/${id}`);
    setCustomer(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!note.trim()) return;
    try {
      await api.post(`/customers/${id}/notes`, { note });
      setNote("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!customer) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{customer.name}</h2>
        {canEdit && (
          <Link to={`/customers/${customer.id}/edit`} className="btn-primary">
            Edit
          </Link>
        )}
      </div>

      <div className="detail-grid">
        <div>
          <strong>Business:</strong> {customer.businessName || "-"}
        </div>
        <div>
          <strong>Mobile:</strong> {customer.mobile}
        </div>
        <div>
          <strong>Email:</strong> {customer.email || "-"}
        </div>
        <div>
          <strong>GST:</strong> {customer.gstNumber || "-"}
        </div>
        <div>
          <strong>Type:</strong> {customer.customerType}
        </div>
        <div>
          <strong>Status:</strong> <span className={`badge badge-${customer.status.toLowerCase()}`}>{customer.status}</span>
        </div>
        <div>
          <strong>Follow-up:</strong>{" "}
          {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString() : "-"}
        </div>
        <div className="span-2">
          <strong>Address:</strong> {customer.address || "-"}
        </div>
      </div>

      <h3>Follow-up Notes</h3>
      {canEdit && (
        <form className="inline-form" onSubmit={handleAddNote}>
          <input
            placeholder="Add a follow-up note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      )}
      {error && <div className="error">{error}</div>}
      <ul className="note-list">
        {customer.followUpNotes?.map((n) => (
          <li key={n.id}>
            <span>{n.note}</span>
            <span className="muted small">
              {n.createdBy?.name} · {new Date(n.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
        {(!customer.followUpNotes || customer.followUpNotes.length === 0) && <li className="muted">No notes yet.</li>}
      </ul>

      <h3>Recent Challans</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Challan #</th>
            <th>Status</th>
            <th>Total Qty</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {customer.challans?.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
              </td>
              <td>{c.status}</td>
              <td>{c.totalQuantity}</td>
              <td>{new Date(c.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {(!customer.challans || customer.challans.length === 0) && (
            <tr>
              <td colSpan={4} className="empty">No challans yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
