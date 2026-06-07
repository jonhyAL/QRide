import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";
import AccountSettings from "./pages/AccountSettings";
import AiChat from "./pages/AiChat";
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
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <AiChat />
            </ProtectedRoute>
          } 
        />
        <Route path="/p/:id/chat" element={<AiChat isPublic={true} />} />
        <Route path="/p/:id/chat" element={<AiChat isPublic={true} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
