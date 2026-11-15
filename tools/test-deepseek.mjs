#!/usr/bin/env node
// Small smoke test for the same DeepSeek Responses endpoint used by the app.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../web/.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

let apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || '';
if (!apiKey && process.env.AI_CREDENTIALS_FILE) {
  try {
    apiKey = JSON.parse(readFileSync(process.env.AI_CREDENTIALS_FILE, 'utf8')).DEEPSEEK_API_KEY || '';
  } catch {
    console.error('FAIL: Không đọc được AI_CREDENTIALS_FILE.');
    process.exit(2);
  }
}
apiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
if (!apiKey) {
  console.error('FAIL: Thiếu AI_API_KEY. Đặt key trong web/.env hoặc biến môi trường AI_API_KEY.');
  process.exit(2);
}

const model = process.env.AI_MODEL || 'deepseek-flash';
let baseURL;
try {
  baseURL = new URL(process.env.AI_BASE_URL || 'https://api.deepseek.com');
  if (baseURL.protocol !== 'https:' || baseURL.hostname !== 'api.deepseek.com' ||
      baseURL.username || baseURL.password || baseURL.search || baseURL.hash) {
    throw new Error('invalid DeepSeek endpoint');
  }
} catch {
  console.error('FAIL: AI_BASE_URL phải là endpoint HTTPS của DeepSeek (https://api.deepseek.com).');
  process.exit(2);
}

const endpoint = `${baseURL.href.replace(/\/+$/, '')}/responses`;
console.log(`Đang kiểm tra ${endpoint} · model ${model} ...`);

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: 'Trả lời đúng một từ: OK',
      reasoning: { effort: 'none' },
      max_output_tokens: 32,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const hint = {
      400: 'Request không hợp lệ.',
      401: 'Key sai, hết hạn hoặc không thuộc tài khoản DeepSeek.',
      402: 'Tài khoản DeepSeek không đủ số dư.',
      403: 'Key không có quyền dùng dịch vụ này.',
      404: 'Sai model hoặc endpoint.',
      429: 'Đang bị giới hạn tốc độ gọi API.',
    }[response.status] || 'Lỗi từ DeepSeek hoặc kết nối trung gian.';
    const detail = String(body.error?.message || '').replaceAll(apiKey, '[ẩn key]').slice(0, 300);
    console.error(`FAIL HTTP ${response.status}: ${hint}${detail ? ` ${detail}` : ''}`);
    process.exitCode = 1;
  } else {
    const answer = body.output?.flatMap(item => item.content || [])
      .filter(part => part.type === 'output_text').map(part => part.text).join(' ').trim();
    if (body.status !== 'completed' || !answer) {
      console.error(`FAIL: DeepSeek trả trạng thái ${body.status || 'không rõ'} nhưng không có câu trả lời.`);
      process.exitCode = 1;
    } else {
      console.log(`OK: ${answer}`);
      console.log(`Model: ${body.model || model} · Tokens: ${body.usage?.total_tokens ?? 'không có'}`);
    }
  }
} catch (error) {
  const reason = error.name === 'TimeoutError' ? 'Quá 20 giây không có phản hồi.' :
    `Không kết nối được DeepSeek (${error.cause?.code || error.name}).`;
  console.error(`FAIL: ${reason}`);
  process.exitCode = 1;
}
