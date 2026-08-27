import { ChevronDown } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"


interface LanguageDropdownProps {
  value: string
  onChange: (language: string) => void
}

const languages = [
  {
    value: "javascript",
    label: "JavaScript",
  },
  {
    value: "python",
    label: "Python",
  },
  {
    value: "cpp",
    label: "C++",
  },
  {
    value: "go",
    label: "Go",
  },
]

export const LanguageDropdown = ({ value, onChange }: LanguageDropdownProps) => {
  const selectedLanguage = languages.find((lang) => lang.value === value)

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[140px] justify-between font-semibold"
            type="button"
          >
            <div className="flex items-center gap-2">
              <span>{selectedLanguage?.label || "Select Language"}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-70 transition-transform duration-200 data-[state=open]:rotate-180" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-[140px]"
          align="end"
          sideOffset={4}
          style={{ zIndex: 9999 }}
          avoidCollisions={true}
          collisionPadding={8}
        >
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.value}
              onClick={() => onChange(language.value)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span>{language.label}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}



