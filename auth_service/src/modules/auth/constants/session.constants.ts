export const ROTATE_SESSION_SCRIPT = `
local refresh_fingerprint = redis.call('HGET', KEYS[1], 'refresh_fingerprint')
local user_id = redis.call('HGET', KEYS[1], 'user_id')
if not refresh_fingerprint or refresh_fingerprint ~= ARGV[1] or user_id ~= ARGV[3] then
  return 0
end
redis.call('HSET', KEYS[1], 'refresh_fingerprint', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[4])
return 1
`;

export const REVOKE_SESSION_SCRIPT = `
local refresh_fingerprint = redis.call('HGET', KEYS[1], 'refresh_fingerprint')
local user_id = redis.call('HGET', KEYS[1], 'user_id')
if not refresh_fingerprint or refresh_fingerprint ~= ARGV[1] or user_id ~= ARGV[2] then
  return 0
end
redis.call('DEL', KEYS[1])
return 1
`;
