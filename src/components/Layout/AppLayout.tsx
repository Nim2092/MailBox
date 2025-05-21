import React, { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store'
import { Sun, Moon } from 'lucide-react'

const AppLayout: React.FC = () => {
  const { clearApiKey } = useAppStore()
  const navigate = useNavigate()
  const [darkMode, setDarkMode] = useState(() => {
    // Check if user has a preference in localStorage
    const savedPreference = localStorage.getItem('darkMode')
    // Check if user prefers dark mode at the OS level
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    return savedPreference ? savedPreference === 'true' : prefersDark
  })
  
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

  const handleLogout = () => {
    clearApiKey()
    navigate('/login')
  }
  
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev)
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 dark:text-white transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link to="/quickmail" className="text-xl font-bold text-blue-600 dark:text-blue-400">
              MailBox
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link to="/accounts" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                Accounts
              </Link>
              <Link to="/domains" className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                Domains
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto py-6 px-6 dark:bg-gray-900">
        <Outlet />
      </main>
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
        <div className="container mx-auto px-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} MailBox by minhdq
        </div>
      </footer>
    </div>
  )
}

export default AppLayout 