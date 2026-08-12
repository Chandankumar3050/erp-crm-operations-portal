import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { Challan } from "../types";
import { useAuth } from "../context/AuthContext";

export function ChallanDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState("");
  const [insufficientDetails, setInsufficientDetails] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get(`/challans/${id}`);
    setChallan(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canConfirm = user?.role === "ADMIN" || user?.role === "SALES" || user?.role === "WAREHOUSE";
  const canCancel = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  async function handleConfirm() {
    setError("");
    setInsufficientDetails([]);
    setBusy(true);
    try {
      await api.post(`/challans/${id}/confirm`);
      load();
    } catch (err: any) {
      setError(apiErrorMessage(err));
      if (err?.response?.data?.details?.insufficient) setInsufficientDetails(err.response.data.details.insufficient);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this challan? If confirmed, stock will be restored.")) return;
    setError("");
    setBusy(true);
    try {
      await api.post(`/challans/${id}/cancel`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!challan) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{challan.challanNumber}</h2>
        <span className={`badge badge-${challan.status.toLowerCase()}`}>{challan.status}</span>
      </div>

      <div className="detail-grid">
        <div>
          <strong>Customer:</strong> <Link to={`/customers/${challan.customerId}`}>{challan.customer?.name}</Link>
        </div>
        <div><strong>Total Quantity:</strong> {challan.totalQuantity}</div>
        <div><strong>Created:</strong> {new Date(challan.createdAt).toLocaleString()}</div>
      </div>

      <h3>Line Items</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Unit Price (at sale)</th>
            <th>Qty</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {challan.items?.map((it) => (
            <tr key={it.id}>
              <td>{it.productNameSnapshot}</td>
              <td>{it.productSkuSnapshot}</td>
              <td>₹{it.unitPriceSnapshot}</td>
              <td>{it.quantity}</td>
              <td>₹{(Number(it.unitPriceSnapshot) * it.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <div className="error">{error}</div>}
      {insufficientDetails.length > 0 && (
        <ul className="error">
          {insufficientDetails.map((d) => (
            <li key={d.productId}>
              {d.name}: available {d.available}, requested {d.requested}
            </li>
          ))}
        </ul>
      )}

      <div className="form-actions">
        {challan.status === "DRAFT" && canConfirm && (
          <button className="btn-primary" disabled={busy} onClick={handleConfirm}>
            Confirm Challan (reduces stock)
          </button>
        )}
        {challan.status !== "CANCELLED" && canCancel && (
          <button className="btn-danger" disabled={busy} onClick={handleCancel}>
            Cancel Challan
          </button>
        )}
      </div>
    </div>
  );
}
