import React from 'react';
import {
  Clock,
  Laptop,
  Smartphone,
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

export const MetadataBadge: React.FC<MetadataBadgeProps> = ({ createdAt, metadata }) => {
  const dateObj = new Date(createdAt);
  const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true });
  const formattedTime = format(dateObj, 'MMM d, h:mm a');

  const author = metadata.author;
  const network = metadata.network;
  const browser = metadata.browser;
  const client = metadata.client;

  const isOwner = author?.is_owner ?? (network?.is_local || author?.label?.toLowerCase().includes('you'));
  const browserName = browser?.browser_name || browser?.browser || client?.browser;
  const osName = browser?.os || client?.os || client?.platform;
  const isMobile = browser?.device_type === 'mobile' || /iphone|ipad|android/i.test(client?.platform || '');

  return (
    <div className="flex items-center gap-2 text-xs text-md3-on-surface-variant font-medium overflow-hidden whitespace-nowrap min-w-0">
      {/* Author Chip */}
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold shrink-0 ${
          isOwner
            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
        }`}
        title={isOwner ? 'Captured by You (Owner)' : 'Captured by Guest / Someone else'}
      >
        {isOwner ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
        <span>{isOwner ? 'You' : 'Guest'}</span>
      </span>

      <span className="text-md3-outline/40 shrink-0">•</span>

      {/* Timestamp */}
      <span
        className="flex items-center gap-1 text-md3-on-surface-variant shrink-0"
        title={`${format(dateObj, 'PPpp')} (${timeAgo})`}
      >
        <Clock className="w-3.5 h-3.5 text-md3-outline shrink-0" />
        <span>{formattedTime}</span>
      </span>

      {/* Browser / Device (if available) */}
      {(browserName || osName) && (
        <>
          <span className="text-md3-outline/40 shrink-0">•</span>
          <span
            className="flex items-center gap-1 text-md3-on-surface-variant truncate min-w-0"
            title={`${browserName || 'Browser'} on ${osName || 'OS'}`}
          >
            {isMobile ? (
              <Smartphone className="w-3.5 h-3.5 text-md3-outline shrink-0" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-md3-outline shrink-0" />
            )}
            <span className="truncate">{browserName || osName}</span>
          </span>
        </>
      )}
    </div>
  );
};
