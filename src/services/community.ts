import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { CommProfile } from '../types/userData';

/**
 * Publica um post na coleção "community" (mesmo do app legado).
 */
export async function addCommunityPost(
  uid: string,
  profile: CommProfile,
  text: string,
  cat: string = 'discussao',
  photoURL?: string | null
): Promise<void> {
  const col = collection(db, 'community');
  await addDoc(col, {
    uid,
    nickname: profile.nickname,
    color: profile.color,
    photoURL: photoURL ?? null,
    text: text.trim(),
    cat,
    likes: [],
    comments: [],
    createdAt: serverTimestamp(),
  });
}

/**
 * Alterna curtida no post (adiciona ou remove o nickname do array likes).
 */
export async function toggleCommunityLike(
  postId: string,
  nickname: string,
  currentLikes: string[]
): Promise<void> {
  const ref = doc(db, 'community', postId);
  const hasLiked = currentLikes.includes(nickname);
  if (hasLiked) {
    await updateDoc(ref, { likes: arrayRemove(nickname) });
  } else {
    await updateDoc(ref, { likes: arrayUnion(nickname) });
  }
}
