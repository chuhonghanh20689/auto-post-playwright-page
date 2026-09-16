import { chromium, Page } from '@playwright/test';
import path from 'path';

const PROFILE_DIR = path.resolve('./fbpost/.browser-profile');
const PAGE_NAME = 'Đảo Bánh Quy';
const PAGE_ID = '61568152018103';

async function openProfileMenu(page: Page): Promise<boolean> {
  console.log('\n========================================');
  console.log('🔵 MỞ MENU PROFILE');
  console.log('========================================');

  const selectors = [
    '[aria-label="Your profile"]',
    '[aria-label="Account"]',
    '[aria-label*="profile" i]',
    '[aria-label*="account" i]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).last();

    if (await locator.count() === 0) {
      continue;
    }

    try {
      await locator.click({ timeout: 3000 });
      console.log(`✅ Đã mở menu bằng selector: ${selector}`);

      await page.waitForTimeout(1500);
      return true;
    } catch {
      // Thử selector tiếp theo
    }
  }

  console.log('❌ Không tìm thấy nút Profile/Account.');

  return false;
}

async function openSelectProfile(page: Page): Promise<boolean> {
  console.log('\n========================================');
  console.log('🔵 MỞ SELECT PROFILE');
  console.log('========================================');

  const seeAllProfiles = page.getByText('See all profiles', {
    exact: true,
  });

  const count = await seeAllProfiles.count();

  console.log(`🔎 "See all profiles": ${count}`);

  if (count === 0) {
    console.log(
      'ℹ️ Facebook có thể đã mở sẵn Select profile.'
    );

    return true;
  }

  try {
    await seeAllProfiles.last().click({
      timeout: 5000,
    });

    console.log('✅ Đã click "See all profiles".');

    await page.waitForTimeout(1500);

    return true;
  } catch (error) {
    console.log('⚠️ Không click được "See all profiles".');
    console.error(error);

    return false;
  }
}

async function switchToPage(page: Page): Promise<boolean> {
  console.log('\n========================================');
  console.log(`🔵 CHỌN PAGE: ${PAGE_NAME}`);
  console.log(`🆔 PAGE ID: ${PAGE_ID}`);
  console.log('========================================');

  /*
   * QUAN TRỌNG:
   * Trong screenshot của Facebook có 2 dòng cùng tên "Đảo Bánh Quy":
   *
   * 1. Dòng trên: Đảo Bánh Quy + dấu ✓
   *    -> profile cá nhân hiện tại.
   *
   * 2. Dòng dưới: Đảo Bánh Quy + "3 notifications"
   *    -> ĐẢO BÁNH QUY PAGE cần chọn.
   *
   * Vì vậy tuyệt đối không dùng:
   *   getByText(PAGE_NAME).first()
   *   nth(1)
   *   hoặc click text tên Page một cách mù quáng.
   *
   * Flow:
   * Account menu -> See all profiles -> Select profile
   * -> tìm option có PAGE_NAME + notifications
   * -> click option đó.
   */

  const pageNameLocators = page.getByText(PAGE_NAME, {
    exact: true,
  });

  const count = await pageNameLocators.count();
  console.log(`🔎 Có ${count} element "${PAGE_NAME}" trong Select profile.`);

  if (count === 0) {
    console.log('❌ Không tìm thấy Đảo Bánh Quy trong Select profile.');
    return false;
  }

  // ------------------------------------------------------------
  // 1. Ưu tiên tìm option có "notifications".
  //    Đây chính là dấu hiệu nhìn thấy trong screenshot:
  //    "Đảo Bánh Quy" + "3 notifications".
  // ------------------------------------------------------------
  for (let i = 0; i < count; i++) {
    const name = pageNameLocators.nth(i);

    try {
      if (!(await name.isVisible())) continue;

      const option = name.locator(
        'xpath=ancestor::*[' +
          'contains(translate(normalize-space(.), ' +
          '"ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "notifications")' +
        '][1]'
      );

      if (await option.count() === 0) continue;

      const optionText = (
        await option.first().innerText().catch(() => '')
      ).trim();

      if (!/notifications/i.test(optionText)) continue;

      console.log(
        `🎯 Tìm thấy Page candidate nth(${i}) có notifications:`
      );
      console.log(`   "${optionText.substring(0, 300)}"`);

      // Lấy clickable ancestor gần nhất của option.
      const clickable = option.first().locator(
        'xpath=ancestor-or-self::*[@role="button" or @role="link" or self::a][1]'
      );

      const target =
        (await clickable.count()) > 0
          ? clickable.first()
          : option.first();

      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      console.log('👉 Click Đảo Bánh Quy PAGE...');
      await target.click({ timeout: 5000 });

      console.log('✅ Đã click đúng option Page.');
      console.log('⏳ Chờ Facebook switch identity...');
      await page.waitForTimeout(7000);

      return true;
    } catch (error) {
      console.log(`⚠️ Candidate nth(${i}) không xử lý được.`);
    }
  }

  // ------------------------------------------------------------
  // 2. Fallback: tìm PAGE_ID trong DOM.
  // ------------------------------------------------------------
  const idSelectors = [
    `[href*="${PAGE_ID}"]`,
    `[aria-label*="${PAGE_ID}"]`,
    `[data-page-id="${PAGE_ID}"]`,
    `[data-profileid="${PAGE_ID}"]`,
  ];

  for (const selector of idSelectors) {
    const candidates = page.locator(selector);
    const idCount = await candidates.count();

    if (idCount === 0) continue;

    console.log(
      `🎯 Tìm thấy ${idCount} element chứa PAGE_ID bằng ${selector}`
    );

    for (let i = 0; i < idCount; i++) {
      try {
        const candidate = candidates.nth(i);
        if (!(await candidate.isVisible())) continue;

        const clickable = candidate.locator(
          'xpath=ancestor-or-self::*[@role="button" or @role="link" or self::a][1]'
        );

        const target =
          (await clickable.count()) > 0
            ? clickable.first()
            : candidate;

        const targetText = (
          await target.innerText().catch(() => '')
        ).trim();

        if (
          !targetText.includes(PAGE_NAME) &&
          !targetText.toLowerCase().includes('notifications')
        ) {
          continue;
        }

        await target.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);

        console.log('👉 Click Page theo PAGE_ID...');
        await target.click({ timeout: 5000 });

        console.log('✅ Đã click Page.');
        console.log('⏳ Chờ Facebook switch identity...');
        await page.waitForTimeout(7000);

        return true;
      } catch {
        // thử candidate tiếp theo
      }
    }
  }

  // ------------------------------------------------------------
  // 3. Không tìm thấy Page -> KHÔNG click đại.
  //    In toàn bộ text để lần sau có dữ liệu debug.
  // ------------------------------------------------------------
  console.log(
    '\n❌ KHÔNG XÁC ĐỊNH ĐƯỢC PAGE ĐẢO BÁNH QUY AN TOÀN.'
  );
  console.log(
    '❌ Script sẽ KHÔNG click vào dòng đầu tiên để tránh switch nhầm account.'
  );

  const bodyText = await page.locator('body').innerText().catch(() => '');

  console.log('\n========== SELECT PROFILE TEXT ==========');
  console.log(bodyText.substring(0, 5000));
  console.log('=========================================\n');

  return false;
}

async function verifyPage(page: Page): Promise<boolean> {
  console.log('\n========================================');
  console.log('🔍 KIỂM TRA PAGE');
  console.log('========================================');

  await page.waitForTimeout(2000);

  const url = page.url();

  console.log(`🌐 URL hiện tại: ${url}`);

  const bodyText = await page.locator('body').innerText();

  /*
   * Sau khi switch thành công,
   * Facebook của bạn đang hiển thị:
   *
   * "What's on your mind, Đảo Bánh Quy?"
   */

  const pageComposer = `What's on your mind, ${PAGE_NAME}`;

  if (bodyText.includes(pageComposer)) {
    console.log('\n========================================');
    console.log('🎉 SWITCH PAGE THÀNH CÔNG!');
    console.log(`📄 Page: ${PAGE_NAME}`);
    console.log('========================================');

    return true;
  }

  /*
   * Facebook đôi khi dùng text khác tùy giao diện.
   * Kiểm tra thêm tên Page trong phần composer.
   */

  if (
    bodyText.includes(PAGE_NAME) &&
    !bodyText.includes('Sign in')
  ) {
    console.log('\n⚠️ Có vẻ đã chuyển Page.');
    console.log(`📄 Đang thấy tên: ${PAGE_NAME}`);
    console.log(
      '👉 Không xác nhận được tuyệt đối bằng composer.'
    );

    return true;
  }

  console.log('\n❌ Chưa xác nhận được Page.');

  console.log('\n========== TEXT HIỆN TẠI ==========');
  console.log(bodyText.substring(0, 3000));
  console.log('===================================\n');

  return false;
}

async function waitForManualLogin(page: Page): Promise<void> {
  const url = page.url();

  if (
    url.includes('/login') ||
    url.includes('/checkpoint') ||
    url.includes('/two_step_verification')
  ) {
    console.log('\n========================================');
    console.log('⚠️ FACEBOOK ĐANG YÊU CẦU LOGIN/XÁC MINH');
    console.log('========================================');

    console.log(
      '👉 Hãy xử lý login/CAPTCHA trên cửa sổ Facebook.'
    );

    console.log(
      '👉 Sau khi vào được Facebook, nhấn ENTER trong Terminal.'
    );

    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve());
    });

    await page.waitForTimeout(3000);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('🚀 FACEBOOK SWITCH PAGE');
  console.log('========================================');

  console.log(`📁 Profile: ${PROFILE_DIR}`);
  console.log(`📄 Target Page: ${PAGE_NAME}`);

  const context = await chromium.launchPersistentContext(
    PROFILE_DIR,
    {
      headless: false,

      viewport: null,

      args: [
        '--disable-blink-features=AutomationControlled',
      ],
    }
  );

  let page: Page;

  if (context.pages().length > 0) {
    page = context.pages()[0];
  } else {
    page = await context.newPage();
  }

  try {
    console.log('\n🌐 Mở Facebook...');

    await page.goto('https://www.facebook.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(4000);

    console.log(`🌐 URL: ${page.url()}`);

    await waitForManualLogin(page);

    console.log('\n⏳ Đợi Facebook tải...');

    await page.waitForTimeout(3000);

    /*
     * Bước 1:
     * Mở menu avatar.
     */

    const menuOpened = await openProfileMenu(page);

    if (!menuOpened) {
      console.log(
        '\n❌ Không mở được menu Profile.'
      );

      console.log(
        '👉 Bạn có thể mở menu bằng tay để kiểm tra.'
      );

      await page.pause();
      return;
    }

    /*
     * Bước 2:
     * Mở Select profile nếu cần.
     */

    const selectProfileOpened =
      await openSelectProfile(page);

    if (!selectProfileOpened) {
      console.log(
        '\n❌ Không mở được Select profile.'
      );

      await page.pause();
      return;
    }

    await page.waitForTimeout(1000);

    /*
     * Bước 3:
     * Chọn Page.
     */

    const switched = await switchToPage(page);

    if (!switched) {
      console.log(
        '\n❌ Không switch được sang Page.'
      );

      await page.pause();
      return;
    }

    /*
     * Bước 4:
     * Kiểm tra.
     */

    const verified = await verifyPage(page);

    if (verified) {
      console.log('\n========================================');
      console.log('🟢 HOÀN TẤT');
      console.log(`🟢 Đang dùng Page: ${PAGE_NAME}`);
      console.log('========================================');
    } else {
      console.log('\n⚠️ Click đã thực hiện nhưng chưa xác minh được.');
    }

    console.log(
      '\nBrowser sẽ được giữ mở.'
    );

    console.log(
      'Bạn có thể kiểm tra Facebook bằng mắt.'
    );

    await page.pause();

  } catch (error) {
    console.log('\n========================================');
    console.log('❌ CÓ LỖI');
    console.log('========================================');

    console.error(error);

    await page.pause();

  } finally {
    /*
     * Cố tình không đóng browser/context.
     * Giữ session Facebook mở để kiểm tra.
     */
  }
}

main();