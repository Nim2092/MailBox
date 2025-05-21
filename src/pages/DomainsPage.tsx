import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import SimpleToast from '../components/ui/SimpleToast'

const DomainsPage: React.FC = () => {
  const { domains, fetchDomains, loading, error, client } = useAppStore()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newDomainActive, setNewDomainActive] = useState(true)
  const [modalError, setModalError] = useState('')
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })

  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setToast({ message: `${type} đã được sao chép vào clipboard!`, visible: true })
      })
      .catch(err => {
        console.error('Failed to copy:', err)
        setToast({ message: 'Không thể sao chép vào clipboard', visible: true })
      })
  }

  // Filter domains based on search term
  const filteredDomains = domains.filter(domain =>
    domain.domain.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate pagination
  const totalPages = Math.ceil(filteredDomains.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentDomains = filteredDomains.slice(indexOfFirstItem, indexOfLastItem)

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    if (client) {
      fetchDomains()
    }
  }, [fetchDomains, client])

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')

    if (!newDomain.trim()) {
      setModalError('Domain name is required')
      return
    }

    // Simple domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (!domainRegex.test(newDomain)) {
      setModalError('Please enter a valid domain name')
      return
    }

    try {
      if (!client) throw new Error('API client not initialized')

      await client.createDomain(newDomain, newDomainActive)
      await fetchDomains()
      setIsAddModalOpen(false)
      setNewDomain('')
      setNewDomainActive(true)
    } catch (error: any) {
      setModalError(error.message || 'Failed to create domain')
    }
  }

  const handleDeleteDomain = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this domain? All associated email accounts will be affected.')) {
      try {
        if (!client) throw new Error('API client not initialized')

        await client.deleteDomain(id)
        await fetchDomains()
      } catch (error) {
        console.error('Failed to delete domain:', error)
      }
    }
  }

  const handleToggleDomainStatus = async (id: string, currentStatus: boolean) => {
    try {
      if (!client) throw new Error('API client not initialized')

      await client.updateDomain(id, !currentStatus)
      await fetchDomains()
    } catch (error) {
      console.error('Failed to update domain status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div>
      {toast.visible && (
        <SimpleToast 
          message={toast.message} 
          onClose={() => setToast({ ...toast, visible: false })} 
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Email Domains</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setIsAddModalOpen(true)}
        >
          Add Domain
        </button>
      </div>

      {/* DNS Configuration Guide */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold dark:text-white mb-3">Hướng dẫn cấu hình DNS cho Domain</h2>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Sau khi thêm domain vào hệ thống, bạn cần trỏ domain đến mail server của chúng tôi bằng cách thêm bản ghi DNS sau:
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border dark:border-gray-700 rounded-lg">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-4 py-2 border-b dark:border-gray-600 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Type</th>
                  <th className="px-4 py-2 border-b dark:border-gray-600 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Name</th>
                  <th className="px-4 py-2 border-b dark:border-gray-600 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Value</th>
                  <th className="px-4 py-2 border-b dark:border-gray-600 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">TTL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 border-b dark:border-gray-600 text-sm text-gray-800 dark:text-gray-300">MX</td>
                  <td className="px-4 py-2 border-b dark:border-gray-600 text-sm text-gray-800 dark:text-gray-300">@</td>
                  <td className="px-4 py-2 border-b dark:border-gray-600 text-sm text-gray-800 dark:text-gray-300 flex items-center">
                    mx.smtp.dev
                    <button
                      onClick={() => copyToClipboard('mx.smtp.dev', 'MX Record')}
                      className="ml-2 p-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                      title="Copy MX Record"
                    >
                      Copy
                    </button>
                  </td>
                  <td className="px-4 py-2 border-b dark:border-gray-600 text-sm text-gray-800 dark:text-gray-300">3600</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <h3 className="text-md font-semibold dark:text-white mb-2">Các bước thực hiện:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>Đăng nhập vào trang quản lý DNS của nhà cung cấp domain của bạn</li>
              <li>Tìm đến phần cài đặt DNS hoặc quản lý domain</li>
              <li>Tạo bản ghi MX mới với các giá trị chính xác như bảng trên</li>
              <li>Lưu thay đổi và đợi khoảng 5-10 phút để DNS được cập nhật</li>
            </ol>
          </div>

          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Lưu ý:</span> Thời gian để DNS được cập nhật có thể từ vài phút đến 48 giờ tùy thuộc vào nhà cung cấp domain của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            className="form-control pl-10 w-full"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading domains...</p>
        </div>
      ) : currentDomains.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'No domains found matching your search.' : 'No domains found. Add one to get started.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Domain Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
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
                {currentDomains.map((domain) => (
                  <tr key={domain.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {domain.domain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                          domain.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {domain.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button 
                          onClick={() => handleToggleDomainStatus(domain.id, domain.isActive)}
                          className="text-xs text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {domain.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(domain.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteDomain(domain.id)}
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

      {/* Add Domain Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Add New Domain</h2>
            
            {modalError && (
              <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-md mb-4">
                {modalError}
              </div>
            )}
            
            <form onSubmit={handleAddDomain}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter a valid domain name (e.g., example.com)
                </p>
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600 dark:text-blue-400"
                    checked={newDomainActive}
                    onChange={(e) => setNewDomainActive(e.target.checked)}
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
                  {loading ? 'Creating...' : 'Create Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default DomainsPage 