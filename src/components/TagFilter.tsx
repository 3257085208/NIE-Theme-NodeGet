import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

interface Props {
  tags: string[]
  active: string | null
  onChange: (tag: string | null) => void
}

export function TagFilter({ tags, active, onChange }: Props) {
  if (tags.length === 0) return null

  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-center gap-2 sm:flex-wrap sm:min-w-0">
        <Chip selected={active === null} onClick={() => onChange(null)}>
          全部
        </Chip>
        {tags.map(t => (
          <Chip key={t} selected={active === t} onClick={() => onChange(t)}>
            {t}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center rounded-xl border px-3.5 text-sm font-extrabold transition-all duration-150',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-secondary text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground',
      )}
    >
      {children}
    </button>
  )
}
