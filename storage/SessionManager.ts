class SessionManagerImpl {
  private static _instance: SessionManagerImpl | null = null;

  public permissions: string[] = [];
  private sessionData: Map<string, any> = new Map();

  static get instance(): SessionManagerImpl {
    if (!SessionManagerImpl._instance) {
      SessionManagerImpl._instance = new SessionManagerImpl();
    }
    return SessionManagerImpl._instance;
  }

  setPermissions(permissions: string[]) {
    this.permissions = permissions || [];
  }

  hasPermission(name: string): boolean {
    return this.permissions.includes(name);
  }

  getPermissions(): string[] {
    return [...this.permissions];
  }

  setData(key: string, value: any): void {
    this.sessionData.set(key, value);
  }

  getData(key: string): any {
    return this.sessionData.get(key);
  }

  removeData(key: string): void {
    this.sessionData.delete(key);
  }

  reset() {
    this.permissions = [];
    this.sessionData.clear();
  }
}

export const SessionManager = SessionManagerImpl.instance;


