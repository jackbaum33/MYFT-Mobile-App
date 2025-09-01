// services/schedule.ts
import {
    collection, query, where, orderBy, onSnapshot, Timestamp,
    QueryConstraint, getDocs, addDoc, serverTimestamp
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  export type ScheduleEvent = {
    id: string;
    title: string;
    startAt: Date;
    endAt?: Date | null;
    location?: string | null;
    description?: string | null;
    category?: string | null;
    dayLabel?: string | null;
    visibility?: string | null;
  };
  
  function mapDoc(d: any): ScheduleEvent {
    const data = d.data();
    return {
      id: d.id,
      title: data.title,
      startAt: (data.startAt as Timestamp)?.toDate?.() ?? new Date(data.startAt),
      endAt: data.endAt ? (data.endAt as Timestamp)?.toDate?.() : null,
      location: data.location ?? null,
      description: data.description ?? null,
      category: data.category ?? null,
      dayLabel: data.dayLabel ?? null,
      visibility: data.visibility ?? 'public',
    };
  }
  
  /** Live subscribe by date range */
  export function listenScheduleByRange(
    from: Date,
    to: Date,
    cb: (events: ScheduleEvent[]) => void
  ) {
    const ref = collection(db, 'scheduleEvents');
    const q = query(
      ref,
      where('startAt', '>=', from),
      where('startAt', '<=', to),
      orderBy('startAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map(mapDoc));
    });
  }
  
  /** One-off fetch for a day or range */
  export async function fetchScheduleByDay(dayISO: string) {
    const date = new Date(dayISO);
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date);   end.setHours(23,59,59,999);
  
    const ref = collection(db, 'scheduleEvents');
    const q = query(
      ref,
      where('startAt', '>=', start),
      where('startAt', '<=', end),
      orderBy('startAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
  }
  
  /** (Optional) seed helper if you want to add events via code once */
  export async function seedScheduleEvent(e: Omit<ScheduleEvent,'id'|'startAt'|'endAt'> & { startAt: Date; endAt?: Date | null }) {
    const ref = collection(db, 'scheduleEvents');
    await addDoc(ref, {
      title: e.title,
      startAt: Timestamp.fromDate(e.startAt),
      endAt: e.endAt ? Timestamp.fromDate(e.endAt) : null,
      location: e.location ?? null,
      description: e.description ?? null,
      category: e.category ?? null,
      dayLabel: e.dayLabel ?? null,
      visibility: e.visibility ?? 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  