import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SmtpDevClient } from '@/api'

interface Account {
  id: string
  address: string
  isActive: boolean
  createdAt: string
  mailboxes?: Mailbox[]
  used: number
  quota: number
}

interface Domain {
  id: string
  domain: string
  isActive: boolean
  createdAt: string
}

interface Mailbox {
  id: string
  path: string
  totalMessages: number
  totalUnreadMessages: number
}

interface Message {
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

interface AppState {
  apiKey: string
  client: SmtpDevClient | null
  accounts: Account[]
  domains: Domain[]
  currentAccount: Account | null
  currentMailbox: Mailbox | null
  messages: Message[]
  currentMessage: any | null
  loading: boolean
  error: string | null
  initializeClient: () => SmtpDevClient | null
  setApiKey: (key: string) => SmtpDevClient | null
  clearApiKey: () => void
  fetchDomains: () => Promise<void>
  fetchAccounts: () => Promise<void>
  fetchMailboxes: (accountId: string) => Promise<Mailbox[]>
  fetchMessages: (accountId: string, mailboxId: string) => Promise<Message[]>
  fetchMessage: (accountId: string, mailboxId: string, messageId: string) => Promise<void>
  createAccount: (address: string, password: string, isActive?: boolean) => Promise<Account>
  deleteAccount: (id: string) => Promise<void>
  setCurrentAccount: (account: Account | null) => void
  setCurrentMailbox: (mailbox: Mailbox | null) => void
  setCurrentMessage: (message: any | null) => void
  setMessages: (messages: Message[]) => void
  markMessageAsRead: (accountId: string, mailboxId: string, messageId: string) => Promise<void>
}

// Create a store with persistence
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      client: null,
      accounts: [],
      domains: [],
      currentAccount: null,
      currentMailbox: null,
      messages: [],
      currentMessage: null,
      loading: false,
      error: null,

      // Create a new function to initialize the API client from stored API key
      initializeClient: () => {
        const { apiKey } = get();
        
        if (!apiKey) {
          console.log('No API key found, client not initialized');
          return null;
        }
        
        try {
          console.log('Initializing client from stored API key...');
          // Create a new client with the stored API key
          const client = new SmtpDevClient(apiKey);
          // Update the client in the store
          set({ client });
          console.log('Client successfully initialized from stored API key');
          return client;
        } catch (error) {
          console.error('Failed to initialize client from stored API key:', error);
          return null;
        }
      },

      setApiKey: (key) => {
        console.log('Setting API key in store:', key ? `${key.substring(0, 5)}...` : 'empty');
        
        try {
          // Tạo client mới với API key
          const client = new SmtpDevClient(key);
          
          // Lưu API key và client vào store
          set({ apiKey: key, client });
          
          console.log('API client successfully initialized');
          return client;
        } catch (error) {
          console.error('Failed to initialize API client:', error);
          set({ error: 'Failed to initialize API client' });
          return null;
        }
      },

      clearApiKey: () => {
        console.log('Clearing API key in store');
        set({ 
          apiKey: '', 
          client: null, 
          accounts: [], 
          domains: [], 
          currentAccount: null, 
          currentMailbox: null, 
          messages: [],
          currentMessage: null
        })
      },

      fetchDomains: async () => {
        const { client, initializeClient } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            console.error('Failed to initialize client, cannot fetch domains');
            return;
          }
        }
        
        console.log('fetchDomains called, client exists:', !!activeClient);
        
        set({ loading: true, error: null })
        try {
          console.log('Fetching domains...');
          const domainsData = await activeClient.listDomains()
          console.log('Domains fetched successfully:', domainsData);
          
          // Handle different response structures
          if (Array.isArray(domainsData)) {
            // Direct array response
            set({ domains: domainsData });
          } else if (domainsData && domainsData.member && Array.isArray(domainsData.member)) {
            // Response with member property containing array
            set({ domains: domainsData.member });
          } else {
            // Empty or unexpected response
            console.warn('Unexpected domains response format:', domainsData);
            set({ domains: [] });
          }
        } catch (error) {
          console.error('Error fetching domains:', error);
          set({ error: 'Failed to fetch domains', domains: [] })
        } finally {
          set({ loading: false })
        }
      },

      fetchAccounts: async () => {
        const { client, initializeClient } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            console.error('Failed to initialize client, cannot fetch accounts');
            return;
          }
        }
        
        console.log('fetchAccounts called, client exists:', !!activeClient);
        
        set({ loading: true, error: null })
        try {
          console.log('Fetching accounts...');
          const accountsData = await activeClient.listAccounts()
          console.log('Accounts fetched successfully:', accountsData);
          
          // Handle different response structures
          if (Array.isArray(accountsData)) {
            // Direct array response
            set({ accounts: accountsData });
          } else if (accountsData && accountsData.member && Array.isArray(accountsData.member)) {
            // Response with member property containing array
            set({ accounts: accountsData.member });
          } else {
            // Empty or unexpected response
            console.warn('Unexpected accounts response format:', accountsData);
            set({ accounts: [] });
          }
        } catch (error) {
          console.error('Error fetching accounts:', error);
          set({ error: 'Failed to fetch accounts', accounts: [] })
        } finally {
          set({ loading: false })
        }
      },

      fetchMailboxes: async (accountId) => {
        const { client, initializeClient } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            console.error('Failed to initialize client, cannot fetch mailboxes');
            return [];
          }
        }
        
        console.log('fetchMailboxes called, client exists:', !!activeClient);
        
        set({ loading: true, error: null })
        try {
          console.log('Fetching mailboxes for account:', accountId);
          const mailboxesData = await activeClient.listMailboxes(accountId)
          console.log('Mailboxes data received:', mailboxesData);
          
          // Handle different response structures
          let mailboxes: Mailbox[] = [];
          if (Array.isArray(mailboxesData)) {
            // Direct array response
            mailboxes = mailboxesData;
          } else if (mailboxesData && 'member' in mailboxesData && Array.isArray(mailboxesData.member)) {
            // Response with member property containing array
            mailboxes = mailboxesData.member;
          } else {
            // Empty or unexpected response
            console.warn('Unexpected mailboxes response format:', mailboxesData);
          }
          
          console.log('Processed mailboxes:', mailboxes);
          return mailboxes;
        } catch (error) {
          console.error('Error fetching mailboxes:', error);
          set({ error: 'Failed to fetch mailboxes' })
          return []
        } finally {
          set({ loading: false })
        }
      },

      fetchMessages: async (accountId, mailboxId) => {
        const { client, initializeClient } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            console.error('Failed to initialize client, cannot fetch messages');
            return [];
          }
        }
        
        set({ loading: true, error: null })
        try {
          // Thêm timestamp vào URL để đảm bảo tránh cache hoàn toàn
          const timestamp = Date.now();
          console.log(`Fetching messages for account ${accountId}, mailbox ${mailboxId} - API call: /accounts/${accountId}/mailboxes/${mailboxId}/messages?page=1&_t=${timestamp}`)
          
          // Luôn sử dụng tham số noCache=true để đảm bảo không bị cache
          const messagesData = await activeClient.listMessages(accountId, mailboxId, 1, true)
          
          console.log('Messages API response received at:', new Date().toISOString());
          console.log('Response data:', messagesData);
          
          // Handle different API response formats
          let messagesList: Message[] = []
          if (Array.isArray(messagesData)) {
            messagesList = messagesData
          } else if (messagesData && 'member' in messagesData && Array.isArray(messagesData.member)) {
            messagesList = messagesData.member
          }
          
          // Sắp xếp tin nhắn theo thời gian mới nhất
          messagesList.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          console.log('Processed and sorted messages list:', messagesList.length, 'messages');
          
          // Lưu dữ liệu vào store
          set({ messages: messagesList });
          
          // Trả về danh sách tin nhắn để có thể sử dụng trong các hàm khác
          return messagesList;
        } catch (error) {
          set({ error: 'Failed to fetch messages' })
          console.error('Error fetching messages:', error)
          return [];
        } finally {
          set({ loading: false })
        }
      },

      fetchMessage: async (accountId, mailboxId, messageId) => {
        const { client, initializeClient } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            console.error('Failed to initialize client, cannot fetch message');
            return;
          }
        }
        
        set({ loading: true, error: null })
        try {
          const messageData = await activeClient.getMessage(accountId, mailboxId, messageId)
          
          // Ensure the message has all required fields for display
          const message = {
            ...messageData,
            html: messageData.html || '',
            text: messageData.text || '',
            // Ensure these fields are available even if empty
            attachments: messageData.attachments || [],
            to: Array.isArray(messageData.to) ? messageData.to : [],
            from: messageData.from || { address: '', name: '' }
          }
          
          set({ currentMessage: message })
        } catch (error) {
          set({ error: 'Failed to fetch message details' })
          console.error(error)
        } finally {
          set({ loading: false })
        }
      },

      createAccount: async (address: string, password: string, isActive?: boolean) => {
        const { client, initializeClient, fetchAccounts } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            throw new Error('API client not initialized');
          }
        }

        set({ loading: true, error: null })
        try {
          console.log('Creating account:', address, isActive !== undefined ? `isActive: ${isActive}` : '');
          const account = await activeClient.createAccount(address, password, isActive)
          await fetchAccounts()
          return account
        } catch (error) {
          set({ error: 'Failed to create account' })
          console.error(error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      deleteAccount: async (id) => {
        const { client, initializeClient, fetchAccounts } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            console.error('Failed to initialize client, cannot delete account');
            return;
          }
        }

        set({ loading: true, error: null })
        try {
          await activeClient.deleteAccount(id)
          await fetchAccounts()
        } catch (error) {
          set({ error: 'Failed to delete account' })
          console.error(error)
        } finally {
          set({ loading: false })
        }
      },

      setCurrentAccount: (account) => {
        set({ 
          currentAccount: account,
          messages: [], // Clear messages when switching accounts
          currentMessage: null // Clear current message too
        })
      },

      setCurrentMailbox: (mailbox) => {
        set({ 
          currentMailbox: mailbox,
          messages: [], // Clear messages when switching mailboxes
          currentMessage: null // Clear current message too
        })
      },

      setCurrentMessage: (message) => {
        set({ currentMessage: message })
      },

      setMessages: (messages) => {
        set({ messages })
      },

      markMessageAsRead: async (accountId, mailboxId, messageId) => {
        const { client, initializeClient } = get()
        let activeClient = client;
        
        // If client is not initialized, try to initialize it
        if (!activeClient) {
          console.log('Client not initialized, attempting to initialize from stored API key');
          activeClient = initializeClient();
          if (!activeClient) {
            console.error('Failed to initialize client, cannot mark message as read');
            return;
          }
        }

        try {
          await activeClient.updateMessage(accountId, mailboxId, messageId, { isRead: true })
          set(state => ({
            messages: state.messages.map(msg => 
              msg.id === messageId ? { ...msg, isRead: true } : msg
            )
          }))
        } catch (error) {
          console.error('Failed to mark message as read', error)
        }
      }
    }),
    {
      name: 'smtp-dev-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        apiKey: state.apiKey,
        accounts: state.accounts,
        domains: state.domains
      }),
      onRehydrateStorage: () => (state) => {
        // This function runs after the state is rehydrated from localStorage
        if (state && state.apiKey) {
          console.log('State rehydrated from storage, initializing client...');
          state.initializeClient();
        }
      }
    }
  )
) 