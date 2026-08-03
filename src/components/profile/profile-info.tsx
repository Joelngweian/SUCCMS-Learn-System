import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Textarea } from "../ui/textarea"
import { Mail, Building2, GraduationCap } from "lucide-react"

interface ProfileInfoProps {
  bio: string
  email?: string
  faculty: string
  programme: string
  isEditing?: boolean
  draftBio?: string
  onBioChange?: (bio: string) => void
}

export function ProfileInfo({ bio, email, faculty, programme, isEditing = false, draftBio = "", onBioChange }: ProfileInfoProps) {
  return (
    <div className="space-y-5">
      <Card className="min-h-[176px] rounded-2xl border-slate-200/80 shadow-sm dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div>
              <Textarea 
                value={draftBio} 
                onChange={(e) => {
                  const words = e.target.value.split(/\s+/).filter(w => w.length > 0)
                  if (words.length <= 150) {
                    onBioChange?.(e.target.value)
                  }
                }}
                placeholder="Tell us about yourself... (Max 150 words, ~30 words per line)"
                rows={5}
                maxLength={750}
                className="resize-none"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {draftBio.split(/\s+/).filter(w => w.length > 0).length} / 150 words
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {bio || "No bio provided yet."}
            </p>
          )}
        </CardContent>
      </Card>

      {email && (
        <Card className="min-h-[150px] rounded-2xl border-slate-200/80 shadow-sm dark:border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Email</p>
                <p className="break-all text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="min-h-[150px] rounded-2xl border-slate-200/80 shadow-sm dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Academic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Faculty</p>
              <p className="text-sm text-muted-foreground">
                {faculty || "Not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Programme</p>
              <p className="text-sm text-muted-foreground">
                {programme || "Not provided"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
