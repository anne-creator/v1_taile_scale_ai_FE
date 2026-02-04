'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, SunDim } from 'lucide-react';
import { useTheme } from 'next-themes';

import { AnimatedThemeToggler } from '@/components/animations/animated-theme-toggler';
import { Button } from '@/components/ui/button';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

/**
 * ThemeToggle - Level 2.5 Compound Component
 * 
 * Manages internal UI state (current theme) and provides
 * multiple presentation variants. No business logic.
 */
export function ThemeToggle({
  type = 'icon',
  className,
}: {
  type?: 'icon' | 'button' | 'toggle';
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const handleThemeChange = (value: string) => {
    setTheme(value);
  };

  if (!mounted) {
    return null;
  }

  if (type === 'button') {
    return (
      <Button variant="outline" size="sm" className="hover:bg-primary/10">
        <SunDim />
      </Button>
    );
  } else if (type === 'toggle') {
    return (
      <ToggleGroup
        type="single"
        className={` ${className}`}
        value={theme}
        onValueChange={handleThemeChange}
        variant="outline"
      >
        <ToggleGroupItem
          value="light"
          onClick={() => setTheme('light')}
          aria-label="Switch to light mode"
        >
          <SunDim />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="dark"
          onClick={() => setTheme('dark')}
          aria-label="Switch to dark mode"
        >
          <Moon />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="system"
          onClick={() => setTheme('system')}
          aria-label="Switch to system mode"
        >
          <Monitor />
        </ToggleGroupItem>
      </ToggleGroup>
    );
  }

  return <AnimatedThemeToggler className={className} />;
}

// Backward compatibility alias
export const ThemeToggler = ThemeToggle;
