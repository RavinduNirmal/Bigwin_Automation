import * as path from 'path';

/**
 * Where the auth setup project saves the logged-in session.
 * Git-ignored via /playwright/.auth/ in .gitignore - these files contain a live token.
 */
export const AUTH_DIR = path.join(__dirname, '..', 'playwright', '.auth');

/**
 * Standard Playwright storageState (cookies + localStorage).
 * BigWin keeps its session in localStorage (`accesstoken`, `tokenExpiry`, `userId`),
 * so storageState captures everything - no extra sessionStorage handling is needed.
 */
export const STORAGE_STATE = path.join(AUTH_DIR, 'admin.json');
