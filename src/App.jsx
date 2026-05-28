import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";
import AccountSettings from "./pages/AccountSettings";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/p/:id" element={<PublicProfile />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/account" 
          element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          } 
        />
        {/* Aquí agregaremos más rutas en el futuro */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

