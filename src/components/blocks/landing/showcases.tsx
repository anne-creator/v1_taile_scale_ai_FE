'use client';

import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
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
    prompt: 'A wise old owl wearing a velvet burgundy waistcoat and half-moon reading glasses, perched on a branch turned into a makeshift lectern, reading aloud from an oversized leather-bound book to a circle of wide-eyed baby woodland creatures sitting on toadstools, deep inside an ancient oak forest',
    style: 'Forest Library',
  },
  {
    url: 'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/6e434201-1532-4f96-adba-ffa8a8ca4bde.jpeg',
    prompt: 'A cheerful squirrel wearing a tiny corduroy jacket and a flat cap, carrying a woven basket overflowing with acorns and chestnuts, walking through a bustling autumn harvest market with wooden stalls draped in orange and red bunting and pumpkins stacked in pyramids',
    style: 'Autumn Market',
  },
  {
    url: 'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/49bce3d1-5926-4496-a9b2-151fb349c7e4.jpeg',
    prompt: 'A graceful swan wearing a pearl necklace and a wide-brimmed sun hat adorned with dried flowers, pouring tea from a porcelain teapot into mismatched vintage cups for a gathering of ducklings in tiny bow ties, in a lush English cottage garden',
    style: 'Garden Tea Party',
  },
  {
    url: 'https://pub-56194e5487384280af43a03cc4ea8ee4.r2.dev/uploads/illustrations/94fedacb-986b-475a-914e-1bf97b88d632.jpeg',
    prompt: 'A young fox cub wrapped in an oversized wool blanket with star patterns, lying on its back on a grassy hilltop gazing up at a vast night sky filled with constellations and a bright crescent moon, open rolling countryside with distant village lights twinkling below',
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
      const resp = await fetch(`/api/proxy/file?url=${encodeURIComponent(image.url)}`);
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
      className="group relative w-full aspect-square [perspective:1000px] cursor-pointer"
      onDoubleClick={handleCopy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* Front */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-lg overflow-hidden shadow-sm">
          <img
            src={image.url}
            alt={image.prompt}
            className="w-full h-full object-cover"
          />
          {/* Download button overlay */}
          <button
            onClick={handleDownload}
            className={cn(
              'absolute bottom-3 right-3 p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-200 z-10',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
            title="Download image"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Back */}
        <div className="absolute inset-0 w-full h-full bg-brand-dark-soft text-white p-4 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-lg overflow-hidden flex flex-col justify-center items-center text-center">
          <p className="text-[11px] leading-relaxed font-medium mb-3 text-gray-200 line-clamp-[8] overflow-hidden">
            &ldquo;{image.prompt}&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors group/btn"
              title="Copy prompt"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-white group-hover/btn:scale-110 transition-transform" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors group/btn"
              title="Download image"
            >
              <Download className="w-4 h-4 text-white group-hover/btn:scale-110 transition-transform" />
            </button>
          </div>
          {copied && (
            <span className="text-[10px] mt-1 text-green-400">
              Copied!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Showcases({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  // Use images from section data if available, otherwise use defaults
  const galleryImages = section.items?.map((item: any) => ({
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
        <div className="text-center mb-12">
          <h2 className="text-h2 mb-4">
            {section.title || 'Guide Gallery'}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {section.description ||
              'Explore stunning illustrations created with TaleCraft. Every image tells a story.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {galleryImages.map((image: GalleryImage, index: number) => (
            <GalleryCard key={index} image={image} />
          ))}
        </div>
      </div>
    </section>
  );
}
