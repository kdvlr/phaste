import React from 'react';
import {
  MapPin,
  Clock,
  Laptop,
  Smartphone,
  Globe,
  User,
  Info,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { MetadataContext } from '../types';

interface MetadataBadgeProps {
  createdAt: string;
  metadata: MetadataContext;
  onInspect?: () => void;
}

export const MetadataBadge: React.FC<MetadataBadgeProps> = ({ createdAt, metadata, onInspect }) => {
  const dateObj = new Date(createdAt);
  const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true });
  const formattedTime = format(dateObj, 'MMM d, h:mm a');

  const author = metadata.author;
  const network = metadata.network;
  const browser = metadata.browser;
  const client = metadata.client;
  const location = metadata.location;

  const isOwner = author?.is_owner ?? (network?.is_local || author?.label?.toLowerCase().includes('you'));
  const ip = network?.ip;
  const locName = location?.city || location?.formatted || metadata.formatted_location || metadata.city;
  const browserName = browser?.browser_name || browser?.browser || client?.browser;
  const osName = browser?.os || client?.os || client?.platform;
  const isMobile = browser?.device_type === 'mobile' || /iphone|ipad|android/i.test(client?.platform || '');

  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-md3-on-surface-variant/80 font-normal">
      {/* Left items: Chips */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 min-w-0">
        {/* Author Chip */}
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium text-[10px] ${
            isOwner
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
          }`}
          title={isOwner ? 'Captured by You (Owner)' : 'Captured by Guest / Someone else'}
        >
          {isOwner ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
          <span>{isOwner ? 'You' : 'Guest'}</span>
        </span>

        {/* Time */}
        <span className="flex items-center gap-1" title={`${format(dateObj, 'PPpp')} (${timeAgo})`}>
          <Clock className="w-3 h-3 text-md3-outline flex-shrink-0" />
          <span className="truncate">{formattedTime}</span>
        </span>

        {/* IP Address */}
        {ip && (
          <span
            className="flex items-center gap-1 font-mono text-[10px] text-md3-on-surface-variant/90 bg-md3-surface-container-highest px-1.5 py-0.5 rounded"
            title={`Client IP: ${ip} (${network?.is_local ? 'Local LAN' : 'External'})`}
          >
            <Globe className="w-2.5 h-2.5 text-md3-outline flex-shrink-0" />
            <span>{ip}</span>
          </span>
        )}

        {/* Location */}
        {locName && (
          <span className="flex items-center gap-1 text-md3-primary" title={`Resolved Location: ${locName}`}>
            <MapPin className="w-3 h-3 text-md3-primary flex-shrink-0" />
            <span className="truncate max-w-[130px]">{locName}</span>
          </span>
        )}

        {/* Browser & OS */}
        {(browserName || osName) && (
          <span className="flex items-center gap-1" title={`${browserName || 'Browser'} on ${osName || 'OS'}`}>
            {isMobile ? (
              <Smartphone className="w-3 h-3 text-md3-outline flex-shrink-0" />
            ) : (
              <Laptop className="w-3 h-3 text-md3-outline flex-shrink-0" />
            )}
            <span className="truncate max-w-[100px]">
              {browserName || osName}
            </span>
          </span>
        )}
      </div>

      {/* Right item: Inspect Details Button */}
      {onInspect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-md3-surface-container-highest hover:bg-md3-outline-variant/30 text-md3-primary hover:text-md3-on-surface text-[10px] font-medium transition-colors"
          title="Inspect full captured metadata & network details"
        >
          <Info className="w-3 h-3" />
          <span className="hidden sm:inline">Details</span>
        </button>
      )}
    </div>
  );
};
