import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import type { CommPost } from '../types/userData';

function parseCreatedAt(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

/**
 * Escuta a coleção "community" (feed da comunidade) em tempo real.
 * Mesma coleção usada pelo app legado.
 */
export function useCommunityFeed() {
  const [posts, setPosts] = useState<CommPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const col = collection(db, 'community');
    const q = query(col, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CommPost[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            uid: d.uid ?? '',
            nickname: d.nickname ?? 'Anônimo',
            color: d.color ?? '#4F8CFF',
            photoURL: d.photoURL ?? null,
            text: d.text ?? '',
            cat: d.cat,
            likes: Array.isArray(d.likes) ? d.likes : [],
            comments: Array.isArray(d.comments) ? d.comments : [],
            createdAt: parseCreatedAt(d.createdAt),
          };
        });
        setPosts(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err as Error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return { posts, loading, error };
}
