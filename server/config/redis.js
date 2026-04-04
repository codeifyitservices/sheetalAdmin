import { config } from "./config.js";
import net from "node:net";

let redisReachableCache;

export const getRedisConnectionOptions = () => {
  if (config.redis.url) {
    return {
      url: config.redis.url,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
    maxRetriesPerRequest: null,
  };
};

export const hasRedisConfiguration = () =>
  Boolean(config.redis.url || config.redis.host || config.redis.port);

export const isRedisReachable = async () => {
  if (redisReachableCache === true) {
    return redisReachableCache;
  }

  if (!hasRedisConfiguration()) {
    return false;
  }

  const { host, port } = config.redis;

  const reachable = await new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(500);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });

  redisReachableCache = reachable ? true : undefined;
  return reachable;
};
