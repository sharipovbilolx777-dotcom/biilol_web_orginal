'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TARGET_CHANNEL = process.env.TARGET_CHANNEL || '';

if (!BOT_TOKEN || !ADMIN_ID || !ADMIN_PASSWORD) {
  throw new Error('BOT_TOKEN, ADMIN_ID va ADMIN_PASSWORD .env faylida bo‘lishi shart.');
}

const bot = new Telegraf(BOT_TOKEN);

const DATA_FILE = path.join(__dirname, 'data.json');
const startTime = Date.now();

let database = {
  users: [],
  reviews: []
};

try {
  if (fs.existsSync(DATA_FILE)) {
    database = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
} catch (error) {
  console.error('data.json o‘qilmadi:', error.message);
}

const states = new Map();

const SERVICES = {
  landing: {
    name: 'Landing Page',
    price: '500 000 so‘mdan',
    time: '2–4 kun',
    text: 'Sotuvchi bir sahifalik veb-sayt'
  },
  shop: {
    name: 'Onlayn do‘kon',
    price: '1 200 000 so‘mdan',
    time: '7–10 kun',
    text: 'Mahsulotlarni onlayn sotish tizimi'
  },
  corporate: {
    name: 'Korporativ sayt',
    price: '800 000 so‘mdan',
    time: '3–5 kun',
    text: 'Kompaniya uchun professional sayt'
  },
  bot: {
    name: 'Telegram bot',
    price: '400 000 so‘mdan',
    time: '2–5 kun',
    text: 'Bot va avtomatlashtirish tizimi'
  },
  webapp: {
    name: 'Veb-ilova',
    price: '2 000 000 so‘mdan',
    time: '10–15 kun',
    text: 'Murakkab veb-ilova va boshqaruv tizimi'
  },
  custom: {
    name: 'Umumiy murojaat',
    price: 'Kelishiladi',
    time: 'Kelishiladi',
    text: 'Maxsus loyiha'
  }
};

function saveDatabase() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 2));
}

function addUser(userId) {
  if (!database.users.includes(userId)) {
    database.users.push(userId);
    saveDatabase();
  }
}

function getState(userId) {
  if (!states.has(userId)) {
    states.set(userId, {
      lang: 'uz',
      step: null,
      service: null,
      name: null,
      description: null,
      budget: null,
      hasDiscount: false,
      hasPlayed: false
    });
  }

  return states.get(userId);
}

function clearOrder(userId) {
  const state = getState(userId);

  state.step = null;
  state.service = null;
  state.name = null;
  state.description = null;
  state.budget = null;
}

function mainMenu() {
  return Markup.keyboard([
    ['💼 Xizmatlar va narxlar', '📝 Loyihaga buyurtma'],
    ['🎮 Chegirma yutish', '⭐ Mijozlar fikri'],
    ['🌐 Portfolio', '📞 Aloqa'],
    ['🌍 Tilni o‘zgartirish']
  ]).resize();
}

function languageMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🇺🇿 O‘zbekcha', 'lang:uz'),
      Markup.button.callback('🇷🇺 Русский', 'lang:ru'),
      Markup.button.callback('🇬🇧 English', 'lang:en')
    ]
  ]);
}

function servicesMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Landing Page', 'service:landing')],
    [Markup.button.callback('🛍 Onlayn do‘kon', 'service:shop')],
    [Markup.button.callback('🏢 Korporativ sayt', 'service:corporate')],
    [Markup.button.callback('🤖 Telegram bot', 'service:bot')],
    [Markup.button.callback('📱 Veb-ilova', 'service:webapp')]
  ]);
}

function agreementMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Roziman', 'agreement:yes'),
      Markup.button.callback('❌ Bekor qilish', 'agreement:no')
    ]
  ]);
}

function phoneMenu() {
  return Markup.keyboard([
    [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
    ['❌ Bekor qilish']
  ]).resize().oneTime();
}

function adminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Statistika', 'admin:stats')],
    [Markup.button.callback('📢 Reklama yuborish', 'admin:broadcast')],
    [Markup.button.callback('👥 Foydalanuvchilar soni', 'admin:users')],
    [Markup.button.callback('🔙 Yopish', 'admin:close')]
  ]);
}

function reviewMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⭐ 1', 'rating:1'),
      Markup.button.callback('⭐ 2', 'rating:2'),
      Markup.button.callback('⭐ 3', 'rating:3'),
      Markup.button.callback('⭐ 4', 'rating:4'),
      Markup.button.callback('⭐ 5', 'rating:5')
    ],
    [Markup.button.callback('✍️ Fikr yozish', 'review:write')]
  ]);
}

async function beginOrder(ctx, service = 'custom') {
  const state = getState(ctx.from.id);

  clearOrder(ctx.from.id);
  state.service = service;
  state.step = 'agreement';

  await ctx.reply(
    '🤝 Buyurtma sharti:\n\nBarcha loyihalar uchun 50% oldindan to‘lov qilinadi. Qolgan summa loyiha topshirilgach to‘lanadi.\n\nShartga rozimisiz?',
    agreementMenu()
  );
}

async function sendOrderToAdmin(ctx) {
  const state = getState(ctx.from.id);
  const user = ctx.from;
  const service = SERVICES[state.service] || SERVICES.custom;
  const phone = ctx.message.contact.phone_number;
  const username = user.username ? `@${user.username}` : 'Mavjud emas';

  const discount = state.hasDiscount
    ? 'BOR — PROMO-2026-VIP'
    : 'Yo‘q';

  const orderText = [
    '🚨 YANGI BUYURTMA',
    '',
    `👤 Mijoz: ${state.name}`,
    `📞 Telefon: +${phone}`,
    `🔗 Username: ${username}`,
    `🆔 Telegram ID: ${user.id}`,
    '',
    `📌 Xizmat: ${service.name}`,
    `💰 Xizmat narxi: ${service.price}`,
    `📝 Tavsif: ${state.description}`,
    `💵 Mijoz budjeti: ${state.budget}`,
    `🏷 Chegirma: ${discount}`,
    '',
    '✅ 50% oldindan to‘lov shartiga rozilik olindi.'
  ].join('\n');

  // Markdown ishlatilmaydi: mijoz matni sabab xato chiqmaydi.
  await ctx.telegram.sendMessage(ADMIN_ID, orderText);
}

bot.use(async (ctx, next) => {
  if (ctx.from) {
    addUser(ctx.from.id);
    getState(ctx.from.id);
  }

  return next();
});

bot.start(async (ctx) => {
  clearOrder(ctx.from.id);

  await ctx.reply(
    '⚡ Assalomu alaykum!\n\nBilol Web Developer botiga xush kelibsiz. Kerakli bo‘limni tanlang.',
    mainMenu()
  );
});

bot.command('admin', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const state = getState(ctx.from.id);
  state.step = 'admin_password';

  await ctx.reply('🔐 Admin panel parolini kiriting:');
});

bot.hears('💼 Xizmatlar va narxlar', async (ctx) => {
  await ctx.reply(
    '🛠 Xizmatlarimizni tanlang:\n\nNarx loyiha murakkabligiga qarab kelishiladi.',
    servicesMenu()
  );
});

bot.hears('📝 Loyihaga buyurtma', async (ctx) => {
  await beginOrder(ctx);
});

bot.hears('🌐 Portfolio', async (ctx) => {
  const portfolio = Markup.inlineKeyboard([
    [
      Markup.button.url(
        '🌐 Korporativ platforma',
        'https://fastidious-starburst-7aa5e3.netlify.app/'
      )
    ],
    [
      Markup.button.url(
        '🛍 Brending va magazin',
        'https://monumental-dieffenbachia-aac848.netlify.app/'
      )
    ],
    [
      Markup.button.url(
        '🚕 Logistika tizimi',
        'https://spontaneous-pothos-202271.netlify.app/'
      )
    ]
  ]);

  await ctx.reply(
    '💻 Biz qilgan loyihalardan namunalar:',
    portfolio
  );
});

bot.hears('📞 Aloqa', async (ctx) => {
  await ctx.reply(
    '📞 Aloqa:\n\nTelegram: @sharipoov1\nTelefon: +998 99 321 21 22\nKanal: https://t.me/Bilolwebdeveloper'
  );
});

bot.hears('🌍 Tilni o‘zgartirish', async (ctx) => {
  await ctx.reply('Muloqot tilini tanlang:', languageMenu());
});

bot.hears('⭐ Mijozlar fikri', async (ctx) => {
  await ctx.reply(
    '⭐ Bizning xizmatimizga baho bering yoki fikr qoldiring:',
    reviewMenu()
  );
});

bot.hears('🎮 Chegirma yutish', async (ctx) => {
  const state = getState(ctx.from.id);

  if (state.hasPlayed) {
    return ctx.reply('⚠️ Siz bu o‘yinda avval qatnashgansiz.');
  }

  state.winningBox = Math.floor(Math.random() * 3) + 1;

  const gameMenu = Markup.inlineKeyboard([
    [
      Markup.button.callback('🎁 1-quti', 'box:1'),
      Markup.button.callback('🎁 2-quti', 'box:2'),
      Markup.button.callback('🎁 3-quti', 'box:3')
    ]
  ]);

  await ctx.reply(
    '🎮 Uchta qutidan birini tanlang. Bittasida 20% chegirma bor!',
    gameMenu
  );
});

bot.hears('❌ Bekor qilish', async (ctx) => {
  clearOrder(ctx.from.id);

  await ctx.reply(
    '❌ Buyurtma jarayoni bekor qilindi.',
    mainMenu()
  );
});

bot.action(/^lang:(uz|ru|en)$/, async (ctx) => {
  const lang = ctx.match[1];
  const state = getState(ctx.from.id);

  state.lang = lang;

  await ctx.answerCbQuery('Til saqlandi');
  await ctx.reply('✅ Til muvaffaqiyatli tanlandi.', mainMenu());
});

bot.action(/^service:(.+)$/, async (ctx) => {
  const serviceId = ctx.match[1];
  const service = SERVICES[serviceId];

  await ctx.answerCbQuery();

  if (!service) {
    return ctx.reply('Xizmat topilmadi.');
  }

  const orderButton = Markup.inlineKeyboard([
    [Markup.button.callback('✨ Shu xizmatga buyurtma berish', `order:${serviceId}`)]
  ]);

  await ctx.reply(
    `📌 ${service.name}\n\n📝 ${service.text}\n⏳ Muddat: ${service.time}\n💰 Narxi: ${service.price}`,
    orderButton
  );
});

bot.action(/^order:(.+)$/, async (ctx) => {
  const serviceId = ctx.match[1];

  await ctx.answerCbQuery();

  if (!SERVICES[serviceId]) {
    return ctx.reply('Xizmat topilmadi.');
  }

  await beginOrder(ctx, serviceId);
});

bot.action('agreement:no', async (ctx) => {
  await ctx.answerCbQuery();

  clearOrder(ctx.from.id);

  await ctx.editMessageText('❌ Buyurtma jarayoni bekor qilindi.');
});

bot.action('agreement:yes', async (ctx) => {
  await ctx.answerCbQuery();

  const state = getState(ctx.from.id);

  if (state.step !== 'agreement') {
    return;
  }

  state.step = 'name';

  await ctx.editMessageText(
    '✅ Rozilik qabul qilindi.\n\n📋 Ism va familiyangizni to‘liq yozing.\n\nMasalan: Ali Valiyev'
  );
});

bot.action(/^rating:([1-5])$/, async (ctx) => {
  const rating = Number(ctx.match[1]);

  database.reviews.push({
    userId: ctx.from.id,
    rating,
    text: null,
    date: new Date().toISOString()
  });

  saveDatabase();

  await ctx.answerCbQuery('Rahmat!');
  await ctx.reply(`Rahmat! Siz ${rating} yulduz baho berdingiz. ⭐`);
});

bot.action('review:write', async (ctx) => {
  await ctx.answerCbQuery();

  const state = getState(ctx.from.id);
  state.step = 'review';

  await ctx.reply('✍️ Fikringizni yozib yuboring:');
});

bot.action(/^box:([1-3])$/, async (ctx) => {
  const box = Number(ctx.match[1]);
  const state = getState(ctx.from.id);

  await ctx.answerCbQuery();

  if (state.hasPlayed) {
    return ctx.reply('⚠️ Siz avval qatnashgansiz.');
  }

  state.hasPlayed = true;

  if (box === state.winningBox) {
    state.hasDiscount = true;

    return ctx.reply(
      '🎉 Tabriklaymiz! Siz 20% chegirma yutdingiz!\n\nPromokod: PROMO-2026-VIP\nBuyurtma berganda shu kodni ayting.'
    );
  }

  await ctx.reply(
    `😔 Bu quti bo‘sh ekan. Yutuqli quti ${state.winningBox}-quti edi.`
  );
});

bot.action('admin:stats', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  await ctx.answerCbQuery();

  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  await ctx.reply(
    `📊 Statistika\n\n👥 Foydalanuvchilar: ${database.users.length}\n⭐ Fikrlar: ${database.reviews.length}\n⏱ Ishlash vaqti: ${hours} soat ${minutes} daqiqa`
  );
});

bot.action('admin:users', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  await ctx.answerCbQuery();

  await ctx.reply(
    `👥 Bot foydalanuvchilari soni: ${database.users.length} ta`
  );
});

bot.action('admin:broadcast', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  await ctx.answerCbQuery();

  const state = getState(ctx.from.id);
  state.step = 'broadcast';

  await ctx.reply(
    '📢 Reklama uchun xabar, rasm, video yoki fayl yuboring.\n\nU barcha foydalanuvchilarga yuboriladi.'
  );
});

bot.action('admin:close', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  await ctx.answerCbQuery();

  const state = getState(ctx.from.id);
  state.step = null;

  await ctx.reply('Admin panel yopildi.', mainMenu());
});

bot.on('message', async (ctx) => {
  const userId = ctx.from.id;
  const state = getState(userId);

  // Admin reklama yuborishi
  if (userId === ADMIN_ID && state.step === 'broadcast') {
    state.step = null;

    let success = 0;
    let failed = 0;

    await ctx.reply('⏳ Reklama yuborilmoqda...');

    if (TARGET_CHANNEL) {
      try {
        await ctx.telegram.copyMessage(
          TARGET_CHANNEL,
          ctx.chat.id,
          ctx.message.message_id
        );

        success++;
      } catch (error) {
        console.error('Kanalga reklama yuborilmadi:', error.message);
      }
    }

    for (const receiverId of database.users) {
      if (receiverId === ADMIN_ID) continue;

      try {
        await ctx.telegram.copyMessage(
          receiverId,
          ctx.chat.id,
          ctx.message.message_id
        );

        success++;
      } catch (error) {
        failed++;
      }
    }

    return ctx.reply(
      `✅ Reklama tarqatildi.\n\nYuborildi: ${success}\nYuborilmadi: ${failed}`
    );
  }

  // Admin paroli
  if (
    userId === ADMIN_ID &&
    state.step === 'admin_password' &&
    ctx.message.text
  ) {
    if (ctx.message.text.trim() === ADMIN_PASSWORD) {
      state.step = null;

      return ctx.reply(
        '🛡 Admin panelga xush kelibsiz.',
        adminMenu()
      );
    }

    return ctx.reply('❌ Parol noto‘g‘ri. Qaytadan yuboring:');
  }

  // Buyurtmadagi telefon raqami
  if (ctx.message.contact) {
    if (state.step !== 'phone') {
      return ctx.reply(
        'Avval buyurtma jarayonini boshlang.',
        mainMenu()
      );
    }

    if (
      ctx.message.contact.user_id &&
      ctx.message.contact.user_id !== userId
    ) {
      return ctx.reply(
        '❌ Iltimos, o‘zingizning telefon raqamingizni yuboring.'
      );
    }

    try {
      await sendOrderToAdmin(ctx);
    } catch (error) {
      console.error(
        'Buyurtma adminga yuborilmadi:',
        error.response?.description || error.message
      );

      return ctx.reply(
        '❌ Buyurtma yuborilmadi. Iltimos, @sharipoov1 ga yozing.'
      );
    }

    clearOrder(userId);

    return ctx.reply(
      '✅ Buyurtmangiz qabul qilindi! Tez orada siz bilan bog‘lanamiz.',
      mainMenu()
    );
  }

  if (!ctx.message.text) return;

  const text = ctx.message.text.trim();

  // Mijoz fikri
  if (state.step === 'review') {
    state.step = null;

    database.reviews.push({
      userId,
      rating: null,
      text,
      date: new Date().toISOString()
    });

    saveDatabase();

    try {
      await ctx.telegram.sendMessage(
        ADMIN_ID,
        `💬 Yangi fikr\n\nKimdan: ${ctx.from.first_name}\nUsername: @${ctx.from.username || 'yoq'}\n\nFikr:\n${text}`
      );
    } catch (error) {
      console.error('Fikr adminga yuborilmadi:', error.message);
    }

    return ctx.reply('✅ Fikringiz uchun rahmat!');
  }

  // Ism-familiya
  if (state.step === 'name') {
    if (text.split(/\s+/).length < 2) {
      return ctx.reply(
        '❌ Ism va familiyani to‘liq yozing.\nMasalan: Ali Valiyev'
      );
    }

    state.name = text;
    state.step = 'description';

    return ctx.reply(
      '🎯 Endi loyiha haqida batafsil yozing.\n\nMasalan: oziq-ovqat do‘koni uchun buyurtma sayti kerak.'
    );
  }

  // Loyiha tavsifi
  if (state.step === 'description') {
    if (text.length < 10) {
      return ctx.reply(
        '❌ Tavsif juda qisqa. Loyiha haqida kamida 10 ta belgi yozing.'
      );
    }

    state.description = text;
    state.step = 'budget';

    return ctx.reply(
      '💰 Ushbu loyiha uchun taxminiy budjetingiz qancha?\n\nMasalan: 1 000 000 so‘m'
    );
  }

  // Budjet
  if (state.step === 'budget') {
    if (!/\d/.test(text)) {
      return ctx.reply(
        '❌ Budjetni raqam bilan kiriting.\nMasalan: 500 000 so‘m'
      );
    }

    state.budget = text;
    state.step = 'phone';

    return ctx.reply(
      '📞 Oxirgi qadam: telefon raqamingizni pastdagi tugma orqali yuboring.',
      phoneMenu()
    );
  }
});

bot.catch((error) => {
  console.error('Bot xatosi:', error);
});

bot.launch({ dropPendingUpdates: false })
  .then(() => console.log('✅ Bot ishga tushdi.'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));