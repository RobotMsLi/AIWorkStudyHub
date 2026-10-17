#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""专门下载 supabase-js，多镜像自动重试"""

import os
import urllib.request
import ssl

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

LIB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'js', 'lib')
os.makedirs(LIB_DIR, exist_ok=True)
DEST = os.path.join(LIB_DIR, 'supabase.min.js')

URLS = [
    # 国内镜像（优先）
    'https://registry.npmmirror.com/@supabase/supabase-js/-/supabase-js-2.39.0.tgz',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://fastly.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://gcore.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.zhimg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://npm.onmicrosoft.cn/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://cdn.jsdmirror.com/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
]

# 备选：tar.gz 版本（需要解压）
TARBALL_URLS = [
    'https://registry.npmmirror.com/@supabase/supabase-js/-/supabase-js-2.39.0.tgz',
]


def download(url, dest):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    with urllib.request.urlopen(req, context=ssl_ctx, timeout=60) as r:
        data = r.read()
    with open(dest, 'wb') as f:
        f.write(data)
    return len(data)


def main():
    if os.path.exists(DEST) and os.path.getsize(DEST) > 10000:
        print('supabase.min.js 已存在，跳过')
        return

    print('=' * 60)
    print('下载 supabase-js...')
    print('=' * 60)

    # 方案 1：直接下 js 文件
    for url in URLS:
        print(f'  尝试: {url[:90]}')
        try:
            size = download(url, DEST)
            # 检查是否是 js 文件（首字符可能是 / 或 ! 或 v）
            with open(DEST, 'r', encoding='utf-8', errors='ignore') as f:
                head = f.read(200)
            if 'function' in head or 'var' in head or '!function' in head or head.strip().startswith('/*'):
                print(f'✓ 成功 ({size // 1024} KB)')
                return
            else:
                print(f'    ✗ 内容不是 JS（可能是错误页）')
                os.remove(DEST)
        except Exception as e:
            print(f'    ✗ {str(e)[:80]}')

    # 方案 2：下载 tar.gz 解压
    print('\n尝试下载 tar.gz 包并解压...')
    for url in TARBALL_URLS:
        print(f'  尝试: {url[:90]}')
        try:
            tmp_tgz = os.path.join(LIB_DIR, '_supabase.tgz')
            size = download(url, tmp_tgz)
            print(f'    下载成功 ({size // 1024} KB)，正在解压...')
            import tarfile
            with tarfile.open(tmp_tgz, 'r:gz') as tar:
                # 找到 dist/umd/supabase.js
                target = None
                for member in tar.getmembers():
                    if member.name.endswith('dist/umd/supabase.js'):
                        target = member
                        break
                if target:
                    f = tar.extractfile(target)
                    with open(DEST, 'wb') as out:
                        out.write(f.read())
                    print(f'✓ 解压成功，已保存到 {DEST}')
                    os.remove(tmp_tgz)
                    return
                else:
                    print('    ✗ tar 包中未找到 supabase.js')
            os.remove(tmp_tgz)
        except Exception as e:
            print(f'    ✗ {str(e)[:80]}')

    print('\n所有镜像都失败，请尝试：')
    print('1. 用手机热点让电脑联网，重跑本脚本')
    print('2. 挂代理后重跑')
    print('3. 浏览器直接访问 https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js 下载')


if __name__ == '__main__':
    main()