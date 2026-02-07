'use client';

import { useRef } from 'react';
import {
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Loader2,
  Music,
  Pause,
  Play,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { LazyImage } from '@/components/custom/lazy-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/compound/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/providers/auth-provider';
import {
  useMusicGenerator,
  MUSIC_MODEL_OPTIONS,
} from '@/providers/music-generator-provider';
import { cn } from '@/shared/lib/utils';

/**
 * MusicGenerator Block (Level 4)
 *
 * Following code_principle.md:
 * - Block only CONSUME context (call actions), not MANAGE state (define useState)
 * - All state is managed by MusicGeneratorProvider
 * - This component is purely for UI rendering
 */

interface MusicGeneratorProps {
  srOnlyTitle?: string;
  className?: string;
}

export function MusicGenerator({ className, srOnlyTitle }: MusicGeneratorProps) {
  const t = useTranslations('ai.music');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // CONSUME context - no useState here
  const { state, actions } = useMusicGenerator();
  const { user, isCheckSign } = useAuth();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section id="create" className={cn('py-section-md', className)}>
      {srOnlyTitle && <h2 className="sr-only">{srOnlyTitle}</h2>}
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left side - Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t('generator.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={state.customMode}
                      onCheckedChange={actions.setCustomMode}
                    />
                    <Label>{t('generator.form.custom_mode')}</Label>
                  </div>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-4">
                    <Label>{t('generator.form.model')}</Label>
                    <Select value={state.model} onValueChange={actions.setModel}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MUSIC_MODEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>

              <CardContent className="space-y-6">
                {state.customMode && (
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('generator.form.title')}</Label>
                    <Input
                      id="title"
                      placeholder={t('generator.form.title_placeholder')}
                      value={state.title}
                      onChange={(e) => actions.setTitle(e.target.value)}
                    />
                  </div>
                )}

                {state.customMode && (
                  <div className="space-y-2">
                    <Label htmlFor="style">{t('generator.form.style')}</Label>
                    <Textarea
                      id="style"
                      placeholder={t('generator.form.style_placeholder')}
                      value={state.style}
                      onChange={(e) => actions.setStyle(e.target.value)}
                      className="min-h-24"
                    />
                    <div className="text-muted-foreground text-right text-sm">
                      {state.style.length}/1000
                    </div>
                  </div>
                )}

                {!state.customMode && (
                  <div className="space-y-2">
                    <Label htmlFor="prompt">{t('generator.form.prompt')}</Label>
                    <Textarea
                      id="prompt"
                      placeholder={t('generator.form.prompt_placeholder')}
                      value={state.prompt}
                      onChange={(e) => actions.setPrompt(e.target.value)}
                      className="min-h-32"
                      required
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="instrumental"
                    checked={state.instrumental}
                    onCheckedChange={actions.setInstrumental}
                  />
                  <Label htmlFor="instrumental">
                    {t('generator.form.instrumental')}
                  </Label>
                </div>

                {state.customMode && !state.instrumental && (
                  <div className="space-y-2">
                    <Label htmlFor="lyrics">{t('generator.form.lyrics')}</Label>
                    <Textarea
                      id="lyrics"
                      placeholder={t('generator.form.lyrics_placeholder')}
                      value={state.lyrics}
                      onChange={(e) => actions.setLyrics(e.target.value)}
                      className="min-h-32"
                    />
                  </div>
                )}

                {!state.isMounted ? (
                  <Button className="w-full" size="lg" disabled>
                    <Music className="mr-2 h-4 w-4" />
                    {t('generator.generate')}
                  </Button>
                ) : isCheckSign ? (
                  <Button className="w-full" size="lg">
                    <Loader2 className="size-4 animate-spin" />{' '}
                    {t('generator.loading')}
                  </Button>
                ) : user ? (
                  <Button
                    onClick={actions.generate}
                    disabled={state.isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {state.isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('generator.generating')}
                      </>
                    ) : (
                      <>
                        <Music className="mr-2 h-4 w-4" />
                        {t('generator.generate')}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={actions.generate}
                  >
                    <User className="mr-2 h-4 w-4" />{' '}
                    {t('generator.sign_in_to_generate')}
                  </Button>
                )}

                {!state.isMounted ? (
                  <div className="mb-6 flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('generator.credits_cost', { credits: state.costCredits })}
                    </span>
                    <span className="text-foreground font-medium">
                      {t('generator.credits_remaining', { credits: 0 })}
                    </span>
                  </div>
                ) : user &&
                  user.quota &&
                  ((user.quota.subscription?.remaining ?? 0) + (user.quota.paygo?.remaining ?? 0)) > 0 ? (
                  <div className="mb-6 flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('generator.credits_cost', { credits: state.costCredits })}
                    </span>
                    <span className="text-foreground font-medium">
                      {t('generator.credits_remaining', {
                        credits: (user.quota.subscription?.remaining ?? 0) + (user.quota.paygo?.remaining ?? 0),
                      })}
                    </span>
                  </div>
                ) : (
                  <div className="mb-6 flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('generator.credits_cost', { credits: state.costCredits })},{' '}
                      {t('generator.credits_remaining', {
                        credits: (user?.quota?.subscription?.remaining ?? 0) + (user?.quota?.paygo?.remaining ?? 0),
                      })}
                    </span>
                    <Link href="/pricing">
                      <Button className="w-full" size="lg" variant="outline">
                        <CreditCard className="size-4" />{' '}
                        {t('generator.buy_credits')}
                      </Button>
                    </Link>
                  </div>
                )}

                {state.isGenerating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t('generator.generation_progress')}</span>
                      <span>{state.progress}%</span>
                    </div>
                    <Progress value={state.progress} className="w-full" />
                    <p className="text-muted-foreground text-center text-sm">
                      {t('generator.time_cost')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right side - Generated Song Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  {t('generator.generated_song')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.generatedSongs.length > 0 ? (
                  <div className="space-y-4">
                    {state.generatedSongs.map((song, index) => {
                      const isCurrentlyPlaying =
                        state.currentPlayingSong?.id === song.id && state.isPlaying;
                      const isCurrentlyLoading =
                        state.currentPlayingSong?.id === song.id && state.isLoadingAudio;

                      return (
                        <div key={song.id} className="space-y-4">
                          <div className="flex gap-4">
                            <div className="relative flex-shrink-0">
                              <div className="bg-muted relative h-20 w-20 overflow-hidden rounded-lg">
                                {song.imageUrl ? (
                                  <LazyImage
                                    src={song.imageUrl}
                                    alt={song.title}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="from-primary/20 to-accent/20 flex h-full w-full items-center justify-center bg-gradient-to-br">
                                    <Music className="text-muted-foreground h-6 w-6" />
                                  </div>
                                )}
                              </div>
                              {song.audioUrl && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="absolute top-6 right-6 h-8 w-8 rounded-full p-0 shadow-lg"
                                  onClick={() => actions.togglePlay(song, audioRef)}
                                  disabled={isCurrentlyLoading}
                                >
                                  {isCurrentlyLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : isCurrentlyPlaying ? (
                                    <Pause className="h-3 w-3" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-foreground mb-1 text-lg font-semibold">
                                {song.title}
                              </h3>
                              <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
                                <User className="h-4 w-4" />
                                <span>{song.artist}</span>
                                <Clock className="ml-2 h-4 w-4" />
                                <span>{formatDuration(song.duration)}</span>
                              </div>
                              <div className="mb-2 line-clamp-1 flex flex-wrap gap-1">
                                {song.style &&
                                  song.style
                                    .split(',')
                                    .slice(0, 2)
                                    .map((tag, tagIndex) => (
                                      <Badge
                                        key={tagIndex}
                                        variant="default"
                                        className="text-xs"
                                      >
                                        {tag.trim()}
                                      </Badge>
                                    ))}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                {song.audioUrl ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>{t('generator.ready_to_play')}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-yellow-600">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>
                                      {t('generator.audio_generating')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              {song.audioUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => actions.downloadAudio(song)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {index < state.generatedSongs.length - 1 && (
                            <div className="border-t" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-section-sm text-center">
                    <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                      <Music className="text-muted-foreground h-8 w-8" />
                    </div>
                    <p className="text-muted-foreground mb-2">
                      {state.isGenerating
                        ? t('generator.generating_song')
                        : t('generator.no_song_generated')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
