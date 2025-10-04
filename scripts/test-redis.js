#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Tests the Redis cache integration with the provided credentials
 */

const Redis = require('ioredis');
const colors = require('colors/safe');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const REDIS_URL = process.env.REDIS_URL || 'redis://default:Ff3H2oTwNmPZxLYKILwSvdi2L481mINH@redis-10486.c60.us-west-1-2.ec2.redns.redis-cloud.com:10486';

console.log(colors.cyan('\n🔧 Redis Connection Test\n'));
console.log(colors.gray('Redis URL:'), REDIS_URL.replace(/:[^:@]*@/, ':****@'));

async function testRedisConnection() {
  let client;
  
  try {
    // Create Redis client
    console.log(colors.yellow('\n1. Connecting to Redis...'));
    client = new Redis(REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    });

    // Test ping
    console.log(colors.yellow('2. Testing PING command...'));
    const pingResult = await client.ping();
    console.log(colors.green('   ✓ PING successful:'), pingResult);

    // Test SET
    console.log(colors.yellow('\n3. Testing SET operation...'));
    const testKey = 'describe_it:test:connection';
    const testValue = { message: 'Redis connection successful', timestamp: Date.now() };
    await client.setex(testKey, 60, JSON.stringify(testValue));
    console.log(colors.green('   ✓ SET successful'));

    // Test GET
    console.log(colors.yellow('4. Testing GET operation...'));
    const retrieved = await client.get(testKey);
    const parsed = JSON.parse(retrieved);
    console.log(colors.green('   ✓ GET successful:'), parsed.message);

    // Test EXISTS
    console.log(colors.yellow('\n5. Testing EXISTS operation...'));
    const exists = await client.exists(testKey);
    console.log(colors.green('   ✓ EXISTS successful:'), exists === 1 ? 'Key exists' : 'Key not found');

    // Test DEL
    console.log(colors.yellow('6. Testing DELETE operation...'));
    const deleted = await client.del(testKey);
    console.log(colors.green('   ✓ DELETE successful:'), deleted === 1 ? 'Key deleted' : 'Key not found');

    // Test INFO
    console.log(colors.yellow('\n7. Getting Redis server info...'));
    const info = await client.info('server');
    const lines = info.split('\n');
    const version = lines.find(l => l.startsWith('redis_version:'));
    const mode = lines.find(l => l.startsWith('redis_mode:'));
    console.log(colors.green('   ✓ Redis Version:'), version?.split(':')[1]?.trim() || 'Unknown');
    console.log(colors.green('   ✓ Redis Mode:'), mode?.split(':')[1]?.trim() || 'Unknown');

    // Test performance
    console.log(colors.yellow('\n8. Testing performance...'));
    const perfKey = 'describe_it:perf:test';
    const iterations = 100;
    
    const writeStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await client.set(`${perfKey}:${i}`, JSON.stringify({ value: i }), 'EX', 60);
    }
    const writeTime = Date.now() - writeStart;
    
    const readStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await client.get(`${perfKey}:${i}`);
    }
    const readTime = Date.now() - readStart;
    
    // Cleanup
    const keys = await client.keys(`${perfKey}:*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    
    console.log(colors.green('   ✓ Write performance:'), `${iterations} ops in ${writeTime}ms (${Math.round(iterations * 1000 / writeTime)} ops/sec)`);
    console.log(colors.green('   ✓ Read performance:'), `${iterations} ops in ${readTime}ms (${Math.round(iterations * 1000 / readTime)} ops/sec)`);

    // Test cache namespace
    console.log(colors.yellow('\n9. Testing cache namespace...'));
    await client.setex('describe_it:images:test1', 60, JSON.stringify({ type: 'image' }));
    await client.setex('describe_it:descriptions:test1', 60, JSON.stringify({ type: 'description' }));
    await client.setex('describe_it:phrases:test1', 60, JSON.stringify({ type: 'phrase' }));
    
    const namespaceKeys = await client.keys('describe_it:*');
    console.log(colors.green('   ✓ Namespace keys found:'), namespaceKeys.length);
    
    // Cleanup namespace test keys
    if (namespaceKeys.length > 0) {
      await client.del(...namespaceKeys);
    }

    console.log(colors.green('\n✅ All Redis tests passed successfully!\n'));
    console.log(colors.cyan('Redis is properly configured and ready to use.'));
    
    return true;
  } catch (error) {
    console.error(colors.red('\n❌ Redis test failed:'), error.message);
    console.error(colors.yellow('\nTroubleshooting tips:'));
    console.error('1. Check if REDIS_URL is correctly set in .env.local');
    console.error('2. Verify Redis server is accessible from your network');
    console.error('3. Check if credentials are valid');
    console.error('4. Ensure Redis server is running');
    return false;
  } finally {
    if (client) {
      client.disconnect();
    }
  }
}

// Run the test
testRedisConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error(colors.red('Unexpected error:'), error);
  process.exit(1);
});