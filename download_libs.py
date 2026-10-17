#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""下载项目需要的第三方库到本地，绕过 CDN"""

import os
import sys
import urllib.request
import ssl

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# 目标文件夹
LIB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'js', 'lib')
CSS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'css', 'lib')
os.makedirs(LIB_DIR, exist_ok=True)
os.makedirs(CSS_DIR, exist_ok=True)

# 要下载的文件（多个镜像备选，自动重试）
FILES = [
    {
        'name': 'supabase.min.js',
        'urls': [
            'https://registry.npmmirror.com/@supabase/supabase-js/2.39.0/files/dist/umd/supabase.js',
            'https://cdn.bootcdn.net/ajax/libs/supabase-js/2.39.0/supabase.min.js',
            'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
        ],
        'dest': LIB_DIR,
    },
    {
        'name': 'mammoth.browser.min.js',
        'urls': [
            'https://registry.npmmirror.com/mammoth/1.6.0/files/mammoth.browser.min.js',
            'https://cdn.bootcdn.net/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
            'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js',
        ],
        'dest': LIB_DIR,
    },
    {
        'name': 'xlsx.full.min.js',
        'urls': [
            'https://registry.npmmirror.com/xlsx/0.18.5/files/dist/xlsx.full.min.js',
            'https://cdn.bootcdn.net/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
            'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        ],
        'dest': LIB_DIR,
    },
    {
        'name': 'marked.min.js',
        'urls': [
            'https://registry.npmmirror.com/marked/11.1.1/files/marked.min.js',
            'https://cdn.bootcdn.net/ajax/libs/marked/11.1.1/marked.min.js',
            'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js',
        ],
        'dest': LIB_DIR,
    },
    {
        'name': 'katex.min.js',
        'urls': [
            'https://registry.npmmirror.com/katex/0.16.9/files/dist/katex.min.js',
            'https://cdn.bootcdn.net/ajax/libs/KaTeX/0.16.9/katex.min.js',
            'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
        ],
        'dest': LIB_DIR,
    },
    {
        'name': 'auto-render.min.js',
        'urls': [
            'https://registry.npmmirror.com/katex/0.16.9/files/dist/contrib/auto-render.min.js',
            'https://cdn.bootcdn.net/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js',
            'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',
        ],
        'dest': LIB_DIR,
    },
    {
        'name': 'katex.min.css',
        'urls': [
            'https://registry.npmmirror.com/katex/0.16.9/files/dist/katex.min.css',
            'https://cdn.bootcdn.net/ajax/libs/KaTeX/0.16.9/katex.min.css',
            'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
        ],
        'dest': CSS_DIR,
    },
]


def download(url, dest_path):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as r:
        data = r.read()
    with open(dest_path, 'wb') as f:
        f.write(data)
    return len(data)


def main():
    print('=' * 60)
    print('开始下载第三方库到本地...')
    print('=' * 60)
    success = 0
    fail = 0
    for item in FILES:
        dest_path = os.path.join(item['dest'], item['name'])
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
            print(f'✓ {item["name"]:30s} 已存在，跳过')
            success += 1
            continue
        downloaded = False
        for url in item['urls']:
            try:
                print(f'  尝试: {url[:80]}...')
                size = download(url, dest_path)
                print(f'✓ {item["name"]:30s} 成功 ({size // 1024} KB)')
                success += 1
                downloaded = True
                break
            except Exception as e:
                print(f'    ✗ 失败: {str(e)[:60]}')
        if not downloaded:
            print(f'✗ {item["name"]:30s} 所有镜像都失败')
            fail += 1
    print('=' * 60)
    print(f'完成：{success} 成功，{fail} 失败')
    print('=' * 60)


if __name__ == '__main__':
    main()