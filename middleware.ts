/**
 * Edge middleware —— 路由保护统一入口。
 *
 * 规则：
 *   - 未登录 + 访问受保护路由 → 重定向到 /login?next=<原路径>
 *   - 已登录 + 访问 /login     → 重定向到 /
 *   - /login 自己永远放行
 *   - 静态资源 / _next / favicon 放行
 *
 * 设计：edge runtime **不**做完整 JWT / Supabase 验证（要网络 IO，延迟大），
 * 只检查 'cv_session' cookie 是否存在。真正的 user 解析在
 * lib/auth/session.ts → getAuthProvider().getCurrentUser() 里做。
 *
 * 安全 trade-off：恶意用户可以伪造 cookie 名绕过 middleware 抵达页面，
 * 但页面里的 getServerUser() 会验失败 → 跳回 /login。
 * 这是标准的 Next.js + Supabase 模式（参考 @supabase/ssr 文档）。
 */

import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'cv_session';
const PUBLIC_PATHS = new Set<string>(['/login']);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // 静态资源 / Next 内部 / favicon / robots / sitemap
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return true;
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  // 公开路径：放行
  if (isPublic(pathname)) {
    // 已登录访问 /login → 跳到首页（避免重复登录）
    if (pathname === '/login' && hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 受保护路径：未登录跳 /login?next=<原路径 + query>
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const next = pathname + (search ?? '');
    url.search = `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // matcher 排除静态资源，middleware 函数体再做一次精确判断
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
