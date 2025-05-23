import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

const AccountsPage: React.FC = () => {
  const { 
    accounts, 
    accountsHydra,
    fetchAccounts, 
    createAccount, 
    deleteAccount, 
    domains,
    fetchDomains,
    loading,
    error,
    client,
    initializeClient,
    apiKey
  } = useAppStore()
  const navigate = useNavigate()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAccountUsername, setNewAccountUsername] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [newAccountPassword, setNewAccountPassword] = useState('')
  const [newAccountActive, setNewAccountActive] = useState(true)
  const [modalError, setModalError] = useState('')
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  
  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Lấy tổng số trang từ accountsHydra (nếu backend trả về page size, có thể dùng, nếu không thì bỏ)
  const totalPages = accountsHydra && accountsHydra.view && accountsHydra.view.last
    ? Number(accountsHydra.view.last.split('page=')[1])
    : 1;

  // Gọi fetchAccounts khi search hoặc đổi trang
  useEffect(() => {
    fetchAccounts(currentPage, searchTerm || undefined)
  }, [currentPage, searchTerm])

  // Reset về trang 1 khi searchTerm thay đổi
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  useEffect(() => {
    // Initialize data on component mount
    const initializeData = async () => {
      setPageLoading(true);
      setPageError(null);
      
      try {
        // Try to initialize client if it doesn't exist but API key is present
        if (!client && apiKey) {
          console.log('Client not initialized but API key exists, initializing client...');
          const newClient = initializeClient();
          
          if (!newClient) {
            setPageError('Failed to initialize API client. Please try logging in again.');
            setPageLoading(false);
            return;
          }
        }
        
        // Fetch data
        await fetchDomains();
      } catch (error) {
        console.error('Error initializing data:', error);
        setPageError('Failed to load accounts data. Please try refreshing the page.');
      } finally {
        setPageLoading(false);
      }
    };
    
    initializeData();
  }, [apiKey, client, fetchDomains, initializeClient]);

  const handleViewAccount = (account: any) => {
    navigate(`/accounts/${account.id}`)
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')

    if (!newAccountUsername.trim()) {
      setModalError('Username is required')
      return
    }

    if (!selectedDomain) {
      setModalError('You must select a domain')
      return
    }

    if (newAccountPassword.length < 8) {
      setModalError('Password must be at least 8 characters')
      return
    }

    try {
      const address = `${newAccountUsername}@${selectedDomain}`
      await createAccount(address, newAccountPassword, newAccountActive)
      setIsAddModalOpen(false)
      setNewAccountUsername('')
      setSelectedDomain('')
      setNewAccountPassword('')
      setNewAccountActive(true)
    } catch (error: any) {
      setModalError(error.message || 'Failed to create account')
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      await deleteAccount(id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Email Accounts</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (!client) {
              setPageError('API client not initialized. Please refresh the page or log in again.')
              return
            }
            setIsAddModalOpen(true)
          }}
        >
          Add Account
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            className="form-control pl-10 w-full"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md mb-4">
          {pageError}
        </div>
      )}

      {error && !pageError && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {(loading || pageLoading) ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No accounts found matching your search.' : 'No email accounts found. Create one to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Used/Quota
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created At
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {account.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {account.used ? `${(account.used / (1024 * 1024)).toFixed(2)}` : '0'} MB / 1 GB
                      {account.used && account.used >= 1024 * 1024 * 1024 && (
                        <span className="ml-2 text-red-500 dark:text-red-400">
                          (Full)
                        </span>
                      )}
                      {account.used && account.used >= 1024 * 1024 * 900 && account.used < 1024 * 1024 * 1024 && (
                        <span className="ml-2 text-yellow-500 dark:text-yellow-400">
                          (Near limit)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(account.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewAccount(account)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === index + 1
                      ? 'bg-blue-500 text-white dark:bg-blue-600'
                      : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Add New Email Account</h2>
            
            {modalError && (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4">
                {modalError}
              </div>
            )}
            
            <form onSubmit={handleAddAccount}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Username
                </label>
                <div className="flex">
                  <input
                    type="text"
                    className="form-control rounded-r-none"
                    placeholder="username"
                    value={newAccountUsername}
                    onChange={(e) => setNewAccountUsername(e.target.value)}
                  />
                  <div className="flex items-center px-3 bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-md">
                    <span className="text-gray-500 dark:text-gray-400">@</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Domain
                </label>
                <select
                  className="form-control"
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                >
                  <option value="">Select a domain</option>
                  {domains && domains.map((domain) => (
                    <option key={domain.id} value={domain.domain}>
                      {domain.domain}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Password (min 8 characters)"
                  value={newAccountPassword}
                  onChange={(e) => setNewAccountPassword(e.target.value)}
                />
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                    checked={newAccountActive}
                    onChange={(e) => setNewAccountActive(e.target.checked)}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-secondary mr-2"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountsPage 