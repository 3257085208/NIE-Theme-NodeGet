import * as ProgressPrimitive from '@radix-ui/react-progress'
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react'
import { cn } from '../../utils/cn'

type Props = ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}

export const Progress = forwardRef<ElementRef<typeof ProgressPrimitive.Root>, Props>(
  ({ className, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn('h-full w-full flex-1 bg-primary transition-all', indicatorClassName)}
        style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value || 0))}%)` }}
      />
    </ProgressPrimitive.Root>
  ),
)
Progress.displayName = ProgressPrimitive.Root.displayName
