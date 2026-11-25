'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';
import { homeFor } from '../lib/access';

export default function Root() {
  const { me } = useStore();
  const router = useRouter();
  useEffect(() => { router.replace(homeFor(me?.role)); }, [me, router]);
  return null;
}