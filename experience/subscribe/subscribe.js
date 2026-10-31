const form = document.getElementById('newsletter-form');
const email = document.getElementById('email');
const button = document.getElementById('submit-button');
const status = document.getElementById('form-status');
const success = document.getElementById('success');
const unsubscribing = document.body.dataset.action === 'unsubscribe';
const idleLabel = button.textContent;
let submitting = false;

button.disabled = false;
email.addEventListener('input', () => email.setCustomValidity(''));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitting) return;
  email.value = email.value.trim();
  if (!form.reportValidity()) return;
  submitting = true;
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.textContent = unsubscribing ? '正在取消訂閱…' : '正在儲存訂閱…';
  status.textContent = '';
  const data = { email: email.value, action: unsubscribing ? 'unsubscribe' : 'subscribe' };
  if (unsubscribing) Object.assign(data, {
    reasons: new FormData(form).getAll('reasons'),
    note: document.getElementById('unsubscribe-note').value.trim(),
  });
  if (!unsubscribing) Object.assign(data, { consent: document.getElementById('consent').checked, consentVersion: '2026-10-31-v1' });
  try {
    const { saveSubscription } = await import('./firebase-newsletter.js');
    await saveSubscription(data);
    form.hidden = true;
    success.hidden = false;
    success.focus();
  } catch (error) {
    status.textContent = error.code === 'functions/resource-exhausted'
      ? '操作次數較多，請稍候 10 分鐘再試。'
      : error.code === 'functions/invalid-argument'
        ? (unsubscribing ? '請確認 email 格式與退訂原因欄位後重試。' : '請確認 email 格式，並勾選訂閱同意後重試。')
        : '目前無法完成，請稍後重試。你填寫的內容已保留；若持續無法送出，請聯繫 rugathadnd@gmail.com。';
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = idleLabel;
    form.removeAttribute('aria-busy');
  }
});
