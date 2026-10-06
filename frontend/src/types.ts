export type PhasteKind = 'text' | 'richtext' | 'link' | 'image' | 'video';
export type PhasteStatus = 'ready' | 'processing' | 'fallback_stream' | 'failed';

export interface MetadataContext {
  city?: string;
  region?: string;
  country_code?: string;
  formatted_location?: string;
  client?: {
    platform?: string;
    timezone?: string;
    user_agent?: string;
    latitude?: number;
    longitude?: number;
  };
  exif?: {
    camera_make?: string;
    camera_model?: string;
    date_taken?: string;
    iso?: string;
    f_number?: number;
  };
  og?: {
    title?: string;
    description?: string;
    image_url?: string;
    favicon_url?: string;
    site_name?: string;
  };
  video_info?: {
    uploader?: string;
    duration?: number;
    width?: number;
    height?: number;
  };
  [key: string]: any;
}

export interface Phaste {
  id: string;
  public_slug: string;
  kind: PhasteKind;
  status: PhasteStatus;
  error_message?: string | null;
  title?: string | null;
  content?: string | null;
  rendered_content?: string | null;
  source_url?: string | null;
  media_path?: string | null;
  thumbnail_path?: string | null;
  media_mime_type?: string | null;
  media_size_bytes?: number | null;
  media_dimensions?: { width: number; height: number } | null;
  duration_seconds?: number | null;
  ocr_transcript?: string | null;
  metadata_context: MetadataContext;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchResultItem {
  phaste: Phaste;
  score: number;
  match_type: 'lexical' | 'semantic' | 'hybrid' | 'filter';
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  query: string;
  filters_applied: Record<string, any>;
}

export interface SnackbarMessage {
  id: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'info' | 'success' | 'error';
}
