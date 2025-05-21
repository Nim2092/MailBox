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
  const [pageError, setPageError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(10)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);
  const lastClickTimeRef = useRef<number>(0); // Track the last click time
  const CLICK_COOLDOWN = 2000; // 2 seconds cooldown between clicks

  // Định nghĩa hàm refresh bằng useCallback - dời lên trước khi sử dụng
  const handleRefreshMessages = useCallback(async () => {
    if (!selectedAccount || !selectedAccount.currentMailbox) return;
    
    // Prevent multiple refreshes at the same time
    if (isRefreshingRef.current) {
      console.log("Already refreshing, ignoring duplicate handleRefreshMessages call");
      return;
    }
    
    try {
      setIsRefreshing(true);
      isRefreshingRef.current = true;
      
      // Lưu số lượng tin nhắn hiện tại và IDs để sau này so sánh
      const currentMessageIds = new Set(messages.map(msg => msg.id));
      
      // Tạo timestamp mới cho mỗi lần gọi API
      const timestamp = Date.now();
      
      console.log(`Refreshing messages for account ${selectedAccount.id}, mailbox ${selectedAccount.currentMailbox.id}...`);
      console.log(`API endpoint: /accounts/${selectedAccount.id}/mailboxes/${selectedAccount.currentMailbox.id}/messages?page=1&_t=${timestamp}`);
      
      // Fetch mailboxes trước để cập nhật thông tin mới nhất về mailbox
      const mailboxes = await fetchMailboxes(selectedAccount.id);
      const currentMailbox = mailboxes.find(m => m.id === selectedAccount.currentMailbox?.id) || mailboxes[0];
      
      console.log('Current mailbox:', currentMailbox);
      
      // Cập nhật danh sách tài khoản
      setGeneratedAccounts(prev => prev.map(acc => 
        acc.id === selectedAccount.id 
          ? { 
              ...acc, 
              mailboxes: mailboxes,
              currentMailbox: currentMailbox
            } 
          : acc
      ));
      
      // Cập nhật selectedAccount hiện tại
      if (selectedAccount) {
        setSelectedAccount(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            mailboxes: mailboxes,
            currentMailbox: currentMailbox
          };
        });
      }
      
      // Tải messages mới - trực tiếp gọi lại API với force refresh
      console.log(`Fetching messages with force refresh at timestamp: ${timestamp}`);
      
      // Thực hiện fetch với tham số noCache=true để luôn lấy dữ liệu mới nhất từ server
      const appClient = client;
      let freshMessages: MessageItem[] = [];
      
      if (appClient) {
        try {
          // Gọi trực tiếp API để đảm bảo luôn lấy dữ liệu mới nhất
          // Truyền timestamp vào hàm để đảm bảo không bị cache
          const freshMessagesData = await appClient.listMessages(
            selectedAccount.id, 
            currentMailbox.id, 
            1, 
            true,
            timestamp // Truyền timestamp cố định để đảm bảo đồng bộ giữa log và request thực tế
          );
          console.log(`Fresh messages data received at timestamp ${timestamp}:`, freshMessagesData);
          
          // Xử lý phản hồi API
          if (Array.isArray(freshMessagesData)) {
            freshMessages = freshMessagesData;
          } else if (freshMessagesData && freshMessagesData.member && Array.isArray(freshMessagesData.member)) {
            freshMessages = freshMessagesData.member;
          }
          
          // Kiểm tra kết nối HTTP trong DevTools
          console.log(`Check Network tab for request to: /accounts/${selectedAccount.id}/mailboxes/${currentMailbox.id}/messages?page=1&_t=${timestamp}`);
          
        } catch (error) {
          console.error('Error fetching fresh messages:', error);
          // Fallback to standard fetch if direct API call fails
          freshMessages = await fetchMessages(selectedAccount.id, currentMailbox.id);
        }
      } else {
        // Fallback to standard fetch if client is not available
        freshMessages = await fetchMessages(selectedAccount.id, currentMailbox.id);
      }
      
      // Đảm bảo cập nhật messages mới ngay cả khi dùng fetchMessages
      setMessages(freshMessages);
      
      // Tìm những tin nhắn mới (có trong danh sách mới nhưng không có trong danh sách cũ)
      const newMessages = freshMessages.filter(msg => !currentMessageIds.has(msg.id));
      console.log('New messages detected:', newMessages.length, newMessages);
      
      // Cập nhật thời gian refresh
      const now = new Date();
      setLastRefreshTime(now);
      
      // Cập nhật số tin nhắn mới
      if (newMessages.length > 0) {
        setNewMessageCount(prev => prev + newMessages.length);
        
        // Hiển thị thông báo khi có tin nhắn mới
        setToast({ 
          message: `Đã nhận được ${newMessages.length} tin nhắn mới!`, 
          visible: true 
        });
        
        // Log thông tin tin nhắn mới để debug
        console.log('New messages details:', newMessages.map(msg => ({
          id: msg.id,
          subject: msg.subject,
          from: msg.from?.address,
          isRead: msg.isRead,
          createdAt: msg.createdAt
        })));
      } else if (initialLoadRef.current) {
        // Chỉ hiển thị thông báo "Không có tin nhắn mới" sau lần tải đầu tiên
        setToast({ 
          message: 'Đã cập nhật thư thành công! Không có tin nhắn mới.', 
          visible: true 
        });
      }
      
      // Đánh dấu đã tải lần đầu
      if (!initialLoadRef.current) {
        initialLoadRef.current = true;
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
      setToast({ 
        message: 'Không thể cập nhật thư. Vui lòng thử lại sau.', 
        visible: true 
      });
    } finally {
      setIsRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [selectedAccount, messages, fetchMailboxes, fetchMessages, setGeneratedAccounts, setSelectedAccount, setLastRefreshTime, setToast, setIsRefreshing, client]);

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

    // Đảm bảo chỉ thực hiện một lần sau khi component mount
    return () => {
      // Xóa bộ đếm thời gian khi component unmount
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchDomains])

  useEffect(() => {
    // Khi đã có domains, tự động chọn domain đầu tiên
    if (domains && domains.length > 0 && !selectedDomain) {
      setSelectedDomain(domains[0].domain)
    }
  }, [domains, selectedDomain])

  useEffect(() => {
    // Tạo username ngẫu nhiên
    if (!username) {
      setUsername(generateRandomString(8))
    }
    
    // Tạo password ngẫu nhiên
    if (!password) {
      setPassword(generateRandomPassword())
    }
  }, [username, password])

  // Xử lý refresh khi tải lại trang - thêm event listener
  useEffect(() => {
    const handlePageVisibilityChange = () => {
      if (!document.hidden && selectedAccount && selectedAccount.currentMailbox && !isRefreshing && !isRefreshingRef.current) {
        console.log('Page became visible, refreshing messages...');
        handleRefreshMessages();
      }
    };

    // Đăng ký sự kiện khi trang trở nên visible (sau khi bị ẩn)
    document.addEventListener('visibilitychange', handlePageVisibilityChange);

    // Xóa event listener khi component unmount
    return () => {
      document.removeEventListener('visibilitychange', handlePageVisibilityChange);
    };
  }, [selectedAccount, handleRefreshMessages]);

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

  // Auto refresh effect
  useEffect(() => {
    // Xóa interval cũ nếu có
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // Thiết lập interval mới nếu autoRefresh đang bật
    if (autoRefresh && selectedAccount && selectedAccount.currentMailbox) {
      console.log(`Setting up auto-refresh interval: ${refreshInterval} seconds`);
      
      // Chạy refresh ngay khi bật autoRefresh
      if (!isRefreshing) {
        console.log('Initial auto-refresh triggered');
        handleRefreshMessages();
      }
      
      refreshTimerRef.current = setInterval(() => {
        if (!isRefreshing && !isRefreshingRef.current && document.visibilityState === 'visible') {
          console.log(`Auto-refresh triggered at ${new Date().toISOString()}`);
          handleRefreshMessages();
        }
      }, refreshInterval * 1000);
      
      console.log(`Auto-refresh timer set with ID: ${refreshTimerRef.current}`);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        console.log(`Clearing auto-refresh timer with ID: ${refreshTimerRef.current}`);
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, selectedAccount, isRefreshing, handleRefreshMessages]);

  // Thêm event listener cho window.focus để refresh khi user quay lại tab
  useEffect(() => {
    const handleWindowFocus = () => {
      if (selectedAccount && selectedAccount.currentMailbox && !isRefreshing && !isRefreshingRef.current) {
        console.log('Window focused, refreshing messages...');
        handleRefreshMessages();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [selectedAccount, handleRefreshMessages, isRefreshing]);

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
        <h1 className="text-2xl font-bold dark:text-white">TMail</h1>
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
          <h2 className="text-lg font-semibold dark:text-white mb-4">Create New Account</h2>
          
          <div className="space-y-4">
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
                />
                <button
                  type="button"
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r-md"
                  onClick={() => setUsername(generateRandomString(8))}
                >
                  🔄
                </button>
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
                />
                <button
                  type="button"
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-r-md"
                  onClick={() => setPassword(generateRandomPassword())}
                >
                  🔄
                </button>
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
            <h3 className="text-md font-semibold dark:text-white mb-2">Your Accounts</h3>
            
            {generatedAccounts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                No accounts created yet
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
                        title="Copy email address"
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
                        title="Copy password"
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
                Create an account or select one to view messages
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
                    <div className="flex items-center mr-2">
                      <input
                        type="checkbox"
                        id="autoRefresh"
                        className="mr-1 h-3 w-3" 
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                      />
                      <label htmlFor="autoRefresh" className="text-xs text-gray-600 dark:text-gray-300 mr-2">
                        Tự động
                      </label>
                      <select
                        className="text-xs bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-0.5"
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        disabled={!autoRefresh}
                      >
                        <option value="5">5s</option>
                        <option value="10">10s</option>
                        <option value="30">30s</option>
                        <option value="60">1m</option>
                      </select>
                    </div>
                    <button
                      className={`px-3 py-1 text-sm ${
                        isRefreshing 
                          ? 'bg-blue-400 text-white dark:bg-blue-700 dark:text-blue-100' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
                      } rounded-md flex items-center shadow-sm`}
                      onClick={async () => {
                        try {
                          console.log("Refresh button clicked!");
                          
                          // STRICT LOCK: Prevent multiple clicks within cooldown period
                          const currentTime = Date.now();
                          const timeSinceLastClick = currentTime - lastClickTimeRef.current;
                          
                          console.log(`Time since last click: ${timeSinceLastClick}ms, Cooldown: ${CLICK_COOLDOWN}ms`);
                          
                          // If another refresh is in progress or not enough time has passed, block this click
                          if (isRefreshing || isRefreshingRef.current) {
                            console.log("Already refreshing, ignoring click");
                            return;
                          }
                          
                          if (timeSinceLastClick < CLICK_COOLDOWN) {
                            console.log(`Blocking click - too soon (only ${timeSinceLastClick}ms since last click)`);
                            setToast({
                              message: "Xin đợi một chút trước khi thử lại",
                              visible: true
                            });
                            return;
                          }
                          
                          // Update last click time immediately
                          lastClickTimeRef.current = currentTime;
                          
                          // Immediately set refreshing state to block other clicks
                          setIsRefreshing(true);
                          isRefreshingRef.current = true;
                          
                          // Kiểm tra tài khoản
                          if (!selectedAccount) {
                            console.log("No account selected");
                            setToast({
                              message: "Vui lòng chọn tài khoản trước",
                              visible: true
                            });
                            setIsRefreshing(false);
                            isRefreshingRef.current = false;
                            return;
                          }
                          
                          if (!selectedAccount.currentMailbox) {
                            console.log("No mailbox for selected account, fetching mailboxes first");
                            setToast({
                              message: "Đang tải mailbox...",
                              visible: true
                            });
                            
                            try {
                              const mailboxes = await fetchMailboxes(selectedAccount.id);
                              if (!mailboxes || mailboxes.length === 0) {
                                throw new Error("No mailboxes found");
                              }
                              
                              const inbox = mailboxes.find(m => m.path.toLowerCase() === 'inbox') || mailboxes[0];
                              
                              // Update selected account with mailbox info
                              setSelectedAccount(prev => {
                                if (!prev) return prev;
                                return { ...prev, mailboxes, currentMailbox: inbox };
                              });
                              
                              setGeneratedAccounts(prev => 
                                prev.map(acc => acc.id === selectedAccount.id
                                  ? { ...acc, mailboxes, currentMailbox: inbox }
                                  : acc
                                )
                              );
                              
                              // Once we have mailbox, call fetchMessages
                              await handleRefreshMessages();
                            } catch (error) {
                              console.error("Error fetching mailboxes:", error);
                              setToast({
                                message: "Không thể tải mailbox. Vui lòng thử lại sau.",
                                visible: true
                              });
                            } finally {
                              setIsRefreshing(false);
                              isRefreshingRef.current = false;
                            }
                            
                            return;
                          }
                          
                          // Safely call handleRefreshMessages which handles its own state
                          await handleRefreshMessages();
                        } catch (error) {
                          console.error("Error in refresh button handler:", error);
                          setToast({
                            message: "Đã xảy ra lỗi khi làm mới tin nhắn",
                            visible: true
                          });
                          
                          // Always reset state
                          setIsRefreshing(false);
                          isRefreshingRef.current = false;
                        }
                      }}
                      disabled={isRefreshing || !selectedAccount}
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
          )}
        </div>
      </div>
    </div>
  )
}

export default QuickMailPage 