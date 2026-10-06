# 0010. Local Persistent Volume Media Storage with Byte-Range Streaming

We chose a local persistent volume directory (`/data/media/YYYY/MM/`) mounted into the application container for storing binary assets (original images, web-optimized MP4 videos, thumbnails). The API serves media directly with HTTP `Range` headers (`206 Partial Content`) to enable smooth seeking and scrubbing in video players across desktop and mobile devices without requiring external object storage infrastructure.
