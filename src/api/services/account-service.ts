import { AxiosInstance } from 'axios';
import {
  Account,
  AccountCreate,
  AccountUpdate,
  CollectionResponse,
} from '../types';

export class AccountService {
  private client: AxiosInstance;

  constructor(apiClient: AxiosInstance) {
    this.client = apiClient;
  }

  /**
   * Lấy danh sách tất cả tài khoản
   * @param address Lọc theo địa chỉ email
   * @param isActive Lọc theo trạng thái active
   * @param page Số trang
   * @returns Danh sách tài khoản
   */
  async listAccounts(
    address?: string,
    isActive?: boolean,
    page?: number
  ): Promise<CollectionResponse<Account> | Account[]> {
    const params: Record<string, any> = {};
    if (address !== undefined) params.address = address;
    if (isActive !== undefined) params.isActive = isActive;
    if (page !== undefined) params.page = page;

    console.log('AccountService.listAccounts - Request URL:', '/accounts', 'Params:', params);
    try {
      const response = await this.client.get('/accounts', { params });
      console.log('AccountService.listAccounts - Response:', response.data);
      
      // Handle the case when API returns array directly instead of collection
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('AccountService.listAccounts - Error:', error);
      throw error;
    }
  }

  /**
   * Tạo tài khoản mới
   * @param data Thông tin tài khoản cần tạo
   * @returns Tài khoản đã tạo
   */
  async createAccount(data: AccountCreate): Promise<Account> {
    console.log('AccountService.createAccount - Request URL:', '/accounts', 'Data:', data);
    try {
      const response = await this.client.post('/accounts', data);
      console.log('AccountService.createAccount - Response:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('AccountService.createAccount - Error:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * Lấy thông tin chi tiết của một tài khoản
   * @param id ID của tài khoản
   * @returns Thông tin tài khoản
   */
  async getAccount(id: string): Promise<Account> {
    const response = await this.client.get(`/accounts/${id}`);
    return response.data;
  }

  /**
   * Xóa một tài khoản
   * @param id ID của tài khoản cần xóa
   * @returns true nếu xóa thành công
   */
  async deleteAccount(id: string): Promise<boolean> {
    await this.client.delete(`/accounts/${id}`);
    return true;
  }

  /**
   * Cập nhật thông tin tài khoản
   * @param id ID của tài khoản
   * @param data Dữ liệu cần cập nhật
   * @returns Tài khoản đã cập nhật
   */
  async updateAccount(id: string, data: AccountUpdate): Promise<Account> {
    const response = await this.client.patch(`/accounts/${id}`, data);
    return response.data;
  }
} 