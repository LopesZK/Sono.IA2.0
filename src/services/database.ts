export interface StoredTrip {
  id: string;
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  driverName?: string;
  vehiclePlate?: string;
  totalDrowsyCount: number;
  totalAsleepCount: number;
  averageFatigueScore: number;
  status: 'in_progress' | 'completed';
  notes?: string;
}

export interface StoredAlertEvent {
  id: string;
  tripId: string;
  timestamp: number;
  type: 'drowsy' | 'asleep';
  eyesClosedDurationMs: number;
  fatigueScore: number;
  yawnDetected: boolean;
  headPitch: number;
  alarmFired: boolean;
  reactionTimeMs?: number; // Time from alarm fire to driver tapping 'Estou Acordado'
}

export interface DriverProfile {
  id: string; // 'current_driver'
  name: string;
  vehicle: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  preferredSound: string;
  createdAt: number;
}

const DB_NAME = 'VigiDriveDB';
const DB_VERSION = 1;

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  public async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;

        // Trips table
        if (!db.objectStoreNames.contains('trips')) {
          const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
          tripStore.createIndex('startTime', 'startTime', { unique: false });
          tripStore.createIndex('status', 'status', { unique: false });
        }

        // Alert events table
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' });
          eventStore.createIndex('tripId', 'tripId', { unique: false });
          eventStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventStore.createIndex('type', 'type', { unique: false });
        }

        // Driver profile table
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  // --- Trips Methods ---

  public async saveTrip(trip: StoredTrip): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readwrite');
      const store = tx.objectStore('trips');
      const req = store.put(trip);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getTrip(id: string): Promise<StoredTrip | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readonly');
      const store = tx.objectStore('trips');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllTrips(): Promise<StoredTrip[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readonly');
      const store = tx.objectStore('trips');
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result as StoredTrip[]).sort((a, b) => b.startTime - a.startTime);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteTrip(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['trips', 'events'], 'readwrite');
      const tripStore = tx.objectStore('trips');
      const eventStore = tx.objectStore('events');

      tripStore.delete(id);

      // Delete associated events
      const index = eventStore.index('tripId');
      const req = index.openKeyCursor(IDBKeyRange.only(id));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          eventStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async clearAllData(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['trips', 'events'], 'readwrite');
      tx.objectStore('trips').clear();
      tx.objectStore('events').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Alert Events Methods ---

  public async saveEvent(event: StoredAlertEvent): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.put(event);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getEventsForTrip(tripId: string): Promise<StoredAlertEvent[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('tripId');
      const req = index.getAll(IDBKeyRange.only(tripId));
      req.onsuccess = () => {
        const sorted = (req.result as StoredAlertEvent[]).sort((a, b) => a.timestamp - b.timestamp);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Driver Profile Methods ---

  public async saveProfile(profile: DriverProfile): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      const req = store.put(profile);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getProfile(): Promise<DriverProfile | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const req = store.get('current_driver');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export const localDb = new LocalDatabase();
