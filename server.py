#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地测试服务器：静态文件 + Netlify Functions 模拟代理
运行：python server.py
访问：http://localhost:8000
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import urllib.error
import json
import time
import os
import ssl
import hmac
import hashlib
from datetime import datetime, timezone

# ============ ⚠️ 配置：填入你自己的 Key ============
AI_API_KEY = '你的API KEY'
AI_BASE_URL = '你的API地址'
AI_MODEL = 'AI对话模型
VISION_MODEL = 'AI视觉模型'

TENCENT_SECRET_ID = '腾讯云Secretld'
TENCENT_SECRET_KEY = '腾讯云SecretKey'
TENCENT_REGION = 'ap-shanghai'
# ===================================================

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


# ============ 腾讯云 TC3-HMAC-SHA256 签名 ============
def _sha256_hex(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


def _hmac_sha256(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()


def tencent_sign(secret_id, secret_key, payload_str, host, service, region):
    algorithm = 'TC3-HMAC-SHA256'
    timestamp = int(time.time())
    date = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime('%Y-%m-%d')
    canonical_request = '\n'.join([
        'POST', '/', '',
        f'content-type:application/json; charset=utf-8\nhost:{host}\n',
        'content-type;host',
        _sha256_hex(payload_str)
    ])
    credential_scope = f'{date}/{service}/tc3_request'
    string_to_sign = '\n'.join([
        algorithm, str(timestamp), credential_scope,
        _sha256_hex(canonical_request)
    ])
    secret_date = _hmac_sha256(('TC3' + secret_key).encode('utf-8'), date)
    secret_service = _hmac_sha256(secret_date, service)
    secret_signing = _hmac_sha256(secret_service, 'tc3_request')
    signature = hmac.new(secret_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()
    return f'{algorithm} Credential={secret_id}/{credential_scope}, SignedHeaders=content-type;host, Signature={signature}'


# ============ 腾讯云一句话识别 ============
def tencent_asr(audio_base64, data_len):
    host = 'asr.tencentcloudapi.com'
    service = 'asr'
    payload = {
        'ProjectId': 0,
        'SubServiceType': 2,
        'EngSerViceType': '16k_zh',
        'SourceType': 1,
        'VoiceFormat': 'wav',
        'Data': audio_base64,
        'DataLen': data_len
    }
    payload_str = json.dumps(payload)
    authorization = tencent_sign(
        TENCENT_SECRET_ID, TENCENT_SECRET_KEY,
        payload_str, host, service, TENCENT_REGION
    )
    timestamp = str(int(time.time()))
    req = urllib.request.Request(
        f'https://{host}',
        data=payload_str.encode('utf-8'),
        headers={
            'Content-Type': 'application/json; charset=utf-8',
            'Host': host,
            'Authorization': authorization,
            'X-TC-Action': 'SentenceRecognition',
            'X-TC-Version': '2019-06-14',
            'X-TC-Timestamp': timestamp,
            'X-TC-Region': TENCENT_REGION,
        },
        method='POST'
    )
    with urllib.request.urlopen(req, context=ssl_ctx) as r:
        data = json.loads(r.read())
    resp = data.get('Response', {})
    if resp.get('Result'):
        return {'err_no': 0, 'result': [resp['Result']], 'err_msg': 'success'}
    err = resp.get('Error', {})
    return {'err_no': -1, 'result': [], 'err_msg': err.get('Message', '识别失败')}


# ============ HTTP 服务器 ============
class Handler(http.server.SimpleHTTPRequestHandler):

    def do_POST(self):
        if self.path.startswith('/.netlify/functions/ai-proxy'):
            self.handle_proxy()
        else:
            self.send_error(404)

    def handle_proxy(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        action = params.get('action', [None])[0]

        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length)

        try:
            if action == 'asr':
                body = json.loads(raw)
                result = tencent_asr(body['audio'], body['len'])
                self._json_response(200, result)
            elif action == 'solve':
                self.handle_solve(json.loads(raw))
            else:
                self.handle_ai_stream(json.loads(raw))
        except Exception as e:
            print('\n========== 【后端报错】 ==========')
            print(e)
            print('==================================\n')
            self._json_response(500, {'error': str(e)})

    def _json_response(self, code, obj):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode('utf-8'))

    def _forward_sse(self, payload_dict):
        payload_str = json.dumps(payload_dict).encode('utf-8')
        req = urllib.request.Request(
            f'{AI_BASE_URL}/chat/completions',
            data=payload_str,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {AI_API_KEY}'
            },
            method='POST'
        )
        try:
            resp = urllib.request.urlopen(req, context=ssl_ctx)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8', 'ignore')
            print('\n========== 【上游 HTTP 错误】 ==========')
            print('状态码:', e.code)
            print('响应:', err_body[:1000])
            print('========================================\n')
            self._json_response(e.code, {'error': err_body})
            return

        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'close')
        self.end_headers()
        try:
            while True:
                chunk = resp.read(1024)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        except Exception as e:
            print('流式转发中断:', e)

    def handle_ai_stream(self, body):
        self._forward_sse({
            'model': body.get('model') or AI_MODEL,
            'messages': body.get('messages', []),
            'stream': True
        })

    def handle_solve(self, body):
        image = body.get('image', '')
        if not image:
            self._json_response(400, {'error': '缺少图片数据'})
            return

        default_prompt = (
            '你是一位耐心、严谨的辅导老师。请识别图片中的题目并解答。\n\n'
            '【输出格式】\n'
            '1. **题目大意**：一句话概括\n'
            '2. **已知条件**：列出关键条件\n'
            '3. **解题思路**：整体思路\n'
            '4. **详细步骤**：分步骤解答\n'
            '5. **最终答案**：明确答案\n'
            '6. **考点总结**：涉及的知识点\n\n'
            '【LaTeX 语法要求 — 必须严格遵守】\n'
            '- 行内公式用 $...$，独立公式用 $$...$$\n'
            '- 禁止使用 \\begin{...} / \\end{...} 环境\n'
            '- 矩阵、行列式改用代数式表达\n'
            '- 分数用 \\frac{分子}{分母}\n'
            '- 向量用 \\vec{AB}\n'
            '- 平行用 \\parallel，垂直用 \\perp\n\n'
            '【重要】\n'
            '- 不要回显、引用或复述我发给你的图片数据\n'
            '- 直接从"题目大意"开始解答'
        )
        prompt = body.get('prompt') or default_prompt

        self._forward_sse({
            'model': VISION_MODEL,
            'messages': [{
                'role': 'user',
                'content': [
                    {'type': 'text', 'text': prompt},
                    {'type': 'image_url', 'image_url': {'url': image}}
                ]
            }],
            'stream': True
        })

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    PORT = 8000
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    with ThreadingServer(('', PORT), Handler) as httpd:
        print('=' * 60)
        print(f'✅ 本地服务器已启动：http://localhost:{PORT}')
        print('   按 Ctrl+C 停止')
        print('=' * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n服务器已停止')

