import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { demoRepository, type TicketCommit } from '../domain/repository';
import type { CrmSnapshot } from '../domain/types';

type LoadStatus = 'loading' | 'ready' | 'error';

interface CrmContextValue {
  data: CrmSnapshot | null;
  status: LoadStatus;
  error: string | null;
  reload: () => Promise<void>;
  resetDemo: () => Promise<void>;
  saveTicket: (commit: TicketCommit) => Promise<void>;
}

const CrmContext = createContext<CrmContextValue | null>(null);

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Не удалось открыть локальное хранилище браузера.';
}

export function CrmProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CrmSnapshot | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const snapshot = await demoRepository.loadSnapshot();
      setData(snapshot);
      setStatus('ready');
    } catch (loadError) {
      setError(errorMessage(loadError));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    let active = true;
    demoRepository
      .loadSnapshot()
      .then((snapshot) => {
        if (!active) return;
        setData(snapshot);
        setStatus('ready');
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(errorMessage(loadError));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const resetDemo = useCallback(async () => {
    const snapshot = await demoRepository.resetDemo();
    setData(snapshot);
    setError(null);
    setStatus('ready');
  }, []);

  const saveTicket = useCallback(async (commit: TicketCommit) => {
    await demoRepository.commitTicket(commit);
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        tickets: current.tickets.map((ticket) =>
          ticket.id === commit.ticket.id ? commit.ticket : ticket,
        ),
        messages: [...current.messages, ...commit.messages],
        activities: [commit.activity, ...current.activities],
      };
    });
  }, []);

  const value = useMemo(
    () => ({ data, status, error, reload, resetDemo, saveTicket }),
    [data, status, error, reload, resetDemo, saveTicket],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used inside CrmProvider');
  }
  return context;
}

export function useCrmData(): CrmSnapshot {
  const { data } = useCrm();
  if (!data) {
    throw new Error('CRM data is not loaded yet');
  }
  return data;
}
