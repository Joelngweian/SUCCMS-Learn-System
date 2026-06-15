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
    <div className="grid gap-6 md:grid-cols-2">
      {/* Bio Section */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>About</CardTitle>
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
              <p className="text-xs text-muted-foreground mt-1">
                {draftBio.split(/\s+/).filter(w => w.length > 0).length} / 150 words
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{bio || "No bio provided yet."}</p>
          )}
        </CardContent>
      </Card>

      {email && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Faculty</p>
              <p className="text-sm text-muted-foreground">{faculty}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Programme</p>
              <p className="text-sm text-muted-foreground">{programme}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
