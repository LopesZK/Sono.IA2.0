class WakeLockService {
  private wakeLock: any = null;
  private isRequested = false;

  public async request(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          // If the lock was released e.g. because user minimized tab, try re-acquiring when visible
          if (this.isRequested && document.visibilityState === 'visible') {
            this.request();
          }
        });
        return true;
      } catch (err) {
        console.warn('Screen WakeLock request failed:', err);
        return false;
      }
    }
    return false;
  }

  public release(): void {
    this.isRequested = false;
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {
        // ignore
      }
      this.wakeLock = null;
    }
  }
}

export const wakeLockService = new WakeLockService();
