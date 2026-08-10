(function () {
  const url = new URL(window.location.href);
  if (window.history && url.searchParams.get("source") === "pwa") {
    url.searchParams.delete("source");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (!("serviceWorker" in navigator)) return;
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (localHosts.has(window.location.hostname)) {
    window.addEventListener("load", function () {
      Promise.all([
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          return Promise.all(registrations.map(function (registration) {
            return registration.unregister();
          }));
        }),
        window.caches
          ? caches.keys().then(function (keys) {
              return Promise.all(
                keys
                  .filter(function (key) { return key.indexOf("rugatha-pwa-") === 0; })
                  .map(function (key) { return caches.delete(key); })
              );
            })
          : Promise.resolve()
      ]).catch(function (error) {
        console.warn("Rugatha local cache cleanup failed.", error);
      });
    });
    return;
  }
  if (window.location.protocol !== "https:") return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function (error) {
      console.warn("Rugatha PWA registration failed.", error);
    });
  });
})();
