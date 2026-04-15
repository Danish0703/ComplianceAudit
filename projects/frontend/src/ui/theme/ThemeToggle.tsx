import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { ThemeMode } from './useTheme'

type ThemeToggleProps = {
  mode: ThemeMode
  onToggle: () => void
}

export default function ThemeToggle({ mode, onToggle }: ThemeToggleProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onToggle}
      className="h-10 w-10 rounded-xl bg-background/60 backdrop-blur"
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
