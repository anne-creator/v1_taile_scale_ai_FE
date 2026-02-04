'use client';

import { motion } from 'framer-motion';

import { LazyImage } from '@/components/custom';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

/**
 * Shared easing curve - use `as const` to ensure tuple type for motion
 */
const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/**
 * Animation variants using staggerChildren pattern
 * per code_principle.md: "Block 作为'指挥官'，负责编排子组件的动画时机（如 staggerChildren）"
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOutExpo,
    },
  },
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: easeOutExpo,
    },
  },
};

const textVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: easeOutExpo,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: easeOutExpo,
    },
  },
};

export function FeaturesFlow({ section }: { section: Section }) {
  if (!section.items || section.items.length === 0) {
    return null;
  }

  return (
    <section
      id={section.id || section.name}
      className={cn('py-section-md', section.className)}
    >
      <motion.div
        className="container mb-12 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={headerVariants}
      >
        {section.sr_only_title && (
          <h1 className="sr-only">{section.sr_only_title}</h1>
        )}
        <h2 className="mx-auto mb-6 max-w-full text-h2 text-pretty md:max-w-5xl">
          {section.title}
        </h2>
        <p className="text-muted-foreground text-md mx-auto mb-4 max-w-full md:max-w-5xl">
          {section.description}
        </p>
      </motion.div>
      
      <motion.div 
        className="container flex flex-col items-center justify-center space-y-8 px-6 md:space-y-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={containerVariants}
      >
        {section.items.map((item, index) => {
          const isImageRight = item.image_position === 'right';
          return (
            <motion.div
              key={index}
              className={cn(
                'grid items-center gap-6 py-section-md sm:grid-cols-2 md:gap-12 lg:gap-24',
                isImageRight &&
                  'sm:[&>*:first-child]:order-2 sm:[&>*:last-child]:order-1'
              )}
              variants={itemVariants}
            >
              <motion.div variants={imageVariants}>
                <LazyImage
                  src={item.image?.src ?? ''}
                  className="rounded-2xl"
                  alt={item.image?.alt ?? ''}
                />
              </motion.div>

              <motion.div
                className="relative space-y-4"
                variants={{
                  ...textVariants,
                  hidden: { ...textVariants.hidden, x: isImageRight ? -20 : 20 },
                }}
              >
                <h3 className="text-h3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
