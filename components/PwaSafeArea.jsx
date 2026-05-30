'use client';

import { useEffect } from 'react';
import { initPwaSafeArea } from '@/lib/pwaSafeArea';

/** Utrzymuje poprawne --safe-* na iOS PWA (Dynamic Island / notch). */
export default function PwaSafeArea() {
  useEffect(() => initPwaSafeArea(), []);
  return null;
}
