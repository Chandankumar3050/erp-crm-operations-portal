import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ customers: 0, products: 0, lowStock: 0, draftChallans: 0 });

  useEffect(() => {
    async function load() {
      const [customers, products, lowStock, drafts] = await Promise.all([
        api.get("/customers?limit=1"),
        api.get("/products?limit=1"),
        api.get("/products?lowStock=true&limit=1"),
        api.get("/challans?status=DRAFT&limit=1"),
      ]);
      setStats({
        customers: customers.data.meta.total,
        products: products.data.meta.total,
        lowStock: lowStock.data.meta.total,
        draftChallans: drafts.data.meta.total,
      });
    }
    load();
  }, []);

  return (
    <div className="page">
      <h2>Welcome, {user?.name}</h2>
      <p className="muted">Role: {user?.role}</p>

      <div className="stat-grid">
        <Link to="/customers" className="stat-card">
          <div className="stat-number">{stats.customers}</div>
          <div>Total Customers</div>
        </Link>
        <Link to="/products" className="stat-card">
          <div className="stat-number">{stats.products}</div>
          <div>Total Products</div>
        </Link>
        <Link to="/products?lowStock=true" className="stat-card warn">
          <div className="stat-number">{stats.lowStock}</div>
          <div>Low Stock Alerts</div>
        </Link>
        <Link to="/challans?status=DRAFT" className="stat-card">
          <div className="stat-number">{stats.draftChallans}</div>
          <div>Draft Challans</div>
        </Link>
      </div>
    </div>
  );
}
