import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LenderLayout } from './components/LenderLayout';
import { ProductList } from './pages/ProductList';
import { EditProduct } from './pages/EditProduct';
import { AddProduct } from './pages/AddProduct';
import { Reports } from './pages/Reports';
import { LenderLogin } from './pages/LenderLogin';
import { LenderAuthProvider } from './auth/LenderAuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function LenderPortalApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <LenderAuthProvider>
        <BrowserRouter basename="/lender-portal">
          <div className="lender-portal">
            <Routes>
              <Route path="/login" element={<LenderLogin />} />
              <Route path="/" element={<ProtectedRoute><LenderLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="products" replace />} />
                <Route path="products" element={<ProductList />} />
                <Route path="products/new" element={<AddProduct />} />
                <Route path="products/:productId" element={<EditProduct />} />
                <Route path="reports" element={<Reports />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </LenderAuthProvider>
    </QueryClientProvider>
  );
}