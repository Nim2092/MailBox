import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '../store'
import SimpleToast from '../components/ui/SimpleToast'

// Hàm tạo chuỗi ngẫu nhiên
const generateRandomString = (length: number) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Hàm tạo mật khẩu ngẫu nhiên
const generateRandomPassword = () => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+[]{}|;:,.<>?'
  
  let password = ''
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
  password += numbers.charAt(Math.floor(Math.random() * numbers.length))
  password += symbols.charAt(Math.floor(Math.random() * symbols.length))
  
  // Thêm các ký tự ngẫu nhiên cho đủ độ dài
  for (let i = 0; i < 8; i++) {
    const allChars = lowercase + uppercase + numbers + symbols
    password += allChars.charAt(Math.floor(Math.random() * allChars.length))
  }
  
  // Xáo trộn chuỗi password
  return password.split('').sort(() => 0.5 - Math.random()).join('')
}

interface AccountItem {
  id: string
  address: string
  password: string
  selected: boolean
  mailboxes?: { id: string, path: string }[]
  currentMailbox?: { id: string, path: string }
}

// Interface for Message tương tự với interface Message trong store
interface MessageItem {
  id: string
  msgid: string
  from: {
    name?: string
    address: string
  }
  to: {
    name?: string
    address: string
  }[]
  subject: string
  intro?: string
  isRead: boolean
  isFlagged: boolean
  hasAttachments: boolean
  createdAt: string
}

const QuickMailPage: React.FC = () => {
  const { 
    client, 
    domains, 
    messages,
    currentMessage,
    fetchDomains, 
    createAccount, 
    fetchMailboxes,
    fetchMessages,
    fetchMessage,
    markMessageAsRead,
    loading,
    error,
    setMessages
  } = useAppStore()
  
  const [generatedAccounts, setGeneratedAccounts] = useState<AccountItem[]>([])
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null)
  const [username, setUsername] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [password, setPassword] = useState('')
  const [isManualMode, setIsManualMode] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const isRefreshingRef = useRef<boolean>(false)
  const initialLoadRef = useRef<boolean>(false)

  // Hàm riêng để thực hiện refresh messages
  const performRefresh = useCallback(async (isAutoRefresh = false) => {
    if (isRefreshingRef.current || !selectedAccount) {
      return;
    }

    try {
      isRefreshingRef.current = true;
      setIsRefreshing(true);

      // If no mailboxes yet, load them first
      if (!selectedAccount.mailboxes) {
        const mailboxes = await fetchMailboxes(selectedAccount.id);
        if (mailboxes.length > 0) {
          const inbox = mailboxes.find(m => m.path.toLowerCase() === 'inbox') || mailboxes[0];
          
          // Update account information
          setGeneratedAccounts(prev => prev.map(acc => 
            acc.id === selectedAccount.id 
              ? { ...acc, mailboxes, currentMailbox: inbox } 
              : acc
          ));
          
          setSelectedAccount(prev => {
            if (!prev) return prev;
            return { ...prev, mailboxes, currentMailbox: inbox };
          });
        }
      }

      // Now check if we have currentMailbox
      const currentMailbox = selectedAccount.currentMailbox;
      if (!currentMailbox) {
        console.warn('No mailbox available for refresh');
        return;
      }

      // Fetch messages
      let freshMessages: MessageItem[] = [];
      if (client) {
        try {
          const timestamp = Date.now();
          const freshMessagesData = await client.listMessages(
            selectedAccount.id,
            currentMailbox.id,
            1,
            true,
            timestamp
          );

          if (Array.isArray(freshMessagesData)) {
            freshMessages = freshMessagesData;
          } else if (freshMessagesData?.member && Array.isArray(freshMessagesData.member)) {
            freshMessages = freshMessagesData.member;
          }
        } catch (error) {
          console.error('Error fetching messages directly:', error);
          freshMessages = await fetchMessages(selectedAccount.id, currentMailbox.id);
        }
      } else {
        freshMessages = await fetchMessages(selectedAccount.id, currentMailbox.id);
      }

      // Update messages and check for new ones
      const currentMessageIds = new Set(messages.map(msg => msg.id));
      const newMessages = freshMessages.filter(msg => !currentMessageIds.has(msg.id));

      setMessages(freshMessages);
      setLastRefreshTime(new Date());

      if (newMessages.length > 0) {
        setNewMessageCount(prev => prev + newMessages.length);
        setToast({
          message: `Đã nhận được ${newMessages.length} tin nhắn mới!`,
          visible: true
        });
      } else if (!isAutoRefresh && initialLoadRef.current) {
        setToast({
          message: 'Đã cập nhật thư thành công! Không có tin nhắn mới.',
          visible: true
        });
      }

      if (!initialLoadRef.current) {
        initialLoadRef.current = true;
      }
    } catch (error) {
      console.error('Error during refresh:', error);
      setToast({
        message: 'Không thể cập nhật thư. Vui lòng thử lại sau.',
        visible: true
      });
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [selectedAccount, messages, client, fetchMailboxes, fetchMessages, setMessages]);

  // Hàm xử lý click refresh button
  const handleManualRefresh = useCallback(async () => {
    // Chỉ kiểm tra nếu đang refresh
    if (isRefreshingRef.current) {
      setToast({
        message: "Đang làm mới, vui lòng đợi...",
        visible: true
      });
      return;
    }
    await performRefresh(false);
  }, [performRefresh]);

  useEffect(() => {
    const loadDomains = async () => {
      try {
        await fetchDomains()
      } catch (error) {
        console.error('Error loading domains:', error)
        setPageError('Failed to load domains')
      }
    }
    
    loadDomains()
  }, [fetchDomains])

  useEffect(() => {
    // Khi đã có domains, tự động chọn domain đầu tiên
    if (domains && domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].domain)
    }
  }, [domains, selectedDomain])

  useEffect(() => {
    // Tạo username và password ngẫu nhiên chỉ khi ở chế độ tự động
    if (!isManualMode) {
      if (!username) {
        setUsername(generateRandomString(8))
      }
      
      if (!password) {
        setPassword(generateRandomPassword())
      }
    }
  }, [username, password, isManualMode])

  // Tìm mailbox và tải messages khi chọn tài khoản
  useEffect(() => {
    if (selectedAccount) {
      const loadMailboxes = async () => {
        try {
          const mailboxes = await fetchMailboxes(selectedAccount.id)
          
          if (mailboxes.length > 0) {
            const inbox = mailboxes.find(m => m.path.toLowerCase() === 'inbox') || mailboxes[0]
            
            // Cập nhật danh sách tài khoản đã tạo
            setGeneratedAccounts(prev => prev.map(acc => 
              acc.id === selectedAccount.id 
                ? { 
                    ...acc, 
                    mailboxes: mailboxes,
                    currentMailbox: inbox
                  } 
                : acc
            ))
            
            // Tải tin nhắn cho mailbox
            await fetchMessages(selectedAccount.id, inbox.id)
            
            // Đặt lại trạng thái ban đầu
            setLastRefreshTime(new Date());
            setNewMessageCount(0);
            initialLoadRef.current = true;
          }
        } catch (error) {
          console.error('Error loading mailboxes:', error)
        }
      }
      
      if (!selectedAccount.mailboxes) {
        loadMailboxes()
      }
    }
  }, [selectedAccount, fetchMailboxes, fetchMessages])

  const handleCreateAccount = async () => {
    if (!client) {
      setPageError('API client not initialized')
      return
    }
    
    if (!selectedDomain) {
      setPageError('Please select a domain')
      return
    }
    
    if (!username.trim()) {
      setPageError('Username is required')
      return
    }
    
    if (password.length < 8) {
      setPageError('Password must be at least 8 characters')
      return
    }
    
    try {
      setIsCreating(true)
      setPageError(null)
      
      const address = `${username}@${selectedDomain}`
      const newAccount = await createAccount(address, password, true)
      
      // Thêm vào danh sách tài khoản tạm thời (cả thông tin password)
      const accountItem: AccountItem = {
        id: newAccount.id,
        address: newAccount.address,
        password: password,
        selected: true
      }
      
      // Cập nhật danh sách và chọn tài khoản mới tạo
      setGeneratedAccounts(prev => [
        ...prev.map(a => ({ ...a, selected: false })),
        accountItem
      ])
      setSelectedAccount(accountItem)
      
      // Reset form
      setUsername(generateRandomString(8))
      setPassword(generateRandomPassword())
    } catch (error) {
      console.error('Error creating account:', error)
      setPageError('Failed to create account')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectAccount = (account: AccountItem) => {
    setSelectedAccount(account)
    
    // Cập nhật trạng thái selected
    setGeneratedAccounts(prev => 
      prev.map(acc => ({
        ...acc,
        selected: acc.id === account.id
      }))
    )
  }

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

  const handleSelectMailbox = async (account: AccountItem, mailboxId: string) => {
    if (!account.mailboxes) return
    
    const mailbox = account.mailboxes.find(m => m.id === mailboxId)
    if (!mailbox) return
    
    // Cập nhật mailbox hiện tại
    setGeneratedAccounts(prev => prev.map(acc => 
      acc.id === account.id 
        ? { ...acc, currentMailbox: mailbox } 
        : acc
    ))
    
    // Cập nhật tài khoản đang chọn
    if (selectedAccount && selectedAccount.id === account.id) {
      setSelectedAccount({
        ...selectedAccount,
        currentMailbox: mailbox
      })
    }
    
    // Tải messages mới
    await fetchMessages(account.id, mailboxId)
  }

  const handleViewMessage = async (messageId: string) => {
    if (!selectedAccount || !selectedAccount.currentMailbox) return
    
    try {
      await fetchMessage(
        selectedAccount.id, 
        selectedAccount.currentMailbox.id, 
        messageId
      )
      
      // Đánh dấu đã đọc
      await markMessageAsRead(
        selectedAccount.id, 
        selectedAccount.currentMailbox.id, 
        messageId
      )
      
      // Reset số tin nhắn mới khi người dùng đã xem
      setNewMessageCount(0);
    } catch (error) {
      console.error('Failed to load message:', error)
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
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">MailBox</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Tạo nhanh tài khoản email tạm thời và kiểm tra tin nhắn đến
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Khung tạo tài khoản mới */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold dark:text-white mb-4">Tạo tài khoản</h2>
          
          <div className="space-y-4">
            <div className="flex justify-end mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {isManualMode ? 'Nhập tay' : 'Tự động'}
                </span>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isManualMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  onClick={() => {
                    setIsManualMode(!isManualMode);
                    if (!isManualMode) {
                      // Khi chuyển sang chế độ nhập tay, xóa giá trị hiện tại
                      setUsername('');
                      setPassword('');
                    } else {
                      // Khi chuyển sang chế độ tự động, tạo giá trị mới
                      setUsername(generateRandomString(8));
                      setPassword(generateRandomPassword());
                    }
                  }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isManualMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <div className="flex">
                <input
                  type="text"
                  className="form-control rounded-r-none flex-1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isManualMode ? "Nhập tên tài khoản" : ""}
                />
                {!isManualMode && (
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r-md"
                    onClick={() => setUsername(generateRandomString(8))}
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Domain
              </label>
              <select
                className="form-control"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
              >
                {domains.length === 0 ? (
                  <option value="">Loading domains...</option>
                ) : (
                  domains.map((domain) => (
                    <option key={domain.id} value={domain.domain}>
                      @{domain.domain}
                    </option>
                  ))
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="flex">
                <input
                  type="text"
                  className="form-control rounded-r-none flex-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isManualMode ? "Nhập mật khẩu" : ""}
                />
                {!isManualMode && (
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r-md"
                    onClick={() => setPassword(generateRandomPassword())}
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>
            
            <button
              className="btn btn-primary w-full mt-4"
              onClick={handleCreateAccount}
              disabled={isCreating || loading}
            >
              {isCreating || loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
          
          {/* Danh sách tài khoản đã tạo */}
          <div className="mt-6">
            <h3 className="text-md font-semibold dark:text-white mb-2">Tài khoản của bạn</h3>
            
            {generatedAccounts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                Chưa có tài khoản nào được tạo
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {generatedAccounts.map((account) => (
                  <div 
                    key={account.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors
                      ${account.selected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div 
                        className="font-medium dark:text-white flex-1 truncate mr-2 cursor-pointer"
                        onClick={() => handleSelectAccount(account)}
                      >
                        {account.address}
                      </div>
                      <button
                        className="p-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(account.address, 'Email');
                        }}
                        title="Sao chép địa chỉ email"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <div className="flex-1 truncate mr-2">
                        Password: {account.password}
                      </div>
                      <button
                        className="p-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(account.password, 'Password');
                        }}
                        title="Sao chép mật khẩu"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Khung hiển thị mailbox và tin nhắn */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow">
          {!selectedAccount ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Tạo tài khoản hoặc chọn một tài khoản để xem tin nhắn
              </p>
            </div>
          ) : (
            <div className="h-full">
              {/* Thanh công cụ và thông tin tài khoản */}
              <div className="border-b dark:border-gray-700 p-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold dark:text-white">
                    {selectedAccount.address}
                  </h3>
                  <div className="flex space-x-2 items-center">
                    {lastRefreshTime && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                        Cập nhật lúc: {lastRefreshTime.toLocaleTimeString()}
                      </span>
                    )}
                    <button
                      className={`px-3 py-1 text-sm ${
                        isRefreshing 
                          ? 'bg-blue-400 text-white dark:bg-blue-700 dark:text-blue-100' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                      } rounded-md flex items-center shadow-sm`}
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      title="Cập nhật tin nhắn từ server"
                    >
                      {isRefreshing ? (
                        <>
                          <div className="inline-block animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white dark:border-blue-200 mr-1"></div>
                          <span>Đang tải...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"></path>
                          </svg>
                          <span>Làm mới</span>
                        </>
                      )}
                      {newMessageCount > 0 && !isRefreshing && (
                        <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {newMessageCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Tab mailboxes */}
                {selectedAccount.mailboxes && selectedAccount.mailboxes.length > 0 && (
                  <div className="flex space-x-2 mt-4 border-b dark:border-gray-700 pb-2">
                    {selectedAccount.mailboxes.map((mailbox) => (
                      <button
                        key={mailbox.id}
                        className={`px-3 py-1 text-sm rounded-md ${
                          selectedAccount.currentMailbox?.id === mailbox.id
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleSelectMailbox(selectedAccount, mailbox.id)}
                      >
                        {mailbox.path}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Khung messages và message detail */}
              <div className="grid grid-cols-5 h-[calc(100vh-300px)]">
                {/* Danh sách tin nhắn */}
                <div className="col-span-2 border-r dark:border-gray-700 overflow-y-auto">
                  {loading ? (
                    <div className="text-center p-4">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="text-gray-500 dark:text-gray-400">No messages found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                            currentMessage && currentMessage.id === message.id
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : ''
                          } ${!message.isRead ? 'font-semibold' : ''}`}
                          onClick={() => handleViewMessage(message.id)}
                        >
                          <div className="flex justify-between">
                            <span className="text-sm dark:text-gray-200 truncate max-w-[150px]">
                              {message.from.name || message.from.address}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm font-medium mt-1 truncate dark:text-gray-300">
                            {message.subject || '(No subject)'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {message.intro || '(No preview available)'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Chi tiết tin nhắn */}
                <div className="col-span-3 overflow-y-auto p-4">
                  {!currentMessage ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">Chọn một tin nhắn để xem nội dung</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold mb-2 dark:text-white">
                          {currentMessage.subject || '(No subject)'}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          <span className="font-medium">From:</span>{' '}
                          <span className="inline-flex items-center">
                            {currentMessage.from.name ? (
                              <>
                                {currentMessage.from.name} &lt;{currentMessage.from.address}&gt;
                              </>
                            ) : (
                              currentMessage.from.address
                            )}
                            <button
                              className="ml-2 p-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                              onClick={() => copyToClipboard(currentMessage.from.address, 'Email')}
                              title="Copy email address"
                            >
                              Copy
                            </button>
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          <span className="font-medium">To:</span>{' '}
                          {currentMessage.to.map((recipient: any, index: number) => (
                            <span key={index} className="inline-flex items-center">
                              {recipient.name ? (
                                <>
                                  {recipient.name} &lt;{recipient.address}&gt;
                                </>
                              ) : (
                                recipient.address
                              )}
                              <button
                                className="ml-1 p-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                                onClick={() => copyToClipboard(recipient.address, 'Email')}
                                title="Copy email address"
                              >
                                Copy
                              </button>
                              {index < currentMessage.to.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                          <span className="font-medium">Date:</span>{' '}
                          {formatDate(currentMessage.createdAt)}
                        </div>
                      </div>
                      
                      {/* Nội dung email */}
                      <div className="mt-4 p-4 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium dark:text-gray-300">Nội dung</h4>
                          <button
                            className="p-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded"
                            onClick={() => {
                              const content = currentMessage.html 
                                ? (Array.isArray(currentMessage.html) ? currentMessage.html[0] : currentMessage.html)
                                : currentMessage.text || currentMessage.intro || '';
                              
                              // Nếu là HTML, chỉ lấy nội dung text
                              const tempDiv = document.createElement('div');
                              tempDiv.innerHTML = content;
                              const textContent = tempDiv.textContent || tempDiv.innerText || content;
                              
                              copyToClipboard(textContent, 'Nội dung');
                            }}
                            title="Copy message content"
                          >
                            Copy nội dung
                          </button>
                        </div>
                        {currentMessage.html ? (
                          <div
                            className="dark:text-gray-200"
                            dangerouslySetInnerHTML={{
                              __html: Array.isArray(currentMessage.html)
                                ? currentMessage.html[0]
                                : currentMessage.html
                            }}
                          />
                        ) : currentMessage.text ? (
                          <pre className="whitespace-pre-wrap font-sans text-sm dark:text-gray-200">
                            {currentMessage.text}
                          </pre>
                        ) : currentMessage.intro ? (
                          <div className="text-gray-800 dark:text-gray-200">
                            {currentMessage.intro}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400 italic">
                            (No content available)
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuickMailPage 