import {test,expect} from '@playwright/test';
test.beforeEach(async ({context})=>{
  await context.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
});
test('advantage includes the modifier and switches its rendered result language',async({page})=>{
  await page.goto('/toolbox/dice_roll/');
  await page.locator('#modifier').selectOption('5');
  await page.evaluate(()=>Math.random=()=>0.5);
  await page.locator('#advantage-button').click();
  await expect(page.locator('.result .total strong')).toHaveText('16');
  await expect(page.locator('.is-kept').first()).toHaveText('11');
  await expect(page.locator('.history-item').first()).toContainText('+ 5: 16');
  await page.locator('[data-lang-toggle]').click();
  await expect(page.locator('.result h2')).toHaveText('Advantage Roll');
  await expect(page.locator('[data-i18n="rules"]')).toContainText('Ability checks and ordinary saving throws');
});
test('equipment and feat descriptions render in both languages without missing translations',async({page})=>{
  for(const path of ['armor','weapons','packs','tools','background','feats']){
    await page.goto(`/toolbox/${path}/`);
    await expect(page.locator('h1')).toBeVisible();
    await page.locator('[data-lang-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('lang',/en|zh-Hant/);
    await expect(page.locator('body')).not.toContainText('undefined');
  }
  await page.goto('/toolbox/armor/');
  await page.evaluate(()=>setLanguage('en'));
  await expect(page.locator('#armorRows')).not.toContainText('無');
  await expect(page.locator('[data-i18n="rule"]')).toContainText('Dwarves');
  await page.goto('/toolbox/weapons/');
  await page.evaluate(()=>setLanguage('en'));
  await expect(page.locator('[data-i18n="specialRules"]')).toContainText('A net deals no damage');
});
test('HP recalculation maximizes only the starting die and later gains never drop below one',async({page})=>{
  await page.goto('/toolbox/character_sheet/');
  await page.evaluate(()=>{
    document.querySelector('#hitDice').value='2d8/con-5';
    document.querySelector('#hpRollHistory').value='[]';
    crypto.getRandomValues=arr=>{arr.fill(0);return arr;};
    document.querySelector('#rollHP').click();
    document.querySelector('#rollHP').click();
  });
  await expect(page.locator('#hpRollResults')).toContainText('= 4');
  await expect(page.locator('#hpRollResults')).toContainText('d8: 8');
  await expect(page.locator('#hpRollResults')).toContainText('d8: 1');
});
