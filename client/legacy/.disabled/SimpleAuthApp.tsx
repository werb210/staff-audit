import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Simple authentication state
let isAuthenticated = false;
let currentUser: any = null;

function DevLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'staff@boreal.financial' }),
      });

      const data = await response.json();
      if (data.ok) {
        isAuthenticated = true;
        currentUser = data.user;
        if (data.token) localStorage.setItem('auth_token', data.token);
        navigate('/portal');
      } else {
        alert('Login failed: ' + data.reason);
      }
    } catch (error) {
      alert('Login error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Development Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Click below to login with development credentials
          </p>
        </div>
        <div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login as Staff'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Portal() {
  const navigate = useNavigate();

  const handleLogout = () => {
    isAuthenticated = false;
    currentUser = null;
    localStorage.removeItem('auth_token');
    navigate('/dev-login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6 md:justify-start md:space-x-10">
            <div className="flex justify-start lg:w-0 lg:flex-1">
              <h1 className="text-xl font-bold text-gray-900">Boreal Financial - Staff Portal</h1>
            </div>
            <div className="md:flex items-center justify-end md:flex-1 lg:w-0">
              <span className="mr-4 text-sm text-gray-500">
                Welcome, {currentUser?.email || 'Staff'}
              </span>
              <button
                onClick={handleLogout}
                className="ml-8 whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bundle 3 & 4 Features Implemented</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">✅ Routing & Queues</h3>
                <p className="text-gray-600">Agent management and RBAC security system</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">✅ Call Transcription</h3>
                <p className="text-gray-600">Search functionality with transcript handling</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">✅ Tasks Management</h3>
                <p className="text-gray-600">Filtering and status tracking capabilities</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">✅ Communication Reports</h3>
                <p className="text-gray-600">Comprehensive metrics dashboard</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">✅ CSV Export</h3>
                <p className="text-gray-600">Data extraction functionality</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-2">✅ System Status</h3>
                <p className="text-gray-600">Monitoring and health checks</p>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Previous Features Available:</h3>
              <p className="text-gray-600">
                Sales Pipeline • Communication Center • Contact Management • Reports & Insights • 
                Banking Analysis • OCR Processing • Document Management • Authentication & Security
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated) {
    return <Navigate to="/dev-login" replace />;
  }
  return <>{children}</>;
}

export default function SimpleAuthApp() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
            headers: { 'X-Auth-Token': token },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.user) {
              isAuthenticated = true;
              currentUser = data.user;
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/dev-login" element={<DevLogin />} />
      <Route 
        path="/portal" 
        element={
          <ProtectedRoute>
            <Portal />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/" 
        element={
          isAuthenticated ? <Navigate to="/portal" replace /> : <Navigate to="/dev-login" replace />
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}