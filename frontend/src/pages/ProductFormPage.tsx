import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  unitPrice: "",
  currentStock: "0",
  minStockAlert: "0",
  location: "",
};

export function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`).then((res) => {
        const p = res.data;
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category || "",
          unitPrice: String(p.unitPrice),
          currentStock: String(p.currentStock),
          minStockAlert: String(p.minStockAlert),
          location: p.location || "",
        });
      });
    }
  }, [id, isEdit]);

  function update<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        category: form.category || undefined,
        unitPrice: Number(form.unitPrice),
        location: form.location || undefined,
        ...(isEdit ? {} : { currentStock: Number(form.currentStock), minStockAlert: Number(form.minStockAlert) }),
      };
      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        navigate(`/products/${id}`);
      } else {
        const res = await api.post("/products", payload);
        navigate(`/products/${res.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>{isEdit ? "Edit Product" : "Add Product"}</h2>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <label>Name *</label>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label>SKU *</label>
            <input required value={form.sku} onChange={(e) => update("sku", e.target.value)} disabled={isEdit} />
          </div>
          <div>
            <label>Category</label>
            <input value={form.category} onChange={(e) => update("category", e.target.value)} />
          </div>
          <div>
            <label>Unit Price *</label>
            <input required type="number" step="0.01" min="0" value={form.unitPrice} onChange={(e) => update("unitPrice", e.target.value)} />
          </div>
          {!isEdit && (
            <>
              <div>
                <label>Opening Stock</label>
                <input type="number" min="0" value={form.currentStock} onChange={(e) => update("currentStock", e.target.value)} />
              </div>
              <div>
                <label>Minimum Stock Alert Qty</label>
                <input type="number" min="0" value={form.minStockAlert} onChange={(e) => update("minStockAlert", e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label>Location / Warehouse</label>
            <input value={form.location} onChange={(e) => update("location", e.target.value)} />
          </div>
        </div>

        {isEdit && (
          <p className="muted small">
            Stock quantity can't be edited here — use "Adjust Stock" on the product page so every change is logged.
          </p>
        )}

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
