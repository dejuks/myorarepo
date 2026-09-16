import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (error: unknown) => unknown;

// A minimal callable mock axios instance: `apiClient(config)` works (used for the retry),
// alongside `.interceptors.request/response.use(...)` capturing what client.ts registers.
function createMockInstance() {
  const requestHandlers: Array<(config: unknown) => unknown> = [];
  const responseHandlers: Array<{ onFulfilled: (r: unknown) => unknown; onRejected: Handler }> = [];

  const instance = vi.fn((config: unknown) => Promise.resolve({ config, data: { success: true, data: 'retried' } }));
  (instance as unknown as { interceptors: unknown }).interceptors = {
    request: { use: vi.fn((fn: (config: unknown) => unknown) => requestHandlers.push(fn)) },
    response: {
      use: vi.fn((onFulfilled: (r: unknown) => unknown, onRejected: Handler) =>
        responseHandlers.push({ onFulfilled, onRejected }),
      ),
    },
  };
  return { instance, requestHandlers, responseHandlers };
}

const mockPost = vi.fn();
const mockCreate = vi.fn();

vi.mock('axios', () => {
  const isAxiosError = (err: unknown): boolean => Boolean(err && typeof err === 'object' && 'isAxiosError' in err);
  return {
    default: {
      create: (...args: unknown[]) => mockCreate(...args),
      post: (...args: unknown[]) => mockPost(...args),
      isAxiosError,
    },
    isAxiosError,
  };
});

describe('apiClient response interceptor (refresh-and-retry)', () => {
  let mockInstanceBundle: ReturnType<typeof createMockInstance>;

  beforeEach(() => {
    vi.resetModules();
    mockPost.mockReset();
    mockInstanceBundle = createMockInstance();
    mockCreate.mockReturnValue(mockInstanceBundle.instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function loadClientWithRefreshToken(refreshToken: string | null) {
    vi.doMock('@/app/store', () => {
      const state = {
        auth: { accessToken: 'old-access', refreshToken, user: null, isAuthenticated: true, isBootstrapping: false },
      };
      return {
        store: {
          getState: () => state,
          dispatch: vi.fn(),
        },
      };
    });
    const clientModule = await import('@/api/client');
    const storeModule = await import('@/app/store');
    return { clientModule, storeModule };
  }

  it('retries the original request exactly once after a successful silent refresh', async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900 } },
    });

    const { storeModule } = await loadClientWithRefreshToken('old-refresh');
    const [{ onRejected }] = mockInstanceBundle.responseHandlers;

    const originalRequest = { url: '/users/me', headers: { set: vi.fn() } };
    const error = { response: { status: 401 }, config: originalRequest, isAxiosError: true };

    const result = (await onRejected(error)) as { data: { data: string } };

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refreshToken: 'old-refresh' },
      expect.anything(),
    );
    expect(storeModule.store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/tokensRotated' }),
    );
    expect(originalRequest.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer new-access');
    // The retried request went back through the mock instance (called as a function).
    expect(mockInstanceBundle.instance).toHaveBeenCalledWith(originalRequest);
    expect(result.data.data).toBe('retried');
  });

  it('does not retry a request already marked as retried, and logs out instead', async () => {
    const { storeModule } = await loadClientWithRefreshToken('old-refresh');
    const [{ onRejected }] = mockInstanceBundle.responseHandlers;

    const originalRequest = { url: '/users/me', headers: { set: vi.fn() }, _retried: true };
    const error = { response: { status: 401 }, config: originalRequest, isAxiosError: true };

    await expect(onRejected(error)).rejects.toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();
    expect(storeModule.store.dispatch).not.toHaveBeenCalled();
  });

  it('dispatches loggedOut and rejects when the refresh call itself fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('refresh token expired'));

    const { storeModule } = await loadClientWithRefreshToken('old-refresh');
    const [{ onRejected }] = mockInstanceBundle.responseHandlers;

    const originalRequest = { url: '/users/me', headers: { set: vi.fn() } };
    const error = { response: { status: 401 }, config: originalRequest, isAxiosError: true };

    await expect(onRejected(error)).rejects.toBeTruthy();
    expect(storeModule.store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth/loggedOut' }));
  });

  it('never attempts a refresh loop when the failing request is /auth/refresh itself', async () => {
    const { storeModule } = await loadClientWithRefreshToken('old-refresh');
    const [{ onRejected }] = mockInstanceBundle.responseHandlers;

    const originalRequest = { url: '/auth/refresh', headers: { set: vi.fn() } };
    const error = { response: { status: 401 }, config: originalRequest, isAxiosError: true };

    await expect(onRejected(error)).rejects.toBe(error);
    expect(mockPost).not.toHaveBeenCalled();
    expect(storeModule.store.dispatch).not.toHaveBeenCalled();
  });
});
