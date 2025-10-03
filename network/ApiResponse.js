// Kept as JS for compatibility; TS types are defined in network/types.ts

export const initial = () => ({ status: 'initial' });
export const loading = () => ({ status: 'loading' });
export const success = (data) => ({ status: 'success', data });
export const error = (code, message) => ({ status: 'error', code, message });


