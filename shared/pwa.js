(function () {
  const url = new URL(window.location.href);
  if (window.history && url.searchParams.get("source") === "pwa") {
    url.searchParams.delete("source");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function (error) {
      console.warn("Rugatha PWA registration failed.", error);
    });
  });
})();
