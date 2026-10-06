import React from 'react';
import { MapPin, Camera, Clock, Laptop, Smartphone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MetadataContext } from '../types';

interface MetadataBadgeProps {
  createdAt: string;
  metadata: MetadataContext;
}

export const MetadataBadge: React.FC<MetadataBadgeProps> = ({ createdAt, metadata }) => {
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  const location = metadata.city || metadata.formatted_location;
  const camera = metadata.exif?.camera_model || metadata.exif?.camera_make;
  const platform = metadata.client?.platform || '';
  const isMobile = /iphone|ipad|android/i.test(platform);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-md3-on-surface-variant/80 font-normal">
      {/* Time */}
      <span className="flex items-center gap-1" title={new Date(createdAt).toLocaleString()}>
        <Clock className="w-3 h-3 text-md3-outline" />
        {timeAgo}
      </span>

      {/* Geolocation */}
      {location && (
        <span className="flex items-center gap-1 text-md3-primary" title={location}>
          <MapPin className="w-3 h-3 text-md3-primary" />
          <span className="truncate max-w-[120px]">{location}</span>
        </span>
      )}

      {/* Camera */}
      {camera && (
        <span className="flex items-center gap-1" title={camera}>
          <Camera className="w-3 h-3 text-md3-outline" />
          <span className="truncate max-w-[100px]">{camera}</span>
        </span>
      )}

      {/* Device Platform */}
      {platform && (
        <span className="flex items-center gap-1" title={platform}>
          {isMobile ? (
            <Smartphone className="w-3 h-3 text-md3-outline" />
          ) : (
            <Laptop className="w-3 h-3 text-md3-outline" />
          )}
          <span className="capitalize">{platform.split(' ')[0]}</span>
        </span>
      )}
    </div>
  );
};
