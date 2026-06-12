import React, { memo, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/hooks/useSettings";
import type { SettingsConfig } from "@/hooks/useSettings";
import { useLoginHistory } from "@/hooks/useLoginHistory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Settings as SettingsIcon,
  Bell,
  Palette,
  Shield,
  Globe,
  Eye,
  Moon,
  Sun,
  Monitor,
  Mail,
  MessageSquare,
  FileText,
  Trophy,
  Clock,
  Lock,
  Smartphone,
  Download,
  Trash2,
  AlertTriangle,
  Info,
  RefreshCw,
  Key,
  CheckCircle2,
  Accessibility,
  User,
} from "lucide-react";

type UpdateSetting = <K extends keyof SettingsConfig>(key: K, value: SettingsConfig[K]) => void;

type SettingsTabProps = {
  settings: SettingsConfig;
  updateSetting: UpdateSetting;
};


type SettingSwitchProps = {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
  bg?: string;
  id?: string;
};

type SectionId =
  | "profile"
  | "account"
  | "notifications"
  | "appearance"
  | "privacy"
  | "security";

type MenuItem = {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    title: "How you use SUCCMS",
    items: [
      { id: "profile", label: "Edit Profile", icon: User },
      { id: "account", label: "Account", icon: SettingsIcon },
    ],
  },
  {
    title: "Your preferences",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "appearance", label: "Appearance", icon: Palette },
    ],
  },
  {
    title: "Who can see your content",
    items: [
      { id: "privacy", label: "Privacy", icon: Eye },
      { id: "security", label: "Security", icon: Lock },
    ],
  },
];

const getRoleLabel = (role?: string) => {
  if (!role) return "Student";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const getInitials = (name?: string | null, fallback = "U") => {
  if (!name) return fallback;
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return initials || fallback;
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unexpected error";
};

export function SettingsPage() {
  const { profile } = useAuth();
  const userRole = profile?.role || "student";
  const { settings, isLoading, isSaving, hasChanges, saveStatus, lastSavedAt, errorMessage, updateSetting, resetToDefaults } = useSettings();
  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  if (isLoading) return <SettingsSkeleton />;

  const saveLabel = isSaving
    ? "Saving"
    : saveStatus === "error"
      ? "Save failed"
      : hasChanges
        ? "Pending save"
        : "Saved";

  const lastSavedLabel = lastSavedAt
    ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Auto-save enabled";

  return (
    <div className="min-w-0 overflow-hidden bg-background" style={{ height: "calc(100vh - 2rem)" }}>
      <div
        className="h-full min-w-0"
        style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)" }}
      >
        <aside className="min-w-0 border-r bg-background/95">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-4">
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="mt-1 text-xs text-muted-foreground">Manage your account preferences</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-5">
                {MENU_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setActiveSection(item.id)}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${
                              isActive
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t px-4 py-3">
              <Button variant="outline" size="sm" onClick={resetToDefaults} disabled={isSaving} className="h-8 w-full text-xs">
                Reset to Defaults
              </Button>
            </div>
          </div>
        </aside>

        <main className="h-full min-h-0 min-w-0 overflow-y-auto bg-muted/20">
          <div className="mx-auto w-full px-6 py-6" style={{ maxWidth: 1040 }}>
            <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
              <Badge
                variant="outline"
                className={
                  saveStatus === "error"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : isSaving || hasChanges
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                      : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"
                }
              >
                {isSaving ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                {saveLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">{lastSavedLabel}</span>
            </div>

            {(hasChanges || saveStatus === "error") && (
              <Card className="mb-6 border-primary/20 bg-primary/5 shadow-sm animate-in fade-in slide-in-from-top-4">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className={`h-5 w-5 text-primary ${isSaving ? "animate-spin" : ""}`} />
                    <div>
                      <p className="font-medium text-primary">{saveStatus === "error" ? "Save failed" : "Autosave pending"}</p>
                      <p className="text-xs text-muted-foreground">
                        {saveStatus === "error"
                          ? (errorMessage || "Try changing the setting again after checking your connection.")
                          : "Your changes will save automatically."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "profile" && <ProfileSettings />}
            {activeSection === "account" && <AccountSettings />}
            {activeSection === "notifications" && <NotificationsTab settings={settings} updateSetting={updateSetting} />}
            {activeSection === "appearance" && <AppearanceTab settings={settings} updateSetting={updateSetting} />}
            {activeSection === "privacy" && <PrivacyTab settings={settings} updateSetting={updateSetting} />}
            {activeSection === "security" && <SecurityTab settings={settings} updateSetting={updateSetting} />}
          </div>
        </main>
      </div>
    </div>
  );
}

const ProfileSettings = memo(() => {
  const { profile, updateProfile } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    faculty: "",
    programme: "",
    bio: "",
    avatar_url: "",
  });

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || "",
      faculty: profile?.faculty || "",
      programme: profile?.programme || "",
      bio: profile?.bio || "",
      avatar_url: profile?.avatar_url || "",
    });
  }, [profile]);

  const updateProfileField = (key: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const { error } = await updateProfile({
        full_name: profileForm.full_name.trim(),
        faculty: profileForm.faculty.trim(),
        programme: profileForm.programme.trim(),
        bio: profileForm.bio.trim(),
        avatar_url: profileForm.avatar_url.trim(),
      });

      if (error) throw error;
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error("Failed to update profile: " + getErrorMessage(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const displayName = profileForm.full_name || profile?.email || "User";
  const roleLabel = getRoleLabel(profile?.role);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-sm">
        <CardHeader className="!px-8 !pt-7">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" /> Edit Profile
          </CardTitle>
          <CardDescription>Update the information shown on your profile.</CardDescription>
        </CardHeader>
        <CardContent className="!px-8 !pb-8 pt-1">
          <form onSubmit={handleProfileSubmit} className="space-y-8">
            <div className="rounded-xl border bg-muted/30 p-5">
              <div className="flex min-w-0 items-center gap-4">
                <Avatar className="h-16 w-16 border">
                  <AvatarImage src={profileForm.avatar_url} />
                  <AvatarFallback className="text-base font-semibold !bg-white !text-black">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{displayName}</p>
                    <Badge variant="secondary">{roleLabel}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{roleLabel} Account</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-10 gap-y-9 md:grid-cols-2">
                <div className="min-w-0 space-y-3">
                  <Label htmlFor="display-name" className="text-sm font-semibold leading-5">Display Name</Label>
                  <Input
                    id="display-name"
                    className="h-12 rounded-xl px-4"
                    value={profileForm.full_name}
                    onChange={(e) => updateProfileField("full_name", e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="min-w-0 space-y-3">
                  <Label htmlFor="faculty" className="text-sm font-semibold leading-5">Faculty</Label>
                  <Input
                    id="faculty"
                    className="h-12 rounded-xl px-4"
                    value={profileForm.faculty}
                    onChange={(e) => updateProfileField("faculty", e.target.value)}
                    placeholder="Faculty"
                  />
                </div>
                <div className="min-w-0 space-y-3">
                  <Label htmlFor="programme" className="text-sm font-semibold leading-5">Programme</Label>
                  <Input
                    id="programme"
                    className="h-12 rounded-xl px-4"
                    value={profileForm.programme}
                    onChange={(e) => updateProfileField("programme", e.target.value)}
                    placeholder="Programme"
                  />
                </div>
              </div>

            <Separator />

            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="avatar-url" className="text-sm font-semibold leading-5">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  className="h-12 rounded-xl px-4"
                  value={profileForm.avatar_url}
                  onChange={(e) => updateProfileField("avatar_url", e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="bio" className="text-sm font-semibold leading-5">Bio</Label>
                <Textarea
                  id="bio"
                  className="min-h-32 rounded-xl px-4 py-3 leading-relaxed"
                  value={profileForm.bio}
                  onChange={(e) => updateProfileField("bio", e.target.value)}
                  placeholder="Write something about yourself"
                />
              </div>
            </div>

            <div className="flex justify-end border-t pt-5">
              <Button type="submit" disabled={!profile || isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
});

const AccountSettings = memo(() => {
  const { user, profile } = useAuth();
  const email = profile?.email || user?.email || "Not available";
  const roleLabel = getRoleLabel(profile?.role);
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Not available";
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Not available";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SettingsIcon className="h-5 w-5 text-primary" /> Account
          </CardTitle>
          <CardDescription>Manage your basic account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Account Type</p>
              <p className="text-sm text-muted-foreground">Your current role in the platform</p>
            </div>
            <Badge variant="secondary">{roleLabel}</Badge>
          </div>

          <div className="rounded-xl border p-4">
            <p className="font-medium">Email Address</p>
            <p className="mt-1 break-all text-sm text-muted-foreground">{email}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="font-medium">Created</p>
              <p className="mt-1 text-sm text-muted-foreground">{createdAt}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="font-medium">Last Sign In</p>
              <p className="mt-1 text-sm text-muted-foreground">{lastSignIn}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

const AppearanceTab = memo(({ settings, updateSetting }: SettingsTabProps) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Palette className="h-5 w-5 text-purple-600" /> Theme & Display</CardTitle>
        <CardDescription>Customize the look and feel of your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-sm font-semibold">Theme Preference</Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { id: "light", label: "Light", icon: Sun, desc: "Clean & bright" },
              { id: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
              { id: "system", label: "System", icon: Monitor, desc: "Follow device" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updateSetting("theme", t.id as SettingsConfig["theme"])}
                className={`rounded-xl border-2 p-5 text-center transition-all duration-200 hover:shadow-md ${
                  settings.theme === t.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 ring-offset-1"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <t.icon className={`mx-auto mb-3 h-7 w-7 ${settings.theme === t.id ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
));



const NotificationsTab = memo(({ settings, updateSetting }: SettingsTabProps) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5 text-blue-600" /> Notification Channels</CardTitle>
        <CardDescription>Choose how you want to be notified.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SettingSwitch
          id="email-notifications"
          icon={<Mail className="h-4 w-4 text-blue-600" />}
          bg="bg-blue-50"
          title="Email Notifications"
          desc="Receive updates via email"
          checked={settings.email_notifications}
          onChange={(v) => updateSetting("email_notifications", v)}
        />
      </CardContent>
    </Card>

    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-orange-500" /> Platform Events</CardTitle>
        <CardDescription>Select which events trigger a notification.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SettingSwitch
          id="assignment-reminders"
          icon={<FileText className="h-4 w-4 text-orange-600" />}
          bg="bg-orange-50"
          title="Assignment Reminders"
          desc="Get notified before assignment deadlines"
          checked={settings.assignment_reminders}
          onChange={(v) => updateSetting("assignment_reminders", v)}
        />
        <SettingSwitch
          id="forum-replies"
          icon={<MessageSquare className="h-4 w-4 text-green-600" />}
          bg="bg-green-50"
          title="Forum Replies"
          desc="Notifications when someone replies to your posts"
          checked={settings.forum_replies}
          onChange={(v) => updateSetting("forum_replies", v)}
        />
        <SettingSwitch
          id="grade-updates"
          icon={<Trophy className="h-4 w-4 text-yellow-600" />}
          bg="bg-yellow-50"
          title="Grade Updates"
          desc="Get notified when grades are posted"
          checked={settings.grade_updates}
          onChange={(v) => updateSetting("grade_updates", v)}
        />
        <SettingSwitch
          id="course-announcements"
          icon={<Bell className="h-4 w-4 text-red-600" />}
          bg="bg-red-50"
          title="Course Announcements"
          desc="Important announcements from lecturers"
          checked={settings.course_announcements}
          onChange={(v) => updateSetting("course_announcements", v)}
        />
        <SettingSwitch
          id="achievement-alerts"
          icon={<Trophy className="h-4 w-4 text-purple-600" />}
          bg="bg-purple-50"
          title="Achievement Alerts"
          desc="Get notified when you earn a new achievement badge"
          checked={settings.achievement_alerts}
          onChange={(v) => updateSetting("achievement_alerts", v)}
        />
        <SettingSwitch
          id="marketing-emails"
          icon={<Mail className="h-4 w-4 text-gray-600" />}
          bg="bg-gray-50"
          title="Campus Updates"
          desc="Receive optional campus and platform announcement emails"
          checked={settings.marketing_emails}
          onChange={(v) => updateSetting("marketing_emails", v)}
        />
      </CardContent>
    </Card>
  </div>
));

const PrivacyTab = memo(({ settings, updateSetting }: SettingsTabProps) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Eye className="h-5 w-5 text-green-600" /> Privacy & Visibility</CardTitle>
        <CardDescription>Control who sees your activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Profile Visibility</Label>
          <Select value={settings.profile_visibility} onValueChange={(v) => updateSetting("profile_visibility", v as SettingsConfig["profile_visibility"])}>
            <SelectTrigger className="w-full bg-background md:w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">Everyone</SelectItem>
              <SelectItem value="enrolled">Enrolled Students & Lecturers</SelectItem>
              <SelectItem value="nobody">Only Me</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Separator />
        <div className="space-y-5">
          <SettingSwitch
            id="show-online-status"
            title="Show Online Status"
            desc="Let others see when you are active"
            checked={settings.show_online_status}
            onChange={(v) => updateSetting("show_online_status", v)}
          />
        </div>
      </CardContent>
    </Card>
  </div>
));

const SecurityTab = memo(({ settings, updateSetting }: SettingsTabProps) => {
  const { history, isLoading: isHistoryLoading } = useLoginHistory();
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ new: "", confirm: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.new !== pwdForm.confirm) return toast.error("Passwords do not match");
    if (pwdForm.new.length < 8) return toast.error("Password must be at least 8 characters");

    setIsChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwdForm.new });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPwdForm({ new: "", confirm: "" });
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to update password");
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      toast.error("Type DELETE to confirm account deletion.");
      return;
    }

    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      toast.error("Failed to delete account: " + getErrorMessage(err));
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) setDeleteConfirm("");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-sm border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5 text-red-600" /> Authentication & Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Key className="h-4 w-4" /> Change Password</h3>
            <form onSubmit={handlePasswordChange} className="max-w-md space-y-3">
              <Input type="password" placeholder="New Password" value={pwdForm.new} onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })} />
              <Input type="password" placeholder="Confirm New Password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
              <Button type="submit" disabled={isChangingPwd || !pwdForm.new || !pwdForm.confirm}>
                {isChangingPwd ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>

          <Separator />

          <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-background p-3 shadow-sm"><Smartphone className="h-5 w-5 text-primary" /></div>
              <div>
                <Label className="text-base font-semibold">Two-Factor Authentication (2FA)</Label>
                <p className="mt-1 text-sm text-muted-foreground">TOTP setup can be added when Supabase MFA is enabled.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Coming soon</Badge>
              <Button variant="outline" disabled>Setup 2FA</Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-semibold"><Clock className="h-4 w-4" /> Recent Login Activity</Label>
            {isHistoryLoading ? <Skeleton className="h-24 w-full" /> : (
              <div className="overflow-hidden rounded-xl border text-sm">
                {history.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No login history recorded yet.</div>
                ) : (
                  history.slice(0, 3).map((h, i) => (
                    <div key={h.id} className={`flex items-center justify-between p-3 ${i > 0 ? "border-t" : ""}`}>
                      <div>
                        <p className="font-medium">{h.device || "Unknown Device"} • {h.browser || "Unknown Browser"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(h.login_time).toLocaleString()} • IP: {h.ip_address || "Unknown"}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{h.location || "Unknown Location"}</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 flex-1 pr-4">
              <Label className="text-base font-semibold text-destructive">Delete Account</Label>
              <p className="text-sm text-muted-foreground leading-snug">Permanently delete your account and all associated data.</p>
            </div>

            <div className="flex-shrink-0">
              <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Account</Button>
                </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label>Type <span className="font-bold text-destructive">DELETE</span> to confirm</Label>
                  <Input
                    id="delete-confirm"
                    className="mt-2"
                    placeholder="DELETE"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirm.trim().toUpperCase() !== "DELETE"}
                  >
                    Confirm Deletion
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});



const SettingSwitch = ({ title, desc, checked, onChange, icon, bg = "bg-muted", id }: SettingSwitchProps) => {
  const switchId = id ?? title.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex items-start justify-between gap-5 rounded-lg p-3 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {icon && <span className={`shrink-0 rounded-xl p-2.5 ${bg}`}>{icon}</span>}
        <div className="min-w-0 space-y-1">
          <Label htmlFor={switchId} className="cursor-pointer text-base font-medium leading-5">{title}</Label>
          <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div 
        role="switch" 
        aria-checked={checked} 
        onClick={() => onChange(!checked)}
        style={{
          width: '40px', height: '24px', 
          backgroundColor: checked ? 'var(--primary, #000)' : '#cbd5e1',
          borderRadius: '999px',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: '4px',
          transition: 'background-color 0.2s'
        }}
      >
        <div style={{
          width: '18px', height: '18px',
          backgroundColor: '#fff',
          borderRadius: '50%',
          position: 'absolute',
          top: '3px',
          left: checked ? '19px' : '3px',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  );
};

const SettingsSkeleton = () => (
  <div className="min-w-0 overflow-hidden bg-background" style={{ height: "calc(100vh - 2rem)" }}>
    <div
      className="h-full min-w-0"
      style={{ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)" }}
    >
      <div className="min-w-0 border-r p-4">
        <div className="space-y-4">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>

      <div className="min-w-0 p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
);
