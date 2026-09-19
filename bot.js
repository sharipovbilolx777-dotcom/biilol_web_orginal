'use strict';

const { Telegraf, Markup } = require('telegraf');
const Database = require('better-sqlite3');

// ============================================================
// CONFIG
// ============================================================
const BOT_TOKEN = process.env.BOT_TOKEN || '8774770545:AAGQR4qQiWWf5AC-5OYvVhzHWkju9udZUgw';
const ADMIN_ID = '867717817';
const ADMIN_PASSWORD = '7777';

const TARGET_CHANNEL = '@webuzbekistan';
const CHANNEL_URL = 'https://t.me/webuzbekistan';
const INSTAGRAM_URL = 'https://www.instagram.com/webi.uz';
const ADMIN_USERNAME = 'https://t.me/sharipoov1';
const PHONE_MAIN = '+998993212122';

const bot = new Telegraf(BOT_TOKEN);
const db = new Database('bilol_bot.db');
db.pragma('journal_mode = WAL');

// ============================================================
// DATABASE
// ============================================================
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    phone TEXT,
    second_phone TEXT,
    language TEXT DEFAULT 'uz',
    subscribed_channel INTEGER DEFAULT 0,
    instagram_confirmed INTEGER DEFAULT 0,
    phone_verified INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    game_played INTEGER DEFAULT 0,
    has_discount INTEGER DEFAULT 0,
    registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    full_name TEXT,
    username TEXT,
    phone TEXT,
    second_phone TEXT,
    service TEXT,
    description TEXT,
    budget TEXT,
    estimated_service TEXT,
    minimum_price TEXT,
    discount TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    rating INTEGER,
    review_text TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    complaint_text TEXT,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS broadcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_type TEXT,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_uz TEXT,
    title_ru TEXT,
    title_en TEXT,
    action TEXT,
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
);
`);

// Default menu
const defaultMenu = [
    ['💻 Bizning ishlar (Portfolio)', '💻 Портфолио проектов', '💻 Portfolio', 'portfolio', 1],
    ['⚙️ Xizmatlar va Narxlar', '⚙️ Услуги и Прайс', '⚙️ Services & Pricing', 'services', 2],
    ['🎮 15% Chegirma o‘yini', '🎮 Игра на скидку 15%', '🎮 Win 15% Discount', 'game', 3],
    ['⭐️ Mijozlar fikri', '⭐️ Отзывы клиентов', '⭐️ Client Reviews', 'reviews', 4],
    ['📞 Biz bilan bog‘lanish', '📞 Контакты', '📞 Contacts', 'contacts', 5],
    ['📝 Shikoyat qoldirish', '📝 Жалоба', '📝 Complaint', 'complaint', 6],
    ['💻 Loyihaga buyurtma', '💻 Заказать проект', '💻 Order Project', 'order', 7],
    ['🌐 Tilni o‘zgartirish', '🌐 Изменить язык', '🌐 Change Language', 'language', 8]
];
const menuCount = db.prepare(`SELECT COUNT(*) AS c FROM menu_items`).get();
if (menuCount.c === 0) {
    const ins = db.prepare(`INSERT INTO menu_items (title_uz,title_ru,title_en,action,sort_order) VALUES (?,?,?,?,?)`);
    const tx = db.transaction(() => { for (const m of defaultMenu) ins.run(...m); });
    tx();
}

// ============================================================
// HELPERS
// ============================================================
const state = new Map();
function getState(userId) {
    if (!state.has(userId)) state.set(userId, {});
    return state.get(userId);
}
function resetTempState(userId) {
    const s = getState(userId);
    ['waitingForName','waitingForOrderDesc','waitingForBudget','waitingForPhone',
     'waitingForSecondPhone','waitingForReview','waitingForComplaint',
     'waitingForAdminPassword','waitingForBroadcast','waitingForMenuTitle',
     'waitingForMenuAction','waitingForChannelPost'].forEach(k => s[k] = false);
}
function now() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
function isAdmin(ctx) { return String(ctx.from?.id) === ADMIN_ID; }

// HTML escape — barcha foydalanuvchi kontenti uchun
function esc(text = '') {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function saveUser(ctx) {
    if (!ctx.from) return;
    const ex = db.prepare(`SELECT id FROM users WHERE id = ?`).get(ctx.from.id);
    if (!ex) {
        db.prepare(`INSERT INTO users (id,first_name,last_name,username,registered_at,last_seen) VALUES (?,?,?,?,?,?)`)
          .run(ctx.from.id, ctx.from.first_name || '', ctx.from.last_name || '', ctx.from.username || '', now(), now());
    } else {
        db.prepare(`UPDATE users SET first_name=?,last_name=?,username=?,last_seen=? WHERE id=?`)
          .run(ctx.from.first_name || '', ctx.from.last_name || '', ctx.from.username || '', now(), ctx.from.id);
    }
}
function updateUser(userId, data) {
    const fields = Object.keys(data);
    if (!fields.length) return;
    const sql = `UPDATE users SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...fields.map(f => data[f]), userId);
}
function getUser(userId) { return db.prepare(`SELECT * FROM users WHERE id=?`).get(userId); }

// ============================================================
// MIDDLEWARE
// ============================================================
bot.use(async (ctx, next) => {
    try {
        if (ctx.from) {
            saveUser(ctx);
            const u = getUser(ctx.from.id);
            if (!isAdmin(ctx) && u && u.is_blocked === 1) {
                return ctx.reply('🚫 Sizning botdan foydalanish imkoniyatingiz vaqtincha cheklangan.').catch(() => {});
            }
        }
        await next();
    } catch (e) {
        console.error('GLOBAL ERROR:', e);
    }
});

// ============================================================
// SUBSCRIPTION
// ============================================================
async function checkChannelSub(userId) {
    try {
        const m = await bot.telegram.getChatMember(TARGET_CHANNEL, userId);
        return ['creator', 'administrator', 'member'].includes(m.status);
    } catch (e) {
        console.log('CHANNEL CHECK:', e.description || e.message);
        return false;
    }
}

function subKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.url('📢 Kanalga obuna bo‘lish', CHANNEL_URL)],
        [Markup.button.url('📸 Instagramni ochish', INSTAGRAM_URL)],
        [Markup.button.callback('🔄 Obunani tekshirish', 'check_sub')],
        [Markup.button.callback('📸 Instagramni tekshirdim', 'insta_confirm')]
    ]);
}

async function requireSubscription(ctx) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    if (user.subscribed_channel === 1 && user.instagram_confirmed === 1) return true;

    const ok = await checkChannelSub(userId);
    if (!ok) {
        await ctx.reply(
            '🚀 <b>BILOL | WEB DEVELOPER</b>\n\n' +
            'Botdan foydalanish uchun avval kanalimizga obuna bo‘ling:\n\n' +
            '📢 Kanal: @webuzbekistan\n' +
            '📸 Instagram: @webi.uz\n\n' +
            'Obuna bo‘lgach, <b>Obunani tekshirish</b> tugmasini bosing 👇',
            { parse_mode: 'HTML', ...subKeyboard() }
        ).catch(() => {});
        return false;
    }
    updateUser(userId, { subscribed_channel: 1 });

    if (user.instagram_confirmed !== 1) {
        await ctx.reply(
            '✅ Kanal obunasi tasdiqlandi!\n\n' +
            '📸 Endi Instagramni ham ochib ko‘ring va <b>Instagramni tekshirdim</b> tugmasini bosing 👇',
            { parse_mode: 'HTML', ...subKeyboard() }
        ).catch(() => {});
        return false;
    }
    return true;
}

// ============================================================
// PHONE REGISTRATION
// ============================================================
function phoneKeyboard() {
    return Markup.keyboard([
        [Markup.button.contactRequest('📱 Telefon raqamimni yuborish')]
    ]).resize().oneTime();
}

async function requestPhone(ctx) {
    const userId = ctx.from.id;
    const u = getUser(userId);
    if (!u.phone_verified) {
        getState(userId).waitingForPhone = true;
        return ctx.reply(
            '📱 <b>Oxirgi qadam</b>\n\n' +
            'Botdan to‘liq foydalanish uchun telefon raqamingizni pastdagi tugma orqali yuboring.\n\n' +
            '⚠️ Raqamni qo‘lda yozish qabul qilinmaydi.',
            { parse_mode: 'HTML', ...phoneKeyboard() }
        );
    }
}

async function ensureAccess(ctx) {
    const sub = await requireSubscription(ctx);
    if (!sub) return false;
    const u = getUser(ctx.from.id);
    if (!u.phone_verified) { await requestPhone(ctx); return false; }
    return true;
}

// ============================================================
// LANGUAGE
// ============================================================
function languageKeyboard() {
    return Markup.inlineKeyboard([[
        Markup.button.callback('🇺🇿 O‘zbekcha', 'lang_uz'),
        Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
        Markup.button.callback('🇬🇧 English', 'lang_en')
    ]]);
}

function getMainMenu(lang = 'uz') {
    const rows = db.prepare(`SELECT * FROM menu_items WHERE active=1 ORDER BY sort_order ASC`).all();
    const titles = rows.map(i => lang === 'ru' ? i.title_ru : lang === 'en' ? i.title_en : i.title_uz);
    const kb = [];
    for (let i = 0; i < titles.length; i += 2) kb.push(titles.slice(i, i + 2));
    return Markup.keyboard(kb).resize();
}

async function showMainMenu(ctx) {
    const user = getUser(ctx.from.id);
    const lang = user?.language || 'uz';
    await ctx.reply(
        '🚀 <b>BILOL | WEB DEVELOPER</b>\n\n' +
        'Biznesingiz uchun zamonaviy raqamli mahsulotlar yaratamiz.\n\n' +
        '💻 Web-saytlar — biznes, landing, korporativ\n' +
        '🛒 Online do‘konlar — E-commerce tizimlari\n' +
        '🤖 Telegram botlar — avtomatlashtirish\n' +
        '🧠 AI yechimlar — aqlli tizimlar\n' +
        '📱 Web ilovalar — maxsus platformalar\n' +
        '🎨 Logo & dizayn — brend yechimlar\n' +
        '✨ Animatsiya — motion dizayn\n\n' +
        '👇 Kerakli bo‘limni tanlang:',
        { parse_mode: 'HTML', ...getMainMenu(lang) }
    );
}

// ============================================================
// START
// ============================================================
bot.start(async ctx => {
    const userId = ctx.from.id;
    resetTempState(userId);
    updateUser(userId, { language: 'uz' });

    if (isAdmin(ctx)) {
        await ctx.reply('👑 <b>Xush kelibsiz, Boss!</b>\n\nAdmin panel: /admin', { parse_mode: 'HTML' });
    }

    const sub = await requireSubscription(ctx);
    if (!sub) return;

    const u = getUser(userId);
    if (!u.phone_verified) { await requestPhone(ctx); return; }

    await showMainMenu(ctx);
});

// ============================================================
// SUBSCRIPTION ACTIONS
// ============================================================
bot.action('check_sub', async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    const ok = await checkChannelSub(ctx.from.id);
    if (!ok) {
        return ctx.reply(
            '❌ Hali kanalga obuna bo‘lmagansiz.\n\n📢 Avval @webuzbekistan kanaliga obuna bo‘ling.',
            subKeyboard()
        );
    }
    updateUser(ctx.from.id, { subscribed_channel: 1 });
    await ctx.reply(
        '✅ Kanal obunasi tasdiqlandi!\n\n📸 Endi Instagramni ochib, <b>Instagramni tekshirdim</b> tugmasini bosing 👇',
        { parse_mode: 'HTML', ...subKeyboard() }
    );
});

bot.action('insta_confirm', async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    const ok = await checkChannelSub(ctx.from.id);
    if (!ok) return ctx.reply('❌ Avval Telegram kanaliga obuna bo‘ling.', subKeyboard());
    updateUser(ctx.from.id, { subscribed_channel: 1, instagram_confirmed: 1 });
    await requestPhone(ctx);
});

// ============================================================
// CONTACT
// ============================================================
bot.on('contact', async ctx => {
    const contact = ctx.message.contact;
    if (!contact?.phone_number) return ctx.reply('❌ Telefon raqami aniqlanmadi.');

    if (contact.user_id && Number(contact.user_id) !== Number(ctx.from.id)) {
        return ctx.reply('❌ Iltimos, faqat o‘zingizning raqamingizni yuboring.');
    }

    const userId = ctx.from.id;
    const s = getState(userId);
    const phone = contact.phone_number.startsWith('+') ? contact.phone_number : '+' + contact.phone_number;

    // Order phone
    if (s.waitingForOrderPhone) {
        s.waitingForOrderPhone = false;
        s.orderPhone = phone;
        return finishOrder(ctx);
    }

    // Registration phone
    if (s.waitingForPhone) {
        updateUser(userId, { phone, phone_verified: 1 });
        s.waitingForPhone = false;
        const u = getUser(userId);

        // Admin notification
        bot.telegram.sendMessage(ADMIN_ID,
            '🆕 <b>YANGI FOYDALANUVCHI</b>\n\n' +
            `👤 ${esc(ctx.from.first_name)} ${esc(ctx.from.last_name || '')}\n` +
            `🔗 @${esc(ctx.from.username || 'yo‘q')}\n` +
            `🆔 <code>${userId}</code>\n` +
            `📞 ${esc(phone)}`,
            { parse_mode: 'HTML' }
        ).catch(() => {});

        if (!u.username) {
            s.waitingForSecondPhone = true;
            return ctx.reply(
                '📞 Telefon raqamingiz qabul qilindi.\n\n' +
                '👤 Telegram username‘ingiz mavjud emas.\n\n' +
                '📱 Iltimos, aloqa uchun <b>qo‘shimcha telefon raqamini</b> ham yuboring.',
                { parse_mode: 'HTML', ...phoneKeyboard() }
            );
        }
        return ctx.reply(
            '✅ <b>Ro‘yxatdan o‘tish yakunlandi!</b>\n\n🚀 Endi botning barcha bo‘limlaridan foydalanishingiz mumkin.',
            { parse_mode: 'HTML', ...getMainMenu(u.language || 'uz') }
        );
    }

    // Second phone
    if (s.waitingForSecondPhone) {
        updateUser(userId, { second_phone: phone });
        s.waitingForSecondPhone = false;
        const u = getUser(userId);
        return ctx.reply(
            '✅ Qo‘shimcha telefon raqami qabul qilindi.\n\n🚀 Endi barcha xizmatlardan foydalanishingiz mumkin.',
            getMainMenu(u.language || 'uz')
        );
    }

    return ctx.reply('📱 Raqamingiz qabul qilindi.');
});

// ============================================================
// LANGUAGE ACTIONS
// ============================================================
bot.action('lang_uz', async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    updateUser(ctx.from.id, { language: 'uz' });
    await ctx.reply('🇺🇿 O‘zbek tili tanlandi.', getMainMenu('uz'));
});
bot.action('lang_ru', async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    updateUser(ctx.from.id, { language: 'ru' });
    await ctx.reply('🇷🇺 Русский язык выбран.', getMainMenu('ru'));
});
bot.action('lang_en', async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    updateUser(ctx.from.id, { language: 'en' });
    await ctx.reply('🇬🇧 English selected.', getMainMenu('en'));
});

bot.hears(['🌐 Tilni o‘zgartirish', '🌐 Изменить язык', '🌐 Change Language'], async ctx => {
    if (!(await ensureAccess(ctx))) return;
    await ctx.reply('🌐 <b>Tilni tanlang:</b>', { parse_mode: 'HTML', ...languageKeyboard() });
});

// ============================================================
// PORTFOLIO
// ============================================================
bot.hears(['💻 Bizning ishlar (Portfolio)', '💻 Портфолио проектов', '💻 Portfolio'], async ctx => {
    if (!(await ensureAccess(ctx))) return;

    const kb = Markup.inlineKeyboard([
        [Markup.button.url('🌐 HumoGarden.uz', 'https://humogarden.uz')],
        [Markup.button.url('🌐 Portfolio 01', 'https://glittery-rugelach-e63860.netlify.app/')],
        [Markup.button.url('🌐 Portfolio 02', 'https://fastidious-dieffenbachia-94b656.netlify.app/')],
        [Markup.button.url('🌐 Portfolio 03', 'https://magenta-blini-956248.netlify.app/')],
        [Markup.button.url('🌐 Portfolio 04', 'https://heartfelt-manatee-645764.netlify.app/')],
        [Markup.button.url('🌐 Portfolio 05', 'https://harmonious-halva-0fe592.netlify.app/')],
        [Markup.button.url('🌐 Portfolio 06', 'https://fastidious-starburst-7aa5e3.netlify.app/')]
    ]);

    await ctx.reply(
        '💻 <b>BILOL | WEB DEVELOPER — PORTFOLIO</b>\n\n' +
        'Biz amalga oshirgan loyihalar bilan tanishing.\n\n' +
        '👇 Loyihani tanlang va saytni to‘g‘ridan-to‘g‘ri oching:',
        { parse_mode: 'HTML', ...kb }
    );
});

// ============================================================
// SERVICES
// ============================================================
const services = {
    landing:   { title: '🚀 Landing Page',       desc: 'Sotuvchi, zamonaviy biznes sayti',   price: 500000,  usd: '$40',  duration: '2–4 kun' },
    shop:      { title: '🛒 E-Commerce',         desc: 'Online do‘kon va buyurtma tizimi',   price: 1200000, usd: '$100', duration: '7–10 kun' },
    corporate: { title: '🏢 Korporativ veb-sayt',desc: 'Kompaniya uchun professional sayt',  price: 800000,  usd: '$65',  duration: '3–5 kun' },
    bot:       { title: '🤖 Telegram Bot',       desc: 'Biznes bot va avtomatlashtirish',    price: 400000,  usd: '$30',  duration: '2–5 kun' },
    webapp:    { title: '📱 Web Application',    desc: 'Murakkab veb-ilova va platforma',    price: 2000000, usd: '$160', duration: '10–15 kun' },
    ai:        { title: '🧠 AI yechim',          desc: 'AI botlar va aqlli tizimlar',        price: 1500000, usd: '$120', duration: '5–15 kun' },
    design:    { title: '🎨 Logo & Dizayn',      desc: 'Brend va vizual dizayn',             price: 300000,  usd: '$25',  duration: '1–3 kun' },
    animation: { title: '✨ Animatsiya',         desc: 'Logo, reklama va motion dizayn',     price: 500000,  usd: '$40',  duration: '2–5 kun' }
};

function servicesKeyboard() {
    const rows = Object.keys(services).map(k => [Markup.button.callback(services[k].title, `service_${k}`)]);
    return Markup.inlineKeyboard(rows);
}

bot.hears(['⚙️ Xizmatlar va Narxlar', '⚙️ Услуги и Прайс', '⚙️ Services & Pricing'], async ctx => {
    if (!(await ensureAccess(ctx))) return;

    await ctx.reply(
        '🛠 <b>BILOL | WEB DEVELOPER — PROFESSIONAL XIZMATLAR</b>\n\n' +
        'Biznesingiz uchun zamonaviy raqamli mahsulotlar yaratamiz.\n\n' +
        '💻 Web-saytlar  •  🛒 Online do‘konlar\n' +
        '🤖 Telegram botlar  •  🧠 AI yechimlar\n' +
        '📱 Web ilovalar  •  🎨 Logo & dizayn\n' +
        '✨ Animatsiya\n\n' +
        '💡 <b>Muhim:</b> Yakuniy narx loyiha murakkabligiga qarab o‘zaro kelishiladi.\n\n' +
        '📌 <b>To‘lov:</b> barcha loyihalarda 50% oldindan to‘lov.\n\n' +
        '👇 Xizmat turini tanlang:',
        { parse_mode: 'HTML', ...servicesKeyboard() }
    );
});

bot.action(/^service_(.+)$/, async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    if (!(await ensureAccess(ctx))) return;
    const type = ctx.match[1];
    const s = services[type];
    if (!s) return;

    await ctx.reply(
        `<b>${s.title}</b>\n\n` +
        `💡 ${esc(s.desc)}\n\n` +
        `💰 <b>Narxi:</b> ${s.price.toLocaleString('uz-UZ')} so‘m (${s.usd}) dan boshlanadi.\n` +
        `⏱ <b>Muddat:</b> ${s.duration}\n\n` +
        '🤝 Yakuniy narx loyiha talablariga qarab kelishiladi.\n' +
        '📌 50% oldindan to‘lov.\n\n' +
        'Buyurtma bermoqchimisiz?',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('✅ Shu xizmatga buyurtma', `order_service_${type}`)]])
        }
    );
});

// ============================================================
// ORDER
// ============================================================
function agreementKeyboard() {
    return Markup.inlineKeyboard([[
        Markup.button.callback('✅ Roziman', 'agree_yes'),
        Markup.button.callback('❌ Bekor qilish', 'agree_no')
    ]]);
}

async function askAgreement(ctx) {
    await ctx.reply(
        '🤝 <b>BUYURTMA SHARTLARI</b>\n\n' +
        'Barcha loyihalar uchun <b>50% oldindan to‘lov</b> amalga oshiriladi.\n\n' +
        'Qolgan narx va yakuniy summa loyiha talablariga qarab o‘zaro kelishiladi.\n\n' +
        'Ushbu shartga rozimisiz?',
        { parse_mode: 'HTML', ...agreementKeyboard() }
    );
}

bot.hears(['💻 Loyihaga buyurtma', '💻 Заказать проект', '💻 Order Project'], async ctx => {
    if (!(await ensureAccess(ctx))) return;
    getState(ctx.from.id).pendingService = 'Umumiy murojaat';
    await askAgreement(ctx);
});

bot.action(/^order_service_(.+)$/, async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    if (!(await ensureAccess(ctx))) return;
    const type = ctx.match[1];
    if (!services[type]) return;
    getState(ctx.from.id).pendingService = type;
    await askAgreement(ctx);
});

bot.action('agree_no', async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    resetTempState(ctx.from.id);
    await ctx.editMessageText('❌ Buyurtma jarayoni bekor qilindi.').catch(() => {});
});

bot.action('agree_yes', async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    const s = getState(ctx.from.id);
    s.agreed = true;
    s.waitingForName = true;
    await ctx.editMessageText(
        '✅ <b>Rozilik qabul qilindi!</b>\n\n' +
        '🚀 Ajoyib tanlov.\n\n' +
        '📝 Iltimos, ism va familiyangizni to‘liq kiriting.\n\n' +
        'Masalan: <b>Alisherbek Usmonov</b>',
        { parse_mode: 'HTML' }
    ).catch(() => {});
});

// ============================================================
// SERVICE DETECT
// ============================================================
function detectService(text) {
    const t = text.toLowerCase();

    if (/(ilova|app|web app|veb.?ilova)/.test(t))
        return { type: 'webapp', title: 'Murakkab veb-ilova (Web Application)', price: 2000000, usd: '$160' };
    if (/(do[‘'`]?kon|magazin|shop|savdo|market|uzum)/.test(t))
        return { type: 'shop', title: 'Onlayn do‘kon (E-Commerce)', price: 1200000, usd: '$100' };
    if (/(bank|moliya|fintech|kredit)/.test(t))
        return { type: 'webapp', title: 'Bank va Moliya tizimi', price: 2500000, usd: '$200' };
    if (/(taksi|taxi|logistika|dostavka|yetkazib)/.test(t))
        return { type: 'landing', title: 'Taksi / Logistika tizimi', price: 800000, usd: '$65' };
    if (/(telegram bot|\bbot\b|telegram)/.test(t))
        return { type: 'bot', title: 'Telegram bot va avtomatlashtirish', price: 400000, usd: '$30' };
    if (/(\bai\b|sun.?iy intellekt|sun'iy intellekt)/.test(t))
        return { type: 'ai', title: 'AI yechim', price: 1500000, usd: '$120' };
    if (/(logo|dizayn|design)/.test(t))
        return { type: 'design', title: 'Logo & Dizayn', price: 300000, usd: '$25' };
    if (/(animatsiya|motion)/.test(t))
        return { type: 'animation', title: 'Animatsiya / Motion Design', price: 500000, usd: '$40' };
    if (/(sayt|site|landing|veb|web|katalog|korporativ)/.test(t))
        return { type: 'landing', title: 'Landing Page / Veb-sayt', price: 500000, usd: '$40' };

    return null;
}

// ============================================================
// TEXT HANDLER
// ============================================================
bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const s = getState(userId);

    // Admin password
    if (isAdmin(ctx) && s.waitingForAdminPassword) {
        if (text === ADMIN_PASSWORD) {
            s.waitingForAdminPassword = false;
            return showAdminPanel(ctx);
        }
        return ctx.reply('❌ Parol noto‘g‘ri. Qaytadan kiriting:');
    }

    // Admin broadcast
    if (isAdmin(ctx) && s.waitingForBroadcast) {
        return processBroadcast(ctx);
    }

    // Admin channel post
    if (isAdmin(ctx) && s.waitingForChannelPost) {
        return processChannelPost(ctx);
    }

    // Order name
    if (s.waitingForName) {
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length < 2 || text.length < 5) {
            return ctx.reply('❌ <b>Ism va familiya to‘liq bo‘lishi kerak!</b>\n\nMasalan: <b>Alisherbek Usmonov</b>', { parse_mode: 'HTML' });
        }
        s.clientFullName = text;
        s.waitingForName = false;
        s.waitingForOrderDesc = true;
        return ctx.reply(
            '🎯 <b>Ajoyib!</b>\n\n' +
            'Endi nima buyurtma qilmoqchi ekaningizni va loyiha haqida batafsil yozing.\n\n' +
            'Masalan: <i>"Taksi xizmati uchun buyurtma sayti kerak"</i>',
            { parse_mode: 'HTML' }
        );
    }

    // Order description
    if (s.waitingForOrderDesc) {
        if (text.length < 4) return ctx.reply('❌ Loyiha haqida batafsilroq yozing.');

        const detected = detectService(text);
        if (!detected) {
            s.waitingForOrderDesc = false;
            return ctx.reply(
                '❌ <b>Kechirasiz, bu yo‘nalish bo‘yicha tayyor xizmat turi topilmadi.</b>\n\n' +
                'Batafsil ma’lumot va narxni kelishish uchun admin bilan bog‘laning 👇',
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([[Markup.button.url('💬 Admin bilan bog‘lanish', ADMIN_USERNAME)]])
                }
            );
        }

        s.detectedService = detected;
        s.orderDescription = text;
        s.waitingForOrderDesc = false;
        s.waitingForBudget = true;

        return ctx.reply(
            '💡 <b>Tushunarli!</b>\n\n' +
            `📌 <b>${esc(detected.title)}</b>\n\n` +
            `💰 Bunday loyiha narxi <b>${detected.price.toLocaleString('uz-UZ')} so‘m (${detected.usd})</b> dan boshlanadi.\n\n` +
            '⚠️ Budjetingiz ushbu summadan kam bo‘lmasligi kerak.\n\n' +
            '💰 Ushbu loyiha uchun ajratgan budjetingiz qancha?\n\n' +
            'Masalan: <b>2 000 000</b>',
            { parse_mode: 'HTML' }
        );
    }

    // Budget
    if (s.waitingForBudget) {
        const clean = text.replace(/[^\d]/g, '');
        if (!clean) return ctx.reply('❌ Budjetni aniq raqam bilan kiriting.\n\nMasalan: 2 000 000');

        const amount = Number(clean);
        const min = s.detectedService?.price || 0;

        if (amount < min) {
            return ctx.reply(
                '❌ <b>Budjet minimal summadan kam!</b>\n\n' +
                `📌 Minimal narx: <b>${min.toLocaleString('uz-UZ')} so‘m</b>\n\n` +
                `Iltimos, ${min.toLocaleString('uz-UZ')} so‘mdan kam bo‘lmagan budjet kiriting.`,
                { parse_mode: 'HTML' }
            );
        }

        s.clientBudget = text;
        s.waitingForBudget = false;
        s.waitingForOrderPhone = true;

        return ctx.reply(
            '📞 <b>Ajoyib! Oxirgi qadam.</b>\n\n' +
            'Aloqa uchun telefon raqamingizni pastdagi tugma orqali yuboring.\n\n' +
            '⚠️ Telefonni qo‘lda yozish qabul qilinmaydi.',
            { parse_mode: 'HTML', ...phoneKeyboard() }
        );
    }

    // Review
    if (s.waitingForReview) {
        s.waitingForReview = false;
        db.prepare(`INSERT INTO reviews (user_id, rating, review_text) VALUES (?,?,?)`)
          .run(userId, s.reviewRating || 5, text);

        bot.telegram.sendMessage(ADMIN_ID,
            '⭐️ <b>YANGI MIJOZ FIKRI</b>\n\n' +
            `👤 ${esc(ctx.from.first_name)}\n` +
            `🔗 @${esc(ctx.from.username || 'yo‘q')}\n` +
            `🆔 <code>${userId}</code>\n` +
            `⭐️ Baho: ${s.reviewRating || 5}/5\n\n` +
            `📝 ${esc(text)}`,
            { parse_mode: 'HTML' }
        ).catch(() => {});

        return ctx.reply('✅ Fikringiz saqlandi.\n\n❤️ Rahmat! Biz uchun mijozlar fikri juda muhim.');
    }

    // Complaint
    if (s.waitingForComplaint) {
        s.waitingForComplaint = false;
        db.prepare(`INSERT INTO complaints (user_id, complaint_text) VALUES (?,?)`).run(userId, text);

        bot.telegram.sendMessage(ADMIN_ID,
            '🚨 <b>YANGI SHIKOYAT</b>\n\n' +
            `👤 ${esc(ctx.from.first_name)}\n` +
            `🔗 @${esc(ctx.from.username || 'yo‘q')}\n` +
            `🆔 <code>${userId}</code>\n\n` +
            `📝 ${esc(text)}`,
            { parse_mode: 'HTML' }
        ).catch(() => {});

        return ctx.reply('✅ Shikoyatingiz adminga yuborildi.');
    }

    return next();
});

// ============================================================
// FINISH ORDER
// ============================================================
async function finishOrder(ctx) {
    const userId = ctx.from.id;
    const s = getState(userId);
    const user = getUser(userId);

    const phone = s.orderPhone || user.phone || '';
    const service = s.pendingService || 'Umumiy murojaat';
    const detected = s.detectedService;
    const discount = user.has_discount ? '🎁 15% chegirma BOR' : 'Chegirma yo‘q';

    const result = db.prepare(`
        INSERT INTO orders
        (user_id, full_name, username, phone, second_phone, service, description,
         budget, estimated_service, minimum_price, discount)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
        userId,
        s.clientFullName || `${user.first_name} ${user.last_name || ''}`.trim(),
        user.username || '',
        phone,
        user.second_phone || '',
        service,
        s.orderDescription || '',
        s.clientBudget || '',
        detected?.title || '',
        detected?.price ? `${detected.price.toLocaleString('uz-UZ')} so‘m` : '',
        discount
    );

    const adminText =
        '🚨 <b>BILOL | WEB DEVELOPER — YANGI BUYURTMA</b>\n\n' +
        `📦 <b>Order ID:</b> #${result.lastInsertRowid}\n\n` +
        `👤 <b>F.I.O:</b> ${esc(s.clientFullName || '')}\n` +
        `📞 <b>Tel:</b> ${esc(phone)}\n` +
        `📱 <b>Qo‘shimcha tel:</b> ${esc(user.second_phone || 'Yo‘q')}\n` +
        `🔗 <b>Username:</b> @${esc(user.username || 'mavjud_emas')}\n` +
        `🆔 <b>Telegram ID:</b> <code>${userId}</code>\n\n` +
        `📌 <b>Xizmat:</b> ${esc(detected?.title || service)}\n` +
        `📝 <b>Buyurtma:</b>\n${esc(s.orderDescription || '')}\n\n` +
        `💰 <b>Mijoz budjeti:</b> ${esc(s.clientBudget || '')}\n` +
        `💵 <b>Minimal narx:</b> ${detected?.price ? detected.price.toLocaleString('uz-UZ') + ' so‘m' : 'Kelishiladi'}\n\n` +
        `🏷 <b>Aksiya:</b> ${esc(discount)}\n\n` +
        '✅ 50% oldindan to‘lov shartiga rozilik berilgan.';

    await bot.telegram.sendMessage(ADMIN_ID, adminText, { parse_mode: 'HTML' }).catch(() => {});

    // Reset
    Object.assign(s, {
        pendingService: null, clientFullName: null, orderDescription: null,
        clientBudget: null, detectedService: null, orderPhone: null, waitingForOrderPhone: false
    });

    await ctx.reply(
        '🎉 <b>Buyurtmangiz qabul qilindi!</b>\n\n' +
        `📦 Buyurtma raqami: <b>#${result.lastInsertRowid}</b>\n\n` +
        'Rahmat! Ma’lumotlaringiz adminga yuborildi.\n' +
        'Mutaxassisimiz siz bilan bog‘lanadi. 🚀',
        { parse_mode: 'HTML', ...getMainMenu(user.language || 'uz') }
    );
}

// ============================================================
// REVIEWS
// ============================================================
bot.hears(['⭐️ Mijozlar fikri', '⭐️ Отзывы клиентов', '⭐️ Client Reviews'], async ctx => {
    if (!(await ensureAccess(ctx))) return;

    await ctx.reply(
        '⭐️ <b>MIJOZLAR FIKRI</b>\n\n' +
        'Biz bilan ishlagan mijozlarning fikrlari.\n\n' +
        'Siz ham baho qoldirishingiz mumkin 👇',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('⭐️ 1', 'review_1'),
                    Markup.button.callback('⭐️ 2', 'review_2'),
                    Markup.button.callback('⭐️ 3', 'review_3')
                ],
                [
                    Markup.button.callback('⭐️ 4', 'review_4'),
                    Markup.button.callback('⭐️ 5', 'review_5')
                ]
            ])
        }
    );
});

bot.action(/^review_([1-5])$/, async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    const rating = Number(ctx.match[1]);
    const s = getState(ctx.from.id);
    s.reviewRating = rating;
    s.waitingForReview = true;
    await ctx.reply(
        `⭐️ Siz <b>${rating}/5</b> baho berdingiz.\n\n✍️ Endi fikringizni yozib qoldiring:`,
        { parse_mode: 'HTML' }
    );
});

// ============================================================
// COMPLAINT
// ============================================================
bot.hears(['📝 Shikoyat qoldirish', '📝 Жалоба', '📝 Complaint'], async ctx => {
    if (!(await ensureAccess(ctx))) return;
    getState(ctx.from.id).waitingForComplaint = true;
    await ctx.reply(
        '📝 <b>SHIKOYAT / TAKLIF</b>\n\n' +
        'Muammo yoki taklifingizni batafsil yozing.\n\n' +
        'Xabaringiz to‘g‘ridan-to‘g‘ri adminga yuboriladi.',
        { parse_mode: 'HTML' }
    );
});

// ============================================================
// GAME 15% (1 marta)
// ============================================================
bot.hears(['🎮 15% Chegirma o‘yini', '🎮 Игра на скидку 15%', '🎮 Win 15% Discount'], async ctx => {
    if (!(await ensureAccess(ctx))) return;

    const user = getUser(ctx.from.id);
    if (user.game_played) {
        return ctx.reply(
            '⚠️ Siz bu o‘yinda allaqachon qatnashgansiz.\n\n🎁 Faqat <b>1 ta imkoniyat</b> beriladi.',
            { parse_mode: 'HTML' }
        );
    }

    const winningBox = Math.floor(Math.random() * 3) + 1;
    getState(ctx.from.id).winningBox = winningBox;

    await ctx.reply(
        '🎮 <b>AKSIYALI OMAD O‘YINI</b>\n\n' +
        '📢 Kanalimizga obuna bo‘lganingiz uchun sizga <b>15% chegirma</b> yutib olish imkoniyati berildi! 🎁\n\n' +
        '3 ta sirli qutidan birini tanlang.\n\n' +
        '🏆 Yutuq: <b>15% chegirma</b>\n' +
        '🔒 Imkoniyat: <b>1 marta</b>',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[
                Markup.button.callback('🎁 1-Quti', 'game_1'),
                Markup.button.callback('🎁 2-Quti', 'game_2'),
                Markup.button.callback('🎁 3-Quti', 'game_3')
            ]])
        }
    );
});

bot.action(/^game_([1-3])$/, async ctx => {
    await ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    const user = getUser(userId);
    const s = getState(userId);

    if (user.game_played) return ctx.reply('⚠️ Siz allaqachon o‘ynagansiz.');

    updateUser(userId, { game_played: 1 });
    const choice = Number(ctx.match[1]);

    if (choice === s.winningBox) {
        updateUser(userId, { has_discount: 1 });
        return ctx.reply(
            '🎉 <b>TABRIKLAYMIZ!</b>\n\n' +
            '🏆 Siz <b>15% CHEGIRMA</b> yutdingiz!\n\n' +
            '🎁 Promokod:\n<code>BILOL15</code>\n\n' +
            'Buyurtma berishda ushbu kodni ayting.',
            { parse_mode: 'HTML' }
        );
    }

    return ctx.reply(
        `😢 Afsus, bu safar yutuq chiqmadi.\n\n` +
        `Sizning tanlovingiz: ${choice}-quti.\n` +
        `🎁 Yutuqli quti: ${s.winningBox}-quti edi.\n\n` +
        '⚠️ O‘yin imkoniyati 1 marta edi.'
    );
});

// ============================================================
// CONTACTS
// ============================================================
bot.hears(['📞 Biz bilan bog‘lanish', '📞 Контакты', '📞 Contacts'], async ctx => {
    if (!(await ensureAccess(ctx))) return;

    await ctx.reply(
        '📞 <b>BIZ BILAN BOG‘LANISH</b>\n\n' +
        '📢 <b>Telegram kanal:</b>\n@webuzbekistan\n\n' +
        '📸 <b>Instagram:</b>\n@webi.uz\n\n' +
        '💬 <b>Shaxsiy aloqa:</b>\n@sharipoov1\n\n' +
        `📱 <b>Telefon:</b>\n${PHONE_MAIN}\n\n` +
        '🚀 Biznesingiz uchun raqamli yechim kerak bo‘lsa, biz bilan bog‘laning.',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.url('📢 Telegram kanal', CHANNEL_URL)],
                [Markup.button.url('📸 Instagram', INSTAGRAM_URL)],
                [Markup.button.url('💬 Telegram orqali bog‘lanish', ADMIN_USERNAME)]
            ])
        }
    );
});

// ============================================================
// ADMIN PANEL
// ============================================================
bot.command('admin', async ctx => {
    if (!isAdmin(ctx)) return;
    getState(ctx.from.id).waitingForAdminPassword = true;
    await ctx.reply('🔐 <b>ADMIN PANEL</b>\n\nMaxfiy parolni kiriting:', { parse_mode: 'HTML' });
});

function adminKeyboard() {
    return Markup.inlineKeyboard([
        [Markup.button.callback('📊 Statistika', 'adm_stats')],
        [Markup.button.callback('👥 Foydalanuvchilar', 'adm_users')],
        [Markup.button.callback('🚨 Buyurtmalar', 'adm_orders')],
        [Markup.button.callback('📝 Shikoyatlar', 'adm_complaints')],
        [Markup.button.callback('⭐️ Sharhlar', 'adm_reviews')],
        [Markup.button.callback('📢 Reklama tarqatish', 'adm_broadcast')],
        [Markup.button.callback('📣 Kanalga post joylash', 'adm_channel_post')],
        [Markup.button.callback('🧹 Bloklanganlarni tozalash', 'adm_clean')],
        [Markup.button.callback('➕ Menyu boshqaruvi', 'adm_menu')]
    ]);
}

async function showAdminPanel(ctx) {
    await ctx.reply(
        '🛡 <b>BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER</b>\n\n' +
        '┏ Xavfsizlik: <code>100% Protected</code>\n' +
        '┣ Tizim: <code>Barqaror / Ishlayapti ⚡️</code>\n' +
        '┣ Database: <code>SQLite / Persistent</code>\n' +
        '┗ Boshqaruv: 👇',
        { parse_mode: 'HTML', ...adminKeyboard() }
    );
}

// ============================================================
// ADMIN STATS
// ============================================================
bot.action('adm_stats', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});

    const count = (sql) => db.prepare(sql).get().count;

    const total = count(`SELECT COUNT(*) AS count FROM users`);
    const active = count(`SELECT COUNT(*) AS count FROM users WHERE is_blocked=0`);
    const blocked = count(`SELECT COUNT(*) AS count FROM users WHERE is_blocked=1`);
    const orders = count(`SELECT COUNT(*) AS count FROM orders`);
    const newOrders = count(`SELECT COUNT(*) AS count FROM orders WHERE status='new'`);
    const complaints = count(`SELECT COUNT(*) AS count FROM complaints`);
    const newComplaints = count(`SELECT COUNT(*) AS count FROM complaints WHERE status='new'`);
    const reviews = count(`SELECT COUNT(*) AS count FROM reviews`);
    const games = count(`SELECT COUNT(*) AS count FROM users WHERE game_played=1`);
    const winners = count(`SELECT COUNT(*) AS count FROM users WHERE has_discount=1`);

    await ctx.editMessageText(
        '📊 <b>BILOL | REAL STATISTIKA</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '👥 <b>FOYDALANUVCHILAR</b>\n\n' +
        `👥 Jami: <code>${total}</code>\n` +
        `🟢 Aktiv: <code>${active}</code>\n` +
        `🚫 Bloklangan: <code>${blocked}</code>\n\n` +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '📦 <b>BUYURTMALAR</b>\n\n' +
        `📦 Jami: <code>${orders}</code>\n` +
        `🆕 Yangi: <code>${newOrders}</code>\n\n` +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '📝 <b>SHIKOYATLAR</b>\n\n' +
        `📝 Jami: <code>${complaints}</code>\n` +
        `🚨 Yangi: <code>${newComplaints}</code>\n\n` +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '⭐️ <b>SHARHLAR</b>\n\n' +
        `⭐️ Jami: <code>${reviews}</code>\n\n` +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '🎮 <b>AKSIYA O‘YINI</b>\n\n' +
        `🎮 O‘ynagan: <code>${games}</code>\n` +
        `🎁 Chegirma olgan: <code>${winners}</code>\n\n` +
        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '💾 Ma’lumotlar real SQLite bazadan olinmoqda.',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Admin panel', 'adm_back')]])
        }
    ).catch(() => {});
});

// ============================================================
// ADMIN USERS
// ============================================================
bot.action('adm_users', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});

    const users = db.prepare(`SELECT * FROM users ORDER BY last_seen DESC`).all();
    if (!users.length) return ctx.reply('👥 Hali foydalanuvchilar yo‘q.');

    await ctx.reply(`👥 <b>FOYDALANUVCHILAR — ${users.length} TA</b>\n\nQuyidagilarni boshqaring:`, { parse_mode: 'HTML' });

    for (const u of users.slice(0, 50)) {
        const status = u.is_blocked ? '🔴 BLOKLANGAN' : '🟢 FAOL';
        await ctx.reply(
            '👤 <b>FOYDALANUVCHI</b>\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            `👤 <b>Ism:</b> ${esc(`${u.first_name || ''} ${u.last_name || ''}`.trim())}\n` +
            `🔗 <b>Username:</b> @${esc(u.username || 'yo‘q')}\n` +
            `🆔 <b>Telegram ID:</b> <code>${u.id}</code>\n` +
            `📞 <b>Telefon:</b> ${esc(u.phone || 'Yo‘q')}\n` +
            `📱 <b>Qo‘shimcha:</b> ${esc(u.second_phone || 'Yo‘q')}\n` +
            `🕐 <b>Ro‘yxatdan:</b> <code>${u.registered_at}</code>\n` +
            `🕐 <b>Oxirgi faollik:</b> <code>${u.last_seen}</code>\n` +
            `📊 <b>Status:</b> ${status}`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[
                    u.is_blocked
                        ? Markup.button.callback('🟢 Blockdan chiqarish', `unblock_${u.id}`)
                        : Markup.button.callback('🚫 Block qilish', `block_${u.id}`)
                ]])
            }
        );
    }
});

bot.action(/^block_(\d+)$/, async ctx => {
    if (!isAdmin(ctx)) return;
    const id = Number(ctx.match[1]);
    updateUser(id, { is_blocked: 1 });
    await ctx.answerCbQuery('Bloklandi.').catch(() => {});
    await ctx.reply(`🚫 Foydalanuvchi <code>${id}</code> bloklandi.`, { parse_mode: 'HTML' });
});

bot.action(/^unblock_(\d+)$/, async ctx => {
    if (!isAdmin(ctx)) return;
    const id = Number(ctx.match[1]);
    updateUser(id, { is_blocked: 0 });
    await ctx.answerCbQuery('Blokdan chiqarildi.').catch(() => {});
    await ctx.reply(`🟢 Foydalanuvchi <code>${id}</code> blokdan chiqarildi.`, { parse_mode: 'HTML' });
});

// ============================================================
// ADMIN ORDERS
// ============================================================
bot.action('adm_orders', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    const orders = db.prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT 20`).all();
    if (!orders.length) return ctx.reply('📦 Hali buyurtmalar mavjud emas.');

    for (const o of orders) {
        await ctx.reply(
            `📦 <b>BUYURTMA #${o.id}</b>\n\n` +
            `👤 ${esc(o.full_name || '')}\n` +
            `📞 ${esc(o.phone || '')}\n` +
            `🔗 @${esc(o.username || 'yo‘q')}\n` +
            `📌 ${esc(o.estimated_service || o.service || '')}\n` +
            `💰 ${esc(o.budget || '')}\n` +
            `📊 Status: ${esc(o.status)}\n` +
            `🕐 ${o.created_at}`,
            { parse_mode: 'HTML' }
        );
    }
});

// ============================================================
// ADMIN COMPLAINTS
// ============================================================
bot.action('adm_complaints', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    const list = db.prepare(`SELECT * FROM complaints ORDER BY id DESC LIMIT 20`).all();
    if (!list.length) return ctx.reply('📝 Hali shikoyatlar yo‘q.');

    for (const c of list) {
        await ctx.reply(
            `🚨 <b>SHIKOYAT #${c.id}</b>\n\n` +
            `👤 User ID: <code>${c.user_id}</code>\n` +
            `📊 Status: ${esc(c.status)}\n\n` +
            `📝 ${esc(c.complaint_text)}\n\n` +
            `🕐 ${c.created_at}`,
            { parse_mode: 'HTML' }
        );
    }
});

// ============================================================
// ADMIN REVIEWS
// ============================================================
bot.action('adm_reviews', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    const list = db.prepare(`SELECT * FROM reviews ORDER BY id DESC LIMIT 20`).all();
    if (!list.length) return ctx.reply('⭐️ Hali sharhlar yo‘q.');

    for (const r of list) {
        await ctx.reply(
            `⭐️ <b>SHARH #${r.id}</b>\n\n` +
            `👤 User: <code>${r.user_id}</code>\n` +
            `⭐️ Baho: ${r.rating}/5\n\n` +
            `📝 ${esc(r.review_text)}\n\n` +
            `🕐 ${r.created_at}`,
            { parse_mode: 'HTML' }
        );
    }
});

// ============================================================
// ADMIN BROADCAST
// ============================================================
bot.action('adm_broadcast', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    getState(ctx.from.id).waitingForBroadcast = true;

    await ctx.reply(
        '📢 <b>UNIVERSAL REKLAMA TARQATISH</b>\n\n' +
        'Endi reklama xabarini yuboring.\n\n' +
        '📝 Oddiy matn\n🖼 Rasm + caption\n📹 Video\n📄 Document\n🎵 Audio\n🎬 GIF\n\n' +
        'Xabar botdan foydalanayotgan barcha foydalanuvchilarga yuboriladi.\n\n' +
        '⚠️ Bloklaganlarga yetib bormaydi.',
        { parse_mode: 'HTML' }
    );
});

async function processBroadcast(ctx) {
    const s = getState(ctx.from.id);
    s.waitingForBroadcast = false;

    const users = db.prepare(`SELECT id FROM users WHERE is_blocked=0`).all();
    await ctx.reply(`⏳ Reklama ${users.length} ta foydalanuvchiga yuborilmoqda...`);

    let success = 0, failed = 0;
    for (const u of users) {
        try {
            await ctx.telegram.copyMessage(u.id, ctx.chat.id, ctx.message.message_id);
            success++;
        } catch (e) {
            failed++;
            const d = e.description || '';
            if (d.includes('blocked') || d.includes('chat not found') || d.includes('deactivated')) {
                updateUser(u.id, { is_blocked: 1 });
            }
        }
    }

    const type = ctx.message.photo ? 'photo' : ctx.message.video ? 'video'
        : ctx.message.document ? 'document' : ctx.message.audio ? 'audio'
        : ctx.message.animation ? 'animation' : 'text';

    db.prepare(`INSERT INTO broadcasts (message_type,success_count,fail_count) VALUES (?,?,?)`)
      .run(type, success, failed);

    await ctx.reply(
        '✅ <b>REKLAMA TARQATISH YAKUNLANDI</b>\n\n' +
        `📤 Yetib bordi: <code>${success}</code>\n` +
        `⚠️ Yetib bormadi: <code>${failed}</code>`,
        { parse_mode: 'HTML' }
    );
}

// ============================================================
// ADMIN CHANNEL POST
// ============================================================
bot.action('adm_channel_post', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    getState(ctx.from.id).waitingForChannelPost = true;

    await ctx.reply(
        '📣 <b>KANALGA POST JOYLASH</b>\n\n' +
        `Endi postni yuboring. U to‘g‘ridan-to‘g‘ri <b>${esc(TARGET_CHANNEL)}</b> kanaliga joylanadi.\n\n` +
        '📝 Matn\n🖼 Rasm + caption\n📹 Video\n📄 Document\n🎬 GIF\n\n' +
        '⚠️ Bot kanalda <b>admin</b> bo‘lishi kerak!',
        { parse_mode: 'HTML' }
    );
});

async function processChannelPost(ctx) {
    const s = getState(ctx.from.id);
    s.waitingForChannelPost = false;

    try {
        await ctx.telegram.copyMessage(TARGET_CHANNEL, ctx.chat.id, ctx.message.message_id);
        await ctx.reply(
            `✅ Post muvaffaqiyatli <b>${esc(TARGET_CHANNEL)}</b> kanaliga joylandi!`,
            { parse_mode: 'HTML' }
        );
    } catch (e) {
        console.error('CHANNEL POST ERROR:', e.message);
        await ctx.reply(
            '❌ Kanalga joylashda xatolik!\n\n' +
            'Sabablari:\n' +
            '• Bot kanalda admin emas\n' +
            '• Kanal username noto‘g‘ri\n' +
            '• Bot huquqlari yetarli emas\n\n' +
            `Xatolik: <code>${esc(e.description || e.message)}</code>`,
            { parse_mode: 'HTML' }
        );
    }
}

// ============================================================
// CLEAN BLOCKED
// ============================================================
bot.action('adm_clean', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});

    const users = db.prepare(`SELECT id FROM users WHERE is_blocked=0`).all();
    let active = 0, removed = 0;
    await ctx.reply('⏳ Foydalanuvchilar tekshirilmoqda...');

    for (const u of users) {
        try {
            await ctx.telegram.sendChatAction(u.id, 'typing');
            active++;
        } catch (e) {
            removed++;
            updateUser(u.id, { is_blocked: 1 });
        }
    }

    await ctx.reply(
        '🧹 <b>TOZALASH YAKUNLANDI</b>\n\n' +
        `🟢 Faol: <code>${active}</code>\n` +
        `🔴 Bloklangan: <code>${removed}</code>`,
        { parse_mode: 'HTML' }
    );
});

// ============================================================
// ADMIN MENU MANAGEMENT
// ============================================================
bot.action('adm_menu', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});

    await ctx.reply(
        '➕ <b>MENYU BOSHQARUVI</b>\n\nBot menyusini shu yerdan boshqarish mumkin.',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 Menyuni ko‘rish', 'menu_list')],
                [Markup.button.callback('➕ Yangi menyu qo‘shish', 'menu_add')],
                [Markup.button.callback('🔄 Menyuni yangilash', 'menu_refresh')]
            ])
        }
    );
});

bot.action('menu_list', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    const menus = db.prepare(`SELECT * FROM menu_items ORDER BY sort_order`).all();
    let text = '📋 <b>BOT MENYUSI</b>\n\n';
    for (const m of menus) {
        text += `#${m.id}  ${m.active ? '🟢' : '🔴'} ${esc(m.title_uz)}\n` +
                `Action: <code>${esc(m.action)}</code>\n\n`;
    }
    await ctx.reply(text, { parse_mode: 'HTML' });
});

bot.action('menu_refresh', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    await ctx.reply('🔄 Menyu ma’lumotlari bazadan qayta o‘qiladi. Yangi menyuni ko‘rish uchun asosiy menyuga qayting.');
});

bot.action('menu_add', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    getState(ctx.from.id).waitingForMenuTitle = true;
    await ctx.reply(
        '➕ <b>YANGI MENYU</b>\n\nHozircha UZ nomini yuboring.\n\nMasalan:\n<code>💎 Maxsus takliflar</code>',
        { parse_mode: 'HTML' }
    );
});

bot.on('text', async (ctx, next) => {
    if (!isAdmin(ctx)) return next();
    const s = getState(ctx.from.id);

    if (s.waitingForMenuTitle) {
        s.newMenuTitleUz = ctx.message.text.trim();
        s.waitingForMenuTitle = false;
        s.waitingForMenuAction = true;
        return ctx.reply(
            '✅ UZ nomi qabul qilindi.\n\nEndi action nomini yuboring.\n\nMasalan:\n<code>special_offer</code>',
            { parse_mode: 'HTML' }
        );
    }

    if (s.waitingForMenuAction) {
        s.newMenuAction = ctx.message.text.trim();
        db.prepare(`INSERT INTO menu_items (title_uz,title_ru,title_en,action,sort_order) VALUES (?,?,?,?,?)`)
          .run(s.newMenuTitleUz, s.newMenuTitleUz, s.newMenuTitleUz, s.newMenuAction, 99);
        s.waitingForMenuAction = false;
        return ctx.reply(
            '✅ <b>Yangi menyu qo‘shildi!</b>\n\n' +
            `🔘 ${esc(s.newMenuTitleUz)}\n` +
            `⚙️ Action: <code>${esc(s.newMenuAction)}</code>\n\n` +
            '⚠️ Maxsus action uchun bot kodiga handler qo‘shish kerak.',
            { parse_mode: 'HTML' }
        );
    }

    return next();
});

bot.action('adm_back', async ctx => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    await showAdminPanel(ctx);
});

// ============================================================
// CANCEL
// ============================================================
bot.command('cancel', async ctx => {
    resetTempState(ctx.from.id);
    const u = getUser(ctx.from.id);
    await ctx.reply('❌ Jarayon bekor qilindi.', getMainMenu(u?.language || 'uz'));
});

// ============================================================
// LAUNCH
// ============================================================
bot.launch({ dropPendingUpdates: true })
    .then(() => {
        console.log('');
        console.log('==============================================');
        console.log('🔥 BILOL | WEB DEVELOPER BOT');
        console.log('==============================================');
        console.log('✅ Bot muvaffaqiyatli ishga tushdi');
        console.log('💾 SQLite database: bilol_bot.db');
        console.log('📢 Channel:', TARGET_CHANNEL);
        console.log('👑 Admin:', ADMIN_ID);
        console.log('🚀 Status: ONLINE');
        console.log('==============================================');
    })
    .catch(err => console.error('❌ BOT LAUNCH ERROR:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));