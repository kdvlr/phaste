import React, { useState } from 'react';
import {
  X,
  User,
  Globe,
  MapPin,
  Laptop,
  Smartphone,
  Clock,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Maximize2
} from 'lucide-react';
import { Phaste } from '../types';
import { format } from 'date-fns';

interface MetadataModalProps {
  phaste: Phaste | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({ phaste, isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'raw'>('overview');

  if (!isOpen || !phaste) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const meta = phaste.metadata_context || {};
  const author = meta.author;
  const network = meta.network;
  const browser = meta.browser;
  const client = meta.client;
  const location = meta.location;
  const exif = meta.exif;
  const og = meta.og;

  const isOwner = author?.is_owner ?? (network?.is_local || author?.label?.toLowerCase().includes('you'));
  const clientIp = network?.ip || 'Unknown';
  const userAgent = network?.user_agent || client?.user_agent || 'Unknown';
  const os = browser?.os || client?.os || client?.platform || 'Unknown';
  const browserName = browser?.browser || client?.browser || 'Unknown';
  const screen = browser?.screen || client?.screen_resolution || 'Unknown';
  const timezone = browser?.timezone || client?.timezone || 'Unknown';
  const language = browser?.language || client?.language || 'Unknown';
  const locFormatted = location?.formatted || meta.formatted_location || location?.city || meta.city || (network?.is_local ? `Local Network (${clientIp})` : 'Unknown');
  const lat = location?.latitude ?? client?.latitude;
  const lon = location?.longitude ?? client?.longitude;

  const createdDate = new Date(phaste.created_at);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-md3-surface-container rounded-md3-xl border border-md3-outline-variant/30 shadow-md3-3 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-md3-outline-variant/15 bg-md3-surface-container-high/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-md3-primary/10 flex items-center justify-center text-md3-primary">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-md3-on-surface">Capture Context Inspector</h3>
              <p className="text-xs text-md3-on-surface-variant">
                Full metadata & origin details for #{phaste.public_slug}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex bg-md3-surface-container-lowest rounded-full p-0.5 border border-md3-outline-variant/15 text-xs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-md3-primary text-md3-on-primary font-medium shadow-sm'
                    : 'text-md3-on-surface-variant hover:text-md3-on-surface'
                }`}
              >
                Structured
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'raw'
                    ? 'bg-md3-primary text-md3-on-primary font-medium shadow-sm'
                    : 'text-md3-on-surface-variant hover:text-md3-on-surface'
                }`}
              >
                Raw JSON
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'overview' ? (
            <>
              {/* 1. Author & Identity Card */}
              <div className="p-4 rounded-md3-lg bg-md3-surface-container-low border border-md3-outline-variant/15">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-md3-primary">
                    <User className="w-4 h-4" />
                    <span>Origin & Identity</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isOwner
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {isOwner ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <span>{isOwner ? 'Pasted by You (Owner)' : 'Pasted by Guest / Someone else'}</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Author Display Name</span>
                    <span className="text-md3-on-surface font-medium">{author?.name || (isOwner ? 'You' : 'Guest')}</span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Authentication Source</span>
                    <span className="text-md3-on-surface font-mono bg-md3-surface-container-highest px-2 py-0.5 rounded text-[11px]">
                      {author?.source || (network?.is_local ? 'local_network' : 'anonymous')}
                    </span>
                  </div>
                  {author?.device_name && (
                    <div className="sm:col-span-2">
                      <span className="text-md3-on-surface-variant block mb-0.5">Device Name</span>
                      <span className="text-md3-on-surface font-medium">{author.device_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Network & IP Card */}
              <div className="p-4 rounded-md3-lg bg-md3-surface-container-low border border-md3-outline-variant/15">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-md3-primary">
                    <Globe className="w-4 h-4" />
                    <span>Network & Connection</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(clientIp, 'ip')}
                    className="flex items-center gap-1 text-[11px] text-md3-primary hover:underline font-mono"
                  >
                    {copiedKey === 'ip' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'ip' ? 'Copied' : 'Copy IP'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Client IP Address</span>
                    <span className="text-md3-on-surface font-mono font-semibold text-sm">{clientIp}</span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Network Topology</span>
                    <span className="text-md3-on-surface font-medium">
                      {network?.is_local ? '🏡 Home Local Area Network (LAN)' : '🌐 Public Internet'}
                    </span>
                  </div>
                </div>
                <div className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-md3-on-surface-variant">User-Agent Header</span>
                    <button
                      onClick={() => copyToClipboard(userAgent, 'ua')}
                      className="text-[11px] text-md3-primary hover:underline flex items-center gap-1"
                    >
                      {copiedKey === 'ua' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'ua' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded bg-md3-surface-container-highest font-mono text-[11px] text-md3-on-surface-variant break-all leading-relaxed select-all">
                    {userAgent}
                  </div>
                </div>
              </div>

              {/* 3. Location & Geocoding Card */}
              <div className="p-4 rounded-md3-lg bg-md3-surface-container-low border border-md3-outline-variant/15">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-md3-primary">
                    <MapPin className="w-4 h-4" />
                    <span>Location & Geocoding</span>
                  </div>
                  {lat && lon && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-md3-primary hover:underline"
                    >
                      <span>View Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <span className="text-md3-on-surface-variant block mb-0.5">Resolved Location</span>
                    <span className="text-md3-on-surface font-medium text-sm">{locFormatted}</span>
                  </div>
                  {location?.city && (
                    <div>
                      <span className="text-md3-on-surface-variant block mb-0.5">City</span>
                      <span className="text-md3-on-surface font-medium">{location.city}</span>
                    </div>
                  )}
                  {location?.country_code && (
                    <div>
                      <span className="text-md3-on-surface-variant block mb-0.5">Country Code</span>
                      <span className="text-md3-on-surface font-medium">{location.country_code}</span>
                    </div>
                  )}
                  {lat && lon && (
                    <div className="sm:col-span-2">
                      <span className="text-md3-on-surface-variant block mb-0.5">GPS Coordinates</span>
                      <span className="text-md3-on-surface font-mono text-[11px]">
                        {lat.toFixed(5)}°, {lon.toFixed(5)}°
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Geocoding Source</span>
                    <span className="text-md3-on-surface font-mono text-[11px] bg-md3-surface-container-highest px-2 py-0.5 rounded">
                      {location?.source || (network?.is_local ? 'lan_ip' : 'unknown')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Browser & Hardware Card */}
              <div className="p-4 rounded-md3-lg bg-md3-surface-container-low border border-md3-outline-variant/15">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-md3-primary mb-3">
                  <Laptop className="w-4 h-4" />
                  <span>Browser & Device Environment</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Browser</span>
                    <span className="text-md3-on-surface font-medium">{browserName}</span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Operating System</span>
                    <span className="text-md3-on-surface font-medium">{os}</span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Device Type</span>
                    <span className="text-md3-on-surface font-medium capitalize">{browser?.device_type || 'Desktop'}</span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Screen Resolution</span>
                    <span className="text-md3-on-surface font-mono">{screen}</span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Timezone</span>
                    <span className="text-md3-on-surface font-medium">{timezone}</span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Language</span>
                    <span className="text-md3-on-surface font-medium">{language}</span>
                  </div>
                </div>
              </div>

              {/* 5. Temporal Info */}
              <div className="p-4 rounded-md3-lg bg-md3-surface-container-low border border-md3-outline-variant/15">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-md3-primary mb-3">
                  <Clock className="w-4 h-4" />
                  <span>Temporal Record</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">Local Capture Time</span>
                    <span className="text-md3-on-surface font-medium">
                      {format(createdDate, 'EEEE, MMMM d, yyyy h:mm:ss a')}
                    </span>
                  </div>
                  <div>
                    <span className="text-md3-on-surface-variant block mb-0.5">UTC Timestamp</span>
                    <span className="text-md3-on-surface font-mono text-[11px]">{phaste.created_at}</span>
                  </div>
                </div>
              </div>

              {/* 6. Media / EXIF / OCR Data */}
              {(exif || phaste.ocr_transcript || og) && (
                <div className="p-4 rounded-md3-lg bg-md3-surface-container-low border border-md3-outline-variant/15">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-md3-primary mb-3">
                    <Camera className="w-4 h-4" />
                    <span>Enrichment & Content Metadata</span>
                  </div>
                  <div className="space-y-3 text-xs">
                    {phaste.ocr_transcript && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-md3-on-surface-variant">OCR Extracted Transcript</span>
                          <button
                            onClick={() => copyToClipboard(phaste.ocr_transcript || '', 'ocr')}
                            className="text-[11px] text-md3-primary hover:underline flex items-center gap-1"
                          >
                            {copiedKey === 'ocr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === 'ocr' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="p-2.5 rounded bg-md3-surface-container-highest font-mono text-[11px] text-md3-on-surface select-all leading-relaxed max-h-32 overflow-y-auto">
                          {phaste.ocr_transcript}
                        </div>
                      </div>
                    )}
                    {exif && Object.keys(exif).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        {exif.camera_make && (
                          <div>
                            <span className="text-md3-on-surface-variant block">Make</span>
                            <span className="font-medium text-md3-on-surface">{exif.camera_make}</span>
                          </div>
                        )}
                        {exif.camera_model && (
                          <div>
                            <span className="text-md3-on-surface-variant block">Model</span>
                            <span className="font-medium text-md3-on-surface">{exif.camera_model}</span>
                          </div>
                        )}
                        {exif.f_number && (
                          <div>
                            <span className="text-md3-on-surface-variant block">Aperture</span>
                            <span className="font-mono text-md3-on-surface">f/{exif.f_number}</span>
                          </div>
                        )}
                        {exif.iso && (
                          <div>
                            <span className="text-md3-on-surface-variant block">ISO</span>
                            <span className="font-mono text-md3-on-surface">{exif.iso}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Raw JSON Viewer */
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(phaste, null, 2), 'raw_json')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-md3-primary text-md3-on-primary text-xs font-semibold shadow-md hover:bg-md3-primary/90 transition-colors"
                >
                  {copiedKey === 'raw_json' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'raw_json' ? 'Copied' : 'Copy Full JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-md3-lg bg-md3-surface-container-lowest border border-md3-outline-variant/20 font-mono text-xs text-md3-on-surface overflow-x-auto leading-relaxed max-h-[65vh] select-all">
                {JSON.stringify(phaste, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-md3-outline-variant/15 bg-md3-surface-container-high/40 flex items-center justify-between">
          <span className="text-[11px] text-md3-on-surface-variant font-mono">
            ID: {phaste.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-md3-surface-container-highest text-md3-on-surface hover:bg-md3-outline-variant/20 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
