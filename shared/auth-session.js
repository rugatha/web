// Initialize the same persistence before reading Auth in every participating page.
// Calling setPersistence after default IndexedDB initialization can sign out other
// tabs while moving a localStorage session between persistence backends.
export function getSiteAuth(app, sdk) {
  if (!sdk.initializeAuth) return sdk.getAuth(app);
  try {
    return sdk.initializeAuth(app, {
      persistence: [sdk.browserLocalPersistence, sdk.indexedDBLocalPersistence, sdk.browserSessionPersistence, sdk.inMemoryPersistence],
      popupRedirectResolver: sdk.browserPopupRedirectResolver
    });
  } catch (error) {
    if (error.code !== 'auth/already-initialized') throw error;
    return sdk.getAuth(app);
  }
}
