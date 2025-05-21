import { AxiosInstance } from 'axios';
import {
  Message,
  MessageList,
  MessageUpdate,
  // MessageMove, // Unused, commented out to fix the TS6133 error
  MessageSource,
  CollectionResponse,
} from '../types';

export class MessageService {
  private client: AxiosInstance;

  constructor(apiClient: AxiosInstance) {
    this.client = apiClient;
  }

  /**
   * Lấy danh sách tất cả tin nhắn trong một thư mục
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param page Số trang
   * @param noCache Boolean để thêm timestamp vào request nhằm tránh cache
   * @param customTimestamp Timestamp tùy chỉnh để đảm bảo đồng bộ giữa các log và request thực tế
   * @returns Danh sách tin nhắn
   */
  async listMessages(
    accountId: string,
    mailboxId: string,
    page?: number,
    noCache: boolean = false,
    customTimestamp?: number
  ): Promise<CollectionResponse<MessageList>> {
    const params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    
    // Thêm timestamp vào request để tránh cache nếu noCache = true
    if (noCache) {
      // Sử dụng customTimestamp nếu được cung cấp, nếu không tạo mới
      params._t = customTimestamp || new Date().getTime();
      
      // Log để debug
      console.log(`Making API request to messages with timestamp: ${params._t}`);
    }

    // Log full API URL để debug
    const url = `/accounts/${accountId}/mailboxes/${mailboxId}/messages`;
    console.log(`Full API request: ${url}?${new URLSearchParams(params).toString()}`);

    const response = await this.client.get(url, { params });
    return response.data;
  }

  /**
   * Lấy thông tin chi tiết của một tin nhắn
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param messageId ID của tin nhắn
   * @returns Thông tin tin nhắn
   */
  async getMessage(
    accountId: string,
    mailboxId: string,
    messageId: string
  ): Promise<Message> {
    const response = await this.client.get(
      `/accounts/${accountId}/mailboxes/${mailboxId}/messages/${messageId}`
    );
    
    // Create a properly formatted message object
    const message = response.data;
    
    // Ensure html and text fields exist 
    // If the message doesn't have html or text content, we'll add empty values
    if (!message.html) {
      message.html = '';
    }
    if (!message.text) {
      message.text = '';
    }
    
    // Handle message source URL if it's available but not content
    if (message.sourceUrl && (!message.html && !message.text)) {
      try {
        const source = await this.getMessageSource(accountId, mailboxId, messageId);
        if (source && source.raw) {
          message.text = source.raw;
        }
      } catch (error) {
        console.error('Failed to fetch message source:', error);
      }
    }
    
    return message;
  }

  /**
   * Xóa một tin nhắn
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param messageId ID của tin nhắn cần xóa
   * @returns true nếu xóa thành công
   */
  async deleteMessage(
    accountId: string,
    mailboxId: string,
    messageId: string
  ): Promise<boolean> {
    await this.client.delete(
      `/accounts/${accountId}/mailboxes/${mailboxId}/messages/${messageId}`
    );
    return true;
  }

  /**
   * Cập nhật thông tin tin nhắn
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param messageId ID của tin nhắn
   * @param data Dữ liệu cần cập nhật
   * @returns Tin nhắn đã cập nhật
   */
  async updateMessage(
    accountId: string,
    mailboxId: string,
    messageId: string,
    data: MessageUpdate
  ): Promise<Message> {
    const response = await this.client.patch(
      `/accounts/${accountId}/mailboxes/${mailboxId}/messages/${messageId}`,
      data
    );
    return response.data;
  }

  /**
   * Lấy nguồn của tin nhắn
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param messageId ID của tin nhắn
   * @returns Nguồn tin nhắn
   */
  async getMessageSource(
    accountId: string,
    mailboxId: string,
    messageId: string
  ): Promise<MessageSource> {
    const response = await this.client.get(
      `/accounts/${accountId}/mailboxes/${mailboxId}/messages/${messageId}/source`
    );
    return response.data;
  }

  /**
   * Tải file đính kèm
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param messageId ID của tin nhắn
   * @param attachmentId ID của file đính kèm
   * @returns Dữ liệu file đính kèm dưới dạng Blob
   */
  async downloadAttachment(
    accountId: string,
    mailboxId: string,
    messageId: string,
    attachmentId: string
  ): Promise<Blob> {
    const response = await this.client.get(
      `/accounts/${accountId}/mailboxes/${mailboxId}/messages/${messageId}/attachment/${attachmentId}`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Tải tin nhắn
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục
   * @param messageId ID của tin nhắn
   * @returns Dữ liệu tin nhắn dưới dạng Blob
   */
  async downloadMessage(
    accountId: string,
    mailboxId: string,
    messageId: string
  ): Promise<Blob> {
    const response = await this.client.get(
      `/accounts/${accountId}/mailboxes/${mailboxId}/messages/${messageId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Di chuyển tin nhắn sang thư mục khác
   * @param accountId ID của tài khoản
   * @param mailboxId ID của thư mục nguồn
   * @param messageId ID của tin nhắn
   * @param targetMailboxId ID của thư mục đích
   * @returns Kết quả di chuyển
   */
  async moveMessage(
    accountId: string,
    mailboxId: string,
    messageId: string,
    targetMailboxId: string
  ): Promise<any> {
    const response = await this.client.put(
      `/accounts/${accountId}/mailboxes/${mailboxId}/messages/${messageId}/move`,
      { mailbox: targetMailboxId }
    );
    return response.data;
  }
} 