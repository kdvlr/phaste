import React, { useRef, useEffect } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { getMediaUrl } from '../api';

interface VideoPlayerProps {
  mediaPath?: string | null;
  thumbnailPath?: string | null;
  sourceUrl?: string | null;
  status: string;
  title?: string | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  mediaPath,
  thumbnailPath,
  sourceUrl,
  status,
  title,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Invariant per global rules: Clean up unmounted <video> elements to release hardware GPU decoders
  useEffect(() => {
    const videoEl = videoRef.current;
    return () => {
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
      }
    };
  }, []);

  const videoUrl = mediaPath ? getMediaUrl(mediaPath) : null;
  const posterUrl = thumbnailPath ? getMediaUrl(thumbnailPath) : undefined;

  // Local downloaded video file (ADR 0004 & ADR 0010)
  if (videoUrl) {
    return (
      <div className="relative rounded-md3-md overflow-hidden bg-black aspect-video group">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Fallback stream or external source (ADR 0004)
  return (
    <div className="relative rounded-md3-md overflow-hidden bg-md3-surface-container-lowest aspect-video border border-md3-outline-variant/30 flex flex-col items-center justify-center p-4 text-center">
      {posterUrl && (
        <img
          src={posterUrl}
          alt={title || 'Video preview'}
          className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px]"
        />
      )}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-md3-primary/20 backdrop-blur border border-md3-primary/30 flex items-center justify-center text-md3-primary shadow-md3-2">
          <Play className="w-6 h-6 ml-0.5 fill-current" />
        </div>
        <p className="text-xs font-medium text-md3-on-surface line-clamp-1 max-w-[240px]">
          {title || 'External Video Stream'}
        </p>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-md3-surface-container-high/90 hover:bg-md3-primary hover:text-md3-on-primary text-[11px] font-medium text-md3-on-surface-variant transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open Original Stream</span>
          </a>
        )}
        <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          Stream Fallback (&gt;500MB or DRM)
        </span>
      </div>
    </div>
  );
};
