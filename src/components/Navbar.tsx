import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, Globe, LayoutGrid, Search as SearchIcon, SlidersHorizontal, Table, X } from 'lucide-react'
import { Search } from './Search'
import { ViewToggle } from './ViewToggle'
import { ThemeToggle } from './ThemeToggle'
import { SortMenu } from './SortMenu'
import { Button } from './ui/button'
import { BackgroundCustomizer } from './BackgroundCustomizer'
import type { BackgroundSettings, Sort, View } from '../types'

interface Props {
  siteName: string
  logo?: string
  query: string
  onQuery: (v: string) => void
  view: View
  onView: (v: View) => void
  sort: Sort
  onSort: (v: Sort) => void
  backgroundSettings: BackgroundSettings
  onBackgroundSettingsChange: (settings: BackgroundSettings) => void
}

type MobilePanel = 'search' | 'more' | null

const SORTS: { value: Sort; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'name', label: '名称' },
  { value: 'region', label: '地区' },
  { value: 'cpu', label: 'CPU' },
  { value: 'mem', label: '内存' },
  { value: 'disk', label: '磁盘' },
  { value: 'netIn', label: '下行' },
  { value: 'netOut', label: '上行' },
  { value: 'uptime', label: '在线' },
]

export function Navbar({
  siteName,
  logo,
  query,
  onQuery,
  view,
  onView,
  sort,
  onSort,
  backgroundSettings,
  onBackgroundSettingsChange,
}: Props) {
  const [panel, setPanel] = useState<MobilePanel>(null)
  const [stuck, setStuck] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (panel === 'search') inputRef.current?.focus()
  }, [panel])

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const sortLabel = SORTS.find(item => item.value === sort)?.label || '默认'
  const cycleSort = () => {
    const idx = Math.max(0, SORTS.findIndex(item => item.value === sort))
    onSort(SORTS[(idx + 1) % SORTS.length].value)
  }
  const togglePanel = (next: MobilePanel) => setPanel(cur => (cur === next ? null : next))

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pb-2 pt-3 sm:px-6">
      <div className="relative mx-auto w-full max-w-[91.5rem] overflow-visible">
        <div
          className={`overflow-visible rounded-2xl border border-border bg-card/92 shadow-[0_14px_36px_rgba(15,23,42,0.09)] backdrop-blur transition-shadow duration-150 dark:shadow-[0_16px_42px_rgba(0,0,0,0.32)] ${
            stuck ? 'shadow-[0_18px_44px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_52px_rgba(0,0,0,0.44)]' : ''
          }`}
        >
          <div className="flex h-16 items-center justify-between gap-2 px-3 sm:h-[68px] sm:gap-3 sm:px-5">
            <a
              href="./"
              className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-80 sm:gap-3"
            >
              {logo && <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-border object-cover sm:h-11 sm:w-11" />}
              <span className="block max-w-full truncate text-base font-black tracking-wide text-primary sm:text-xl">{siteName}</span>
            </a>

            <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
              <Search value={query} onChange={onQuery} />
              <BackgroundCustomizer settings={backgroundSettings} onChange={onBackgroundSettingsChange} className="hidden sm:inline-flex" />
              <SortMenu value={sort} onChange={onSort} />
              <ViewToggle value={view} onChange={onView} />
              <ThemeToggle />
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:hidden">
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={cycleSort}
                aria-label={`排序：${sortLabel}`}
                title={`排序：${sortLabel}`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={() => togglePanel('search')}
                aria-label={panel === 'search' ? '关闭搜索' : '搜索'}
              >
                {panel === 'search' ? <X className="h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl"
                  onClick={() => togglePanel('more')}
                  aria-label={panel === 'more' ? '关闭多功能' : '多功能'}
                >
                  {panel === 'more' ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
                </Button>
                {panel === 'more' && (
                  <MobileMore view={view} onView={onView} />
                )}
              </div>
            </div>
          </div>

          <div
            className={`overflow-hidden border-t border-dashed border-border/80 transition-all duration-150 sm:hidden ${
              panel === 'search' ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {panel === 'search' && (
              <div className="px-4 py-3">
                <Search ref={inputRef} value={query} onChange={onQuery} className="w-full" />
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  )
}

function MobileMore({ view, onView }: { view: View; onView: (v: View) => void }) {
  const views: { value: View; label: string; icon: typeof LayoutGrid }[] = [
    { value: 'cards', label: '卡片视图', icon: LayoutGrid },
    { value: 'table', label: '表格视图', icon: Table },
    { value: 'map', label: '地图视图', icon: Globe },
  ]

  return (
    <div className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-11 space-y-2 sm:hidden">
      {views.map(item => {
        const Icon = item.icon
        const active = view === item.value
        return (
          <Button
            key={item.value}
            variant="outline"
            size="icon"
            className={`h-11 w-11 rounded-xl bg-secondary/95 shadow-md backdrop-blur ${active ? 'border-primary/70 text-primary' : 'border-border text-muted-foreground'}`}
            onClick={() => onView(item.value)}
            aria-label={item.label}
            title={item.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        )
      })}
      <ThemeToggle className="border-border bg-secondary/95 text-muted-foreground shadow-md backdrop-blur" />
    </div>
  )
}
