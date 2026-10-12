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
const dataUrl = new URL('../data/plus-08-multiple-choices.json', import.meta.url);
const chapterDataUrl = new URL('../data/chapter-content.json', import.meta.url);
let uid = '', character = null, config, chapterSettings, db, unsubscribe = [], busy = false;
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
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
const voter = person => {
  const node = element('div', undefined, 'adventure-voter');
  node.append(portrait(person), element('span', person.name));
  return node;
};
function lock(message = '請輸入角色密碼。') {
  unsubscribe.forEach(stop => stop());
  unsubscribe = [];
  character = null;
  page.hidden = true;
  gate.hidden = false;
  root.replaceChildren();
  status.textContent = message;
}
function showChapter() {
  gate.hidden = true;
  page.hidden = false;
  root.replaceChildren();
  root.closest('.campaign-detail').hidden = false;
  if (chapterSettings.lock === 1 && character) {
    const identity = element('div', undefined, 'adventure-characters');
    identity.append(voter(character));
    root.append(identity);
  }
  if (!document.querySelector('script[data-temp-content]')) {
    const script = element('script');
    script.src = new URL('./chapter-content.js', import.meta.url).href;
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
    voters.forEach(person => icons.append(voter(person)));
    row.append(icons, element('p', text, 'adventure-result-text'));
    target.append(row);
  };
  question.options.forEach((text, index) => makeRow(`${index + 1}. ${text}`, people.filter(person => (answers.get(person.id)?.option ?? 1) === index + 1)));
  const custom = people.filter(person => answers.get(person.id)?.option === 5);
  custom.forEach(person => makeRow(answers.get(person.id).customText, [person]));
}
function renderQuestion(question) {
  const people = config.groups[question.group];
  const section = element('section', undefined, 'adventure-question');
  if (chapterSettings.lock === 1) {
    section.append(element('h2', '冒險者的抉擇？'), element('p', question.question));
  }
  root.append(section);
  const answersPath = `${accessPath()}/questions/${question.id}/answers`;
  const eligible = people.some(person => person.id === character?.id);
  if (chapterSettings.lock === 1 && eligible) {
    section.append(voter(character));
    const answerForm = element('form');
    const options = element('div', undefined, 'adventure-options');
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', '選擇答案');
    let selected = 1, saving = false, loaded = false;
    const buttons = [...question.options, question.customLabel].map((text, index) => {
      const button = element('button', `${index + 1}. ${text}`, 'adventure-option');
      button.type = 'button';
      button.addEventListener('click', () => { selected = index + 1; sync(); });
      options.append(button);
      return button;
    });
    const customLabel = element('label', '請輸入你的選擇');
    const custom = element('textarea', undefined, 'adventure-custom');
    custom.id = `custom-${question.id}`;
    customLabel.htmlFor = custom.id;
    custom.maxLength = 4000;
    const confirm = element('button', '確認', 'adventure-confirm');
    const message = element('p', '讀取已儲存的答案…');
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
      message.textContent = snapshot.exists() ? '已載入你的答案；可以修改後再次確認。' : '尚未送出答案時，視為選擇第一項；確認後儲存你的選擇。';
      sync();
    }, () => { message.textContent = '無法讀取答案，請重新解鎖或檢查連線。'; }));
    answerForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (saving || !loaded || !answerForm.reportValidity()) return;
      if (selected === 5 && !custom.value.trim()) { message.textContent = '請輸入自訂答案。'; return; }
      saving = true;
      sync();
      message.textContent = '儲存中…';
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
        message.textContent = '答案已儲存至 Firestore。';
      } catch (error) {
        message.textContent = error.code === 'permission-denied' ? '儲存失敗：請重新解鎖，或確認角色組別與 Firestore 設定。' : '儲存失敗，請檢查網路後重試。';
      } finally { saving = false; sync(); }
    });
  } else if (chapterSettings.lock === 1 && character) {
    section.append(element('p', `${character.name} 不在本題的冒險者組別中。`));
  }
  if (chapterSettings.lock !== 0) return;
  const reveal = element('section', undefined, 'adventure-reveal');
  reveal.append(element('h2', '冒險者的抉擇。'), element('p', question.question));
  section.append(reveal);
  const results = element('div', undefined, 'adventure-results');
  const resultStatus = element('p', '讀取公布答案中…');
  resultStatus.setAttribute('role', 'status');
  reveal.append(resultStatus, results);
  unsubscribe.push(onSnapshot(collection(db, answersPath), snapshot => {
    const answers = new Map(snapshot.docs.map(answer => [answer.id, answer.data()]));
    renderResults(results, question, answers, people);
    resultStatus.textContent = '';
    resultStatus.hidden = true;
  }, () => {
    results.replaceChildren();
    resultStatus.hidden = false;
    resultStatus.textContent = '答案尚未開放，或無法讀取公布資料。';
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
    if (!character) status.textContent = uid ? '請輸入角色密碼，例如 Midori_加上密碼。' : '正在建立安全連線…';
  });
  await auth.authStateReady();
  if (!auth.currentUser) await signInAnonymously(auth);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!uid || busy) return;
    busy = true;
    unlock.disabled = true;
    const credential = document.querySelector('#chapter-password').value;
    const person = allCharacters().find(person => credential.startsWith(`${person.id === 'yhwh' ? 'YHWH' : person.id[0].toUpperCase() + person.id.slice(1)}_`));
    try {
      if (!person) throw new Error('invalid-credential');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential));
      const passwordHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      await setDoc(doc(db, accessPath(), 'grants', uid), { characterId: person.id, passwordHash, verifiedAt: serverTimestamp() });
      character = person;
      document.querySelector('#chapter-password').value = '';
      unsubscribe.forEach(stop => stop());
      unsubscribe = [];
      showChapter();
    } catch (error) {
      status.textContent = error.code === 'permission-denied' || error.message === 'invalid-credential' ? '角色密碼不正確，或本章尚未設定密碼。' : '驗證失敗，請檢查網路與 Firestore 設定。';
    } finally { busy = false; unlock.disabled = !uid; }
  });
}
start().catch(error => { status.textContent = `無法載入：${error.message}`; });
