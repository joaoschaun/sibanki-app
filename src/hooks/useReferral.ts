import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const STORAGE_KEY = 'sib_ref_code';

export function captureRefParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.length >= 4) {
      localStorage.setItem(STORAGE_KEY, ref.toUpperCase());
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    }
  } catch { /* silent */ }
}

export function useReferral() {
  const { user, data } = useAppContext();
  const processed = useRef(false);

  useEffect(() => {
    if (!user?.uid || processed.current) return;
    if ((data as any)?.refCode) { processed.current = true; return; }

    const refCode = localStorage.getItem(STORAGE_KEY);
    if (!refCode) return;

    processed.current = true;
    (async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('filiadoCodigo', '==', refCode));
        const snap = await getDocs(q);
        if (snap.empty) return;
        const filiadoDoc = snap.docs[0];
        if (filiadoDoc.id === user.uid) return;

        await updateDoc(doc(db, 'users', user.uid), {
          refCode,
          refFiliadoUid: filiadoDoc.id,
          refRegistradoEm: serverTimestamp(),
        });

        const filiadoRef = doc(db, 'users', filiadoDoc.id, 'filiado', 'dados');
        const filiadoSnap = await getDoc(filiadoRef);
        if (filiadoSnap.exists()) {
          await updateDoc(filiadoRef, { totalIndicados: increment(1) });
        }

        localStorage.removeItem(STORAGE_KEY);
      } catch { /* silent */ }
    })();
  }, [user?.uid, data]);
}
