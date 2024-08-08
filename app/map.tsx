'use client';

import { invoke } from '@tauri-apps/api';
import { useEffect, useState } from 'react';

export function Map() {
  const [coordinates, setCoordinates] = useState<string[]>([]);

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const result = await invoke<string>('get_coordinates');
        setCoordinates((prev) => [...prev, result]);
      } catch (err) {
        console.error('Error:', err);
      }
    };

    const intervalId = setInterval(fetchCoordinates, 100);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <h1>GPS Coordinates</h1>
      <div>
        {coordinates.map((coordinate) => (
          <p key={coordinate}>{coordinate}</p>
        ))}
      </div>
    </div>
  );
}
