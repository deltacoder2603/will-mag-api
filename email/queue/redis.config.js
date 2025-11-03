/**
 * Redis Configuration for BullMQ
 * 
 * Supports multiple Redis providers:
 * - Local Redis (development)
 * - Upstash (free tier - recommended for production)
 * - Redis Cloud
 * - Any Redis-compatible service
 */

import { Redis } from 'ioredis';

/**
 * Redis connection configuration
 * Priority: Environment variables > Local Redis
 */
const getRedisConfig = () => {
  // Check for Upstash or custom Redis URL
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  
  // Check for Upstash-specific env vars
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (token) {
      // Use Upstash HTTP-based connection
      console.log('📡 Using Upstash Redis');
      return {
        host: new URL(url).hostname,
        port: new URL(url).port || 6379,
        password: token,
        tls: {}
      };
    }
  }
  
  // Default: Local Redis
  console.log('📡 Using Local Redis (localhost:6379)');
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false
  };
};

/**
 * Create Redis connection for BullMQ
 */
export function createRedisConnection() {
  const config = getRedisConfig();
  
  try {
    const redis = new Redis(config);
    
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
    
    redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
    
    return redis;
  } catch (error) {
    console.error('❌ Failed to create Redis connection:', error);
    throw error;
  }
}

/**
 * Get BullMQ connection options
 */
export function getQueueConnection() {
  return {
    connection: getRedisConfig()
  };
}

/**
 * Test Redis connection
 */
export async function testRedisConnection() {
  const redis = createRedisConnection();
  
  try {
    await redis.ping();
    console.log('✅ Redis connection test: SUCCESS');
    await redis.quit();
    return true;
  } catch (error) {
    console.error('❌ Redis connection test: FAILED', error.message);
    return false;
  }
}

export default {
  createRedisConnection,
  getQueueConnection,
  testRedisConnection
};

