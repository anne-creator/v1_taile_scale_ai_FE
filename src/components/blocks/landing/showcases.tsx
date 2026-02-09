'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, ArrowRight } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

interface GalleryImage {
  url: string;
  prompt: string;
  style?: string;
}

const defaultGalleryImages: GalleryImage[] = [
  {
    url: 'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/dfddf168-b993-439a-adae-c7973d5a73d4.jpeg',
    prompt:
      'A wise old owl wearing a velvet burgundy waistcoat and half-moon reading glasses, perched on a branch turned into a makeshift lectern, reading aloud from an oversized leather-bound book to a circle of wide-eyed baby woodland creatures sitting on toadstools, deep inside an ancient oak forest',
    style: 'Forest Library',
  },
  {
    url: 'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/6e434201-1532-4f96-adba-ffa8a8ca4bde.jpeg',
    prompt:
      'A cheerful squirrel wearing a tiny corduroy jacket and a flat cap, carrying a woven basket overflowing with acorns and chestnuts, walking through a bustling autumn harvest market with wooden stalls draped in orange and red bunting and pumpkins stacked in pyramids',
    style: 'Autumn Market',
  },
  {
    url: 'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/49bce3d1-5926-4496-a9b2-151fb349c7e4.jpeg',
    prompt:
      'A graceful swan wearing a pearl necklace and a wide-brimmed sun hat adorned with dried flowers, pouring tea from a porcelain teapot into mismatched vintage cups for a gathering of ducklings in tiny bow ties, in a lush English cottage garden',
    style: 'Garden Tea Party',
  },
  {
    url: 'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/94fedacb-986b-475a-914e-1bf97b88d632.jpeg',
    prompt:
      'A young fox cub wrapped in an oversized wool blanket with star patterns, lying on its back on a grassy hilltop gazing up at a vast night sky filled with constellations and a bright crescent moon, open rolling countryside with distant village lights twinkling below',
    style: 'Stargazing Hilltop',
  },
];

function GalleryCard({ image }: { image: GalleryImage }) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(image.url)}`
      );
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `talecraft-${image.style?.toLowerCase().replace(/\s+/g, '-') || 'illustration'}.jpeg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.url, '_blank');
    }
  };

  return (
    <div
      className="group relative aspect-square w-full cursor-pointer [perspective:1000px]"
      onDoubleClick={handleCopy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* Front */}
        <div className="absolute inset-0 h-full w-full overflow-hidden rounded-lg shadow-sm [backface-visibility:hidden]">
          <img
            src={image.url}
            alt={image.prompt}
            className="h-full w-full object-cover"
          />
          {/* Download button overlay */}
          <button
            onClick={handleDownload}
            className={cn(
              'absolute right-3 bottom-3 z-10 rounded-full bg-black/40 p-2.5 backdrop-blur-sm transition-all duration-200 hover:bg-black/60',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
            title="Download image"
          >
            <Download className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Back */}
        <div className="bg-brand-dark-soft absolute inset-0 flex h-full w-full [transform:rotateY(180deg)] flex-col items-center justify-center overflow-hidden rounded-lg p-4 text-center text-white [backface-visibility:hidden]">
          <p className="mb-3 line-clamp-[8] overflow-hidden text-[11px] leading-relaxed font-medium text-gray-200">
            &ldquo;{image.prompt}&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="group/btn rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20"
              title="Copy prompt"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-white transition-transform group-hover/btn:scale-110" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="group/btn rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20"
              title="Download image"
            >
              <Download className="h-4 w-4 text-white transition-transform group-hover/btn:scale-110" />
            </button>
          </div>
          {copied && (
            <span className="mt-1 text-[10px] text-green-400">Copied!</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Showcases({
  section,
  className,
  showViewFullButton = false,
}: {
  section: Section;
  className?: string;
  showViewFullButton?: boolean;
}) {
  // Use images from section data if available, otherwise use defaults
  const galleryImages =
    section.items?.map((item: any) => ({
      url: item.image?.src || item.url,
      prompt: item.description || item.prompt || '',
      style: item.title || item.style,
    })) || defaultGalleryImages;

  return (
    <section
      id={section.id || 'gallery'}
      className={cn('py-section-sm bg-muted/30', section.className, className)}
    >
      <div className="container max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-h2 mb-4">{section.title || 'Gallery'}</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            {section.description ||
              'Explore stunning illustrations created with TaleCraft. Every image tells a story.'}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {galleryImages.map((image: GalleryImage, index: number) => (
            <GalleryCard key={index} image={image} />
          ))}
        </div>

        {/* View Full Gallery button - shown on main page when prop is true */}
        {showViewFullButton && (
          <div className="mt-12 text-center">
            <Link
              href="/showcases"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              View Full Gallery
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
