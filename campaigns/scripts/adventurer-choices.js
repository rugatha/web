import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { collection, doc, getFirestore, onSnapshot, runTransaction, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const root = document.querySelector('#choices-root');
const gate = document.querySelector('#password-gate');
const page = document.querySelector('#chapter-page');
const status = document.querySelector('#gate-status');
const form = document.querySelector('#unlock-form');
const unlock = document.querySelector('#unlock-button');
const siteBase = new URL('../../', import.meta.url);
const dataUrl = new URL(`../data/${document.body.dataset.choicesConfig || 'plus-08-multiple-choices.json'}`, import.meta.url);
const chapterDataUrl = new URL('../data/chapter-content.json', import.meta.url);
// Keep older Service Worker entries for the temp page out of this chapter.
dataUrl.searchParams.set('chapter', document.body.dataset.chapterContentId);
chapterDataUrl.searchParams.set('chapter', document.body.dataset.chapterContentId);
const revision = new URL(import.meta.url).searchParams.get('v');
if (revision) {
  dataUrl.searchParams.set('v', revision);
  chapterDataUrl.searchParams.set('v', revision);
}
let uid = '', character = null, reviewMode = false, config, chapterSettings, db, unsubscribe = [], busy = false;
const bilingual = (zh, en) => ({ zh, en: en || zh });
const setText = (node, text) => {
  if (text && typeof text === 'object') {
    node.dataset.textZh = text.zh;
    node.dataset.textEn = text.en;
    node.textContent = document.documentElement.dataset.lang === 'en' ? text.en : text.zh;
  } else {
    delete node.dataset.textZh;
    delete node.dataset.textEn;
    node.textContent = text;
  }
};
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) setText(node, text);
  if (className) node.className = className;
  return node;
};
const allCharacters = () => Object.values(config.groups).flat();
const accessPath = () => {
  const [arc, chapter] = config.chapterKey.split('/');
  return `chapterAccess/${arc}/pages/${chapter}`;
};
const portrait = person => {
  const img = element('img', undefined, 'adventure-icon');
  img.src = new URL(person.icon, siteBase).href;
  img.alt = person.name;
  return img;
};
const voter = (person, submitted) => {
  const node = element('div', undefined, 'adventure-voter');
  node.append(portrait(person), element('span', bilingual(person.name, person.nameEn)));
  if (submitted !== undefined) node.append(element('small', submitted
    ? bilingual('已提交', 'Submitted')
    : bilingual('未提交・預設第一項', 'Not submitted · defaults to 1'), 'adventure-submission-status'));
  return node;
};
function lock(message = bilingual('請輸入角色密碼。', 'Please enter your character password.')) {
  unsubscribe.forEach(stop => stop());
  unsubscribe = [];
  character = null;
  reviewMode = false;
  page.hidden = true;
  gate.hidden = false;
  root.replaceChildren();
  setText(status, message);
}
function showChapter() {
  gate.hidden = true;
  page.hidden = false;
  root.replaceChildren();
  root.closest('.campaign-detail').hidden = false;
  if (!document.querySelector('script[data-temp-content]')) {
    const script = element('script');
    script.src = new URL('./chapter-content.js?v=20261029-language-1', import.meta.url).href;
    script.dataset.tempContent = 'true';
    document.body.append(script);
  }
  config.questions.forEach(renderQuestion);
}
function renderResults(target, question, answers, people) {
  target.replaceChildren();
  const makeRow = (text, voters) => {
    const row = element('div', undefined, `adventure-result ${voters.length ? 'is-chosen' : 'is-empty'}`);
    const icons = element('div', undefined, 'adventure-voters');
    voters.forEach(person => icons.append(voter(person, reviewMode ? answers.has(person.id) : undefined)));
    row.append(icons, element('p', text, 'adventure-result-text'));
    target.append(row);
  };
  question.options.forEach((text, index) => makeRow(bilingual(`${index + 1}. ${text}`, `${index + 1}. ${question.en?.options[index] || text}`), people.filter(person => (answers.get(person.id)?.option ?? 1) === index + 1)));
  const custom = people.filter(person => answers.get(person.id)?.option === 5);
  if (question.showCustomOption && !custom.length) makeRow(bilingual(`5. ${question.customLabel}`, `5. ${question.en?.customLabel || question.customLabel}`), []);
  custom.forEach(person => makeRow(answers.get(person.id).customText, [person]));
}
function renderQuestion(question) {
  const people = config.groups[question.group];
  const section = element('section', undefined, 'adventure-question');
  if (chapterSettings.lock === 1 && !reviewMode) {
    section.append(element('h2', bilingual('冒險者的抉擇？', 'What will the adventurers choose?')));
    if (question.question) section.append(element('p', bilingual(question.question, question.en?.question)));
  }
  root.append(section);
  const answersPath = `${accessPath()}/questions/${question.id}/answers`;
  const eligible = people.some(person => person.id === character?.id);
  if (chapterSettings.lock === 1 && eligible && !reviewMode) {
    section.append(voter(character));
    const answerForm = element('form');
    const options = element('div', undefined, 'adventure-options');
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', '選擇答案');
    let selected = 1, saving = false, loaded = false;
    const buttons = [...question.options, question.customLabel].map((text, index) => {
      const button = element('button', bilingual(`${index + 1}. ${text}`, `${index + 1}. ${[...(question.en?.options || question.options), question.en?.customLabel || question.customLabel][index]}`), 'adventure-option');
      button.type = 'button';
      button.addEventListener('click', () => { selected = index + 1; sync(); });
      options.append(button);
      return button;
    });
    const customLabel = element('label', bilingual('請輸入你的選擇', 'Enter your answer'));
    const custom = element('textarea', undefined, 'adventure-custom');
    custom.id = `custom-${question.id}`;
    customLabel.htmlFor = custom.id;
    custom.maxLength = 4000;
    const confirm = element('button', bilingual('確認', 'Confirm'), 'adventure-confirm');
    const message = element('p', bilingual('讀取已儲存的答案…', 'Loading your saved answer…'));
    message.setAttribute('role', 'status');
    const sync = () => {
      buttons.forEach((button, index) => {
        button.setAttribute('aria-pressed', String(selected === index + 1));
        button.disabled = saving || !loaded;
      });
      custom.hidden = customLabel.hidden = selected !== 5;
      custom.required = selected === 5;
      custom.disabled = saving || !loaded;
      confirm.disabled = saving || !loaded || window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled === false;
    };
    answerForm.append(options, customLabel, custom, confirm, message);
    section.append(answerForm);
    sync();
    const answerRef = doc(db, answersPath, character.id);
    const activeUid = uid;
    unsubscribe.push(onSnapshot(answerRef, snapshot => {
      if (!saving && snapshot.exists()) {
        selected = snapshot.data().option;
        custom.value = snapshot.data().customText;
      }
      loaded = true;
      setText(message, snapshot.exists() ? bilingual('已載入你的答案；可以修改後再次確認。', 'Your answer is loaded; you can edit and confirm it again.') : bilingual('尚未送出答案時，視為選擇第一項；確認後儲存你的選擇。', 'Your default is option 1 until you submit. Confirm to save your choice.'));
      sync();
    }, () => { setText(message, bilingual('無法讀取答案，請重新解鎖或檢查連線。', 'Unable to load your answer. Unlock again or check your connection.')); }));
    answerForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (saving || !loaded || !answerForm.reportValidity()) return;
      if (selected === 5 && !custom.value.trim()) { setText(message, bilingual('請輸入自訂答案。', 'Please enter your own answer.')); return; }
      saving = true;
      sync();
      setText(message, bilingual('儲存中…', 'Saving…'));
      try {
        await runTransaction(db, async transaction => {
          const previous = await transaction.get(answerRef);
          transaction.set(answerRef, {
            characterId: answerRef.id, uid: activeUid, option: selected,
            customText: selected === 5 ? custom.value : '',
            createdAt: previous.exists() ? previous.data().createdAt : serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        setText(message, bilingual('答案已儲存至 Firestore。', 'Your answer has been saved.'));
      } catch (error) {
        setText(message, error.code === 'permission-denied' ? bilingual('儲存失敗：請重新解鎖，或確認角色組別與 Firestore 設定。', 'Unable to save. Unlock again or check the character group and Firestore settings.') : bilingual('儲存失敗，請檢查網路後重試。', 'Unable to save. Check your connection and try again.'));
      } finally { saving = false; sync(); }
    });
  } else if (chapterSettings.lock === 1 && character && !reviewMode) {
    section.append(element('p', bilingual(`${character.name} 不在本題的冒險者組別中。`, `${character.nameEn || character.name} is not in this question’s adventurer group.`)));
  }
  if (chapterSettings.lock !== 0 && !reviewMode) return;
  const reveal = element('section', undefined, 'adventure-reveal');
  reveal.append(element('h2', bilingual('冒險者的抉擇。', 'The adventurers’ choices')));
  if (reviewMode) reveal.append(element('p', bilingual('管理檢視', 'Review mode')));
  if (question.question) reveal.append(element('p', bilingual(question.question, question.en?.question)));
  section.append(reveal);
  const results = element('div', undefined, 'adventure-results');
  const resultStatus = element('p', bilingual('讀取公布答案中…', 'Loading published answers…'));
  resultStatus.setAttribute('role', 'status');
  reveal.append(resultStatus, results);
  unsubscribe.push(onSnapshot(collection(db, answersPath), snapshot => {
    const answers = new Map(snapshot.docs.map(answer => [answer.id, answer.data()]));
    renderResults(results, question, answers, people);
    if (reviewMode) {
      const submitted = people.filter(person => answers.has(person.id)).length;
      setText(resultStatus, bilingual(`已提交 ${submitted} / ${people.length} 人；未提交者顯示預設第一項。`, `${submitted} / ${people.length} submitted; unanswered characters default to option 1.`));
    } else {
      resultStatus.textContent = '';
      resultStatus.hidden = true;
    }
  }, () => {
    results.replaceChildren();
    resultStatus.hidden = false;
    setText(resultStatus, bilingual('答案尚未開放，或無法讀取公布資料。', 'Answers are not available yet, or could not be loaded.'));
  }));
}
async function start() {
  const [response, chapterResponse] = await Promise.all([
    fetch(dataUrl, { cache: 'no-cache' }),
    fetch(chapterDataUrl, { cache: 'no-cache' })
  ]);
  if (!response.ok) throw new Error('題目資料載入失敗');
  if (!chapterResponse.ok) throw new Error('章節設定載入失敗');
  config = await response.json();
  const chapters = await chapterResponse.json();
  chapterSettings = chapters[document.body.dataset.chapterContentId];
  if (!chapterSettings || ![0, 1].includes(chapterSettings.lock)) {
    throw new Error('章節 lock 必須設為 0 或 1');
  }
  if (!/^[\w-]+\/[\w-]+$/.test(config.chapterKey)) throw new Error('章節 key 格式錯誤');
  for (const question of config.questions) {
    if (!config.groups[question.group] || question.options.length !== 4 || !/^[\w-]+$/.test(question.id)) throw new Error('題目設定錯誤');
  }
  if (!window.RUGATHA_FIREBASE_CONFIG || window.RUGATHA_FEATURE_FLAGS?.firebaseEnabled === false) throw new Error('Firebase 尚未啟用');
  const app = getApps()[0] || initializeApp(window.RUGATHA_FIREBASE_CONFIG);
  db = getFirestore(app);
  if (chapterSettings.lock === 0) {
    showChapter();
    return;
  }
  const auth = getAuth(app);
  onAuthStateChanged(auth, user => {
    const nextUid = user?.uid || '';
    if (nextUid !== uid && chapterSettings.lock === 1) lock();
    else if (nextUid !== uid && character) {
      unsubscribe.forEach(stop => stop());
      unsubscribe = [];
      character = null;
      showChapter();
    }
    uid = nextUid;
    unlock.disabled = !uid || busy;
    if (!character) setText(status, uid
      ? (config.credentialMode === 'character-password' ? bilingual('請選擇冒險者並輸入角色密碼。', 'Choose your character and enter their password.') : bilingual('請輸入角色密碼，例如 Midori_加上密碼。', 'Enter your character password, such as Midori_ followed by the password.'))
      : bilingual('正在建立安全連線…', 'Establishing a secure connection…'));
  });
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!uid || busy) return;
    busy = true;
    unlock.disabled = true;
    const credential = document.querySelector('#chapter-password').value;
    const person = config.credentialMode === 'character-password'
      ? allCharacters().find(person => person.id === document.querySelector('#chapter-character')?.value)
      : allCharacters().find(person => credential.startsWith(`${person.id === 'yhwh' ? 'YHWH' : person.id[0].toUpperCase() + person.id.slice(1)}_`));
    const reviewLogin = config.credentialMode === 'character-password'
      && document.querySelector('#chapter-character')?.value === '';
    const loginId = reviewLogin ? 'admin' : person?.id;
    try {
      if (!loginId) throw new Error('invalid-credential');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential));
      const passwordHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      await setDoc(doc(db, accessPath(), 'grants', uid), { characterId: loginId, passwordHash, verifiedAt: serverTimestamp() });
      character = reviewLogin ? null : person;
      reviewMode = reviewLogin;
      document.querySelector('#chapter-password').value = '';
      unsubscribe.forEach(stop => stop());
      unsubscribe = [];
      showChapter();
    } catch (error) {
      setText(status, error.code === 'permission-denied' || error.message === 'invalid-credential' ? bilingual('角色密碼不正確，或本章尚未設定密碼。', 'The character password is incorrect or has not been configured for this chapter.') : bilingual('驗證失敗，請檢查網路與 Firestore 設定。', 'Verification failed. Check your connection and Firestore settings.'));
    } finally { busy = false; unlock.disabled = !uid; }
  });
}
start().catch(error => {
  gate.hidden = false;
  status.textContent = `無法載入：${error.message}`;
});
