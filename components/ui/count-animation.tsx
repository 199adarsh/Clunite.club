'use client';

import { cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

interface CountAnimationProps {
  number: number;
  className?: string;
  duration?: number;
}

export function CountAnimation({
  number,
  className,
  duration = 2,
}: CountAnimationProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, number, { duration });
    return () => animation.stop();
  }, [count, number, duration]);

  return <motion.span className={cn(className)}>{rounded}</motion.span>;
}
