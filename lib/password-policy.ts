// Account password rules, shared by the client auth forms, the register/admin
// APIs, and the i18n placeholder so the minimum stays defined in one place.
// Pure constant (no runtime deps) → safe to import from client or server.
export const MIN_PASSWORD_LENGTH = 8;
