import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/quotation-cm",
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
```

**2. 修改 `.env.production`（部署時使用的環境變數）：**
```
AUTH_URL=https://ai.chancemarketing.com.tw/quotation-cm
