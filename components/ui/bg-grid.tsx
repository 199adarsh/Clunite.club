import React from 'react';
import { cn } from '@/lib/utils';

type BGMaskType = 'fade-edges' | 'none';

const maskClasses: Record<BGMaskType, string> = {
  'fade-edges':
    '[mask-image:radial-gradient(ellipse_at_center,var(--background),transparent)]',
  none: '',
};

type BGGridProps = React.ComponentProps<'div'> & {
  size?: number;
  fill?: string;
  mask?: BGMaskType;
};

export const BGGrid = ({
  size = 24,
  fill = '#252525',
  mask = 'none',
  className,
  style,
  ...props
}: BGGridProps) => {
  const bgSize = `${size}px ${size}px`;

  const backgroundImage = `
    linear-gradient(to right, ${fill} 1px, transparent 1px),
    linear-gradient(to bottom, ${fill} 1px, transparent 1px)
  `;

  return (
    <div
      className={cn(
        'absolute inset-0 z-[-10] size-full',
        maskClasses[mask],
        className
      )}
      style={{
        backgroundImage,
        backgroundSize: bgSize,
        ...style,
      }}
      {...props}
    />
  );
};
