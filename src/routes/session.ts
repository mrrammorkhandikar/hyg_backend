import { redis } from "../db/redis";

async function setCache(key: string, value: string) {
  await redis.set(key, value, "EX", 3600); // expires in 1 hour
}

async function getCache(key: string) {
  return await redis.get(key);
}
