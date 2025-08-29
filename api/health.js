// Vercel Serverless Function - Health Check
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthInfo = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'vercel-serverless',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      limit: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };

  res.status(200).json(healthInfo);
}