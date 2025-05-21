import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

const AccountDetailPage: React.FC = () => {
  const { id: accountId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { 
    client,
    accounts, 
    messages,
    currentAccount,
    currentMailbox,
    currentMessage,
    fetchAccounts, 
    setCurrentAccount,
    setCurrentMailbox,
    setCurrentMessage,
    fetchMessages,
    fetchMessage,
    markMessageAsRead
  } = useAppStore()
  
  const [mailboxes, setMailboxes] = useState<any[]>([])
  const [isAddMailboxOpen, setIsAddMailboxOpen] = useState(false)
  const [newMailboxPath, setNewMailboxPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalUsed, setTotalUsed] = useState(0)
  const [isClearing, setIsClearing] = useState(false)

  // Add function to calculate total storage used
  const calculateTotalUsed = (messages: any[]) => {
    return messages.reduce((total, msg) => {
      // Calculate message size including attachments
      const attachmentsSize = msg.attachments ? 
        msg.attachments.reduce((sum: number, att: any) => sum + (att.size || 0), 0) : 0;
      const messageSize = (msg.size || 0) + attachmentsSize;
      return total + messageSize;
    }, 0);
  };

  // Add function to clear mailbox
  const handleClearMailbox = async (mailboxId: string) => {
    if (!accountId || !client || !currentMailbox) return;
    
    if (window.confirm('Are you sure you want to clear this mailbox? All messages will be permanently deleted.')) {
      try {
        setIsClearing(true);
        setError(null);
        
        // Delete messages in batches
        const batchSize = 50;
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = messages.slice(i, i + batchSize);
          await Promise.all(
            batch.map(msg => client.deleteMessage(accountId, mailboxId, msg.id))
          );
        }
        
        // Refresh all data
        await fetchAccounts(); // Refresh accounts to update storage info
        const mailboxesData = await client.listMailboxes(accountId);
        if (Array.isArray(mailboxesData)) {
          setMailboxes(mailboxesData);
        } else if (mailboxesData && 'member' in mailboxesData && Array.isArray(mailboxesData.member)) {
          setMailboxes(mailboxesData.member);
        }
        await fetchMessages(accountId, mailboxId);
        setTotalUsed(0);
        setCurrentMessage(null);
        
      } catch (error) {
        console.error('Failed to clear mailbox:', error);
        setError('Failed to clear mailbox. Please try again.');
      } finally {
        setIsClearing(false);
      }
    }
  };

  // Add auto-cleanup check in useEffect
  useEffect(() => {
    if (totalUsed >= 1024 * 1024 * 1024 && currentMailbox?.id) { // 1GB in bytes
      handleClearMailbox(currentMailbox.id);
    }
  }, [totalUsed, currentMailbox]);

  // Update useEffect to calculate total storage
  useEffect(() => {
    if (messages && messages.length > 0) {
      const used = calculateTotalUsed(messages);
      setTotalUsed(used);
    }
  }, [messages]);

  useEffect(() => {
    if (!accountId) return
    
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Ensure accounts are loaded
        if (accounts && accounts.length === 0) {
          await fetchAccounts()
        }
        
        // Set current account
        const account = accounts && accounts.find(a => a.id === accountId) || null
        setCurrentAccount(account) // This now also clears messages
        
        // Load mailboxes
        if (client && account) {
          console.log('Loading mailboxes for account:', account.id);
          try {
            const mailboxesData = await client.listMailboxes(accountId);
            console.log('Mailboxes response:', mailboxesData);
            
            // Handle different response structures
            let mailboxesList: any[] = [];
            if (Array.isArray(mailboxesData)) {
              // Direct array response
              mailboxesList = mailboxesData;
            } else if (mailboxesData && 'member' in mailboxesData && Array.isArray(mailboxesData.member)) {
              // Response with member property containing array
              mailboxesList = mailboxesData.member;
            } else if (account.mailboxes && Array.isArray(account.mailboxes)) {
              // Mailboxes directly in account object
              console.log('Using mailboxes from account object:', account.mailboxes);
              mailboxesList = account.mailboxes;
            }
            
            console.log('Final mailboxes list:', mailboxesList);
            setMailboxes(mailboxesList);
            
            // Select first mailbox by default if none is selected
            if (mailboxesList.length > 0 && !currentMailbox) {
              const firstMailbox = mailboxesList[0];
              setCurrentMailbox(firstMailbox);
              await fetchMessages(accountId, firstMailbox.id);
            }
          } catch (error) {
            console.error('Error fetching mailboxes:', error);
          }
        }
      } catch (error) {
        console.error('Error loading account data:', error)
        setError('Failed to load account data')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [accountId, fetchAccounts, accounts, client, setCurrentAccount, setCurrentMailbox, fetchMessages, currentMailbox])

  const handleAddMailbox = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId || !client) return
    
    try {
      setLoading(true)
      await client.createMailbox(accountId, newMailboxPath)
      const mailboxesData = await client.listMailboxes(accountId)
      
      // Handle different response structures
      let mailboxesList: any[] = [];
      if (Array.isArray(mailboxesData)) {
        mailboxesList = mailboxesData;
      } else if (mailboxesData && 'member' in mailboxesData && Array.isArray(mailboxesData.member)) {
        mailboxesList = mailboxesData.member;
      }
      
      setMailboxes(mailboxesList)
      setIsAddMailboxOpen(false)
      setNewMailboxPath('')
    } catch (error) {
      console.error('Failed to create mailbox:', error)
      setError('Failed to create mailbox')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSelectMailbox = async (mailbox: any) => {
    if (!accountId) return
    
    setCurrentMailbox(mailbox) // This now also clears messages and currentMessage
    await fetchMessages(accountId, mailbox.id)
  }
  
  const handleSelectMessage = async (message: any) => {
    if (!accountId || !currentMailbox) return
    
    try {
      await fetchMessage(accountId, currentMailbox.id, message.id)
      
      // Mark as read if not already
      if (!message.isRead) {
        await markMessageAsRead(accountId, currentMailbox.id, message.id)
      }
    } catch (error) {
      console.error('Failed to load message:', error)
    }
  }
  
  const handleDeleteMailbox = async (mailboxId: string) => {
    if (!accountId || !client) return
    
    if (window.confirm('Are you sure you want to delete this mailbox? All messages will be lost.')) {
      try {
        setLoading(true)
        await client.deleteMailbox(accountId, mailboxId)
        
        // Refresh mailboxes
        const mailboxesData = await client.listMailboxes(accountId)
        
        // Handle different response structures
        let mailboxesList: any[] = [];
        if (Array.isArray(mailboxesData)) {
          mailboxesList = mailboxesData;
        } else if (mailboxesData && 'member' in mailboxesData && Array.isArray(mailboxesData.member)) {
          mailboxesList = mailboxesData.member;
        }
        
        setMailboxes(mailboxesList)
        
        // Clear current mailbox if it was deleted
        if (currentMailbox && currentMailbox.id === mailboxId) {
          setCurrentMailbox(null)
          setCurrentMessage(null)
        }
      } catch (error) {
        console.error('Failed to delete mailbox:', error)
        setError('Failed to delete mailbox')
      } finally {
        setLoading(false)
      }
    }
  }
  
  const handleDeleteMessage = async (messageId: string) => {
    if (!accountId || !currentMailbox || !client) return;
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        setLoading(true);
        await client.deleteMessage(accountId, currentMailbox.id, messageId);
        
        // Refresh all data
        await fetchAccounts(); // Refresh accounts to update storage info
        const mailboxesData = await client.listMailboxes(accountId);
        if (Array.isArray(mailboxesData)) {
          setMailboxes(mailboxesData);
        } else if (mailboxesData && 'member' in mailboxesData && Array.isArray(mailboxesData.member)) {
          setMailboxes(mailboxesData.member);
        }
        await fetchMessages(accountId, currentMailbox.id);
        
        // Clear current message if it was deleted
        if (currentMessage && currentMessage.id === messageId) {
          setCurrentMessage(null);
        }

        // Recalculate total used after deletion
        if (messages && messages.length > 0) {
          const used = calculateTotalUsed(messages.filter(msg => msg.id !== messageId));
          setTotalUsed(used);
        }
      } catch (error) {
        console.error('Failed to delete message:', error);
        setError('Failed to delete message');
      } finally {
        setLoading(false);
      }
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }
  
  const formatMessageSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  if (!currentAccount) {
    return (
      <div className="text-center p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600">Loading account...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/accounts')}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
        >
          ← Back to Accounts
        </button>
        <div className="flex justify-between items-center mt-2">
          <h1 className="text-2xl font-bold dark:text-white">{currentAccount?.address}</h1>
          {currentMailbox && (
            <div className="flex items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-4">
                Used: {(totalUsed / (1024 * 1024)).toFixed(2)} MB / 1 GB
                {totalUsed >= 1024 * 1024 * 900 && totalUsed < 1024 * 1024 * 1024 && (
                  <span className="ml-2 text-yellow-500 dark:text-yellow-400">
                    (Near limit)
                  </span>
                )}
                {totalUsed >= 1024 * 1024 * 1024 && (
                  <span className="ml-2 text-red-500 dark:text-red-400">
                    (Full)
                  </span>
                )}
              </span>
              <button
                onClick={() => handleClearMailbox(currentMailbox.id)}
                disabled={isClearing || messages.length === 0}
                className={`px-4 py-2 rounded-md text-white ${
                  isClearing || messages.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isClearing ? 'Clearing...' : 'Clear Mailbox'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Mailboxes */}
        <div className="col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Mailboxes</h2>
            <button
              onClick={() => setIsAddMailboxOpen(true)}
              className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              + Add
            </button>
          </div>
          
          {loading && (!mailboxes || mailboxes.length === 0) ? (
            <div className="text-center p-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
          ) : !mailboxes || mailboxes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm p-2">No mailboxes found</p>
          ) : (
            <ul className="space-y-1">
              {mailboxes.map((mailbox) => (
                <li key={mailbox.id}>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                    <button
                      className={`flex-grow text-left px-2 py-1 rounded ${
                        currentMailbox && currentMailbox.id === mailbox.id
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : 'dark:text-gray-200'
                      }`}
                      onClick={() => handleSelectMailbox(mailbox)}
                    >
                      <span className="font-medium">{mailbox.path}</span>
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        ({mailbox.totalMessages})
                      </span>
                      {mailbox.totalUnreadMessages > 0 && (
                        <span className="ml-1 text-xs bg-blue-500 text-white px-1.5 rounded-full">
                          {mailbox.totalUnreadMessages}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteMailbox(mailbox.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          {/* Add Mailbox Modal */}
          {isAddMailboxOpen && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Add New Mailbox</h2>
                
                <form onSubmit={handleAddMailbox}>
                  <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                      Mailbox Path
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., Inbox, Sent, Archive"
                      value={newMailboxPath}
                      onChange={(e) => setNewMailboxPath(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-secondary mr-2"
                      onClick={() => setIsAddMailboxOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Mailbox'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
        
        {/* Messages List */}
        <div className="col-span-1 md:col-span-3">
          {!currentMailbox ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">Select a mailbox to view messages</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="border-b dark:border-gray-700 px-4 py-3">
                <h2 className="text-lg font-semibold dark:text-white">{currentMailbox.path}</h2>
              </div>
              
              {loading && (!messages || messages.length === 0) ? (
                <div className="text-center p-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading messages...</p>
                </div>
              ) : !messages || messages.length === 0 ? (
                <div className="text-center p-8">
                  <p className="text-gray-500 dark:text-gray-400">No messages in this mailbox</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                  {/* Messages List */}
                  <div className="col-span-1 border-r dark:border-gray-700">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[70vh] overflow-y-auto">
                      {messages.map((message) => (
                        <li key={message.id}>
                          <button
                            className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              currentMessage && currentMessage.id === message.id
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : ''
                            } ${
                              !message.isRead ? 'font-semibold' : ''
                            }`}
                            onClick={() => handleSelectMessage(message)}
                          >
                            <div className="flex justify-between">
                              <span className="text-sm truncate max-w-[200px] dark:text-gray-200">
                                {message.from.name || message.from.address}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(message.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-sm font-medium mt-1 truncate dark:text-gray-300">
                              {message.subject || '(No subject)'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {message.intro || '(No preview available)'}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Message Content */}
                  <div className="col-span-1 md:col-span-2">
                    {!currentMessage ? (
                      <div className="h-[70vh] flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">Select a message to view its contents</p>
                      </div>
                    ) : (
                      <div className="p-4 max-h-[70vh] overflow-y-auto">
                        <div className="mb-4 flex justify-between items-start">
                          <div>
                            <h2 className="text-xl font-bold mb-2 dark:text-white">
                              {currentMessage.subject || '(No subject)'}
                            </h2>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              <span className="font-medium">From:</span>{' '}
                              {currentMessage.from.name ? (
                                <>
                                  {currentMessage.from.name} &lt;{currentMessage.from.address}&gt;
                                </>
                              ) : (
                                currentMessage.from.address
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                              <span className="font-medium">To:</span>{' '}
                              {currentMessage.to.map((recipient: any, index: number) => (
                                <span key={index}>
                                  {recipient.name ? (
                                    <>
                                      {recipient.name} &lt;{recipient.address}&gt;
                                    </>
                                  ) : (
                                    recipient.address
                                  )}
                                  {index < currentMessage.to.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                              <span className="font-medium">Date:</span>{' '}
                              {formatDate(currentMessage.createdAt)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMessage(currentMessage.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                        
                        {currentMessage.hasAttachments && (
                          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Attachments:
                            </h3>
                            <ul className="space-y-1">
                              {currentMessage.attachments && currentMessage.attachments.map((attachment: any) => (
                                <li key={attachment.id} className="flex items-center">
                                  <a
                                    href={attachment.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center"
                                  >
                                    {attachment.filename}{' '}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                      ({formatMessageSize(attachment.size)})
                                    </span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="mt-4 p-4 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                          {/* Email Body */}
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
                            // Use intro if html and text are not available
                            <div className="text-gray-800 dark:text-gray-200">
                              {currentMessage.intro}
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 italic">
                              (No content available)
                            </p>
                          )}

                          {/* Show additional metadata if available */}
                          {currentMessage.downloadUrl && (
                            <div className="mt-4 pt-3 border-t dark:border-gray-700">
                              <a 
                                href={currentMessage.downloadUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                              >
                                Download Raw Message
                              </a>
                              {currentMessage.sourceUrl && (
                                <a 
                                  href={currentMessage.sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm ml-4"
                                >
                                  View Source
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountDetailPage 