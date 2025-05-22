export const config = {
  api: {
    bodyParser: false, // Tắt bodyParser để tự xử lý stream
  },
};

export default async function handler(req: any, res: any) {
  // Lấy path động và query string
  const match = req.url.match(/^\/api\/proxy(\/.*)?$/);
  const path = match && match[1] ? match[1] : '';
  const url = 'https://api.smtp.dev' + path + (req._parsedUrl?.search || '');

  // Loại bỏ các header không hợp lệ
  const { host, connection, ...headers } = req.headers;

  // Đọc body nếu là POST/PUT/PATCH
  let body: Buffer | undefined = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  const response = await fetch(url, {
    method: req.method,
    headers,
    body: body === undefined ? undefined : body,
  });

  const data = await response.arrayBuffer();
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-encoding') res.setHeader(key, value);
  });
  res.send(Buffer.from(data));
} 