class SessionManagerImpl {
  private static _instance: SessionManagerImpl | null = null;

  public permissions: string[] = [];

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

  reset() {
    this.permissions = [];
  }
}

export const SessionManager = SessionManagerImpl.instance;


