import { useEffect } from 'react';
import { Phaste } from '../types';

interface EventsHandler {
  onPhasteCreated?: (phaste: Phaste) => void;
  onPhasteProcessed?: (phaste: Phaste) => void;
  onPhasteUpdated?: (phaste: Partial<Phaste> & { id: string }) => void;
  onPhasteDeleted?: (data: { id: string }) => void;
  onCategoryCreated?: (data: { name: string }) => void;
  onCategoryRenamed?: (data: { old_name: string; new_name: string; count?: number }) => void;
  onCategoryDeleted?: (data: { name: string; count?: number }) => void;
}

export function useEvents(handlers: EventsHandler) {
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      es = new EventSource('/api/events');

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.event;
          const data = payload.data;

          if (type === 'phaste.created' && handlers.onPhasteCreated) {
            handlers.onPhasteCreated(data);
          } else if (type === 'phaste.processed' && handlers.onPhasteProcessed) {
            handlers.onPhasteProcessed(data);
          } else if (type === 'phaste.updated' && handlers.onPhasteUpdated) {
            handlers.onPhasteUpdated(data);
          } else if (type === 'phaste.deleted' && handlers.onPhasteDeleted) {
            handlers.onPhasteDeleted(data);
          } else if (type === 'category.created' && handlers.onCategoryCreated) {
            handlers.onCategoryCreated(data);
          } else if (type === 'category.renamed' && handlers.onCategoryRenamed) {
            handlers.onCategoryRenamed(data);
          } else if (type === 'category.deleted' && handlers.onCategoryDeleted) {
            handlers.onCategoryDeleted(data);
          }
        } catch (e) {
          // ignore heartbeat / invalid json
        }
      };

      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (es) es.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [handlers]);
}
