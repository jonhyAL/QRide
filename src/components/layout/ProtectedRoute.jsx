import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function ProtectedRoute({ children, requiredRole }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4EFEA] text-secondary font-sans font-bold">Cargando...</div>;
  }

  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredRole && session.user?.user_metadata?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}