'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Wand2,
  Download,
  Sparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/compound/select';
import { useAuth } from '@/providers/auth-provider';
import { useUI } from '@/providers/ui-provider';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';

type UserMode = 'developers' | 'creators';
type CodeLanguage = 'typescript' | 'python' | 'curl';
type AspectRatio = '16:9' | '1:1' | '4:3';

const POLL_INTERVAL = 3000;

// localStorage utility for API keys (anonymous users)
const apiKeyStorage = {
  getKey: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('talecraft_api_key');
  },
  setKey: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('talecraft_api_key', key);
  },
  removeKey: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('talecraft_api_key');
  },
};

export function Hero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const { user } = useAuth();
  const { setIsShowSignModal } = useUI();

  const [userMode, setUserMode] = useState<UserMode>('developers');
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('typescript');
  const [apiKey, setApiKey] = useState('');
  const [codePrompt, setCodePrompt] = useState('A brave knight in an enchanted forest');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);

  // Default placeholder image
  const placeholderImage = 'https://images.unsplash.com/photo-1610308700652-d931026f7eec?w=800';

  const codeExamples: Record<CodeLanguage, string> = {
    typescript: `const response = await fetch('https://talescaleai.com/api/v1/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': '${apiKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "${codePrompt}",
    style: "children_book",
    aspect_ratio: "${aspectRatio}"
  })
});

const data = await response.json();
console.log(data.image_url);`,
    python: `import requests

url = "https://talescaleai.com/api/v1/generate"
headers = {
    "X-API-Key": "${apiKey || 'YOUR_API_KEY'}",
    "Content-Type": "application/json"
}
data = {
    "prompt": "${codePrompt}",
    "style": "children_book",
    "aspect_ratio": "${aspectRatio}"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result["image_url"])`,
    curl: `curl -X POST https://talescaleai.com/api/v1/generate \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "${codePrompt}",
    "style": "children_book",
    "aspect_ratio": "${aspectRatio}"
  }'`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[codeLanguage]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateApiKey = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }
    setIsGeneratingKey(true);
    setError(null);

    try {
      const resp = await fetch('/api/apikey/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Landing Page Key' }),
      });

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Failed to create API key');
      }

      // Fill the API key input with the new key
      if (data?.key) {
        setApiKey(data.key);
        // Also save to localStorage
        apiKeyStorage.setKey(data.key);
      }
    } catch (error: any) {
      console.error('Generate API key error:', error);
      setError(error.message || 'Failed to generate API key');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const pollTaskStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      const resp = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: id }),
      });

      if (!resp.ok) throw new Error(`Query failed: ${resp.status}`);

      const { code, data } = await resp.json();
      if (code !== 0) throw new Error('Query task failed');

      const status = data?.status as AITaskStatus;

      if (status === AITaskStatus.SUCCESS) {
        const taskInfo = data?.taskInfo ? JSON.parse(data.taskInfo) : null;
        const output = taskInfo?.output ?? taskInfo?.images ?? taskInfo?.data;
        let imageUrl = null;

        if (typeof output === 'string') {
          imageUrl = output;
        } else if (Array.isArray(output) && output.length > 0) {
          const first = output[0];
          imageUrl = typeof first === 'string' ? first : first?.url ?? first?.uri ?? first?.imageUrl;
        }

        if (imageUrl) {
          setGeneratedImage(imageUrl);
        }
        return true;
      }

      if (status === AITaskStatus.FAILED) {
        setError('Generation failed. Please try again.');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Poll error:', error);
      return true;
    }
  }, []);

  const handleGenerate = async () => {
    const currentPrompt = userMode === 'developers' ? codePrompt : prompt;

    if (!currentPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // Require API key in all modes
    if (!apiKey.trim()) {
      setError('Please generate or enter an API key first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Use public API with API key authentication
      const resp = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          style: 'children_book',
          aspect_ratio: aspectRatio,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        if (message?.includes('insufficient credits')) {
          setShowQuotaModal(true);
          return;
        }
        throw new Error(message || 'Generation failed');
      }

      const newTaskId = data?.id;
      if (!newTaskId) throw new Error('No task ID returned');

      setTaskId(newTaskId);

      // Check if the task is already completed (synchronous providers like Gemini)
      if (data.status === 'success' && data.image_url) {
        setGeneratedImage(data.image_url);
        setIsGenerating(false);
        setTaskId(null);
        return;
      }

      // Poll for result (for async providers like Replicate, Fal, etc.)
      const poll = async () => {
        const done = await pollTaskStatus(newTaskId);
        if (!done) {
          setTimeout(poll, POLL_INTERVAL);
        } else {
          setIsGenerating(false);
          setTaskId(null);
        }
      };

      setTimeout(poll, POLL_INTERVAL);
    } catch (error: any) {
      console.error('Generate error:', error);
      setError(error.message || 'Failed to generate image');
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const resp = await fetch(`/api/proxy/file?url=${encodeURIComponent(generatedImage)}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `talecraft-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(generatedImage, '_blank');
    }
  };

  // Quota Exceeded Modal
  const QuotaModal = () => {
    if (!showQuotaModal) return null;

    if (user) {
      return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Credits Depleted
              </h3>
              <p className="text-muted-foreground">
                You've used all your credits. Purchase more credits to continue generating images!
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                className="w-full"
                onClick={() => {
                  setShowQuotaModal(false);
                  window.location.href = '/pricing';
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Get More Credits
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowQuotaModal(false)}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Sign In Required
            </h3>
            <p className="text-muted-foreground">
              Sign in to generate images and unlock all features!
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full"
              onClick={() => {
                setShowQuotaModal(false);
                setIsShowSignModal(true);
              }}
            >
              Sign In / Sign Up
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowQuotaModal(false)}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      id={section.id}
      className={cn('py-section-sm', section.className, className)}
    >
      <QuotaModal />

      <div className="container">
        {/* Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border p-1 bg-muted/50">
            <button
              onClick={() => setUserMode('developers')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                userMode === 'developers'
                  ? 'bg-background shadow-sm border-b-2 border-brand-yellow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              For Developers
            </button>
            <button
              onClick={() => setUserMode('creators')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                userMode === 'creators'
                  ? 'bg-background shadow-sm border-b-2 border-brand-yellow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              For Creators (No code)
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl mb-4">
            {userMode === 'developers'
              ? 'Reliable Image Generation API'
              : 'No-Code Story Illustrator'
            }
          </h1>
          <p className="text-muted-foreground text-lg">
            {userMode === 'developers'
              ? 'Generate consistent style illustrations in seconds.'
              : 'Create consistent characters and scenes instantly.'
            }
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-start">
          {/* Left Panel */}
          <div className="space-y-4">
            {userMode === 'developers' ? (
              <>
                {/* Code Snippet */}
                <div className="bg-brand-dark-soft rounded-lg p-4 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1">
                      {(['typescript', 'python', 'curl'] as CodeLanguage[]).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setCodeLanguage(lang)}
                          className={cn(
                            'text-xs px-3 py-1.5 rounded transition-colors',
                            codeLanguage === lang
                              ? 'bg-brand-yellow text-brand-yellow-foreground'
                              : 'text-gray-400 hover:text-gray-200'
                          )}
                        >
                          {lang === 'typescript' ? 'TypeScript' : lang === 'python' ? 'Python' : 'cURL'}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-sm text-gray-300 overflow-x-auto max-h-[280px]">
                    <code>{codeExamples[codeLanguage]}</code>
                  </pre>
                </div>

                {/* Edit Prompt */}
                <div>
                  <label className="block text-sm mb-2">Edit Prompt</label>
                  <Input
                    type="text"
                    placeholder="A brave knight in an enchanted forest"
                    value={codePrompt}
                    onChange={(e) => setCodePrompt(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Changes will be reflected in the code snippet above
                  </p>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-sm mb-2">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {(['16:9', '1:1', '4:3'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        disabled={isGenerating}
                        className={cn(
                          'px-4 py-2 border rounded-lg transition-colors text-sm',
                          aspectRatio === ratio
                            ? 'bg-brand-yellow text-brand-yellow-foreground border-brand-yellow'
                            : 'border-border hover:border-brand-yellow/50'
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-sm mb-2">Your API Key</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="tc_sk_••••••••••••••••"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleGenerateApiKey}
                      disabled={isGeneratingKey}
                    >
                      {isGeneratingKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-1" />
                          Generate Key
                        </>
                      )}
                    </Button>
                  </div>
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>

                {/* Generate Illustration Button */}
                <Button
                  size="lg"
                  variant="brand"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || !apiKey.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Illustration
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Prompt Input */}
                <div>
                  <label className="block text-sm mb-2">Describe Your Story Scene</label>
                  <Textarea
                    placeholder="A brave knight in an enchanted forest..."
                    className="min-h-[120px] resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* Style Selection */}
                <div>
                  <label className="block text-sm mb-2">Art Style</label>
                  <Select defaultValue="vintage">
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vintage">Vintage Children's Book</SelectItem>
                      <SelectItem value="watercolor" disabled>Coming Soon...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="block text-sm mb-2">Format</label>
                  <div className="flex gap-2">
                    {(['16:9', '1:1', '4:3'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        disabled={isGenerating}
                        className={cn(
                          'px-4 py-2 border rounded-lg transition-colors text-sm',
                          aspectRatio === ratio
                            ? 'bg-brand-yellow text-brand-yellow-foreground border-brand-yellow'
                            : 'border-border hover:border-brand-yellow/50'
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-sm mb-2">Your API Key</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="sk-••••••••••••••••"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleGenerateApiKey}
                      disabled={isGeneratingKey}
                    >
                      {isGeneratingKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-1" />
                          Generate Key
                        </>
                      )}
                    </Button>
                  </div>
                  {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                </div>

                {/* Generate Button */}
                <Button
                  size="lg"
                  variant="brand"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || !apiKey.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Illustration
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Right Panel - Generated Image */}
          <div 
            className={cn(
              "relative rounded-xl overflow-hidden border bg-muted",
              aspectRatio === '16:9' && "aspect-[16/9]",
              aspectRatio === '1:1' && "aspect-square",
              aspectRatio === '4:3' && "aspect-[4/3]"
            )}
          >
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                  <Loader2 
                    className="w-8 h-8 mx-auto mb-2 text-gray-400" 
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  <p className="text-sm text-muted-foreground">Creating your illustration...</p>
                </div>
              </div>
            ) : (
              <img
                src={generatedImage || placeholderImage}
                alt={generatedImage ? "Generated illustration" : "Example illustration"}
                className="w-full h-full object-cover"
                onMouseEnter={() => setIsImageHovered(true)}
                onMouseLeave={() => setIsImageHovered(false)}
              />
            )}

            {/* Gallery link overlay */}
            <Link
              href="/showcases"
              className="absolute top-4 right-4 flex items-center gap-1.5 text-sm font-medium bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-brand-yellow hover:bg-black/60 transition-colors"
            >
              Check guide gallery for inspiration
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            {/* Download button when image is generated */}
            {generatedImage && (
              <button
                onClick={handleDownload}
                className={cn(
                  "absolute bottom-4 right-4 p-3 rounded-full bg-black/40 hover:bg-black/60 transition-all duration-200",
                  isImageHovered ? "opacity-100" : "opacity-0"
                )}
                title="Download image"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
