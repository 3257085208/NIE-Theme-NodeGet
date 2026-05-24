import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from './ui/button'

export function ScrollToTopButton() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`fixed bottom-24 right-4 z-40 transition-all duration-150 sm:bottom-8 sm:right-6 ${show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 pointer-events-none'}`}>
      <Button
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-full bg-background/90 shadow-md backdrop-blur"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="回到顶部"
        title="回到顶部"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  )
}
