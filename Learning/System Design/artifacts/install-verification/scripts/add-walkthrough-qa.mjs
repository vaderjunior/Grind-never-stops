import fs from 'node:fs';
const f='scripts/qa-learning.ts';let s=fs.readFileSync(f,'utf8');s=s.replaceAll("page.locator('.diagram-svg svg')).toHaveCount(1)","page.locator('.diagram-svg svg')).toHaveCount(2)");
const marker=" await page.getByLabel('Your explanation or sketch').fill";
s=s.replace(marker,` const firstStory=page.locator('.visual-story').first();await expect(firstStory).toBeVisible();await expect(firstStory.locator('.story-panel:visible')).toHaveCount(1);await expect(firstStory.locator('.story-position:visible')).toContainText('Step 1');await firstStory.getByRole('button',{name:'Next step',exact:true}).click();await expect(firstStory.locator('.story-position:visible')).toContainText('Step 2');await firstStory.getByRole('button',{name:'Previous',exact:true}).click();await expect(firstStory.locator('.story-position:visible')).toContainText('Step 1');checks.push('Authored walkthrough shows one concrete state at a time with working forward/back controls.');
`+marker);
const print="await page.emulateMedia({media:'print'});await expect(page.locator('.guide-example-answer')).toHaveCount(0);";
s=s.replace(print,"await page.emulateMedia({media:'print'});await expect(page.locator('.guide-example-answer')).toHaveCount(0);const printStory=page.locator('.visual-story').first();expect(await printStory.locator('.story-panel:visible').count()).toBe(await printStory.locator('.story-panel').count());");
fs.writeFileSync(f,s);
