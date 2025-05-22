export default async function handler(req: any, res: any) {
  const url = 'https://api.smtp.dev' + (req.url?.replace('/api/proxy', '') || '');
  const response = await fetch(url, {
    method: req.method,
    headers: { ...req.headers, host: undefined }, // loại bỏ host để tránh lỗi
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  });

  const data = await response.arrayBuffer();
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-encoding') res.setHeader(key, value);
  });
  res.send(Buffer.from(data));
} 