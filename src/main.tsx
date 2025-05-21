import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import AppLayout from './components/Layout/AppLayout'
import AccountsPage from './pages/AccountsPage'
import DomainsPage from './pages/DomainsPage'
import AccountDetailPage from './pages/AccountDetailPage'
import QuickMailPage from './pages/QuickMailPage'
import { useAppStore } from './store'

// Debug: Log storage content
try {
  const storedData = localStorage.getItem('smtp-dev-storage');
  console.log('Stored app data:', storedData ? JSON.parse(storedData) : 'No data found');
} catch (error) {
  console.error('Failed to parse stored data:', error);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 1000 * 60 * 60 * 24
    }
  }
})

// Auth guard component to check for API key and initialized client
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { apiKey, client, initializeClient } = useAppStore()
  
  // Try to initialize client if API key exists but client doesn't
  useEffect(() => {
    if (apiKey && !client) {
      console.log('API key exists but client is not initialized, initializing client...');
      initializeClient();
    }
  }, [apiKey, client, initializeClient]);
  
  // If no API key, redirect to login
  if (!apiKey) {
    console.log('No API key found. Redirecting to login page.');
    return <Navigate to="/login" replace />
  }
  
  // Return children even if client isn't initialized yet
  // This allows the components to handle their own loading states
  // and let the client initialization to complete
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/quickmail" replace />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="accounts/:id" element={<AccountDetailPage />} />
            <Route path="domains" element={<DomainsPage />} />
            <Route path="quickmail" element={<QuickMailPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
