/**
 * Max wait for a create/update/delete request to finish on the shared staging server.
 * Under parallel load (several workers on one server) a save regularly takes 10-20s.
 */
export const SERVER_SAVE_TIMEOUT = 30000;
