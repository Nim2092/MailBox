import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import { Moon, Sun } from 'lucide-react'

const LoginPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    // Check if user has a preference in localStorage
    const savedPreference = localStorage.getItem('darkMode')
    // Check if user prefers dark mode at the OS level
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    return savedPreference ? savedPreference === 'true' : prefersDark
  })
  
  const { 
    setApiKey: storeSetApiKey, 
    apiKey: storedApiKey,
    client,
    initializeClient,
    fetchAccounts,
    fetchDomains
  } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Apply dark mode class to document
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  useEffect(() => {
    // If user is already logged in (has API key and client is initialized)
    if (storedApiKey) {
      // Make sure client is initialized
      if (!client) {
        console.log('Client not initialized but API key exists, initializing...');
        initializeClient();
      }
      
      // Navigate to accounts page
      navigate('/accounts');
      return;
    }
    
    // If there's no stored API key, check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('key');
    
    if (keyFromUrl && keyFromUrl.startsWith('smtplabs_')) {
      console.log('API key found in URL, initializing...');
      setApiKey(keyFromUrl);
      // Attempt auto-login
      loginWithKey(keyFromUrl);
    }
  }, [storedApiKey, client, navigate, initializeClient])

  // Hàm xử lý đăng nhập với key 
  const loginWithKey = async (key: string) => {
    try {
      setLoading(true);
      console.log('Logging in with API key...');
      
      // Initialize
      const client = storeSetApiKey(key);
      
      if (!client) {
        throw new Error('Failed to initialize API client');
      }
      
      // Test connection
      await client.testConnection();
      
      // Load data
      await Promise.all([fetchAccounts(), fetchDomains()]);
      navigate('/accounts');
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Failed to initialize with the provided API key. Please check if the API key is correct.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!apiKey.trim() || !apiKey.startsWith('smtplabs_')) {
      setError('Please enter a valid SMTP.dev API key (starts with smtplabs_)')
      return
    }

    try {
      setLoading(true);
      console.log('Logging in with API key from form...');
      
      // Initialize client with API key
      const client = storeSetApiKey(apiKey);
      
      if (!client) {
        throw new Error('Failed to initialize API client');
      }
      
      // Test connection
      console.log('Testing API connection...');
      await client.testConnection();
      console.log('API connection test successful!');
      
      // Initialize app with fetched data
      await Promise.all([fetchAccounts(), fetchDomains()]);
      navigate('/accounts');
    } catch (error: any) {
      console.error('Login error:', error)
      setError('Failed to initialize with the provided API key. Please check if your API key is correct.')
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleDarkMode}
          className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Email Testing Mailbox
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Enter your SMTP.dev API key to access your test mailboxes
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="apiKey" className="sr-only">
                API Key
              </label>
              <input
                id="apiKey"
                name="apiKey"
                type="password"
                autoComplete="off"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="SMTP.dev API Key (smtplabs_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            <p>
              If you don't have an API key, create one on the{' '}
              <a
                href="https://smtp.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                SMTP.dev website
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage 