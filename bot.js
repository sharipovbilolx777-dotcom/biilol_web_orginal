const { Markup } = require('telegraf');
const {
  getLanguageKeyboard,
  getMainMenu,
  getAdminPanelKeyboard,
  getAgreementKeyboard,
  getServicesKeyboard,
  getPortfolioKeyboard,
  getContactsKeyboard,
  getRatingKeyboard,
  getGameKeyboard,
  getBackKeyboard,
} = require('./keyboards');
const {
  getUser,
  createOrUpdateUser,
  setUserLanguage,
  setUserPhone,
  setUserPlayed,
  setUserDiscount,
  getAllUsers,
  countUsers,
  countBlockedUsers,
  countPlayedUsers,
  countDiscountUsers,
  createOrder,
  getOrders,
  countOrders,
  countOrdersByStatus,
  updateOrderStatus,
  createReview,
  getReviews,
  countReviews,
  getActiveUsersCount,
} = require('./database');
const {
  isAdmin,
  getState,
  clearState,
  setState,
  getStateValue,
  formatPhone,
  escapeMarkdown,
  logError,
  checkAndMarkBlockedUsers,
} = require('./helpers');

const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TARGET_CHANNEL = process.env.TARGET_CHANNEL;

// ===================== START / TIL =====================

function startHandler(ctx) {
  const user = ctx.from;
  const telegramId = user.id.toString();

  // DB ga qo‘shish yoki yangilash
  createOrUpdateUser(telegramId, user.first_name, user.last_name, user.username, 'uz');

  // State tozalash
  clearState(telegramId);

  // Admin uchun maxsus salom
  if (isAdmin(telegramId, ADMIN_ID)) {
    ctx.reply(
      '👑 *Xush kelibsiz, Boss!*\nAdmin panelga kirish uchun /admin buyrugʻini yuboring.',
      { parse_mode: 'Markdown' }
    );
  }

  ctx.reply(
    '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '💻 *BILOL | WEB DEVELOPER*\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🚀 Biznesingizni raqamlashtirish uchun professional jamoa xizmatda.\n\n' +
    '🎁 *Maxsus aksiya:* Mini-oʻyinda qatnashing va 20% chegirma yutib oling!\n\n' +
    '🌐 *Muloqot tilini tanlang:*',
    {
      parse_mode: 'Markdown',
      ...getLanguageKeyboard(),
    }
  );
}

// ===================== TIL O‘ZGARTIRISH =====================

function languageCallback(ctx) {
  const lang = ctx.match[1];
  const telegramId = ctx.from.id.toString();

  setUserLanguage(telegramId, lang);
  setState(telegramId, 'lang', lang);

  const messages = {
    uz: '🇺🇿 Oʻzbek tili faollashdi.',
    ru: '🇷🇺 Русский язык активирован.',
    en: '🇬🇧 English selected.',
  };

  ctx.answerCbQuery();
  ctx.reply(messages[lang] || messages.uz, getMainMenu(lang));
}

// ===================== ASOSIY MENYU HEAR =====================

function mainMenuHandler(ctx) {
  const text = ctx.message.text;
  const telegramId = ctx.from.id.toString();
  const user = getUser(telegramId);
  const lang = user?.language || 'uz';

  // Tilni o‘zgartirish
  if (text.match(/🌐 Tilni o'zgartirish|🌐 Изменить язык|🌐 Change Language/)) {
    ctx.reply('🌐 Tilni tanlang:', getLanguageKeyboard());
    return;
  }

  // Portfolio
  if (text.match(/💻 Portfolio|💻 Портфолио|💻 Bizning ishlar \(Portfolio\)/)) {
    ctx.reply(
      '💻 *Bilol | Web Developer — Eng soʻnggi loyihalar:*\n\nOʻzingizga yoqqan namunani koʻring 👇',
      { parse_mode: 'Markdown', ...getPortfolioKeyboard() }
    );
    return;
  }

  // Xizmatlar
  if (text.match(/⚙️ Xizmatlar va narxlar|⚙️ Услуги и цены|⚙️ Services & Pricing/)) {
    ctx.reply(
      '🛠 *Professional xizmatlarimiz:*\n\n' +
      '💡 Narxlar loyiha murakkabligiga qarab kelishiladi.\n' +
      '📌 Barcha loyihalar uchun *50% oldindan toʻlov*.\n\n' +
      'Quyidagi yoʻnalishlardan birini tanlang:',
      { parse_mode: 'Markdown', ...getServicesKeyboard() }
    );
    return;
  }

  // Chegirma o‘yini
  if (text.match(/🎮 20% chegirma yutish|🎮 Выиграть скидку 20%|🎮 Win 20% Discount/)) {
    gameHandler(ctx);
    return;
  }

  // Mijozlar fikri
  if (text.match(/⭐️ Mijozlar fikri|⭐️ Отзывы клиентов|⭐️ Client Reviews/)) {
    ctx.reply(
      '⭐️ *Mijozlarimiz Bilol | Web Developer haqida:*\n\n' +
      '👤 *Javohir (Startup asoschisi):*\n_“Veb-sayt oʻylaganimdan ham tez va professional chiqdi!”_\n\n' +
      '👤 *Dilshod (Doʻkon egasi):*\n_“Onlayn doʻkonimiz ishga tushgach, savdolar keskin oshdi. Rahmat!”_\n\n' +
      '👇 *Oʻz fikringizni qoldiring:*',
      { parse_mode: 'Markdown', ...getRatingKeyboard() }
    );
    return;
  }

  // Loyihaga buyurtma
  if (text.match(/📦 Loyihaga buyurtma|📦 Заказать проект|📦 Order Project/)) {
    setState(telegramId, 'pendingService', 'Umumiy murojaat');
    askAgreement(ctx);
    return;
  }

  // Aloqa
  if (text.match(/📞 Aloqa|📞 Контакты|📞 Contacts/)) {
    ctx.reply(
      '📬 *Bilol | Web Developer — Bogʻlanish:*\n\n' +
      '📞 *Telefon:* `+998 99 321 21 22`\n' +
      '💬 *Telegram:* @sharipoov1\n' +
      '📸 *Instagram:* [boburivlc__7](https://instagram.com/boburivlc__7)\n' +
      '📢 *Kanal:* [Bilol Web Developer](https://t.me/Bilolwebdeveloper)',
      { parse_mode: 'Markdown', ...getContactsKeyboard(), disable_web_page_preview: true }
    );
    return;
  }

  // Ortga
  if (text === '🔙 Ortga') {
    clearState(telegramId);
    ctx.reply('Asosiy menyu:', getMainMenu(lang));
    return;
  }

  // Agar hech narsa mos kelmasa, asosiy menyu
  ctx.reply('Iltimos, menyudan birini tanlang:', getMainMenu(lang));
}

// ===================== XIZMATLAR =====================

function serviceCallback(ctx) {
  const type = ctx.match[1];
  const telegramId = ctx.from.id.toString();

  const services = {
    landing: {
      name: 'Landing Page',
      duration: '2–4 kun',
      price: '500 000 so‘m ($40)',
      prepayment: '250 000 so‘m',
    },
    shop: {
      name: 'E-Commerce',
      duration: '7–10 kun',
      price: '1 200 000 so‘m ($100)',
      prepayment: '600 000 so‘m',
    },
    corporate: {
      name: 'Korporativ veb-sayt',
      duration: '3–5 kun',
      price: '800 000 so‘m ($65)',
      prepayment: '400 000 so‘m',
    },
    bot: {
      name: 'Telegram Bot',
      duration: '2–5 kun',
      price: '400 000 so‘m ($30)',
      prepayment: '200 000 so‘m',
    },
    webapp: {
      name: 'Veb-Ilova',
      duration: '10–15 kun',
      price: '2 000 000 so‘m ($160)',
      prepayment: '1 000 000 so‘m',
    },
  };

  const s = services[type];
  if (!s) return ctx.answerCbQuery('Xizmat topilmadi.');

  ctx.answerCbQuery();

  const info =
    `🚀 *${s.name}*\n\n` +
    `⏳ Muddat: ${s.duration}\n` +
    `💰 Narx: ${s.price}\n` +
    `💳 Oldindan toʻlov (50%): ${s.prepayment}\n\n` +
    `🤝 Narx yana kelishiladi!`;

  setState(telegramId, 'pendingService', s.name);

  ctx.reply(info, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✨ Shu xizmatga buyurtma berish', `order_${type}`)],
    ]),
  });
}

// ===================== BUYURTMA JARAYONI =====================

function askAgreement(ctx) {
  ctx.reply(
    '🤝 *Buyurtma shartlari:*\n\n' +
    'Barcha loyihalar uchun *50% oldindan toʻlov* amalga oshiriladi.\n' +
    'Qolgan summa loyiha tafsilotlari va murakkabligiga qarab kelishiladi.\n\n' +
    'Rozimisiz?',
    { parse_mode: 'Markdown', ...getAgreementKeyboard() }
  );
}

function agreementCallback(ctx) {
  const answer = ctx.match[1];
  const telegramId = ctx.from.id.toString();

  ctx.answerCbQuery();

  if (answer === 'no') {
    ctx.editMessageText('❌ Buyurtma bekor qilindi.', { parse_mode: 'Markdown' });
    clearState(telegramId);
    const user = getUser(telegramId);
    ctx.reply('Asosiy menyu:', getMainMenu(user?.language || 'uz'));
    return;
  }

  // Yes
  ctx.editMessageText(
    '✅ Rozilik qabul qilindi. Ajoyib tanlov! 🚀\n\n' +
    '📝 Iltimos, ism va familiyangizni toʻliq kiriting (Masalan: Alisherbek Usmonov):',
    { parse_mode: 'Markdown' }
  );
  setState(telegramId, 'waitingForName', true);
}

function orderCallback(ctx) {
  const type = ctx.match[1];
  const telegramId = ctx.from.id.toString();

  ctx.answerCbQuery();

  const services = {
    landing: 'Landing Page',
    shop: 'E-Commerce',
    corporate: 'Korporativ veb-sayt',
    bot: 'Telegram Bot',
    webapp: 'Veb-Ilova',
  };

  setState(telegramId, 'pendingService', services[type] || type);
  askAgreement(ctx);
}

// ===================== MATN QABUL QILISH (FLOW) =====================

async function textHandler(ctx, next) {
  const telegramId = ctx.from.id.toString();
  const user = getUser(telegramId);
  const lang = user?.language || 'uz';
  const state = getState(telegramId);
  const text = ctx.message.text?.trim() || '';

  // 1. Ism kutilmoqda
  if (state.waitingForName) {
    const words = text.split(/\s+/);
    if (words.length < 2) {
      return ctx.reply(
        '❌ Iltimos, ism va familiyangizni *toʻliq* yozing (Masalan: Alisherbek Usmonov):',
        { parse_mode: 'Markdown' }
      );
    }
    setState(telegramId, 'fullName', text);
    setState(telegramId, 'waitingForName', false);
    setState(telegramId, 'waitingForDescription', true);
    return ctx.reply(
      '🎯 Endi loyihangiz haqida batafsil yozing.\n\n' +
      'Masalan: Restoran uchun zamonaviy buyurtma sayti kerak.',
      { parse_mode: 'Markdown' }
    );
  }

  // 2. Loyiha tavsifi kutilmoqda
  if (state.waitingForDescription) {
    if (text.length < 10) {
      return ctx.reply(
        '❌ Iltimos, loyihangiz haqida *batafsilroq* yozing (kamida 10 belgi):',
        { parse_mode: 'Markdown' }
      );
    }
    setState(telegramId, 'description', text);
    setState(telegramId, 'waitingForDescription', false);
    setState(telegramId, 'waitingForBudget', true);

    // Xizmat turini aniqlash (faqat ko‘rsatish uchun)
    const lower = text.toLowerCase();
    let siteType = 'Maxsus loyiha';
    let minPrice = 'kelishiladi';

    if (lower.includes('ilova') || lower.includes('app') || lower.includes('web application')) {
      siteType = 'Veb-Ilova';
      minPrice = '2 000 000 so‘m ($160)';
    } else if (lower.includes('do\'kon') || lower.includes('magazin') || lower.includes('shop') || lower.includes('savdo') || lower.includes('market')) {
      siteType = 'E-Commerce';
      minPrice = '1 200 000 so‘m ($100)';
    } else if (lower.includes('bank') || lower.includes('moliya') || lower.includes('fintech') || lower.includes('kredit')) {
      siteType = 'Bank / Moliya';
      minPrice = '2 500 000 so‘m ($200)';
    } else if (lower.includes('taksi') || lower.includes('taxi') || lower.includes('logistika') || lower.includes('dostavka')) {
      siteType = 'Logistika / Taksi';
      minPrice = '800 000 so‘m ($65)';
    } else if (lower.includes('bot') || lower.includes('telegram')) {
      siteType = 'Telegram Bot';
      minPrice = '400 000 so‘m ($30)';
    } else if (lower.includes('landing') || lower.includes('sayt') || lower.includes('site') || lower.includes('vizitka')) {
      siteType = 'Landing Page / Veb-sayt';
      minPrice = '500 000 so‘m ($40)';
    }

    return ctx.reply(
      `💡 Tushunarli. Bu *${siteType}* turiga oʻxshaydi.\n` +
      `📌 Bunday loyihalar narxi *${minPrice}* dan boshlanadi.\n\n` +
      `💰 Loyiha uchun taxminiy budjetingiz qancha? (Masalan: 500000, 1 500 000 so‘m, $100)`,
      { parse_mode: 'Markdown' }
    );
  }

  // 3. Budjet kutilmoqda
  if (state.waitingForBudget) {
    const raw = text.replace(/[^0-9$]/g, '');
    const numeric = parseInt(raw.replace(/[^0-9]/g, ''), 10);
    const isDollar = text.includes('$');
    const minLimit = isDollar ? 10 : 1000;

    if (!raw || numeric < minLimit || text.length > 30) {
      return ctx.reply(
        '❌ Iltimos, real budjet miqdorini toʻgʻri yozing (Masalan: 500000, 1 500 000 so‘m, $50):',
        { parse_mode: 'Markdown' }
      );
    }

    setState(telegramId, 'budget', text);
    setState(telegramId, 'waitingForBudget', false);
    setState(telegramId, 'waitingForPhone', true);

    // Telefon raqam so‘rash
    const phoneKeyboard = Markup.keyboard([
      [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
      ['🔙 Ortga'],
    ]).resize();

    return ctx.reply(
      '📞 Oxirgi qadam — aloqa uchun telefon raqamingizni yuboring (pastdagi tugma orqali):',
      phoneKeyboard
    );
  }

  // 4. Review kutilmoqda
  if (state.waitingForReview) {
    if (text.length < 3) {
      return ctx.reply('❌ Iltimos, fikringizni batafsil yozing (kamida 3 belgi):');
    }
    setState(telegramId, 'waitingForReview', false);

    const rating = state.reviewRating || 0;
    createReview(telegramId, ctx.from.username || '', rating, text);

    // Adminga xabar
    const adminMsg =
      `💬 *Yangi sharh*\n\n` +
      `👤 ${ctx.from.first_name} (@${ctx.from.username || 'yoq'})\n` +
      `🆔 \`${telegramId}\`\n` +
      `⭐️ Baho: ${rating} yulduz\n` +
      `📝 Fikr: "${escapeMarkdown(text)}"`;
    ctx.telegram.sendMessage(ADMIN_ID, adminMsg, { parse_mode: 'Markdown' }).catch(() => {});

    ctx.reply('✅ Fikringiz uchun rahmat! 🙏', getMainMenu(lang));
    return;
  }

  // 5. Admin parol
  if (isAdmin(telegramId, ADMIN_ID) && state.waitingForAdminPassword) {
    if (text === ADMIN_PASSWORD) {
      setState(telegramId, 'waitingForAdminPassword', false);
      return showAdminPanel(ctx);
    } else {
      return ctx.reply('❌ Notoʻgʻri parol! Qaytadan urinib koʻring:');
    }
  }

  // 6. Admin broadcast
  if (isAdmin(telegramId, ADMIN_ID) && state.waitingForBroadcast) {
    // Bu yerda broadcast handler faqat media yoki matn uchun ishlaydi, lekin biz buni boshqa handlerda qilamiz
    // (media handler orqali). Agar matn bo‘lsa, shu yerda ishlaydi.
    setState(telegramId, 'waitingForBroadcast', false);
    await broadcastMessage(ctx, ctx.message);
    return;
  }

  // Agar hech narsa mos kelmasa, keyingi middleware
  return next();
}

// ===================== BUYURTMA TELEFON (CONTACT) =====================

async function contactHandler(ctx) {
  const telegramId = ctx.from.id.toString();
  const user = getUser(telegramId);
  const lang = user?.language || 'uz';
  const state = getState(telegramId);

  if (!state.waitingForPhone) {
    ctx.reply('Hozircha telefon raqam kerak emas.', getMainMenu(lang));
    return;
  }

  const contact = ctx.message.contact;
  const phone = contact.phone_number;

  setState(telegramId, 'waitingForPhone', false);
  setUserPhone(telegramId, phone);

  // Maʼlumotlarni yig‘ish
  const fullName = state.fullName || ctx.from.first_name || 'Ism kiritilmagan';
  const service = state.pendingService || 'Umumiy murojaat';
  const description = state.description || 'Ko‘rsatilmagan';
  const budget = state.budget || 'Kelishiladi';
  const discount = getUser(telegramId)?.has_discount ? '🎁 PROMO-2026-VIP (20%)' : 'Yo‘q';

  // DB ga buyurtma yozish
  createOrder(
    telegramId,
    fullName,
    ctx.from.username || '',
    phone,
    service,
    description,
    budget,
    discount
  );

  // Adminga xabar
  const adminMsg =
    `🚨 *YANGI BUYURTMA*\n\n` +
    `👤 Mijoz: ${escapeMarkdown(fullName)}\n` +
    `📞 Telefon: ${formatPhone(phone)}\n` +
    `🔗 Username: @${ctx.from.username || 'mavjud_emas'}\n` +
    `🆔 ID: \`${telegramId}\`\n` +
    `💼 Xizmat: ${escapeMarkdown(service)}\n` +
    `📝 Loyiha: "${escapeMarkdown(description)}"\n` +
    `💰 Budjet: ${escapeMarkdown(budget)}\n` +
    `🎁 Chegirma: ${discount}\n` +
    `🕐 Sana: ${new Date().toLocaleString('uz-UZ')}`;

  try {
    await ctx.telegram.sendMessage(ADMIN_ID, adminMsg, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.telegram.sendMessage(ADMIN_ID, adminMsg.replace(/[*_`]/g, ''));
  }

  // Foydalanuvchiga javob
  ctx.reply(
    '✅ Maʼlumotlaringiz qabul qilindi! Tez orada mutaxassisimiz siz bilan bogʻlanadi.\n' +
    'Rahmat! 🙏',
    getMainMenu(lang)
  );

  // Stateni tozalash
  clearState(telegramId);
}

// ===================== O‘YIN =====================

function gameHandler(ctx) {
  const telegramId = ctx.from.id.toString();
  const user = getUser(telegramId);

  if (user?.has_played) {
    return ctx.reply('⚠️ Siz bu o‘yinda allaqachon qatnashgansiz! Imkoniyat faqat 1 marta. 😉');
  }

  const winningBox = Math.floor(Math.random() * 3) + 1;
  setState(telegramId, 'winningBox', winningBox);

  ctx.reply(
    '🎮 *Omadli chegirma o‘yini!*\n\n' +
    '3 ta qutidan birida 20% chegirma promokodi yashiringan.\n' +
    'O‘zingizga yoqqan birini tanlang:',
    { parse_mode: 'Markdown', ...getGameKeyboard() }
  );
}

function gameBoxCallback(ctx) {
  const choice = parseInt(ctx.match[1], 10);
  const telegramId = ctx.from.id.toString();
  const user = getUser(telegramId);

  if (user?.has_played) {
    return ctx.answerCbQuery('Siz allaqachon o‘ynagansiz!');
  }

  const winningBox = getStateValue(telegramId, 'winningBox');
  if (!winningBox) {
    return ctx.answerCbQuery('Xatolik, qayta urinib ko‘ring.');
  }

  setUserPlayed(telegramId);

  if (choice === winningBox) {
    setUserDiscount(telegramId);
    ctx.reply(
      '🎉 *TABRIKLAYMIZ! Siz 20% chegirma yutib oldingiz!* 🏆\n\n' +
      'Promokod: `PROMO-2026-VIP`\n' +
      'Buyurtma berishda shu kodni aytsangiz kifoya!',
      { parse_mode: 'Markdown' }
    );
  } else {
    ctx.reply(
      `😢 Afsus, bu quti bo‘sh chiqdi. (Yutuqli quti ${winningBox}-quti edi).\n` +
      'Keyingi safar albatta omadingiz keladi! ✨'
    );
  }

  // State tozalash
  setState(telegramId, 'winningBox', null);
}

// ===================== REYTING =====================

function ratingCallback(ctx) {
  const rating = parseInt(ctx.match[1], 10);
  const telegramId = ctx.from.id.toString();

  ctx.answerCbQuery();
  setState(telegramId, 'reviewRating', rating);
  setState(telegramId, 'waitingForReview', true);

  ctx.reply(
    `⭐️ Siz ${rating} yulduz baho berdingiz.\n\n✍️ Endi fikringizni yozib qoldiring:`,
    { parse_mode: 'Markdown' }
  );
}

function leaveReviewCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  ctx.answerCbQuery();
  setState(telegramId, 'waitingForReview', true);
  ctx.reply('✍️ Iltimos, fikringizni yozib yuboring:');
}

// ===================== ADMIN PANEL =====================

function adminCommand(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) {
    return ctx.reply('⛔ Sizda admin huquqi mavjud emas.');
  }

  setState(telegramId, 'waitingForAdminPassword', true);
  ctx.reply('🔐 Admin parolini kiriting:');
}

function showAdminPanel(ctx) {
  ctx.reply(
    '👑 *BILOL ADMIN PANEL*\n\n' +
    'Quyidagi bo‘limlardan birini tanlang:',
    { parse_mode: 'Markdown', ...getAdminPanelKeyboard() }
  );
}

// ===================== ADMIN STATISTIKA =====================

function adminStatsCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();

  const totalUsers = countUsers();
  const blockedUsers = countBlockedUsers();
  const activeUsers = getActiveUsersCount();
  const totalOrders = countOrders();
  const pendingOrders = countOrdersByStatus('kutilmoqda');
  const completedOrders = countOrdersByStatus('yakunlandi');
  const totalReviews = countReviews();
  const playedUsers = countPlayedUsers();
  const discountUsers = countDiscountUsers();

  const uptimeSeconds = Math.floor((Date.now() - global.startTime) / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  const msg =
    `📊 *STATISTIKA*\n\n` +
    `👥 Jami foydalanuvchilar: ${totalUsers}\n` +
    `🟢 Faol foydalanuvchilar: ${activeUsers}\n` +
    `🔴 Bloklanganlar: ${blockedUsers}\n\n` +
    `📦 Jami buyurtmalar: ${totalOrders}\n` +
    `⏳ Kutilayotganlar: ${pendingOrders}\n` +
    `✅ Yakunlanganlar: ${completedOrders}\n\n` +
    `⭐️ Jami sharhlar: ${totalReviews}\n` +
    `🎮 O‘yinda qatnashganlar: ${playedUsers}\n` +
    `🎁 Chegirma yutganlar: ${discountUsers}\n\n` +
    `🟢 Bot holati: ONLINE\n` +
    `⏱ Uptime: ${hours} soat ${minutes} daqiqa`;

  ctx.editMessageText(msg, { parse_mode: 'Markdown', ...getBackKeyboard() }).catch(() => {});
}

// ===================== ADMIN BUYURTMALAR =====================

function adminOrdersCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();

  const orders = getOrders(10);
  if (orders.length === 0) {
    ctx.editMessageText(
      '📦 Hozircha buyurtmalar yo‘q.',
      { parse_mode: 'Markdown', ...getBackKeyboard() }
    ).catch(() => {});
    return;
  }

  let msg = '📦 *Oxirgi 10 ta buyurtma:*\n\n';
  orders.forEach((o, i) => {
    msg +=
      `${i + 1}. 👤 ${escapeMarkdown(o.full_name)} | ${o.phone}\n` +
      `   💼 ${escapeMarkdown(o.service)}\n` +
      `   📝 ${escapeMarkdown(o.description.substring(0, 50))}${o.description.length > 50 ? '...' : ''}\n` +
      `   💰 ${escapeMarkdown(o.budget || 'Kelishiladi')}\n` +
      `   📌 Status: ${statusEmoji(o.status)} ${escapeMarkdown(o.status)}\n` +
      `   🕐 ${new Date(o.created_at).toLocaleString('uz-UZ')}\n\n`;
  });

  ctx.editMessageText(msg, { parse_mode: 'Markdown', ...getBackKeyboard() }).catch(() => {});
}

function statusEmoji(status) {
  const map = {
    'kutilmoqda': '🟡',
    'jarayonda': '🔵',
    'yakunlandi': '🟢',
    'bekor qilindi': '🔴',
  };
  return map[status] || '⚪';
}

// ===================== ADMIN FOYDALANUVCHILAR =====================

function adminUsersCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();

  const users = getAllUsers(20);
  if (users.length === 0) {
    ctx.editMessageText(
      '👥 Hozircha foydalanuvchilar yo‘q.',
      { parse_mode: 'Markdown', ...getBackKeyboard() }
    ).catch(() => {});
    return;
  }

  let msg = '👥 *Oxirgi 20 ta foydalanuvchi:*\n\n';
  users.forEach((u, i) => {
    msg +=
      `${i + 1}. ${escapeMarkdown(u.first_name || 'Noma\'lum')} ` +
      `@${u.username || 'yoq'} ` +
      `[${u.is_blocked ? '🔴' : '🟢'}]\n`;
  });

  ctx.editMessageText(msg, { parse_mode: 'Markdown', ...getBackKeyboard() }).catch(() => {});
}

// ===================== ADMIN SHARHLAR =====================

function adminReviewsCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();

  const reviews = getReviews(10);
  if (reviews.length === 0) {
    ctx.editMessageText(
      '⭐️ Hozircha sharhlar yo‘q.',
      { parse_mode: 'Markdown', ...getBackKeyboard() }
    ).catch(() => {});
    return;
  }

  let msg = '⭐️ *Oxirgi 10 ta sharh:*\n\n';
  reviews.forEach((r, i) => {
    msg +=
      `${i + 1}. @${r.username || 'yoq'} — ${'⭐️'.repeat(r.rating || 0)}\n` +
      `   "${escapeMarkdown(r.review.substring(0, 100))}${r.review.length > 100 ? '...' : ''}"\n` +
      `   🕐 ${new Date(r.created_at).toLocaleString('uz-UZ')}\n\n`;
  });

  ctx.editMessageText(msg, { parse_mode: 'Markdown', ...getBackKeyboard() }).catch(() => {});
}

// ===================== ADMIN BROADCAST =====================

function adminBroadcastCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();
  setState(telegramId, 'waitingForBroadcast', true);

  ctx.reply(
    '📢 *Reklama tarqatish rejimi faollashtirildi!*\n\n' +
    'Endi xohlagan turdagi xabaringizni (matn, rasm, video, hujjat, audio) yuboring.\n' +
    'Xabar barcha faol foydalanuvchilarga va kanalga yuboriladi.',
    { parse_mode: 'Markdown' }
  );
}

// ===================== ADMIN CLEAN =====================

async function adminCleanCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();
  await ctx.reply('⏳ Bloklangan foydalanuvchilar tekshirilmoqda...');

  const allUsers = getAllUsers(1000);
  const userIds = allUsers.map(u => u.telegram_id);

  const blockedCount = await checkAndMarkBlockedUsers(ctx.telegram, userIds);

  const total = countUsers();
  const blocked = countBlockedUsers();
  const active = total - blocked;

  ctx.editMessageText(
    `🧹 *Tozalash yakunlandi!*\n\n` +
    `🟢 Faol: ${active}\n` +
    `🔴 Bloklangan: ${blocked}\n` +
    `📌 Jami: ${total}\n` +
    `🆕 Yangi bloklanganlar: ${blockedCount}`,
    { parse_mode: 'Markdown', ...getBackKeyboard() }
  ).catch(() => {});
}

// ===================== ADMIN SYSTEM =====================

function adminSystemCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();

  const uptimeSeconds = Math.floor((Date.now() - global.startTime) / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  const msg =
    `⚙️ *Tizim maʼlumotlari*\n\n` +
    `🤖 Bot: Bilol | Web Developer\n` +
    `📦 Versiya: 3.5.0\n` +
    `⏱ Uptime: ${hours} soat ${minutes} daqiqa\n` +
    `🧠 Node.js: ${process.version}\n` +
    `📊 Xotira: ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB\n` +
    `🟢 Holat: Barqaror`;

  ctx.editMessageText(msg, { parse_mode: 'Markdown', ...getBackKeyboard() }).catch(() => {});
}

// ===================== ADMIN ORQAGA =====================

function adminBackCallback(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return ctx.answerCbQuery();

  ctx.answerCbQuery();
  showAdminPanel(ctx);
}

// ===================== BROADCAST FUNKSIYASI =====================

async function broadcastMessage(ctx, message) {
  const telegramId = ctx.from.id.toString();

  // Kanalga yuborish
  let channelSuccess = 0;
  try {
    await ctx.telegram.copyMessage(TARGET_CHANNEL, ctx.chat.id, message.message_id);
    channelSuccess = 1;
  } catch (e) {
    console.log('Kanalga yuborish xatosi:', e.message);
  }

  // Foydalanuvchilarga yuborish
  const users = getAllUsers(1000);
  let success = 0;
  let fail = 0;

  for (const user of users) {
    if (user.is_blocked) continue;
    try {
      await ctx.telegram.copyMessage(user.telegram_id, ctx.chat.id, message.message_id);
      success++;
      // Flood limitdan qochish uchun kichik delay
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (e) {
      if (e.response && e.response.error_code === 403) {
        setUserBlocked(user.telegram_id, 1);
      }
      fail++;
    }
  }

  ctx.reply(
    `📢 *Reklama tarqatish yakunlandi!*\n\n` +
    `✅ Kanalga: ${channelSuccess}\n` +
    `✅ Foydalanuvchilarga: ${success}\n` +
    `❌ Yuborilmadi: ${fail}`,
    { parse_mode: 'Markdown' }
  );
}

// ===================== MEDIA BROADCAST HANDLER =====================

async function mediaBroadcastHandler(ctx) {
  const telegramId = ctx.from.id.toString();
  if (!isAdmin(telegramId, ADMIN_ID)) return;
  if (!getStateValue(telegramId, 'waitingForBroadcast')) return;

  setState(telegramId, 'waitingForBroadcast', false);
  await broadcastMessage(ctx, ctx.message);
}

// ===================== EXPORT =====================

module.exports = {
  startHandler,
  languageCallback,
  mainMenuHandler,
  serviceCallback,
  orderCallback,
  agreementCallback,
  textHandler,
  contactHandler,
  gameHandler,
  gameBoxCallback,
  ratingCallback,
  leaveReviewCallback,
  adminCommand,
  adminStatsCallback,
  adminOrdersCallback,
  adminUsersCallback,
  adminReviewsCallback,
  adminBroadcastCallback,
  adminCleanCallback,
  adminSystemCallback,
  adminBackCallback,
  mediaBroadcastHandler,
  showAdminPanel,
};