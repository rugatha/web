(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('feedback-form');
  const dialog = $('review-dialog');
  const questions = [...form.querySelectorAll('[data-question]')];
  let pendingFeedback = null;
  let feedbackId = null;
  let submitting = false;
  let submitted = false;
  const feeLabels = ['太便宜', '可以接受', '太貴'];

  function updateForm() {
    const other = form.querySelector('[name="gender"]:checked')?.value === '其他/不願透露';
    $('gender-other').hidden = !other;
    $('gender-other').disabled = !other;
    const otherInterest = form.querySelector('[name="interests"][value="其他"]').checked;
    const otherInput = $('interests-other');
    otherInput.hidden = !otherInterest;
    otherInput.disabled = !otherInterest;
    otherInput.required = otherInterest;
    otherInput.setCustomValidity(otherInterest && !otherInput.value.trim() ? '請填寫其他興趣類型。' : '');
    const interests = form.querySelector('[name="interests"]');
    const hasInterests = Boolean(form.querySelector('[name="interests"]:checked'));
    interests.setCustomValidity(hasInterests ? '' : '請至少選擇一項興趣類型。');
    $('interests-error').hidden = hasInterests || !interests.getAttribute('aria-invalid');
    if (hasInterests) interests.removeAttribute('aria-invalid');
    form.querySelectorAll('input[type="range"]').forEach(input => {
      const label = input.name === 'feeOpinion' ? feeLabels[Number(input.value)] : `${input.value} / 5 星`;
      const answered = input.dataset.answered === 'true';
      input.setCustomValidity(answered ? '' : '請點選或拖曳滑桿完成此題。');
      input.setAttribute('aria-valuetext', answered ? label : '尚未填答');
      const fill = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
      input.style.setProperty('--slider-fill', answered ? `${fill}%` : '0%');
    });
  }
  // Native ranges always have a numeric value; track an explicit answer separately.
  form.querySelectorAll('input[type="range"]').forEach(input => {
    const answer = () => {
      input.dataset.answered = 'true';
      updateForm();
    };
    input.addEventListener('input', answer);
    input.addEventListener('change', answer);
    // Clicking the initial midpoint is an answer even if the native value stays the same.
    input.addEventListener('pointerup', answer);
    input.addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) answer();
    });
  });
  form.addEventListener('input', event => {
    if (event.target.id === 'nickname') event.target.setCustomValidity(event.target.value.trim() ? '' : '請填寫暱稱，不能僅有空白。');
    updateForm();
  });
  form.addEventListener('change', updateForm);
  form.addEventListener('invalid', event => {
    if (event.target.name === 'interests') {
      event.target.setAttribute('aria-invalid', 'true');
      $('interests-error').hidden = false;
    }
  }, true);
  form.addEventListener('submit', event => {
    event.preventDefault();
    updateForm();
    if (submitting || submitted || !form.reportValidity()) return;
    const data = new FormData(form);
    const answers = questions.map(question => {
      const name = question.dataset.question;
      const heading = question.querySelector('legend, label').cloneNode(true);
      heading.querySelectorAll('.required, .optional, .legend-note').forEach(node => node.remove());
      let value = data.getAll(name).map(value => value.trim()).join('、') || '未填寫';
      if (name === 'interests') value = data.getAll(name).map(item => item === '其他' ? `其他：${String(data.get('interestsOther') || '').trim()}` : item).join('、');
      if (name === 'gender' && data.get('genderOther')?.trim()) value += `：${data.get('genderOther').trim()}`;
      if (name.endsWith('Rating')) value += ' / 5 星';
      if (name === 'feeOpinion') value = feeLabels[Number(data.get(name))];
      return { name, title: heading.textContent.trim(), value };
    });
    pendingFeedback = Object.fromEntries(questions.map(question => {
      const name = question.dataset.question;
      const value = name === 'interests' ? data.getAll(name)
        : name.endsWith('Rating') ? Number(data.get(name))
        : name === 'feeOpinion' ? feeLabels[Number(data.get(name))]
        : String(data.get(name) || '').trim();
      return [name, value];
    }));
    pendingFeedback.genderOther = pendingFeedback.gender === '其他/不願透露' ? String(data.get('genderOther') || '').trim() : '';
    pendingFeedback.interestsOther = pendingFeedback.interests.includes('其他') ? String(data.get('interestsOther') || '').trim() : '';
    $('submission-status').textContent = '尚未送出。確認內容後，請按下「送出回饋」。';
    $('review-details').replaceChildren();
    for (const answer of answers) {
      const row = document.createElement('div');
      if (answer.name === 'privateFeedback') row.className = 'private-answer';
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = answer.title + (answer.name === 'privateFeedback' ? '（不公開）' : '');
      dd.textContent = answer.value;
      row.append(dt, dd);
      $('review-details').append(row);
    }
    dialog.showModal();
    dialog.scrollTop = 0;
  });
  $('edit-button').addEventListener('click', () => dialog.close());
  $('submit-button').addEventListener('click', async () => {
    if (submitting || submitted || !pendingFeedback) return;
    submitting = true;
    $('submit-button').disabled = true;
    $('edit-button').disabled = true;
    $('submit-button').textContent = '正在送出…';
    $('submission-status').textContent = '正在儲存回饋，請稍候。';
    try {
      const { createFeedbackId, saveFeedback } = await import('./firebase-feedback.js');
      // Reuse the document ID after failures so retries cannot create extra records.
      feedbackId ||= createFeedbackId();
      await saveFeedback(feedbackId, pendingFeedback);
      submitted = true;
      dialog.close();
      form.hidden = true;
      document.querySelector('.form-intro').hidden = true;
      $('frontend-notice').hidden = true;
      document.querySelector('.hero-cta').hidden = true;
      const summary = $('success-details');
      summary.replaceChildren();
      for (const [label, value] of [['填答者', pendingFeedback.nickname], ['參與日期', pendingFeedback.sessionDate], ['跑團劇本', pendingFeedback.scenario]]) {
        const row = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        row.append(dt, dd);
        summary.append(row);
      }
      $('feedback-success').hidden = false;
      $('feedback-success').focus();
    } catch (error) {
      $('submission-status').textContent = error.code === 'permission-denied'
        ? '目前無法確認回饋送達，請聯繫主辦方。填寫內容仍保留在此頁。'
        : '送出尚未完成，請確認網路後重試。填寫內容仍保留在此頁；若問題持續，請聯繫主辦方。';
    } finally {
      submitting = false;
      $('edit-button').disabled = false;
      $('submit-button').disabled = submitted;
      $('submit-button').textContent = '送出回饋 →';
    }
  });
  dialog.addEventListener('cancel', event => { if (submitting) event.preventDefault(); });
  updateForm();
  form.hidden = false;
})();
