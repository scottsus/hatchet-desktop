'use client';

import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';

export function Greet() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    invoke<string>('fancy_greet', { name: 'Scott' })
      .then((result) => setGreeting(result))
      .catch(console.error);
  }, []);

  return <div>{greeting}</div>;
}
