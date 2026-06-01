```bash
corepack enable
corepack disable
corepack prepare pnpm@latest --activate
corepack use pnpm@latest
corepack use pnpm@10

yarn config set strict-ssl false
yarn install --network-timeout 100000
```
