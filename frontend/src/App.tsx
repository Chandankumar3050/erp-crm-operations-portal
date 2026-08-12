import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { CustomerFormPage } from "./pages/CustomerFormPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { ChallansPage } from "./pages/ChallansPage";
import { ChallanFormPage } from "./pages/ChallanFormPage";
import { ChallanDetailPage } from "./pages/ChallanDetailPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />

          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<ProtectedRoute roles={["ADMIN", "SALES"]}><CustomerFormPage /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/:id/edit" element={<ProtectedRoute roles={["ADMIN", "SALES"]}><CustomerFormPage /></ProtectedRoute>} />

          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}><ProductFormPage /></ProtectedRoute>} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<ProtectedRoute roles={["ADMIN", "WAREHOUSE"]}><ProductFormPage /></ProtectedRoute>} />

          <Route path="/challans" element={<ChallansPage />} />
          <Route path="/challans/new" element={<ProtectedRoute roles={["ADMIN", "SALES"]}><ChallanFormPage /></ProtectedRoute>} />
          <Route path="/challans/:id" element={<ChallanDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
