import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type FeedbackCategory = 'sugestao' | 'critica' | 'erro';
export type FeedbackStatus = 'novo' | 'em-analise' | 'resolvido';

export interface FeedbackPayload {
  uid: string;
  userName: string;
  userEmail: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  page: string;
}

export async function saveFeedback(payload: FeedbackPayload): Promise<string> {
  const docRef = await addDoc(collection(db, 'feedbacks'), {
    ...payload,
    status: 'novo' as FeedbackStatus,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}
