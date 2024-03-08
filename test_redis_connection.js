const redis = require('redis');

// Connect to Redis
const client = redis.createClient();

// Check if connection is successful
client.on('connect', () => {
    console.log('Connected to Redis');
});

// Handle any errors
client.on('error', (error) => {
    console.error('Redis error:', error);
});

// Close the connection
client.quit();
