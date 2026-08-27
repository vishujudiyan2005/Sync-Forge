"use client"

import { Code2, Play, Loader2, PenTool, Layout, Circle, Share2, Check, Users, Sun, Moon } from "lucide-react"
import { LanguageDropdown } from "./LanguageDropDown"
import { Button } from "./ui/button"
import { useTheme } from "../contexts/ThemeContext"

interface CodeEditorHeaderProps {
  language: string
  onLanguageChange: (language: string) => void
  onSubmit: () => void
  isLoading: boolean
  currentButtonState: string
  activeView: 'editor' | 'whiteboard'
  onViewChange: (view: 'editor' | 'whiteboard') => void
  onInvite: () => void
  inviteCopied: boolean
  connectedUsersCount: number
}

export const CodeEditorHeader = ({
  language,
  onLanguageChange,
  onSubmit,
  isLoading,
  currentButtonState,
  activeView,
  onViewChange,
  onInvite,
  inviteCopied,
  connectedUsersCount,
}: CodeEditorHeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div
      className="neu-raised flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:px-5"
      style={{ position: "relative", zIndex: 10 }}
    >
      <div className="flex items-center justify-center gap-3">
        <div className="neu-flat p-2.5 text-[var(--brand)]">
          <Code2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-extrabold tracking-tight text-[var(--text-strong)]">SyncForge</div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]"><Circle size={7} fill="currentColor" /> Live workspace</div>
        </div>
      </div>

      <div className="neu-inset mx-auto flex shrink-0 p-1 sm:mx-4">
        <button
          onClick={() => onViewChange('editor')}
          className={`flex items-center gap-2 rounded-[calc(var(--radius)-4px)] px-4 py-2 text-sm font-bold transition-all duration-[220ms] ${activeView === 'editor' ? 'neu-raised !text-[var(--brand)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
        >
          <Layout size={16} />
          Editor
        </button>
        <button
          onClick={() => onViewChange('whiteboard')}
          className={`flex items-center gap-2 rounded-[calc(var(--radius)-4px)] px-4 py-2 text-sm font-bold transition-all duration-[220ms] ${activeView === 'whiteboard' ? 'neu-raised !text-[var(--brand)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
        >
          <PenTool size={16} />
          Whiteboard
        </button>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row items-center">
        <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}<span className="hidden 2xl:inline">{theme === "dark" ? "Light" : "Dark"}</span></button>
        <div className="neu-inset flex items-center gap-2 px-3 py-2 text-sm font-bold text-[var(--text)] mr-2">
          <Users size={16} className="text-[var(--brand)]" />
          <span>{connectedUsersCount}</span>
        </div>

        {activeView === 'editor' && (
          <LanguageDropdown value={language} onChange={onLanguageChange} />
        )}

        <Button
          onClick={onInvite}
          type="button"
          variant="outline"
          className="h-10 px-4 font-bold"
        >
          {inviteCopied ? <Check className="h-4 w-4 text-[var(--brand)]" /> : <Share2 className="h-4 w-4" />}
          {inviteCopied ? "Link copied" : "Invite"}
        </Button>

        <Button
          onClick={onSubmit}
          disabled={isLoading}
          type="button"
          className="h-10 px-5 font-extrabold"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{currentButtonState}</span>
        </Button>
      </div>
    </div>
  )
}
