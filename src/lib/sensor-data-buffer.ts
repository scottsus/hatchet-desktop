import { SensorDataWithId } from '../types/sensor-data';

class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

export class SensorDataBuffer {
  private static instance: SensorDataBuffer;
  private buffer: SensorDataWithId[] = [];
  private mutex: Mutex = new Mutex();

  private constructor() {}

  public static getInstance() {
    if (!SensorDataBuffer.instance) {
      SensorDataBuffer.instance = new SensorDataBuffer();
    }
    return SensorDataBuffer.instance;
  }

  public async push(data: SensorDataWithId): Promise<void> {
    try {
      await this.mutex.acquire();
      this.buffer.push(data);
    } finally {
      this.mutex.release();
    }
  }

  public async pop(): Promise<SensorDataWithId | undefined> {
    try {
      await this.mutex.acquire();
      return this.buffer.shift();
    } finally {
      this.mutex.release();
    }
  }

  public async empty(): Promise<boolean> {
    try {
      await this.mutex.acquire();
      return this.buffer.length === 0;
    } finally {
      this.mutex.release();
    }
  }
}
