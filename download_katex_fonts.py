#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""下载 KaTeX 字体文件"""

import os
import urllib.request
import ssl

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

BASE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE, 'css', 'lib', 'fonts')
os.makedirs(FONT_DIR, exist_ok=True)

# KaTeX 0.16.9 用到的字体文件
FONTS = [
    'KaTeX_AMS-Regular.woff2',
    'KaTeX_Caligraphic-Bold.woff2',
    'KaTeX_Caligraphic-Regular.woff2',
    'KaTeX_Fraktur-Bold.woff2',
    'KaTeX_Fraktur-Regular.woff2',
    'KaTeX_Main-Bold.woff2',
    'KaTeX_Main-BoldItalic.woff2',
    'KaTeX_Main-Italic.woff2',
    'KaTeX_Main-Regular.woff2',
    'KaTeX_Math-BoldItalic.woff2',
    'KaTeX_Math-Italic.woff2',
    'KaTeX_SansSerif-Bold.woff2',
    'KaTeX_SansSerif-Italic.woff2',
    'KaTeX_SansSerif-Regular.woff2',
    'KaTeX_Script-Regular.woff2',
    'KaTeX_Size1-Regular.woff2',
    'KaTeX_Size2-Regular.woff2',
    'KaTeX_Size3-Regular.woff2',
    'KaTeX_Size4-Regular.woff2',
    'KaTeX_Typewriter-Regular.woff2',
]

MIRRORS = [
    'https://fastly.jsdelivr.net/npm/katex@0.16.9/dist/fonts/{name}',
    'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/{name}',
    'https://registry.npmmirror.com/katex/0.16.9/files/dist/fonts/{name}',
    'https://unpkg.com/katex@0.16.9/dist/fonts/{name}',
]


def download(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as r:
        data = r.read()
    with open(dest, 'wb') as f:
        f.write(data)
    return len(data)


def main():
    print('=' * 60)
    print('开始下载 KaTeX 字体...')
    print('=' * 60)
    success = 0
    fail = 0
    for name in FONTS:
        dest = os.path.join(FONT_DIR, name)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            print(f'✓ {name} 已存在')
            success += 1
            continue
        downloaded = False
        for mirror in MIRRORS:
            url = mirror.format(name=name)
            try:
                size = download(url, dest)
                print(f'✓ {name} ({size // 1024} KB)')
                success += 1
                downloaded = True
                break
            except Exception as e:
                pass
        if not downloaded:
            print(f'✗ {name} 所有镜像失败')
            fail += 1
    print('=' * 60)
    print(f'完成：{success} 成功，{fail} 失败')
    print('=' * 60)


if __name__ == '__main__':
    main()