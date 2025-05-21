import { createApiClient } from './config/api-config';
import { AccountService } from './services/account-service';
import { DomainService } from './services/domain-service';
import { MailboxService } from './services/mailbox-service';
import { MessageService } from './services/message-service';

export class SmtpDevClient {
  private apiClient;
  
  public accounts: AccountService;
  public domains: DomainService;
  public mailboxes: MailboxService;
  public messages: MessageService;

  constructor(apiKey: string) {
    this.apiClient = createApiClient(apiKey);
    
    // Initialize services
    this.accounts = new AccountService(this.apiClient);
    this.domains = new DomainService(this.apiClient);
    this.mailboxes = new MailboxService(this.apiClient);
    this.messages = new MessageService(this.apiClient);
  }

  // Test connectivity
  async testConnection() {
    try {
      console.log('Testing API connection...');
      
      // Attempt to request both accounts and domains for testing
      const [accountsResponse] = await Promise.all([
        this.apiClient.get('/accounts')
      ]);
      
      console.log('API Connection test results:');
      console.log('- Accounts:', accountsResponse.status);
      
      return {
        success: true,
        message: 'Connection successful',
        accounts: accountsResponse.data
      };
    } catch (error: any) {
      console.error('API Connection test failed:', error?.response?.status || error);
      
      // Chi tiết hơn về lỗi
      if (error.response) {
        // Có phản hồi từ server nhưng status code là lỗi
        throw new Error(`API returned error ${error.response.status}: ${JSON.stringify(error.response.data || {})}`);
      } else if (error.request) {
        // Không nhận được phản hồi từ server
        throw new Error('No response received from API server. Please check your network connection.');
      } else {
        // Lỗi trong quá trình thiết lập request
        throw error;
      }
    }
  }

  // Account methods
  async listAccounts(address?: string, isActive?: boolean, page?: number) {
    return this.accounts.listAccounts(address, isActive, page);
  }

  async createAccount(address: string, password: string, isActive?: boolean) {
    console.log('Creating account with address:', address, 'isActive:', isActive);
    return this.accounts.createAccount({ address, password, isActive });
  }

  async getAccount(id: string) {
    return this.accounts.getAccount(id);
  }

  async deleteAccount(id: string) {
    return this.accounts.deleteAccount(id);
  }

  // Domain methods
  async listDomains(isActive?: boolean, page?: number) {
    return this.domains.listDomains(isActive, page);
  }

  async createDomain(domain: string, isActive?: boolean) {
    return this.domains.createDomain({ domain, isActive });
  }

  async deleteDomain(id: string) {
    return this.domains.deleteDomain(id);
  }

  async updateDomain(id: string, isActive: boolean) {
    return this.domains.updateDomain(id, { isActive });
  }

  // Mailbox methods
  async listMailboxes(accountId: string, page?: number) {
    return this.mailboxes.listMailboxes(accountId, page);
  }

  async createMailbox(accountId: string, path: string) {
    return this.mailboxes.createMailbox(accountId, { path });
  }

  async deleteMailbox(accountId: string, mailboxId: string) {
    return this.mailboxes.deleteMailbox(accountId, mailboxId);
  }

  // Message methods
  async listMessages(accountId: string, mailboxId: string, page?: number, noCache: boolean = false, customTimestamp?: number) {
    return this.messages.listMessages(accountId, mailboxId, page, noCache, customTimestamp);
  }

  async getMessage(accountId: string, mailboxId: string, messageId: string) {
    return this.messages.getMessage(accountId, mailboxId, messageId);
  }

  async updateMessage(accountId: string, mailboxId: string, messageId: string, data: any) {
    return this.messages.updateMessage(accountId, mailboxId, messageId, data);
  }

  async deleteMessage(accountId: string, mailboxId: string, messageId: string) {
    return this.messages.deleteMessage(accountId, mailboxId, messageId);
  }
}

// Re-export all types
export * from './types'; 