export type Listing = {
  id: string;
  title: string;
  description: string;
  city: string;
  district: string | null;
  country: string;
  address: string;
  type: string;
  rating: number;
  reviewCount: number;
  trustScore?: number;
  pricePerNight: number | null;
  pricePerMonth: number | null;
  currency: string;
  rooms?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  maxGuests: number | null;
  images?: Array<{ id: string; url: string; position: number }>;
  amenities?: Array<{ id: string; name: string; icon?: string | null; category?: string | null }>;
  host?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    rating?: number;
    reviewCount?: number;
    trustScore?: number;
    reputationScore?: number;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    identityVerified?: boolean;
  };
};

export type Conversation = {
  conversationId: string;
  listing: {
    id: string;
    title: string;
    city: string;
    country: string;
  };
  host: {
    id: string;
    firstName: string;
    lastName: string;
  };
  guest: {
    id: string;
    firstName: string;
    lastName: string;
  };
  lastMessage?: {
    id: string;
    senderId: string;
    text: string;
    createdAt: string;
  } | null;
  updatedAt: string;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead?: boolean;
};
