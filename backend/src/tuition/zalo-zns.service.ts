import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ZaloZnsResponse {
  status: number; // 0=success, other=error code
  message?: string;
  error?: string;
}

@Injectable()
export class ZaloZnsService {
  private readonly logger = new Logger('ZaloZnsService');
  private readonly accessToken = process.env.ZALO_OA_ACCESS_TOKEN;

  async sendTemplate(payload: {
    phone: string;
    template_id: string;
    template_data: Record<string, any>;
  }): Promise<ZaloZnsResponse> {
    if (!this.accessToken) {
      throw new Error('ZALO_OA_ACCESS_TOKEN not set');
    }

    try {
      const response = await axios.post<ZaloZnsResponse>(
        'https://business.openapi.zalo.me/message/template',
        {
          phone: payload.phone,
          template_id: payload.template_id,
          template_data: payload.template_data,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            // Token is read from env and sent — never logged or returned to client
            Authorization: `Bearer ${this.accessToken}`,
          },
          timeout: 10_000,
        },
      );

      this.logger.log(`ZNS sent to ${payload.phone}: status=${response.data.status}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `ZNS failed for ${payload.phone}: ${error.message}`,
        error.response?.data || error,
      );
      throw error;
    }
  }
}
