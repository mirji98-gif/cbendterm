import type { Server } from 'node:http';
export function startServer(port?: number, adminKey?: string | null): Server;
export function createContext(): { sandbox: Record<string, any>; spreadsheet: unknown; props: Map<string, string> };
