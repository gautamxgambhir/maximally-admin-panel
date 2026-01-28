// Vercel cron job for newsletter scheduling
// This runs on Vercel and calls the Netlify API

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is a cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🚀 Vercel cron job triggering Netlify newsletter function...');
    
    // Call the Netlify function
    const response = await fetch('https://maximally.in/.netlify/functions/newsletter-cron?test=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    console.log('📧 Newsletter cron result:', result);

    return res.status(200).json({
      success: true,
      message: 'Newsletter cron triggered successfully',
      result: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Newsletter cron error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}