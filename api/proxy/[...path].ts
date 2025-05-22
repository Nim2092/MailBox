export default async function handler(req: any, res: any) {
  // Lấy path động và query string
  const match = req.url.match(/^\/api\/proxy(\/.*)?$/);
  const path = match && match[1] ? match[1] : '';
  const url = 'https://api.smtp.dev' + path + (req._parsedUrl?.search || '');

  // Loại bỏ các header không hợp lệ
  const { host, connection, ...headers } = req.headers;
  const response = await fetch(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  });

  const data = await response.arrayBuffer();
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-encoding') res.setHeader(key, value);
  });
  res.send(Buffer.from(data));
} 