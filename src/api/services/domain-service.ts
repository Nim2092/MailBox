import { AxiosInstance } from 'axios';
import {
  Domain,
  DomainCreate,
  DomainUpdate,
  CollectionResponse,
} from '../types';

export class DomainService {
  private client: AxiosInstance;

  constructor(apiClient: AxiosInstance) {
    this.client = apiClient;
  }

  /**
   * Lấy danh sách tất cả domain
   * @param isActive Lọc theo trạng thái active
   * @param page Số trang
   * @returns Danh sách domain
   */
  async listDomains(isActive?: boolean, page?: number): Promise<CollectionResponse<Domain> | Domain[]> {
    const params: Record<string, any> = {};
    if (isActive !== undefined) params.isActive = isActive;
    if (page !== undefined) params.page = page;

    console.log('DomainService.listDomains - Request URL:', '/domains', 'Params:', params);
    try {
      const response = await this.client.get('/domains', { params });
      console.log('DomainService.listDomains - Response:', response.data);
      
      // Handle the case when API returns array directly instead of collection
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('DomainService.listDomains - Error:', error);
      throw error;
    }
  }

  /**
   * Tạo domain mới
   * @param data Thông tin domain cần tạo
   * @returns Domain đã tạo
   */
  async createDomain(data: DomainCreate): Promise<Domain> {
    const response = await this.client.post('/domains', data);
    return response.data;
  }

  /**
   * Lấy thông tin chi tiết của một domain
   * @param id ID của domain
   * @returns Thông tin domain
   */
  async getDomain(id: string): Promise<Domain> {
    const response = await this.client.get(`/domains/${id}`);
    return response.data;
  }

  /**
   * Xóa một domain
   * @param id ID của domain cần xóa
   * @returns true nếu xóa thành công
   */
  async deleteDomain(id: string): Promise<boolean> {
    await this.client.delete(`/domains/${id}`);
    return true;
  }

  /**
   * Cập nhật thông tin domain
   * @param id ID của domain
   * @param data Dữ liệu cần cập nhật
   * @returns Domain đã cập nhật
   */
  async updateDomain(id: string, data: DomainUpdate): Promise<Domain> {
    const response = await this.client.patch(`/domains/${id}`, data);
    return response.data;
  }
} 