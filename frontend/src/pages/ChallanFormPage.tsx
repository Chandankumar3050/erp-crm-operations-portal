import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { Customer, Product } from "../types";

interface Line {
  productId: string;
  quantity: string;
}

export function ChallanFormPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1" }]);
  const [error, setError] = useState("");
  const [insufficientDetails, setInsufficientDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/customers?limit=100").then((res) => setCustomers(res.data.data));
    api.get("/products?limit=200").then((res) => setProducts(res.data.data));
  }, []);

  function updateLine(index: number, key: keyof Line, value: string) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, [key]: value } : l)));
  }

  function addLine() {
    setLines((ls) => [...ls, { productId: "", quantity: "1" }]);
  }

  function removeLine(index: number) {
    setLines((ls) => ls.filter((_, i) => i !== index));
  }

  async function submit(status: "DRAFT" | "CONFIRMED", e: FormEvent) {
    e.preventDefault();
    setError("");
    setInsufficientDetails([]);
    setLoading(true);
    try {
      const items = lines
        .filter((l) => l.productId && Number(l.quantity) > 0)
        .map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }));
      if (items.length === 0) {
        setError("Add at least one product line with a valid quantity.");
        setLoading(false);
        return;
      }
      const res = await api.post("/challans", { customerId, items, status });
      navigate(`/challans/${res.data.id}`);
    } catch (err: any) {
      setError(apiErrorMessage(err));
      if (err?.response?.data?.details?.insufficient) {
        setInsufficientDetails(err.response.data.details.insufficient);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>New Sales Challan</h2>
      <form className="form-card">
        <div className="form-grid">
          <div className="span-2">
            <label>Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.businessName ? `(${c.businessName})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h3>Products</h3>
        {lines.map((line, i) => {
          const product = products.find((p) => p.id === line.productId);
          return (
            <div className="line-item" key={i}>
              <select value={line.productId} onChange={(e) => updateLine(i, "productId", e.target.value)}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — stock: {p.currentStock}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={line.quantity}
                onChange={(e) => updateLine(i, "quantity", e.target.value)}
                style={{ width: 100 }}
              />
              {product && <span className="muted small">₹{product.unitPrice} / unit</span>}
              {lines.length > 1 && (
                <button type="button" className="btn-danger" onClick={() => removeLine(i)}>
                  Remove
                </button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={addLine} className="btn-secondary">
          + Add Product Line
        </button>

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
          <button disabled={loading} className="btn-secondary" onClick={(e) => submit("DRAFT", e)}>
            Save as Draft
          </button>
          <button disabled={loading} className="btn-primary" onClick={(e) => submit("CONFIRMED", e)}>
            Save & Confirm (reduces stock)
          </button>
        </div>
      </form>
    </div>
  );
}
