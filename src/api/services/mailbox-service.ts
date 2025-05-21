import { AxiosInstance } from 'axios';
import {
  Mailbox,
  MailboxCreate,
  MailboxUpdate,
  CollectionResponse,
} from '../types';

export class MailboxService {
  private client: AxiosInstance;

  constructor(apiClient: AxiosInstance) {
    this.client = apiClient;
  }

  /**
   * Lấy danh sách tất cả thư mục của một tài khoản
   * @param accountId ID của tài khoản
   * @param page Số trang
   * @returns Danh sách thư mục
   */
  async listMailboxes(
    accountId: string,
    page?: number
  ): Promise<CollectionResponse<Mailbox> | Mailbox[]> {
    const params: Record<string, any> = {};
    if (page !== undefined) params.page = page;

    console.log('MailboxService.listMailboxes - Request URL:', `/accounts/${accountId}/mailboxes`, 'Params:', params);
    try {
      const response = await this.client.get(`/accounts/${accountId}/mailboxes`, { params });
      console.log('MailboxService.listMailboxes - Response:', response.data);
      
      // Handle the case when API returns array directly instead of collection
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.mailboxes && Array.isArray(response.data.mailboxes)) {
        // Handle when mailboxes are nested in account data
        return response.data.mailboxes;
      }
      
      return response.data;
    } catch (error) {
      console.error('MailboxService.listMailboxes - Error:', error);
      throw error;
    }
  }

  /**
   * Tạo thư mục mới cho tài khoản
   * @param accountId ID của tài khoản
   * @param data Thông tin thư mục cần tạo
   * @returns Thư mục đã tạo
   */
  async createMailbox(accountId: string, data: MailboxCreate): Promise<Mailbox> {
    const response = await this.client.post(`/accounts/${accountId}/mailboxes`, data);
    return response.data;
  }

  /**
   * Lấy thông tin chi tiết của một thư mục
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @returns Thông tin thư mục
   */
  async getMailbox(accountId: string, mailboxId: string): Promise<Mailbox> {
    const response = await this.client.get(`/accounts/${accountId}/mailboxes/${mailboxId}`);
    return response.data;
  }

  /**
   * Xóa một thư mục
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục cần xóa
   * @returns true nếu xóa thành công
   */
  async deleteMailbox(accountId: string, mailboxId: string): Promise<boolean> {
    await this.client.delete(`/accounts/${accountId}/mailboxes/${mailboxId}`);
    return true;
  }

  /**
   * Cập nhật thông tin thư mục
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param data Dữ liệu cần cập nhật
   * @returns Thư mục đã cập nhật
   */
  async updateMailbox(
    accountId: string,
    mailboxId: string,
    data: MailboxUpdate
  ): Promise<Mailbox> {
    const response = await this.client.patch(
      `/accounts/${accountId}/mailboxes/${mailboxId}`,
      data
    );
    return response.data;
  }
} 