/**
 * Test Unsplash API key validity
 */

import { NextRequest, NextResponse } from 'next/server';
import { safeParse, safeStringify } from "@/lib/utils/json-safe";
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = safeParse(await request.text(), {});
    
    if (!apiKey) {
      return NextResponse.json({ 
        valid: false, 
        error: 'API key is required' 
      });
    }

    // Test the API key with Unsplash
    const response = await axios.get('https://api.unsplash.com/photos/random', {
      headers: {
        'Authorization': `Client-ID ${apiKey}`
      },
      params: {
        count: 1
      },
      timeout: 5000
    });

    if (response.status === 200) {
      // Check rate limit headers
      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];
      
      return NextResponse.json({ 
        valid: true, 
        message: `Valid! ${remaining}/${limit} requests remaining`,
        rateLimit: {
          remaining: parseInt(remaining) || 0,
          limit: parseInt(limit) || 0
        }
      });
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid API key' 
      });
    } else if (error.response?.status === 403) {
      return NextResponse.json({ 
        valid: false, 
        error: 'API key is rate limited' 
      });
    } else if (error.code === 'ECONNABORTED') {
      return NextResponse.json({ 
        valid: false, 
        error: 'Connection timeout - check your internet' 
      });
    }
    
    return NextResponse.json({ 
      valid: false, 
      error: 'Failed to validate API key' 
    });
  }
}