const viewer = document.querySelector('#image-viewer');
const image = document.querySelector('#image-viewer-image');
const caption = document.querySelector('#image-viewer-caption');
for (const card of document.querySelectorAll('.collage-card')) {
  card.addEventListener('click', () => {
    const source = card.querySelector('img');
    image.src = source.src;
    image.alt = source.alt;
    caption.textContent = card.querySelector('span').textContent;
    viewer.showModal();
  });
}
viewer.querySelector('.image-viewer-close').addEventListener('click', () => viewer.close());
// The backdrop belongs to the dialog; clicks inside its bounds stay open.
viewer.addEventListener('click', event => {
  if (event.target !== viewer) return;
  const bounds = viewer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
});
