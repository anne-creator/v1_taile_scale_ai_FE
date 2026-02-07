kill -9 $(lsof -ti:3000)

## 部署前类型检查

`pnpm dev` 不做完整类型检查，类型错误不会阻止开发服务器运行，但 Vercel 部署时执行 `pnpm build` 会严格检查，类型错误会导致构建失败。

提交代码前建议执行以下任一命令：

```bash
# 完整构建（与 Vercel 部署行为一致）
pnpm build

# 仅类型检查（更快，不生成构建产物）
npx tsc --noEmit
```
