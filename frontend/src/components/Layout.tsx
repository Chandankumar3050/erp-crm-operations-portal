import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  customers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9" />
      <path d="M20 14c2 .6 3.5 2.5 3.5 4.8" />
    </svg>
  ),
  products: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  ),
  challans: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1 className="brand">ERP · CRM</h1>
        <nav>
          <NavLink to="/" end>
            <span className="nav-icon">{icons.dashboard}</span>Dashboard
          </NavLink>
          <NavLink to="/customers">
            <span className="nav-icon">{icons.customers}</span>Customers
          </NavLink>
          <NavLink to="/products">
            <span className="nav-icon">{icons.products}</span>Products
          </NavLink>
          <NavLink to="/challans">
            <span className="nav-icon">{icons.challans}</span>Sales Challans
          </NavLink>
        </nav>
        <div className="user-box">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role}</div>
          <button onClick={handleLogout}>
            {icons.logout}
            <span>Log out</span>
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}