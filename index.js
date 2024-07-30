import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { scan } from '@ryntab/wappalyzer-node';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;

// Initialize Redis client
const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on('error', (error) => {
  console.error(`Redis error: ${error.message}`);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

const ensureFullyQualifiedDomain = (site) => {
  try {
    // Check if the site already has a protocol
    return new URL(site).href;
  } catch (e) {
    // If not, add http:// as the default protocol
    return new URL(`http://${site}`).href;
  }
};

const handleScanRequest = async (req, res) => {
  const site = req.body.site;

  if (!site) {
    return res.status(400).send({ error: "No site provided in the request body" });
  }

  const redisKey = site;

  try {
    // Ensure Redis client is connected
    if (!redis.isOpen) {
      await redis.connect();
    }

    // Check if the site has already been scanned and cached
    const cachedResult = await redis.get(redisKey);

    if (cachedResult) {
      console.log(`Found ${redisKey} in cache`);
      return res.send({ result: JSON.parse(cachedResult) });
    }

    console.log(`Scanning ${redisKey}`);
    const fullSiteUrl = ensureFullyQualifiedDomain(site);

    // Perform the scan
    const scanResult = await scan(fullSiteUrl, {});

    // Cache the result
    await redis.set(redisKey, JSON.stringify(scanResult));

    res.send({ result: scanResult });
  } catch (error) {
    console.error(`Error scanning site: ${error.message}`);
    res.status(500).send({ error: error.message });
  }
};

// Define API route
app.post('/api/scan', handleScanRequest);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Gracefully handle server shutdown
const shutdown = async () => {
  console.log('Shutting down server...');
  await redis.quit();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
