import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { CustomerStatus, CustomerType } from "../types";

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL" as CustomerType,
  address: "",
  status: "LEAD" as CustomerStatus,
  followUpDate: "",
  notes: "",
};

export function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`).then((res) => {
        const c = res.data;
        setForm({
          name: c.name || "",
          mobile: c.mobile || "",
          email: c.email || "",
          businessName: c.businessName || "",
          gstNumber: c.gstNumber || "",
          customerType: c.customerType,
          address: c.address || "",
          status: c.status,
          followUpDate: c.followUpDate ? c.followUpDate.slice(0, 10) : "",
          notes: c.notes || "",
        });
      });
    }
  }, [id, isEdit]);

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, followUpDate: form.followUpDate || undefined };
      if (isEdit) {
        await api.put(`/customers/${id}`, payload);
        navigate(`/customers/${id}`);
      } else {
        const res = await api.post("/customers", payload);
        navigate(`/customers/${res.data.id}`);
      }
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>{isEdit ? "Edit Customer" : "Add Customer"}</h2>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <label>Name *</label>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <label>Mobile *</label>
            <input required value={form.mobile} onChange={(e) => update("mobile", e.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label>Business Name</label>
            <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
          </div>
          <div>
            <label>GST Number</label>
            <input value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} />
          </div>
          <div>
            <label>Customer Type *</label>
            <select value={form.customerType} onChange={(e) => update("customerType", e.target.value as CustomerType)}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value as CustomerStatus)}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label>Follow-up Date</label>
            <input type="date" value={form.followUpDate} onChange={(e) => update("followUpDate", e.target.value)} />
          </div>
          <div className="span-2">
            <label>Address</label>
            <input value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="span-2">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : "Save Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
