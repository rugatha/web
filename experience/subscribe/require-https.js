// Upgrade the public form before Firebase loads; keep local emulator previews on HTTP.
if (location.protocol === 'http:' && ['rugatha.com', 'www.rugatha.com'].includes(location.hostname)) {
  const secureUrl = new URL(location.href);
  secureUrl.protocol = 'https:';
  location.replace(secureUrl.href);
}
