# AUTH — Cognitive Venture OS

> 认证与权限的权威说明。13 工厂里的第 5 个 Provider（AuthProvider）走 `lib/providers/auth.ts`；路由保护走 `middleware.ts`（edge runtime，cookie 存在性检查）；真用户解析走 `getAuthProvider().getCurrentUser()`。

## 1. 三种角色

| 角色 | 权限范围 | 典型场景 |
|---|---|---|
| `owner` | 全部（含删除、admin 配置） | 项目负责人 |
| `editor` | 写（创建 / 编辑） | 内容生产者 |
| `viewer` | 只读 | 旁观者 / 评审 |

`AuthProvider.hasRole(user, requiredRole)` 用 `ROLE_RANK` 做等级比较：`owner > editor > viewer`，传 `editor` 时 `owner` 和 `editor` 都过。

## 2. 派发逻辑

```
getAuthProvider()  // 在 lib/providers/auth.ts 工厂里
  if (APP_MODE ∈ {staging, production} && isSupabaseConfigured())
       → createSupabaseAuthProvider()  // @supabase/ssr
  else
       → createMockAuthProvider()      // 硬编码 3 个用户
```

**demo 模式永远走 mock**。即使 `SUPABASE_*` 配齐了，`APP_MODE` 必须是 `staging` 或 `production` 才会走真 Supabase。

## 3. Mock Auth（demo 模式）

三个硬编码用户，密码统一 `demo`：

| Email | 角色 | name |
|---|---|---|
| `owner@demo.local` | owner | Demo Owner |
| `editor@demo.local` | editor | Demo Editor |
| `viewer@demo.local` | viewer | Demo Viewer |

Session 存在 HTTP-only cookie `cv_session` 里，值 = `base64url(JSON(user))`，24h 过期。

**Demo 模式登录页直接出 3 个一键登录按钮**（owner / editor / viewer），不用手敲邮箱密码。

**显式不做的**（mock 限制）：
- 密码明文比对（**仅** demo 用）
- cookie 不签名（**仅** demo 用）
- 没有 refresh / token rotation

## 4. Supabase Auth（staging / production）

走 `@supabase/ssr` 的 `createServerClient`，cookie 由 SDK 自动管理。

角色从 `user.app_metadata.role` 读（`user_metadata` 兜底），**缺省 `viewer`**（保守默认 —— 不知道给什么权限就给最少）。

**Supabase 后台设置 role**：在 `auth.users.app_metadata` 里加 `{"role": "owner"}`。也可以用 SQL：

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}'::jsonb
where email = 'someone@example.com';
```

生产环境建议用 Supabase Auth Hooks / Edge Functions 在 sign-up 时自动赋 `viewer`，admin 手动提权到 `editor` / `owner`。

## 5. 路由保护（middleware.ts）

`middleware.ts` 跑在 edge runtime，**只检查 `cv_session` cookie 是否存在**：

- 未登录 + 访问受保护路由 → `redirect(/login?next=<原路径>)`
- 已登录 + 访问 `/login` → `redirect(/)`
- `/login` 自己永远放行
- `_next/*` / `favicon.ico` / `robots.txt` 放行

**安全 trade-off**：edge 不做 JWT 校验（要网络 IO，延迟大）。恶意用户可以伪造 cookie 名绕过 middleware 抵达页面，但页面的 `getServerUser()` 会验失败 → 自动跳回 /login。这是 Supabase 官方文档推荐的模式。

## 6. 服务端 helpers（`lib/auth/session.ts`）

| 函数 | 用途 | 行为 |
|---|---|---|
| `getServerUser()` | 拿当前用户 | 未登录返 null（**不** redirect） |
| `requireUser(returnTo)` | RSC / action 要求登录 | 未登录 redirect `/login?next=<returnTo>` |
| `requireRole(role, returnTo)` | 要求最低角色 | 未登录跳 login；权限不足跳 `/?forbidden=<role>` |

调用方按需选择 —— 列表页用 `requireUser`，删除按钮背后用 `requireRole('owner', ...)`。

## 7. 文件清单

| 文件 | 作用 |
|---|---|
| `lib/providers/auth.ts` | AuthProvider 接口 + 工厂（13 工厂的第 5 个） |
| `lib/providers/mock/auth.ts` | mock 实现（demo 模式） |
| `lib/providers/real/auth.ts` | Supabase 实现（staging / production） |
| `lib/auth/session.ts` | 服务端 helpers（getServerUser / requireUser / requireRole） |
| `middleware.ts` | edge 路由保护 |
| `app/login/page.tsx` | 登录页 RSC |
| `app/login/LoginForm.tsx` | 登录表单（client） |
| `app/login/actions.ts` | signInAction / quickSignInAction / signOutAction |
| `components/layout/Topbar.tsx` | 显示当前用户 + 登出按钮 |

## 8. 使用示例

### RSC 页面（只读）
```ts
import { requireUser } from '@/lib/auth/session';

export default async function Page() {
  const user = await requireUser('/research/topics');
  // user.id / user.email / user.role 可用
  // ...
}
```

### Server action（写）
```ts
'use server';
import { requireRole } from '@/lib/auth/session';

export async function deleteProject(id: string) {
  const user = await requireRole('editor', `/mvp/${id}`);
  // ...
}
```

### 隐藏 UI（按角色）
```tsx
import { getServerUser } from '@/lib/auth/session';
import { getAuthProvider } from '@/lib/providers';

export default async function Page() {
  const user = await getServerUser();
  const auth = await getAuthProvider();
  const canEdit = auth.hasRole(user, 'editor');
  return (
    <div>
      {canEdit && <Button>Edit</Button>}
    </div>
  );
}
```

## 9. 测试

`lib/providers/index.test.ts` 锁定 13 工厂的契约：
- `getAuthProvider()` 返回 instance
- `getAllProvidersHealth()` 长度 = 13，名字列表严格匹配
- `AuthProvider.health()` 在 demo 模式返 `ok: true`

Service 层（getServerUser / requireUser / requireRole）有 cookie 依赖，没写 vitest（vitest 是 node 环境，没 cookies()）。后续接 Supabase 后再加集成测试。

## 10. 已知限制

- **没有 RLS 策略**：AGENTS.md / DATABASE.md §4 已记录，MVP 阶段 RLS enabled 但无策略。Supabase Auth 上线前必须补策略（典型：用户表 + `auth.uid() = user_id`）。
- **密码学细节**：mock 模式 cookie 不签名、不加密，**不能用于生产**。即使 demo 模式被错误地部署到公开 URL，攻击者也能伪造 cookie —— demo 仅限受控环境。
- **没有 token refresh**：mock 24h 后 cookie 失效，用户重新登录。Supabase 模式下 SDK 自动 refresh。
- **/forbidden 页面未实现**：`requireRole` 失败时暂跳 `/?forbidden=<role>`，约定下次加 `/forbidden` 页面给清晰的权限拒绝 UI。
