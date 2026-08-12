import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { MovementType, Product, StockMovement } from "../types";
import { useAuth } from "../context/AuthContext";

export function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  const [product, setProduct] = useState<Product | null>(null);
  const [log, setLog] = useState<StockMovement[]>([]);
  const [quantity, setQuantity] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("IN");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [p, l] = await Promise.all([api.get(`/products/${id}`), api.get(`/products/${id}/stock-log?limit=20`)]);
    setProduct(p.data);
    setLog(l.data.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/products/${id}/stock-movement`, {
        quantity: Number(quantity),
        movementType,
        reason,
      });
      setQuantity("");
      setReason("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!product) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{product.name}</h2>
        {canEdit && (
          <Link to={`/products/${product.id}/edit`} className="btn-primary">
            Edit
          </Link>
        )}
      </div>

      <div className="detail-grid">
        <div><strong>SKU:</strong> {product.sku}</div>
        <div><strong>Category:</strong> {product.category || "-"}</div>
        <div><strong>Unit Price:</strong> ₹{product.unitPrice}</div>
        <div>
          <strong>Current Stock:</strong>{" "}
          <span className={product.currentStock <= product.minStockAlert ? "stock-low" : ""}>
            {product.currentStock}
          </span>
        </div>
        <div><strong>Min Alert Qty:</strong> {product.minStockAlert}</div>
        <div><strong>Location:</strong> {product.location || "-"}</div>
      </div>

      {canEdit && (
        <>
          <h3>Adjust Stock</h3>
          <form className="inline-form" onSubmit={handleAdjust}>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value as MovementType)}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
            <input
              type="number"
              min="1"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <input placeholder="Reason (e.g. purchase, damage, correction)" value={reason} onChange={(e) => setReason(e.target.value)} required />
            <button type="submit" className="btn-primary">
              Record Movement
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </>
      )}

      <h3>Stock Movement Log</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Qty</th>
            <th>Reason</th>
            <th>By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {log.map((m) => (
            <tr key={m.id}>
              <td>
                <span className={`badge ${m.movementType === "IN" ? "badge-active" : "badge-inactive"}`}>{m.movementType}</span>
              </td>
              <td>{m.quantityChanged}</td>
              <td>{m.reason}</td>
              <td>{m.createdBy?.name}</td>
              <td>{new Date(m.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {log.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">No stock movements yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
