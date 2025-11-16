import Redis from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()

const redisUrl = process.env.REDIS_URI
let client: Redis | null = null
if (redisUrl) client = new Redis(redisUrl)

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!client) return null
  const raw = await client.get(key)
  if (!raw) return null
  return JSON.parse(raw) as T
}
export async function cacheSet<T>(key: string, value: T | null, ttlSec = 60) {
  if (!client) return
  if (value === null) {
    await client.del(key)
    return
  }
  await client.set(key, JSON.stringify(value), 'EX', ttlSec)
}
