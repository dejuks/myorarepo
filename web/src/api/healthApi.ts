import axios from 'axios';
import { API_BASE_URL } from '@/api/client';

export interface GatewayHealth {
  status: 'ready' | 'not_ready';
  service: string;
  checks: Record<string, 'ok' | 'error'>;
  timestamp: string;
}

/** /health/ready lives on the gateway root, not under /api/v1, and needs no auth. */
export async function getGatewayHealth(): Promise<GatewayHealth> {
  const gatewayRoot = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const response = await axios.get<GatewayHealth>(`${gatewayRoot}/health/ready`, { timeout: 5000 });
  return response.data;
}
