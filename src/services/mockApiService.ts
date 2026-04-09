import axios from 'axios';

export type MockPost = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
};

type CreateMockPostInput = {
  title: string;
  content: string;
};

type UpdateMockPostInput = {
  title?: string;
  content?: string;
};

const BASE_URL = 'https://69d1514b90cd06523d5e04eb.mockapi.io';
const POSTS_URL = `${BASE_URL}/posts`;

type MockApiErrorCode = 'NETWORK' | 'HTTP' | 'UNKNOWN';

export class MockApiError extends Error {
  code: MockApiErrorCode;

  constructor(code: MockApiErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function isMockApiConnectionError(err: unknown): boolean {
  return err instanceof MockApiError && err.code === 'NETWORK';
}

function normalizePost(raw: unknown): MockPost {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(obj.id ?? ''),
    title: String(obj.title ?? ''),
    content: String(obj.content ?? ''),
    createdAt: String(obj.createdAt ?? new Date(0).toISOString()),
  };
}

async function requestJson<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown,
): Promise<T> {
  try {
    const response = await axios.request<T>({
      method,
      url,
      data,
      timeout: 20_000,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (err) {
    if (err instanceof MockApiError) throw err;
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        throw new MockApiError('NETWORK', 'Mock API bağlantısı kurulamadı.');
      }
      throw new MockApiError('HTTP', `Mock API hatası (${err.response.status})`);
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/network|internet|failed/i.test(msg)) {
      throw new MockApiError('NETWORK', 'Mock API bağlantısı kurulamadı.');
    }
    throw new MockApiError('UNKNOWN', msg || 'Bilinmeyen Mock API hatası.');
  }
}

export async function listMockPosts(): Promise<MockPost[]> {
  const data = await requestJson<unknown[]>('GET', POSTS_URL);
  const toSortableMs = (value: string): number => {
    const asNum = Number(value);
    if (Number.isFinite(asNum)) return asNum;
    const asDate = Date.parse(value);
    return Number.isFinite(asDate) ? asDate : 0;
  };
  return (Array.isArray(data) ? data : [])
    .map(normalizePost)
    .sort((a, b) => toSortableMs(b.createdAt) - toSortableMs(a.createdAt));
}

export async function createMockPost(input: CreateMockPostInput): Promise<MockPost> {
  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) throw new Error('Başlık ve içerik zorunludur.');
  const createdAt = new Date().toISOString();
  const data = await requestJson<unknown>('POST', POSTS_URL, { title, content, createdAt });
  return normalizePost(data);
}

export async function updateMockPost(id: string, input: UpdateMockPostInput): Promise<MockPost> {
  const payload: Record<string, string> = {};
  if (typeof input.title === 'string' && input.title.trim()) payload.title = input.title.trim();
  if (typeof input.content === 'string' && input.content.trim()) payload.content = input.content.trim();
  const data = await requestJson<unknown>('PUT', `${POSTS_URL}/${encodeURIComponent(id)}`, payload);
  return normalizePost(data);
}

export async function deleteMockPost(id: string): Promise<void> {
  await requestJson<unknown>('DELETE', `${POSTS_URL}/${encodeURIComponent(id)}`);
}
