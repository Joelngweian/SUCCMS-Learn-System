export interface Story {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  contentUrl: string;
  type: "image";
  timestamp: string;
  viewed: boolean;
  created_at: string;
  expires_at: string;
}

export interface StoryUser {
  id: string;
  name: string;
  initials: string;
  avatar_url?: string;
  role: string;
  hasActiveStories: boolean;
  stories: Story[];
  viewed: boolean;
}
