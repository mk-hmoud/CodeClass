import { createClient } from 'redis';

const logMessage = (functionName: string, message: string): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Redis] [${functionName}] ${message}`);
};

const REDIS_URL = process.env.REDIS_URL || 
                 `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
const redisClient = createClient({
    url: REDIS_URL
});

redisClient.on('error', (err) => 
    logMessage('RedisError', `Client error: ${err.message}`));
redisClient.on('connect', () => 
    logMessage('Redis', 'Connecting to Redis...'));
redisClient.on('ready', () => 
    logMessage('Redis', 'Redis client ready'));
redisClient.on('reconnecting', () => 
    logMessage('Redis', 'Reconnecting to Redis...'));

(async () => {
    try {
        await redisClient.connect();
        logMessage('Redis', 'Successfully connected to Redis server');
    } catch (err) {
        logMessage('Redis', `Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        //process.exit(1);
    }
})();

export default redisClient;