# Internal Architecture: `/api/v1/generate`

> 内部技术文档 - 仅供开发参考

## 数据流概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           客户端请求                                          │
│  POST /api/v1/generate                                                       │
│  Headers: { "X-API-Key": "xxx" }                                            │
│  Body: { "prompt": "A hedgehog reading a book" }                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     1. 认证层 (route.ts)                                     │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐               │
│  │ 验证 API Key  │ -> │ 查找用户       │ -> │ 检查积分      │               │
│  │ (apikey表)    │    │ (user表)      │    │ (credit表)    │               │
│  └───────────────┘    └───────────────┘    └───────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                2. 图片生成层 (gemini-client.ts)                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  构建请求 Parts:                                                        │  │
│  │  1. SYSTEM_STYLE_PROMPT (风格提示词)                                    │  │
│  │  2. 5张参考图片 Base64 (public/reference-images/style-1~5.png)         │  │
│  │  3. 用户 prompt                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  调用 Gemini API                                                        │  │
│  │  POST https://generativelanguage.googleapis.com/v1beta/models/         │  │
│  │       gemini-3-pro-image-preview:generateContent                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  3. 存储层 (storage.ts)                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  上传图片到 Cloudflare R2 / AWS S3                                      │  │
│  │  Key: illustrations/{uuid}.png                                         │  │
│  │  返回: https://{r2_domain}/illustrations/{uuid}.png                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               4. 数据持久化层 (ai_task.ts)                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  数据库事务:                                                            │  │
│  │  1. INSERT ai_task 记录                                                │  │
│  │  2. 调用 consumeCredits() 扣除 2 积分                                  │  │
│  │  3. UPDATE ai_task.credit_id                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           返回响应                                            │
│  { code: 0, message: "ok", data: { id, status, image_url } }                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 文件结构与职责

```
src/
├── app/api/v1/generate/
│   └── route.ts                    # API 入口点
│
├── core-services/image-generation/
│   ├── index.ts                    # 模块导出
│   ├── types.ts                    # TypeScript 类型定义
│   ├── constants.ts                # 常量配置
│   └── gemini-client.ts            # Gemini API 客户端
│
├── shared/
│   ├── services/
│   │   └── storage.ts              # 存储服务抽象
│   ├── models/
│   │   ├── ai_task.ts              # AI任务 CRUD
│   │   ├── apikey.ts               # API Key 验证
│   │   ├── user.ts                 # 用户查询
│   │   ├── credit.ts               # 积分管理
│   │   └── config.ts               # 配置读取
│   └── lib/
│       ├── resp.ts                 # HTTP 响应工具
│       └── hash.ts                 # UUID 生成
│
├── config/db/
│   └── schema.postgres.ts          # Drizzle ORM Schema
│
└── extensions/
    ├── ai/types.ts                 # AI 枚举类型
    └── storage/                    # R2/S3 Provider
```

---

## 核心代码块

### 1. API 入口 (`route.ts`)

```typescript
// src/app/api/v1/generate/route.ts

export async function POST(request: Request) {
  try {
    // 1. 认证
    const userApiKey = request.headers.get('X-API-Key');
    if (!userApiKey) {
      return respErr('API key is required. Please provide X-API-Key header.');
    }

    const apikeyRecord = await findApikeyByKey(userApiKey);
    if (!apikeyRecord) {
      return respErr('Invalid API key');
    }

    const user = await findUserById(apikeyRecord.userId);
    if (!user) {
      return respErr('User not found');
    }

    // 2. 解析请求
    const body = await request.json();
    const { prompt } = body;
    if (!prompt) {
      return respErr('prompt is required');
    }

    // 3. 获取配置
    const configs = await getAllConfigs();
    const geminiApiKey = configs.gemini_api_key || 
                         process.env.GEMINI_IMAGE_API_KEY || 
                         process.env.GEMINI_API_KEY;

    // 4. 检查积分
    const costCredits = 2;
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < costCredits) {
      return respErr('insufficient credits');
    }

    // 5. 生成图片
    const result = await generateIllustration({
      userPrompt: prompt,
      apiKey: geminiApiKey,
      model: DEFAULT_IMAGE_MODEL,
    });

    // 6. 创建任务记录 (含扣积分)
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType: AIMediaType.IMAGE,
      provider: 'gemini',
      model: DEFAULT_IMAGE_MODEL,
      prompt,
      scene: 'text-to-image',
      status: AITaskStatus.SUCCESS,
      costCredits,
      taskId: result.taskId,
      taskInfo: JSON.stringify({
        images: [{ imageUrl: result.imageUrl, imageType: result.mimeType }],
        status: 'success',
        createTime: result.createdAt,
      }),
    };
    await createAITask(newAITask);

    // 7. 返回结果
    return respData({
      id: newAITask.id,
      status: 'success',
      image_url: result.imageUrl,
    });
  } catch (e: any) {
    console.error('v1/generate failed', e);
    return respErr(e.message || 'Generation failed');
  }
}
```

### 2. Gemini 客户端 (`gemini-client.ts`)

```typescript
// src/core-services/image-generation/gemini-client.ts

export async function generateIllustration({
  userPrompt,
  apiKey,
  model = DEFAULT_IMAGE_MODEL,
}: GenerateIllustrationParams): Promise<GenerationResult> {
  
  // 1. 加载参考图片 (带缓存)
  const referenceImages = await loadReferenceImages();

  // 2. 构建请求 Parts
  const parts: GeminiRequestPart[] = [
    { text: SYSTEM_STYLE_PROMPT },                    // 风格提示词
    ...referenceImages.map(img => ({                  // 5张参考图
      inlineData: { mimeType: img.mimeType, data: img.data }
    })),
    { text: userPrompt },                             // 用户提示词
  ];

  // 3. 调用 Gemini API
  const apiUrl = `${GEMINI_API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: { role: 'user', parts },
      generation_config: { response_modalities: ['TEXT', 'IMAGE'] },
    }),
  });

  const data = await response.json();
  const imagePart = data.candidates[0].content.parts.find((p: any) => p.inlineData);

  // 4. 上传到存储
  const { getStorageService } = await import('@/shared/services/storage');
  const storageService = await getStorageService();
  
  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const key = `illustrations/${getUuid()}.png`;
  
  const uploadResult = await storageService.uploadFile({
    body: buffer,
    key,
    contentType: imagePart.inlineData.mimeType,
  });

  return {
    taskId: nanoid(),
    imageUrl: uploadResult.url,
    mimeType: imagePart.inlineData.mimeType,
    createdAt: new Date(),
  };
}
```

### 3. 任务记录创建 (`ai_task.ts`)

```typescript
// src/shared/models/ai_task.ts

export async function createAITask(newAITask: NewAITask) {
  const result = await db().transaction(async (tx: any) => {
    // 1. 插入任务记录
    const [taskResult] = await tx.insert(aiTask).values(newAITask).returning();

    // 2. 扣除积分
    if (newAITask.costCredits && newAITask.costCredits > 0) {
      const consumedCredit = await consumeCredits({
        userId: newAITask.userId,
        credits: newAITask.costCredits,
        scene: newAITask.scene,
        description: `generate ${newAITask.mediaType}`,
        metadata: JSON.stringify({
          type: 'ai-task',
          mediaType: taskResult.mediaType,
          taskId: taskResult.id,
        }),
        tx,
      });

      // 3. 关联积分记录
      if (consumedCredit?.id) {
        await tx.update(aiTask)
          .set({ creditId: consumedCredit.id })
          .where(eq(aiTask.id, taskResult.id));
      }
    }

    return taskResult;
  });

  return result;
}
```

---

## 数据库 Schema

### `ai_task` 表

```typescript
// src/config/db/schema.postgres.ts

export const aiTask = table('ai_task', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(),      // 'image'
  provider: text('provider').notNull(),          // 'gemini'
  model: text('model').notNull(),                // 'gemini-3-pro-image-preview'
  prompt: text('prompt').notNull(),              // 用户输入的 prompt
  options: text('options'),                      // JSON, 额外选项
  status: text('status').notNull(),              // 'pending' | 'processing' | 'success' | 'failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at'),
  taskId: text('task_id'),                       // Gemini 返回的 ID
  taskInfo: text('task_info'),                   // JSON: { images: [{imageUrl, imageType}], status, createTime }
  taskResult: text('task_result'),               // 原始响应
  costCredits: integer('cost_credits').notNull().default(0),  // 消耗积分数
  scene: text('scene').notNull().default(''),    // 'text-to-image'
  creditId: text('credit_id'),                   // 关联的积分消费记录
});
```

### `apikey` 表

```typescript
export const apikey = table('apikey', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),                    // API Key 值
  title: text('title').notNull(),                // 用户自定义名称
  status: text('status').notNull(),              // 'active' | 'revoked'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()).notNull(),
  deletedAt: timestamp('deleted_at'),
});
```

---

## 类型定义

### 请求参数

```typescript
// src/core-services/image-generation/types.ts

interface GenerateIllustrationParams {
  userPrompt: string;   // 用户场景描述
  apiKey: string;       // Gemini API Key
  model?: string;       // 可选，默认 'gemini-3-pro-image-preview'
}
```

### 生成结果

```typescript
interface GenerationResult {
  taskId: string;       // 唯一任务 ID (nanoid)
  imageUrl: string;     // 上传后的图片 URL
  mimeType: string;     // 'image/png' | 'image/jpeg'
  createdAt: Date;      // 生成时间
}
```

### 任务状态枚举

```typescript
// src/extensions/ai/types.ts

enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

enum AIMediaType {
  MUSIC = 'music',
  IMAGE = 'image',
  VIDEO = 'video',
  TEXT = 'text',
  SPEECH = 'speech',
}
```

---

## 常量配置

```typescript
// src/core-services/image-generation/constants.ts

// 风格提示词
export const SYSTEM_STYLE_PROMPT = `Analyze the attached reference images and replicate the exact visual style, line work, and atmosphere so that the new illustration appears to be from the same physical book.

Use medium dry watercolor with overlapping watercolor strokes to create variety and texture. Background should has less object details and firm lines, but the texture with water color strokes still needs to be there. Ensure characters are anthropomorphic animals wearing clothing.`;

// 参考图片路径
export const REFERENCE_IMAGE_PATHS = [
  '/reference-images/style-1.png',
  '/reference-images/style-2.png',
  '/reference-images/style-3.png',
  '/reference-images/style-4.png',
  '/reference-images/style-5.png',
];

// 默认模型
export const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';

// API 基础 URL
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
```

---

## 存储配置

```typescript
// src/shared/services/storage.ts

// 支持两种存储后端:
// 1. Cloudflare R2 (默认)
// 2. AWS S3

// 配置项 (从 config 表或环境变量读取):
// - r2_access_key, r2_secret_key, r2_bucket_name, r2_domain
// - s3_access_key, s3_secret_key, s3_bucket, s3_domain
```

---

## 数据存储位置总结

| 数据 | 存储位置 | 表/路径 |
|------|---------|---------|
| 用户信息 | Supabase PostgreSQL | `user` |
| API Key | Supabase PostgreSQL | `apikey` |
| 积分记录 | Supabase PostgreSQL | `credit` |
| AI 任务记录 | Supabase PostgreSQL | `ai_task` |
| 参考图片 | 项目 public 目录 | `public/reference-images/` |
| 生成的图片 | Cloudflare R2 / AWS S3 | `illustrations/{uuid}.png` |
| 系统配置 | Supabase PostgreSQL / 环境变量 | `config` 表 |

---

## 响应格式工具

```typescript
// src/shared/lib/resp.ts

export function respData(data: any) {
  return Response.json({ code: 0, message: 'ok', data });
}

export function respErr(message: string) {
  return Response.json({ code: -1, message });
}
```
