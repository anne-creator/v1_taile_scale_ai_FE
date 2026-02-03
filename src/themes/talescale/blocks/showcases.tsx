'use client';

import { useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

interface GalleryImage {
  url: string;
  prompt: string;
  style?: string;
}

const defaultGalleryImages: GalleryImage[] = [
  {
    url: 'https://images.unsplash.com/photo-1577720086808-ee62b140bc0e?w=800',
    prompt: 'Fairy tale castle in the clouds',
    style: 'Watercolor Dreams',
  },
  {
    url: 'https://images.unsplash.com/photo-1760355493926-5a38d4341fd4?w=800',
    prompt: 'Magical forest adventure',
    style: 'Storybook Classic',
  },
  {
    url: 'https://images.unsplash.com/photo-1631061184412-b18f5fb1dc70?w=800',
    prompt: 'Whimsical animal friends',
    style: 'Bright & Bold',
  },
  {
    url: 'https://images.unsplash.com/photo-1743356816344-397d510977ea?w=800',
    prompt: 'Character portrait collection',
    style: 'Character Focus',
  },
];

function GalleryCard({ image }: { image: GalleryImage }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(image.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="group relative w-full aspect-square [perspective:1000px] cursor-pointer"
      onDoubleClick={handleCopy}
    >
      <div className="relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* Front */}
        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] rounded-lg overflow-hidden shadow-sm">
          <img
            src={image.url}
            alt={image.prompt}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Back */}
        <div className="absolute inset-0 w-full h-full bg-[#1e1e1e] text-white p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-lg overflow-hidden flex flex-col justify-center items-center text-center">
          <p className="text-sm font-medium mb-4 text-gray-200">
            "{image.prompt}"
          </p>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors group/btn"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-white group-hover/btn:scale-110 transition-transform" />
              )}
            </button>
            <span
              className={cn(
                'text-xs transition-opacity duration-300',
                copied ? 'opacity-100 text-green-400' : 'opacity-0'
              )}
            >
              Copied!
            </span>
          </div>
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
      className={cn('py-12 bg-muted/30', section.className, className)}
    >
      <div className="container max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl mb-4 font-bold">
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

        <div className="text-center mt-12">
          <Link
            href="/showcases"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border bg-background hover:bg-muted transition-colors font-medium"
          >
            View Full Gallery
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
