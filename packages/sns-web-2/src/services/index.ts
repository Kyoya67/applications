export const host = process.env.API_HOST;

export const path = (path?: string) => `${host}${path}`;

export class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const handleSucceed = async (res: Response) => {
  if (!res.ok) {
    throw new FetchError(res.statusText, res.status);
  }

  const text = await res.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('JSON parse error:', text);
    throw new Error('Invalid JSON response');
  }
};

export const handleFailed = async (err: unknown) => {
  if (err instanceof FetchError) {
    console.warn(err.message);
  }
  throw err;
};
