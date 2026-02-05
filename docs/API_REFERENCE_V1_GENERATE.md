# TaleScale AI - Image Generation API Reference

> `/api/v1/generate` - Watercolor Illustration Generation API

## Overview

This API generates watercolor-style illustrations from text descriptions. It uses Google's Gemini AI model with pre-configured style prompts and reference images to produce consistent, book-quality illustrations featuring anthropomorphic animal characters.

**Key Features:**
- Single endpoint for illustration generation
- Automatic style consistency via bundled reference images
- Credit-based usage tracking
- Generated images stored in cloud storage (R2/S3)

---

## Quick Start

### Basic Request

```bash
curl -X POST https://talescaleai.com/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"prompt": "A hedgehog reading a book in a cozy library"}'
```

### Response

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "success",
    "image_url": "https://storage.talescaleai.com/illustrations/550e8400-e29b-41d4-a716-446655440000.png"
  }
}
```

---

## Authentication

All requests require an API key passed via the `X-API-Key` header.

| Header | Required | Description |
|--------|----------|-------------|
| `X-API-Key` | Yes | Your personal API key obtained from the dashboard |
| `Content-Type` | Yes | Must be `application/json` |

### Getting Your API Key

1. Log in to your TaleScale AI account
2. Navigate to **Settings** → **API Keys**
3. Click **Create New API Key**
4. Copy and securely store your key

> ⚠️ **Security Note**: Keep your API key confidential. Do not expose it in client-side code or public repositories.

---

## Request

### Endpoint

```
POST /api/v1/generate
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Scene description for the illustration |

### Prompt Guidelines

For best results, your prompt should:
- Describe the scene, characters, and setting
- Include details about actions and emotions
- Specify environmental elements (lighting, weather, location)

**Good Example:**
```json
{
  "prompt": "A small rabbit wearing a blue coat, sitting by a window on a rainy day, drinking hot cocoa while reading an old book"
}
```

**Simple Example:**
```json
{
  "prompt": "A fox playing violin in an autumn forest"
}
```

---

## Response

### Success Response

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "string",
    "status": "success",
    "image_url": "string"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | number | `0` indicates success |
| `message` | string | `"ok"` on success |
| `data.id` | string | Unique task ID (UUID format) |
| `data.status` | string | Always `"success"` for successful generation |
| `data.image_url` | string | Direct URL to download the generated image |

### Error Response

```json
{
  "code": -1,
  "message": "Error description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | number | `-1` indicates error |
| `message` | string | Human-readable error description |

---

## Error Codes

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `API key is required. Please provide X-API-Key header.` | Missing API key header | Add `X-API-Key` header to your request |
| `Invalid API key` | API key not found or revoked | Verify your API key is correct and active |
| `User not found` | Associated user account issue | Contact support |
| `prompt is required` | Empty or missing prompt | Provide a non-empty `prompt` field |
| `Image generation service is not configured` | Server configuration issue | Contact support |
| `insufficient credits` | Account has no remaining credits | Purchase more credits |
| `Generation failed` | AI model error | Retry the request or modify your prompt |

---

## Credits & Pricing

| Operation | Credit Cost |
|-----------|-------------|
| Generate one illustration | 2 credits |

Check your remaining credits in the dashboard under **Settings** → **Billing**.

---

## Code Examples

### JavaScript / Node.js

```javascript
const generateIllustration = async (prompt) => {
  const response = await fetch('https://talescaleai.com/api/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.TALESCALE_API_KEY,
    },
    body: JSON.stringify({ prompt }),
  });

  const result = await response.json();
  
  if (result.code !== 0) {
    throw new Error(result.message);
  }
  
  return result.data;
};

// Usage
const illustration = await generateIllustration(
  'A wise owl teaching young mice in a treehouse classroom'
);
console.log('Image URL:', illustration.image_url);
```

### Python

```python
import requests
import os

def generate_illustration(prompt: str) -> dict:
    """Generate a watercolor illustration from a text prompt."""
    
    response = requests.post(
        'https://talescaleai.com/api/v1/generate',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': os.environ['TALESCALE_API_KEY'],
        },
        json={'prompt': prompt}
    )
    
    result = response.json()
    
    if result['code'] != 0:
        raise Exception(result['message'])
    
    return result['data']


# Usage
illustration = generate_illustration(
    'A brave mouse knight standing on a hilltop at sunset'
)
print(f"Image URL: {illustration['image_url']}")
```

### cURL

```bash
# Basic request
curl -X POST https://talescaleai.com/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TALESCALE_API_KEY" \
  -d '{"prompt": "A cat baker decorating cupcakes in a cozy kitchen"}'

# Download the generated image
curl -X POST https://talescaleai.com/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $TALESCALE_API_KEY" \
  -d '{"prompt": "A squirrel artist painting in the park"}' \
  | jq -r '.data.image_url' \
  | xargs curl -o illustration.png
```

### TypeScript with Error Handling

```typescript
interface GenerateResponse {
  code: number;
  message: string;
  data?: {
    id: string;
    status: string;
    image_url: string;
  };
}

class TaleScaleClient {
  private apiKey: string;
  private baseUrl = 'https://talescaleai.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateIllustration(prompt: string): Promise<{
    id: string;
    status: string;
    imageUrl: string;
  }> {
    if (!prompt?.trim()) {
      throw new Error('Prompt cannot be empty');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ prompt }),
    });

    const result: GenerateResponse = await response.json();

    if (result.code !== 0 || !result.data) {
      throw new Error(result.message || 'Generation failed');
    }

    return {
      id: result.data.id,
      status: result.data.status,
      imageUrl: result.data.image_url,
    };
  }
}

// Usage
const client = new TaleScaleClient(process.env.TALESCALE_API_KEY!);

try {
  const result = await client.generateIllustration(
    'A deer family having a picnic by a crystal-clear lake'
  );
  console.log('Generated image:', result.imageUrl);
} catch (error) {
  console.error('Failed to generate:', error.message);
}
```

---

## Rate Limits

| Limit Type | Value |
|------------|-------|
| Requests per minute | 10 |
| Requests per day | 100 |
| Concurrent requests | 2 |

> Rate limits may vary based on your subscription plan.

---

## Image Specifications

| Property | Value |
|----------|-------|
| Format | PNG |
| Style | Watercolor with dry brush texture |
| Characters | Anthropomorphic animals in clothing |
| Storage | Cloudflare R2 (CDN-accelerated) |
| Retention | Permanent (linked to your account) |

---

## System Behavior

### Style Consistency

The API automatically applies:
- **Style Prompt**: Instructions for watercolor technique with overlapping strokes
- **Reference Images**: 5 bundled style reference images
- **Character Style**: Anthropomorphic animals wearing clothing

You don't need to specify style in your prompt—just describe the scene.

### How It Works

```
Your Prompt → [Style Prompt + 5 Reference Images + Your Prompt] → Gemini AI → Generated Image → Cloud Storage → Image URL
```

---

## Troubleshooting

### "insufficient credits" Error

1. Check your credit balance in the dashboard
2. Purchase additional credits
3. Retry your request

### Unexpected Image Style

- Ensure your prompt describes a scene, not a style
- The system applies watercolor style automatically
- Focus on characters, actions, and setting

### Slow Response Time

- Generation typically takes 10-30 seconds
- Large/complex scenes may take longer
- Check server status if consistently slow

### Image Not Loading

- Verify the URL is complete
- Check if your IP is blocked by CDN
- Try accessing from a different network

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial release |

---

## Support

- **Email**: support@talescaleai.com
- **Documentation**: https://docs.talescaleai.com
- **Status Page**: https://status.talescaleai.com
