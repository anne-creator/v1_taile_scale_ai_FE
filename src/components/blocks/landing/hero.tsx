'use client';

import { useCallback, useEffect, useState } from 'react';
import { TextShimmer } from '@/components/animations/text-shimmer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/compound/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import { useUI } from '@/providers/ui-provider';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import { useAnonymousSession } from '@/hooks/use-anonymous-session';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

type UserMode = 'developers' | 'creators';
type CodeLanguage = 'typescript' | 'python' | 'curl';
type AspectRatio = '16:9' | '1:1' | '4:3';

const POLL_INTERVAL = 3000;

const DEFAULT_CODE_PROMPT =
  'A wise old owl wearing a velvet burgundy waistcoat and half-moon reading glasses, perched on a branch turned into a makeshift lectern, reading aloud from an oversized leather-bound book to a circle of wide-eyed baby woodland creatures sitting on toadstools, deep inside an ancient oak forest';

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
  const {
    session: anonSession,
    createSession: createAnonSession,
    updateRemainingGenerations,
    isLoading: isAnonLoading,
  } = useAnonymousSession();

  const [userMode, setUserMode] = useState<UserMode>('creators');
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>('typescript');
  const [apiKey, setApiKey] = useState('');
  const [codePrompt, setCodePrompt] = useState('');
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

  // Auto-fill API key from anonymous session when available
  useEffect(() => {
    if (!user && anonSession?.apiKey && !apiKey) {
      setApiKey(anonSession.apiKey);
    }
  }, [user, anonSession, apiKey]);

  // Default placeholder image - real TaleCraft generated illustration
  const placeholderImage =
    'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/dfddf168-b993-439a-adae-c7973d5a73d4.jpeg';

  const effectivePrompt = codePrompt || DEFAULT_CODE_PROMPT;

  const escapeForJSON = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const safeApiKey =
    apiKey && !/[\s'"\\{}]/.test(apiKey) ? apiKey : 'YOUR_API_KEY';
  const safePrompt = escapeForJSON(effectivePrompt);

  const codeExamples: Record<CodeLanguage, string> = {
    typescript: `const response = await fetch('https://talescaleai.com/api/v1/generate', {
  method: 'POST',
  headers: {
    'X-API-Key': '${safeApiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "${safePrompt}",
    style: "children_book",
    aspect_ratio: "${aspectRatio}"
  })
});

const result = await response.json();
console.log(result.data.image_url);`,
    python: `import requests

url = "https://talescaleai.com/api/v1/generate"
headers = {
    "X-API-Key": "${safeApiKey}",
    "Content-Type": "application/json"
}
data = {
    "prompt": "${safePrompt}",
    "style": "children_book",
    "aspect_ratio": "${aspectRatio}"
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result["data"]["image_url"])`,
    curl: `curl -X POST https://talescaleai.com/api/v1/generate \\
  -H "X-API-Key: ${safeApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "${safePrompt}",
    "style": "children_book",
    "aspect_ratio": "${aspectRatio}"
  }'`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[codeLanguage]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateApiKey = async () => {
    if (!user) {
      // For unauthenticated users, create an anonymous session
      const session = await createAnonSession();
      if (session) {
        setApiKey(session.apiKey);
        apiKeyStorage.setKey(session.apiKey);
      } else {
        setShowQuotaModal(true);
      }
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
          imageUrl =
            typeof first === 'string'
              ? first
              : (first?.url ?? first?.uri ?? first?.imageUrl);
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
    const currentPrompt = userMode === 'developers' ? effectivePrompt : prompt;

    if (!currentPrompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    let activeKey = apiKey;

    if (!activeKey.trim()) {
      if (!user) {
        // Anonymous user: provision a session automatically
        const session = await createAnonSession();
        if (!session) {
          setShowQuotaModal(true);
          return;
        }
        activeKey = session.apiKey;
        setApiKey(activeKey);
      } else if (userMode === 'creators') {
        // Logged-in creator: auto-generate an API key transparently
        setIsGeneratingKey(true);
        try {
          const resp = await fetch('/api/apikey/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Story Illustrator' }),
          });
          const { code, message, data } = await resp.json();
          if (code !== 0) throw new Error(message || 'Failed to create API key');
          activeKey = data?.key;
          if (activeKey) {
            setApiKey(activeKey);
            apiKeyStorage.setKey(activeKey);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to set up your session');
          setIsGeneratingKey(false);
          return;
        } finally {
          setIsGeneratingKey(false);
        }
      }
    }

    if (!activeKey?.trim()) {
      setError(
        userMode === 'developers'
          ? 'Please generate or enter an API key first'
          : 'Something went wrong setting up your session. Please try again.'
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const resp = await fetch('/api/v1/generate', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': activeKey,
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          style: 'children_book',
          aspect_ratio: aspectRatio,
        }),
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        setError(errorData.message || `Request failed: ${resp.status}`);
        setIsGenerating(false);
        return;
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        if (
          message?.includes('insufficient credits') ||
          message?.includes('insufficient quota') ||
          message?.includes('Insufficient quota')
        ) {
          if (anonSession) {
            updateRemainingGenerations(0);
          }
          setShowQuotaModal(true);
          return;
        }
        setError(message || 'Generation failed. Please try again.');
        setIsGenerating(false);
        return;
      }

      // Decrement anonymous remaining count on success
      if (anonSession && anonSession.remainingGenerations > 0) {
        updateRemainingGenerations(anonSession.remainingGenerations - 1);
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
      clearTimeout(timeout);
      const isTimeout = error.name === 'AbortError';
      console.error('Generate error:', error);
      setError(
        isTimeout
          ? 'Generation timed out. The server is under heavy load — please try again.'
          : error.message || 'Failed to generate image'
      );
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(generatedImage)}`
      );
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background w-full max-w-md space-y-4 rounded-xl p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <Sparkles className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Credits Depleted</h3>
              <p className="text-muted-foreground">
                You&apos;ve used all your credits. Purchase more credits to
                continue generating images!
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
                <Sparkles className="mr-2 h-4 w-4" />
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

    // Anonymous user or unauthenticated: prompt to sign up
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-background w-full max-w-md space-y-4 rounded-xl p-6 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <Sparkles className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              {anonSession
                ? 'Free Trial Complete'
                : 'Sign In Required'}
            </h3>
            <p className="text-muted-foreground">
              {anonSession
                ? 'You\'ve used all your free generations. Sign up to get more credits and unlock all features!'
                : 'Sign in to generate images and unlock all features!'}
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
              Sign Up for Free
              <ArrowRight className="ml-2 h-4 w-4" />
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
        <div className="mb-8 flex justify-center">
          <div className="bg-muted/50 inline-flex rounded-lg border p-1">
            <button
              onClick={() => setUserMode('developers')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                userMode === 'developers'
                  ? 'bg-background border-primary border-b-2 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              For Developers
            </button>
            <button
              onClick={() => setUserMode('creators')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                userMode === 'creators'
                  ? 'bg-background border-primary border-b-2 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              For Creators
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-5xl">
            {userMode === 'developers'
              ? 'Reliable Image Generation API'
              : 'Story Illustrator'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {userMode === 'developers'
              ? 'Generate consistent style illustrations in seconds.'
              : 'Generate high-quality illustrations in a consistent style.'}
          </p>
        </div>

        {/* Content Grid */}
        <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-2">
          {/* Left Panel */}
          <div className="space-y-4">
            {userMode === 'developers' ? (
              <>
                {/* Code Snippet */}
                <div className="bg-brand-dark-soft relative rounded-lg p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex gap-1">
                      {(['typescript', 'python', 'curl'] as CodeLanguage[]).map(
                        (lang) => (
                          <button
                            key={lang}
                            onClick={() => setCodeLanguage(lang)}
                            className={cn(
                              'rounded px-3 py-1.5 text-xs transition-colors',
                              codeLanguage === lang
                                ? 'bg-primary text-primary-foreground'
                                : 'text-gray-400 hover:text-gray-200'
                            )}
                          >
                            {lang === 'typescript'
                              ? 'TypeScript'
                              : lang === 'python'
                                ? 'Python'
                                : 'cURL'}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="text-gray-400 transition-colors hover:text-white"
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <pre className="scrollbar-thin max-h-[280px] overflow-x-auto overflow-y-auto text-sm whitespace-pre text-gray-300">
                    <code>{codeExamples[codeLanguage]}</code>
                  </pre>
                </div>

                {/* Edit Prompt */}
                <div>
                  <label className="mb-2 block text-sm">Edit Prompt</label>
                  <Input
                    type="text"
                    placeholder={DEFAULT_CODE_PROMPT}
                    value={codePrompt}
                    onChange={(e) => setCodePrompt(e.target.value)}
                  />
                  <p className="text-muted-foreground mt-1 text-xs">
                    Changes will be reflected in the code snippet above
                  </p>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="mb-2 block text-sm">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {(['16:9', '1:1', '4:3'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        disabled={isGenerating}
                        className={cn(
                          'rounded-lg border px-4 py-2 text-sm transition-colors',
                          aspectRatio === ratio
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="mb-2 block text-sm">Your API Key</label>
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
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Wand2 className="mr-1 h-4 w-4" />
                          Generate Key
                        </>
                      )}
                    </Button>
                  </div>
                  {error && (
                    <p className="text-destructive mt-1 text-xs">{error}</p>
                  )}
                </div>

                {/* Generate Illustration Button */}
                <Button
                  size="lg"
                  variant="default"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || isAnonLoading || (!!user && !apiKey.trim())}
                >
                  {isGenerating || isAnonLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isAnonLoading ? 'Setting up...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      Generate Illustration
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Prompt Input */}
                <div>
                  <label className="mb-2 block text-sm">
                    Describe Your Story Scene
                  </label>
                  <Textarea
                    placeholder="A wise old owl in a velvet waistcoat reading to woodland creatures in an ancient oak forest..."
                    className="min-h-[120px] resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* Style Selection */}
                <div>
                  <label className="mb-2 block text-sm">Art Style</label>
                  <Select defaultValue="vintage">
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vintage">
                        Vintage Children's Book
                      </SelectItem>
                      <SelectItem value="watercolor" disabled>
                        Coming Soon...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="mb-2 block text-sm">Format</label>
                  <div className="flex gap-2">
                    {(['16:9', '1:1', '4:3'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        disabled={isGenerating}
                        className={cn(
                          'rounded-lg border px-4 py-2 text-sm transition-colors',
                          aspectRatio === ratio
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}

                {/* Generate Button */}
                <Button
                  size="lg"
                  variant="default"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || isGeneratingKey || isAnonLoading || !prompt.trim()}
                >
                  {isGenerating || isGeneratingKey || isAnonLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isAnonLoading || isGeneratingKey ? 'Setting up...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      Generate Illustration
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Right Panel - Generated Image */}
          <div
            className={cn(
              'bg-muted relative overflow-hidden rounded-xl border',
              aspectRatio === '16:9' && 'aspect-[16/9]',
              aspectRatio === '1:1' && 'aspect-square',
              aspectRatio === '4:3' && 'aspect-[4/3]'
            )}
            onMouseEnter={() => setIsImageHovered(true)}
            onMouseLeave={() => setIsImageHovered(false)}
          >
            {isGenerating ? (
              <div className="bg-muted absolute inset-0 flex flex-col items-center justify-center">
                {/* Skeleton shimmer background to simulate image forming */}
                <div className="absolute inset-4 flex flex-col gap-3 opacity-40">
                  <Skeleton className="h-1/3 w-full rounded-lg" />
                  <div className="flex h-1/4 gap-3">
                    <Skeleton className="w-1/2 rounded-lg" />
                    <Skeleton className="w-1/2 rounded-lg" />
                  </div>
                  <Skeleton className="h-1/4 w-3/4 rounded-lg" />
                </div>

                {/* Center loading indicator */}
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <Sparkles
                    className="text-primary h-10 w-10 animate-pulse [animation-duration:2.5s]"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <TextShimmer className="text-sm" shimmerWidth={120}>
                      Creating your illustration...
                    </TextShimmer>
                    <p className="text-muted-foreground/60 text-xs">
                      It might take 5–20s to generate
                    </p>
                  </div>
                </div>

                {/* Animated progress bar at bottom */}
                <div className="bg-muted-foreground/10 absolute right-0 bottom-0 left-0 h-1 overflow-hidden">
                  <div className="bg-primary/60 animate-progress h-full w-1/3 rounded-full" />
                </div>
              </div>
            ) : (
              <img
                src={generatedImage || placeholderImage}
                alt={
                  generatedImage
                    ? 'Generated illustration'
                    : 'Example illustration'
                }
                className="h-full w-full object-cover"
              />
            )}

            {/* Gallery link overlay - hidden during generation */}
            {!isGenerating && (
              <Link
                href="/showcases"
                className="text-primary absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                Check gallery for inspiration
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {/* Download button when image is generated - centered with semi-transparent style */}
            {generatedImage && (
              <button
                onClick={handleDownload}
                className={cn(
                  'absolute inset-0 m-auto flex h-fit w-fit items-center gap-2 rounded-full bg-black/40 px-5 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-black/60',
                  isImageHovered ? 'opacity-100' : 'opacity-0'
                )}
                title="Download image"
              >
                <Download className="h-5 w-5 text-white" />
                <span className="text-sm font-medium text-white">Download</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
