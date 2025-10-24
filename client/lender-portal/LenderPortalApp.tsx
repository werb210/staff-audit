import React from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LenderLayout } from './components/LenderLayout';
import { ProductList } from './pages/ProductList';
import { EditProduct } from './pages/EditProduct';
import { AddProduct } from './pages/AddProduct';
import { Reports } from './pages/Reports';
import { LenderLogin } from './pages/LenderLogin';
import { LenderAuthProvider } from './auth/LenderAuthProvider';
import ProtectedRoute from '../src/auth/ProtectedRoute';

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

const router = createBrowserRouter(
  [
    {
      element: (
        <div className="lender-portal">
          <Outlet />
        </div>
      ),
      children: [
        {
          path: "/login",
          element: <LenderLogin />,
        },
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <LenderLayout />
            </ProtectedRoute>
          ),
          children: [
            {
              index: true,
              element: <Navigate to="products" replace />,
            },
            {
              path: "products",
              element: <ProductList />,
            },
            {
              path: "products/new",
              element: <AddProduct />,
            },
            {
              path: "products/:productId",
              element: <EditProduct />,
            },
            {
              path: "reports",
              element: <Reports />,
            },
          ],
        },
        {
          path: "*",
          element: <Navigate to="/" replace />,
        },
      ],
    },
  ],
  { basename: "/lender-portal" }
);

export function LenderPortalApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <LenderAuthProvider>
        <RouterProvider router={router} />
      </LenderAuthProvider>
    </QueryClientProvider>
  );
}