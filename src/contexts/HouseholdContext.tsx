import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  createHousehold,
  getMember,
  getUserHouseholds,
} from '../lib/households';
import { subscribeMembers } from '../lib/members';
import type { Household, Member } from '../types';

const ACTIVE_KEY = 'active_household_id';

interface HouseholdContextValue {
  loading: boolean;
  households: Household[];
  activeHousehold: Household | null;
  currentMember: Member | null;
  members: Member[];
  selectHousehold: (id: string) => void;
  createNewHousehold: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(
  undefined
);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY)
  );
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const loadHouseholds = useCallback(async () => {
    if (!user) {
      setHouseholds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getUserHouseholds(user.uid);
    setHouseholds(list);
    setActiveId((prev) => {
      if (prev && list.some((h) => h.id === prev)) return prev;
      return list.length > 0 ? list[0].id : null;
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadHouseholds();
  }, [loadHouseholds]);

  // סנכרון החשבון הפעיל ל-localStorage
  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeHousehold =
    households.find((h) => h.id === activeId) ?? null;

  // מאזין לחברים של החשבון הפעיל + זיהוי החבר הנוכחי
  useEffect(() => {
    if (!activeHousehold || !user) {
      setMembers([]);
      setCurrentMember(null);
      return;
    }
    const unsub = subscribeMembers(activeHousehold.id, (list) => {
      setMembers(list);
      setCurrentMember(list.find((m) => m.userId === user.uid) ?? null);
    });
    return unsub;
  }, [activeHousehold, user]);

  // גיבוי: אם עדיין אין currentMember (למשל מיד לאחר הצטרפות) — משיכה ישירה
  useEffect(() => {
    if (activeHousehold && user && !currentMember) {
      getMember(activeHousehold.id, user.uid).then((m) => {
        if (m) setCurrentMember(m);
      });
    }
  }, [activeHousehold, user, currentMember]);

  function selectHousehold(id: string) {
    setActiveId(id);
  }

  async function createNewHousehold(name: string) {
    if (!user) return;
    const id = await createHousehold(name, user);
    await loadHouseholds();
    setActiveId(id);
  }

  return (
    <HouseholdContext.Provider
      value={{
        loading,
        households,
        activeHousehold,
        currentMember,
        members,
        selectHousehold,
        createNewHousehold,
        refresh: loadHouseholds,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx)
    throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
