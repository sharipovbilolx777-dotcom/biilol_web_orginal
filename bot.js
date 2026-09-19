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

const DB_FILE = 'bilol_bot.db';

const bot = new Telegraf(BOT_TOKEN);
const db = new Database(DB_FILE);

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

// ============================================================
// DEFAULT MENU
// ============================================================

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

const menuCount = db.prepare(`SELECT COUNT(*) AS count FROM menu_items`).get();

if (menuCount.count === 0) {
    const insertMenu = db.prepare(`
        INSERT INTO menu_items
        (title_uz, title_ru, title_en, action, sort_order)
        VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
        for (const item of defaultMenu) {
            insertMenu.run(...item);
        }
    });

    transaction();
}

// ============================================================
// USER STATE
// ============================================================

const state = new Map();

function getState(userId) {
    if (!state.has(userId)) {
        state.set(userId, {});
    }

    return state.get(userId);
}

function resetTemporaryState(userId) {
    const s = getState(userId);

    s.waitingForName = false;
    s.waitingForOrderDesc = false;
    s.waitingForBudget = false;
    s.waitingForPhone = false;
    s.waitingForSecondPhone = false;
    s.waitingForReview = false;
    s.waitingForComplaint = false;
    s.waitingForAdminPassword = false;
    s.waitingForBroadcast = false;
    s.waitingForMenuTitle = false;
    s.waitingForMenuAction = false;
}

// ============================================================
// HELPERS
// ============================================================

function now() {
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function isAdmin(ctx) {
    return String(ctx.from?.id) === ADMIN_ID;
}

function escapeMarkdown(text = '') {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function saveUser(ctx) {
    if (!ctx.from) return;

    const existing = db.prepare(`
        SELECT id FROM users WHERE id = ?
    `).get(ctx.from.id);

    if (!existing) {
        db.prepare(`
            INSERT INTO users
            (id, first_name, last_name, username, registered_at, last_seen)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            ctx.from.id,
            ctx.from.first_name || '',
            ctx.from.last_name || '',
            ctx.from.username || '',
            now(),
            now()
        );
    } else {
        db.prepare(`
            UPDATE users
            SET first_name = ?,
                last_name = ?,
                username = ?,
                last_seen = ?
            WHERE id = ?
        `).run(
            ctx.from.first_name || '',
            ctx.from.last_name || '',
            ctx.from.username || '',
            now(),
            ctx.from.id
        );
    }
}

function updateUser(userId, data) {
    const fields = Object.keys(data);

    if (!fields.length) return;

    const sql = `
        UPDATE users
        SET ${fields.map(f => `${f} = ?`).join(', ')}
        WHERE id = ?
    `;

    db.prepare(sql).run(
        ...fields.map(f => data[f]),
        userId
    );
}

function getUser(userId) {
    return db.prepare(`
        SELECT * FROM users WHERE id = ?
    `).get(userId);
}

function isBlocked(userId) {
    const user = getUser(userId);
    return user?.is_blocked === 1;
}

// ============================================================
// MIDDLEWARE
// ============================================================

bot.use(async (ctx, next) => {
    try {
        if (ctx.from) {
            saveUser(ctx);

            if (!isAdmin(ctx) && isBlocked(ctx.from.id)) {
                return ctx.reply(
                    '🚫 Sizning botdan foydalanish imkoniyatingiz vaqtincha cheklangan.'
                );
            }
        }

        await next();
    } catch (error) {
        console.error('GLOBAL ERROR:', error);

        try {
            await ctx.reply(
                '⚠️ Kutilmagan xatolik yuz berdi. Iltimos, birozdan keyin qayta urinib ko‘ring.'
            );
        } catch (_) {}
    }
});

// ============================================================
// CHANNEL SUBSCRIPTION
// ============================================================

async function checkChannelSubscription(userId) {
    try {
        const member = await bot.telegram.getChatMember(
            TARGET_CHANNEL,
            userId
        );

        return ['creator', 'administrator', 'member'].includes(member.status);

    } catch (error) {
        console.log(
            'CHANNEL CHECK:',
            error.description || error.message
        );

        return false;
    }
}

function subscriptionKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.url(
                '📢 Kanalga obuna bo‘lish',
                CHANNEL_URL
            )
        ],
        [
            Markup.button.url(
                '📸 Instagramni ochish',
                INSTAGRAM_URL
            )
        ],
        [
            Markup.button.callback(
                '🔄 Obunani tekshirish',
                'check_subscription'
            )
        ],
        [
            Markup.button.callback(
                '📸 Instagramni tekshirdim',
                'instagram_confirm'
            )
        ]
    ]);
}

async function requireSubscription(ctx) {
    const userId = ctx.from.id;

    const subscribed = await checkChannelSubscription(userId);

    if (!subscribed) {
        await ctx.reply(
            `🚀 *BILOL | WEB DEVELOPER*\n\n` +
            `Botdan foydalanishni boshlashdan oldin bizning kanalimizga obuna bo‘ling.\n\n` +
            `📢 Kanal: @webuzbekistan\n` +
            `📸 Instagram: @webi.uz\n\n` +
            `Kanalga obuna bo‘lgach, *Obunani tekshirish* tugmasini bosing 👇`,
            {
                parse_mode: 'Markdown',
                ...subscriptionKeyboard()
            }
        );

        return false;
    }

    updateUser(userId, {
        subscribed_channel: 1
    });

    return true;
}

// ============================================================
// PHONE REGISTRATION
// ============================================================

function phoneKeyboard() {
    return Markup.keyboard([
        [
            Markup.button.contactRequest(
                '📱 Telefon raqamimni yuborish'
            )
        ]
    ])
        .resize()
        .oneTime();
}

async function requestPhone(ctx) {
    const userId = ctx.from.id;

    const user = getUser(userId);

    if (!user?.phone_verified) {
        getState(userId).waitingForPhone = true;

        return ctx.reply(
            `📱 *Oxirgi qadam*\n\n` +
            `Botdan to‘liq foydalanish uchun telefon raqamingizni ` +
            `pastdagi tugma orqali yuboring.\n\n` +
            `⚠️ Raqamni qo‘lda yozish qabul qilinmaydi.`,
            {
                parse_mode: 'Markdown',
                ...phoneKeyboard()
            }
        );
    }

    return true;
}

async function ensureAccess(ctx) {
    const subscribed = await requireSubscription(ctx);

    if (!subscribed) {
        return false;
    }

    const user = getUser(ctx.from.id);

    if (!user?.phone_verified) {
        await requestPhone(ctx);
        return false;
    }

    return true;
}

// ============================================================
// LANGUAGE
// ============================================================

function languageKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🇺🇿 O‘zbekcha', 'lang_uz'),
            Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
            Markup.button.callback('🇬🇧 English', 'lang_en')
        ]
    ]);
}

function getMainMenu(lang = 'uz') {
    const rows = db.prepare(`
        SELECT *
        FROM menu_items
        WHERE active = 1
        ORDER BY sort_order ASC
    `).all();

    const titles = rows.map(item => {
        if (lang === 'ru') return item.title_ru;
        if (lang === 'en') return item.title_en;
        return item.title_uz;
    });

    const keyboard = [];

    for (let i = 0; i < titles.length; i += 2) {
        keyboard.push(titles.slice(i, i + 2));
    }

    return Markup.keyboard(keyboard)
        .resize();
}

function languageName(lang) {
    if (lang === 'ru') return 'Русский';
    if (lang === 'en') return 'English';
    return 'O‘zbekcha';
}

async function showMainMenu(ctx) {
    const user = getUser(ctx.from.id);
    const lang = user?.language || 'uz';

    await ctx.reply(
        `🚀 *BILOL | WEB DEVELOPER*\n\n` +
        `Biznesingiz uchun zamonaviy raqamli mahsulotlar yaratamiz.\n\n` +
        `💻 Web-saytlar — biznes, landing, korporativ, katalog\n` +
        `🛒 Online do‘konlar — E-commerce va buyurtma tizimlari\n` +
        `🤖 Telegram botlar — avtomatlashtirish va biznes botlar\n` +
        `🧠 AI yechimlar — AI botlar va aqlli tizimlar\n` +
        `📱 Web ilovalar — maxsus platformalar va servislar\n` +
        `🎨 Logo & dizayn — brend va vizual yechimlar\n` +
        `✨ Animatsiya — logo, reklama va motion dizayn\n\n` +
        `👇 Kerakli bo‘limni tanlang:`,
        {
            parse_mode: 'Markdown',
            ...getMainMenu(lang)
        }
    );
}

// ============================================================
// START
// ============================================================

bot.start(async ctx => {
    const userId = ctx.from.id;

    resetTemporaryState(userId);

    const s = getState(userId);

    s.lang = 'uz';

    updateUser(userId, {
        language: 'uz'
    });

    if (isAdmin(ctx)) {
        await ctx.reply(
            `👑 *Xush kelibsiz, Boss!*\n\n` +
            `Admin panel: /admin`,
            { parse_mode: 'Markdown' }
        );
    }

    const subscribed = await requireSubscription(ctx);

    if (!subscribed) return;

    const user = getUser(userId);

    if (!user.phone_verified) {
        return requestPhone(ctx);
    }

    await showMainMenu(ctx);
});

// ============================================================
// SUBSCRIPTION ACTIONS
// ============================================================

bot.action('check_subscription', async ctx => {
    await ctx.answerCbQuery().catch(() => {});

    const ok = await checkChannelSubscription(ctx.from.id);

    if (!ok) {
        return ctx.reply(
            `❌ Hali kanalga obuna bo‘lmagansiz.\n\n` +
            `📢 Avval @webuzbekistan kanaliga obuna bo‘ling, ` +
            `keyin yana tekshiring.`,
            subscriptionKeyboard()
        );
    }

    updateUser(ctx.from.id, {
        subscribed_channel: 1
    });

    await ctx.reply(
        `✅ *Kanal obunasi tasdiqlandi!*\n\n` +
        `Endi Instagramni ham ko‘rib chiqing va ` +
        `*Instagramni tekshirdim* tugmasini bosing.`,
        {
            parse_mode: 'Markdown',
            ...subscriptionKeyboard()
        }
    );
});

bot.action('instagram_confirm', async ctx => {
    await ctx.answerCbQuery().catch(() => {});

    const subscribed = await checkChannelSubscription(ctx.from.id);

    if (!subscribed) {
        return ctx.reply(
            `❌ Avval Telegram kanaliga obuna bo‘ling.`,
            subscriptionKeyboard()
        );
    }

    updateUser(ctx.from.id, {
        subscribed_channel: 1,
        instagram_confirmed: 1
    });

    await requestPhone(ctx);
});

// ============================================================
// CONTACT
// ============================================================

bot.on('contact', async ctx => {
    const contact = ctx.message.contact;
    const user = ctx.from;

    if (!contact || !contact.phone_number) {
        return ctx.reply(
            '❌ Telefon raqami aniqlanmadi.'
        );
    }

    // Security:
    // faqat foydalanuvchining o'z Contact'i qabul qilinadi
    if (contact.user_id && Number(contact.user_id) !== Number(user.id)) {
        return ctx.reply(
            '❌ Iltimos, faqat o‘zingizning telefon raqamingizni yuboring.'
        );
    }

    const userId = user.id;
    const s = getState(userId);

    const phone = contact.phone_number.startsWith('+')
        ? contact.phone_number
        : '+' + contact.phone_number;

    // ORDER phone
    if (s.waitingForPhone) {

        updateUser(userId, {
            phone: phone,
            phone_verified: 1
        });

        s.waitingForPhone = false;

        const dbUser = getUser(userId);

        if (!dbUser.username) {
            s.waitingForSecondPhone = true;

            return ctx.reply(
                `📞 Telefon raqamingiz qabul qilindi.\n\n` +
                `👤 Telegram username'ingiz mavjud emas.\n\n` +
                `📱 Iltimos, aloqa uchun *qo‘shimcha telefon raqamini* ham yuboring.`,
                {
                    parse_mode: 'Markdown',
                    ...phoneKeyboard()
                }
            );
        }

        await ctx.reply(
            `✅ *Ro‘yxatdan o‘tish yakunlandi!*\n\n` +
            `Endi botning barcha bo‘limlaridan foydalanishingiz mumkin. 🚀`,
            {
                parse_mode: 'Markdown',
                ...getMainMenu(dbUser.language || 'uz')
            }
        );

        return;
    }

    // SECOND PHONE
    if (s.waitingForSecondPhone) {

        updateUser(userId, {
            second_phone: phone
        });

        s.waitingForSecondPhone = false;

        const dbUser = getUser(userId);

        await ctx.reply(
            `✅ Qo‘shimcha telefon raqami ham qabul qilindi.\n\n` +
            `🚀 Endi barcha xizmatlardan foydalanishingiz mumkin.`,
            getMainMenu(dbUser.language || 'uz')
        );

        return;
    }

    // ORDER PHONE AFTER BUDGET
    if (s.waitingForOrderPhone) {

        s.waitingForOrderPhone = false;

        s.orderPhone = phone;

        await finishOrder(ctx);

        return;
    }

    return ctx.reply(
        '📱 Telefon raqamingiz qabul qilindi.'
    );
});

// ============================================================
// LANGUAGE ACTIONS
// ============================================================

bot.action('lang_uz', async ctx => {
    await ctx.answerCbQuery().catch(() => {});

    updateUser(ctx.from.id, {
        language: 'uz'
    });

    await ctx.reply(
        `🇺🇿 O‘zbek tili tanlandi.`,
        getMainMenu('uz')
    );
});

bot.action('lang_ru', async ctx => {
    await ctx.answerCbQuery().catch(() => {});

    updateUser(ctx.from.id, {
        language: 'ru'
    });

    await ctx.reply(
        `🇷🇺 Русский язык выбран.`,
        getMainMenu('ru')
    );
});

bot.action('lang_en', async ctx => {
    await ctx.answerCbQuery().catch(() => {});

    updateUser(ctx.from.id, {
        language: 'en'
    });

    await ctx.reply(
        `🇬🇧 English selected.`,
        getMainMenu('en')
    );
});

// ============================================================
// LANGUAGE MENU
// ============================================================

bot.hears([
    '🌐 Tilni o‘zgartirish',
    '🌐 Изменить язык',
    '🌐 Change Language'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    await ctx.reply(
        `🌐 *Tilni tanlang:*`,
        {
            parse_mode: 'Markdown',
            ...languageKeyboard()
        }
    );
});

// ============================================================
// PORTFOLIO
// ============================================================

bot.hears([
    '💻 Bizning ishlar (Portfolio)',
    '💻 Портфолио проектов',
    '💻 Portfolio'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.url(
                '🌐 HumoGarden.uz',
                'https://humogarden.uz'
            )
        ],
        [
            Markup.button.url(
                '🌐 Portfolio 01',
                'https://glittery-rugelach-e63860.netlify.app/'
            )
        ],
        [
            Markup.button.url(
                '🌐 Portfolio 02',
                'https://fastidious-dieffenbachia-94b656.netlify.app/'
            )
        ],
        [
            Markup.button.url(
                '🌐 Portfolio 03',
                'https://magenta-blini-956248.netlify.app/'
            )
        ],
        [
            Markup.button.url(
                '🌐 Portfolio 04',
                'https://heartfelt-manatee-645764.netlify.app/'
            )
        ],
        [
            Markup.button.url(
                '🌐 Portfolio 05',
                'https://harmonious-halva-0fe592.netlify.app/'
            )
        ],
        [
            Markup.button.url(
                '🌐 Portfolio 06',
                'https://fastidious-starburst-7aa5e3.netlify.app/'
            )
        ]
    ]);

    await ctx.reply(
        `💻 *BILOL | WEB DEVELOPER — PORTFOLIO*\n\n` +
        `Biz amalga oshirgan loyihalar bilan tanishing.\n\n` +
        `👇 Loyihani tanlang va saytni to‘g‘ridan-to‘g‘ri oching:`,
        {
            parse_mode: 'Markdown',
            ...keyboard
        }
    );
});

// ============================================================
// SERVICES
// ============================================================

const services = {
    landing: {
        title: '🚀 Landing Page',
        description: 'Sotuvchi, zamonaviy biznes sayti',
        price: 500000,
        usd: '$40',
        duration: '2–4 kun'
    },

    shop: {
        title: '🛒 E-Commerce',
        description: 'Online do‘kon va buyurtma tizimi',
        price: 1200000,
        usd: '$100',
        duration: '7–10 kun'
    },

    corporate: {
        title: '🏢 Korporativ veb-sayt',
        description: 'Kompaniya uchun professional sayt',
        price: 800000,
        usd: '$65',
        duration: '3–5 kun'
    },

    bot: {
        title: '🤖 Telegram Bot',
        description: 'Biznes bot va avtomatlashtirish',
        price: 400000,
        usd: '$30',
        duration: '2–5 kun'
    },

    webapp: {
        title: '📱 Web Application',
        description: 'Murakkab veb-ilova va platforma',
        price: 2000000,
        usd: '$160',
        duration: '10–15 kun'
    },

    ai: {
        title: '🧠 AI yechim',
        description: 'AI botlar va aqlli tizimlar',
        price: 1500000,
        usd: '$120',
        duration: '5–15 kun'
    },

    design: {
        title: '🎨 Logo & Dizayn',
        description: 'Brend va vizual dizayn',
        price: 300000,
        usd: '$25',
        duration: '1–3 kun'
    },

    animation: {
        title: '✨ Animatsiya',
        description: 'Logo, reklama va motion dizayn',
        price: 500000,
        usd: '$40',
        duration: '2–5 kun'
    }
};

function servicesKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🚀 Landing Page',
                'service_landing'
            )
        ],
        [
            Markup.button.callback(
                '🛒 Online do‘kon',
                'service_shop'
            )
        ],
        [
            Markup.button.callback(
                '🏢 Korporativ sayt',
                'service_corporate'
            )
        ],
        [
            Markup.button.callback(
                '🤖 Telegram Bot',
                'service_bot'
            )
        ],
        [
            Markup.button.callback(
                '📱 Web Application',
                'service_webapp'
            )
        ],
        [
            Markup.button.callback(
                '🧠 AI yechimlar',
                'service_ai'
            )
        ],
        [
            Markup.button.callback(
                '🎨 Logo & Dizayn',
                'service_design'
            )
        ],
        [
            Markup.button.callback(
                '✨ Animatsiya',
                'service_animation'
            )
        ]
    ]);
}

bot.hears([
    '⚙️ Xizmatlar va Narxlar',
    '⚙️ Услуги и Прайс',
    '⚙️ Services & Pricing'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    await ctx.reply(
        `🛠 *BILOL | WEB DEVELOPER — PROFESSIONAL XIZMATLAR*\n\n` +
        `Biznesingiz uchun zamonaviy raqamli mahsulotlar yaratamiz.\n\n` +

        `💻 Web-saytlar — biznes, landing, korporativ, katalog\n` +
        `🛒 Online do‘konlar — E-commerce va buyurtma tizimlari\n` +
        `🤖 Telegram botlar — avtomatlashtirish va biznes botlar\n` +
        `🧠 AI yechimlar — AI botlar va aqlli tizimlar\n` +
        `📱 Web ilovalar — maxsus platformalar va servislar\n` +
        `🎨 Logo & dizayn — brend va vizual yechimlar\n` +
        `✨ Animatsiya — logo, reklama va motion dizayn\n\n` +

        `💡 *Muhim:* Yakuniy narx loyiha murakkabligiga qarab ` +
        `o‘zaro kelishiladi.\n\n` +

        `📌 *To‘lov:* barcha loyihalarda 50% oldindan to‘lov.\n\n` +

        `👇 Xizmat turini tanlang:`,
        {
            parse_mode: 'Markdown',
            ...servicesKeyboard()
        }
    );
});

bot.action(/^service_(.+)$/, async ctx => {

    await ctx.answerCbQuery().catch(() => {});

    if (!(await ensureAccess(ctx))) return;

    const type = ctx.match[1];
    const service = services[type];

    if (!service) return;

    await ctx.reply(
        `${service.title}\n\n` +
        `💡 ${service.description}\n\n` +
        `💰 *Narxi:* ${service.price.toLocaleString('uz-UZ')} so‘m (${service.usd}) dan boshlanadi.\n` +
        `⏱ *Muddat:* ${service.duration}\n\n` +
        `🤝 Yakuniy narx loyiha talablariga qarab kelishiladi.\n` +
        `📌 50% oldindan to‘lov.\n\n` +
        `Buyurtma bermoqchimisiz?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '✅ Shu xizmatga buyurtma',
                        `order_service_${type}`
                    )
                ]
            ])
        }
    );
});

// ============================================================
// ORDER
// ============================================================

function agreementKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '✅ Roziman',
                'agree_yes'
            ),
            Markup.button.callback(
                '❌ Bekor qilish',
                'agree_no'
            )
        ]
    ]);
}

async function askAgreement(ctx) {

    const s = getState(ctx.from.id);

    await ctx.reply(
        `🤝 *BUYURTMA SHARTLARI*\n\n` +
        `Barcha loyihalar uchun *50% oldindan to‘lov* amalga oshiriladi.\n\n` +
        `Qolgan narx va yakuniy summa loyiha talablariga qarab ` +
        `o‘zaro kelishiladi.\n\n` +
        `Ushbu shartga rozimisiz?`,
        {
            parse_mode: 'Markdown',
            ...agreementKeyboard()
        }
    );
}

bot.hears([
    '💻 Loyihaga buyurtma',
    '💻 Заказать проект',
    '💻 Order Project'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    const s = getState(ctx.from.id);

    s.pendingService = 'Umumiy murojaat';

    await askAgreement(ctx);
});

bot.action(/^order_service_(.+)$/, async ctx => {

    await ctx.answerCbQuery().catch(() => {});

    const type = ctx.match[1];

    if (!services[type]) return;

    const s = getState(ctx.from.id);

    s.pendingService = type;

    await askAgreement(ctx);
});

bot.action('agree_no', async ctx => {

    await ctx.answerCbQuery().catch(() => {});

    resetTemporaryState(ctx.from.id);

    await ctx.editMessageText(
        `❌ Buyurtma jarayoni bekor qilindi.\n\n` +
        `Istasangiz keyinroq qayta buyurtma berishingiz mumkin.`
    ).catch(() => {});
});

bot.action('agree_yes', async ctx => {

    await ctx.answerCbQuery().catch(() => {});

    const s = getState(ctx.from.id);

    s.agreed = true;
    s.waitingForName = true;

    await ctx.editMessageText(
        `✅ *Rozilik qabul qilindi!*\n\n` +
        `Ajoyib tanlov. 🚀\n\n` +
        `📝 Iltimos, ism va familiyangizni to‘liq kiriting.\n\n` +
        `Masalan:\n` +
        `*Alisherbek Usmonov*`,
        {
            parse_mode: 'Markdown'
        }
    ).catch(() => {});
});

// ============================================================
// DETECT SERVICE
// ============================================================

function detectService(description) {

    const text = description.toLowerCase();

    if (
        text.includes('ilova') ||
        text.includes('app') ||
        text.includes('web app') ||
        text.includes('veb ilova') ||
        text.includes('veb-ilova')
    ) {
        return {
            type: 'webapp',
            title: 'Murakkab veb-ilova (Web Application)',
            price: 2000000,
            usd: '$160'
        };
    }

    if (
        text.includes('do‘kon') ||
        text.includes("do'kon") ||
        text.includes('dokoni') ||
        text.includes('magazin') ||
        text.includes('shop') ||
        text.includes('savdo') ||
        text.includes('market') ||
        text.includes('uzum')
    ) {
        return {
            type: 'shop',
            title: 'Onlayn do‘kon (E-Commerce)',
            price: 1200000,
            usd: '$100'
        };
    }

    if (
        text.includes('taksi') ||
        text.includes('taxi') ||
        text.includes('logistika') ||
        text.includes('dostavka') ||
        text.includes('yetkazib')
    ) {
        return {
            type: 'landing',
            title: 'Taksi / logistika tizimi',
            price: 800000,
            usd: '$65'
        };
    }

    if (
        text.includes('telegram bot') ||
        text.includes('bot') ||
        text.includes('telegram')
    ) {
        return {
            type: 'bot',
            title: 'Telegram bot va avtomatlashtirish',
            price: 400000,
            usd: '$30'
        };
    }

    if (
        text.includes('ai') ||
        text.includes('suniy intellekt') ||
        text.includes('sun’iy intellekt')
    ) {
        return {
            type: 'ai',
            title: 'AI yechim',
            price: 1500000,
            usd: '$120'
        };
    }

    if (
        text.includes('logo') ||
        text.includes('dizayn') ||
        text.includes('design')
    ) {
        return {
            type: 'design',
            title: 'Logo & Dizayn',
            price: 300000,
            usd: '$25'
        };
    }

    if (
        text.includes('animatsiya') ||
        text.includes('motion')
    ) {
        return {
            type: 'animation',
            title: 'Animatsiya / Motion Design',
            price: 500000,
            usd: '$40'
        };
    }

    if (
        text.includes('sayt') ||
        text.includes('site') ||
        text.includes('landing') ||
        text.includes('veb') ||
        text.includes('web')
    ) {
        return {
            type: 'landing',
            title: 'Landing Page / Veb-sayt',
            price: 500000,
            usd: '$40'
        };
    }

    return null;
}

// ============================================================
// TEXT HANDLER
// ============================================================

bot.on('text', async (ctx, next) => {

    const userId = ctx.from.id;
    const text = ctx.message.text.trim();

    const s = getState(userId);

    // ADMIN PASSWORD
    if (
        isAdmin(ctx) &&
        s.waitingForAdminPassword
    ) {

        if (text === ADMIN_PASSWORD) {

            s.waitingForAdminPassword = false;

            return showAdminPanel(ctx);
        }

        return ctx.reply(
            `❌ Parol noto‘g‘ri.\n\nQaytadan kiriting:`
        );
    }

    // BROADCAST
    if (
        isAdmin(ctx) &&
        s.waitingForBroadcast
    ) {

        return processBroadcast(ctx);
    }

    // ORDER NAME
    if (s.waitingForName) {

        const words = text.split(/\s+/).filter(Boolean);

        if (words.length < 2) {
            return ctx.reply(
                `❌ *Ism va familiya to‘liq bo‘lishi kerak!*\n\n` +
                `Masalan: *Alisherbek Usmonov*`,
                {
                    parse_mode: 'Markdown'
                }
            );
        }

        if (text.length < 5) {
            return ctx.reply(
                `❌ Iltimos, ism va familiyangizni to‘liq kiriting.`
            );
        }

        s.clientFullName = text;
        s.waitingForName = false;
        s.waitingForOrderDesc = true;

        return ctx.reply(
            `🎯 *Ajoyib!*\n\n` +
            `Endi nima buyurtma qilmoqchi ekaningizni va loyiha haqida batafsil yozing.\n\n` +
            `Masalan:\n` +
            `“Taksi xizmati uchun buyurtma sayti kerak.”`,
            {
                parse_mode: 'Markdown'
            }
        );
    }

    // ORDER DESCRIPTION
    if (s.waitingForOrderDesc) {

        if (text.length < 4) {
            return ctx.reply(
                `❌ Loyiha haqida batafsilroq yozing.`
            );
        }

        const detected = detectService(text);

        if (!detected) {

            s.waitingForOrderDesc = false;

            return ctx.reply(
                `❌ *Kechirasiz, bu yo‘nalish bo‘yicha tayyor xizmat turi topilmadi.*\n\n` +
                `Batafsil ma’lumot va narxni kelishish uchun admin bilan bog‘laning 👇`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.url(
                                '💬 Admin bilan bog‘lanish',
                                ADMIN_USERNAME
                            )
                        ]
                    ])
                }
            );
        }

        s.detectedService = detected;
        s.orderDescription = text;

        s.waitingForOrderDesc = false;
        s.waitingForBudget = true;

        return ctx.reply(
            `💡 *Tushunarli!*\n\n` +
            `Demak, bu:\n` +
            `📌 *${detected.title}*\n\n` +
            `💰 Bunday loyiha narxi *${detected.price.toLocaleString('uz-UZ')} so‘m (${detected.usd}) dan boshlanadi.*\n\n` +
            `⚠️ Budjetingiz ushbu summadan kam bo‘lmasligi kerak.\n\n` +
            `💰 Ushbu loyiha uchun ajratgan budjetingiz qancha?\n\n` +
            `Masalan: *2 000 000 so‘m*`,
            {
                parse_mode: 'Markdown'
            }
        );
    }

    // BUDGET
    if (s.waitingForBudget) {

        const clean = text.replace(/[^\d]/g, '');

        if (!clean) {
            return ctx.reply(
                `❌ Iltimos, budjetni aniq raqam bilan kiriting.\n\nMasalan: 2 000 000`
            );
        }

        const amount = Number(clean);

        const min = s.detectedService?.price || 0;

        if (amount < min) {

            return ctx.reply(
                `❌ *Budjet minimal summadan kam!*\n\n` +
                `📌 Ushbu loyiha uchun minimal narx:\n` +
                `💰 *${min.toLocaleString('uz-UZ')} so‘m*\n\n` +
                `Iltimos, ${min.toLocaleString('uz-UZ')} so‘mdan kam bo‘lmagan budjet kiriting.`,
                {
                    parse_mode: 'Markdown'
                }
            );
        }

        s.clientBudget = text;
        s.waitingForBudget = false;
        s.waitingForOrderPhone = true;

        return ctx.reply(
            `📞 *Ajoyib! Oxirgi qadam.*\n\n` +
            `Aloqa uchun telefon raqamingizni pastdagi tugma orqali yuboring.\n\n` +
            `⚠️ Telefonni qo‘lda yozish qabul qilinmaydi.`,
            {
                parse_mode: 'Markdown',
                ...phoneKeyboard()
            }
        );
    }

    // REVIEW
    if (s.waitingForReview) {

        s.waitingForReview = false;

        db.prepare(`
            INSERT INTO reviews
            (user_id, rating, review_text)
            VALUES (?, ?, ?)
        `).run(
            userId,
            s.reviewRating || 5,
            text
        );

        await bot.telegram.sendMessage(
            ADMIN_ID,
            `⭐️ *YANGI MIJOZ FIKRI*\n\n` +
            `👤 ${escapeMarkdown(ctx.from.first_name)}\n` +
            `🔗 @${ctx.from.username || 'username_yoq'}\n` +
            `🆔 \`${userId}\`\n` +
            `⭐️ Baho: ${s.reviewRating || 5}/5\n\n` +
            `📝 ${escapeMarkdown(text)}`,
            {
                parse_mode: 'Markdown'
            }
        ).catch(() => {});

        return ctx.reply(
            `✅ Fikringiz saqlandi.\n\n` +
            `❤️ Rahmat! Biz uchun mijozlar fikri juda muhim.`
        );
    }

    // COMPLAINT
    if (s.waitingForComplaint) {

        s.waitingForComplaint = false;

        db.prepare(`
            INSERT INTO complaints
            (user_id, complaint_text)
            VALUES (?, ?)
        `).run(
            userId,
            text
        );

        await bot.telegram.sendMessage(
            ADMIN_ID,
            `🚨 *YANGI SHIKOYAT*\n\n` +
            `👤 ${escapeMarkdown(ctx.from.first_name)}\n` +
            `🔗 @${ctx.from.username || 'username_yoq'}\n` +
            `🆔 \`${userId}\`\n\n` +
            `📝 ${escapeMarkdown(text)}`,
            {
                parse_mode: 'Markdown'
            }
        ).catch(() => {});

        return ctx.reply(
            `✅ Shikoyatingiz adminga yuborildi.\n\n` +
            `Tez orada ko‘rib chiqiladi.`
        );
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

    const phone =
        s.orderPhone ||
        user.phone ||
        '';

    const service =
        s.pendingService || 'Umumiy murojaat';

    const detected = s.detectedService;

    const discount = user.has_discount
        ? '🎁 15% chegirma BOR'
        : 'Chegirma yo‘q';

    const result = db.prepare(`
        INSERT INTO orders
        (
            user_id,
            full_name,
            username,
            phone,
            second_phone,
            service,
            description,
            budget,
            estimated_service,
            minimum_price,
            discount
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        s.clientFullName || `${user.first_name} ${user.last_name || ''}`,
        user.username || '',
        phone,
        user.second_phone || '',
        service,
        s.orderDescription || '',
        s.clientBudget || '',
        detected?.title || '',
        detected?.price
            ? `${detected.price.toLocaleString('uz-UZ')} so‘m`
            : '',
        discount
    );

    const adminText =
        `🚨 *BILOL | WEB DEVELOPER — YANGI BUYURTMA*\n\n` +

        `📦 *Order ID:* #${result.lastInsertRowid}\n\n` +

        `👤 *F.I.O:* ${escapeMarkdown(
            s.clientFullName || ''
        )}\n` +

        `📞 *Tel:* ${escapeMarkdown(phone)}\n` +

        `📱 *Qo‘shimcha tel:* ${
            user.second_phone
                ? escapeMarkdown(user.second_phone)
                : 'Yo‘q'
        }\n` +

        `🔗 *Username:* @${
            user.username || 'mavjud_emas'
        }\n` +

        `🆔 *Telegram ID:* \`${userId}\`\n\n` +

        `📌 *Xizmat:* ${escapeMarkdown(
            detected?.title || service
        )}\n` +

        `📝 *Buyurtma:*\n${escapeMarkdown(
            s.orderDescription || ''
        )}\n\n` +

        `💰 *Mijoz budjeti:* ${escapeMarkdown(
            s.clientBudget || ''
        )}\n` +

        `💵 *Minimal narx:* ${
            detected?.price
                ? detected.price.toLocaleString('uz-UZ') + ' so‘m'
                : 'Kelishiladi'
        }\n\n` +

        `🏷 *Aksiya:* ${escapeMarkdown(discount)}\n\n` +

        `✅ *50% oldindan to‘lov shartiga rozilik berilgan.*`;

    await bot.telegram.sendMessage(
        ADMIN_ID,
        adminText,
        {
            parse_mode: 'Markdown'
        }
    ).catch(async () => {
        await bot.telegram.sendMessage(
            ADMIN_ID,
            adminText.replace(/[*_`]/g, '')
        ).catch(() => {});
    });

    // Reset
    s.pendingService = null;
    s.clientFullName = null;
    s.orderDescription = null;
    s.clientBudget = null;
    s.detectedService = null;
    s.orderPhone = null;
    s.waitingForOrderPhone = false;

    await ctx.reply(
        `🎉 *Buyurtmangiz qabul qilindi!*\n\n` +
        `📦 Buyurtma raqami: *#${result.lastInsertRowid}*\n\n` +
        `Rahmat! Ma’lumotlaringiz adminga yuborildi.\n` +
        `Mutaxassisimiz siz bilan bog‘lanib, loyiha tafsilotlari va yakuniy narxni kelishadi. 🚀`,
        {
            parse_mode: 'Markdown',
            ...getMainMenu(user.language || 'uz')
        }
    );
}

// ============================================================
// REVIEWS
// ============================================================

bot.hears([
    '⭐️ Mijozlar fikri',
    '⭐️ Отзывы клиентов',
    '⭐️ Client Reviews'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    await ctx.reply(
        `⭐️ *MIJOZLAR FIKRI*\n\n` +
        `Biz bilan ishlagan mijozlarning fikrlari.\n\n` +
        `Siz ham baho qoldirishingiz mumkin 👇`,
        {
            parse_mode: 'Markdown',
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
        `⭐️ Siz *${rating}/5* baho berdingiz.\n\n` +
        `✍️ Endi fikringizni yozib qoldiring:`,
        {
            parse_mode: 'Markdown'
        }
    );
});

// ============================================================
// COMPLAINT
// ============================================================

bot.hears([
    '📝 Shikoyat qoldirish',
    '📝 Жалоба',
    '📝 Complaint'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    const s = getState(ctx.from.id);

    s.waitingForComplaint = true;

    await ctx.reply(
        `📝 *SHIKOYAT / TAKLIF*\n\n` +
        `Muammo yoki taklifingizni batafsil yozing.\n\n` +
        `Xabaringiz to‘g‘ridan-to‘g‘ri adminga yuboriladi.`,
        {
            parse_mode: 'Markdown'
        }
    );
});

// ============================================================
// GAME 15%
// ============================================================

bot.hears([
    '🎮 15% Chegirma o‘yini',
    '🎮 Игра на скидку 15%',
    '🎮 Win 15% Discount'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    const user = getUser(ctx.from.id);

    if (user.game_played) {
        return ctx.reply(
            `⚠️ Siz bu o‘yinda allaqachon qatnashgansiz.\n\n` +
            `🎁 Har bir foydalanuvchiga faqat *1 ta imkoniyat* beriladi.`,
            {
                parse_mode: 'Markdown'
            }
        );
    }

    const winningBox =
        Math.floor(Math.random() * 3) + 1;

    const s = getState(ctx.from.id);

    s.winningBox = winningBox;

    await ctx.reply(
        `🎮 *AKSIYALI OMAD O‘YINI*\n\n` +
        `📢 Kanalimizga obuna bo‘lganingiz uchun sizga ` +
        `15% chegirma yutib olish imkoniyati berildi! 🎁\n\n` +

        `3 ta sirli qutidan birini tanlang.\n\n` +

        `🏆 Yutuq: *15% chegirma*\n` +
        `🔒 Imkoniyat: *1 marta*`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('🎁 1-Quti', 'game_1'),
                    Markup.button.callback('🎁 2-Quti', 'game_2'),
                    Markup.button.callback('🎁 3-Quti', 'game_3')
                ]
            ])
        }
    );
});

bot.action(/^game_([1-3])$/, async ctx => {

    await ctx.answerCbQuery().catch(() => {});

    const userId = ctx.from.id;
    const user = getUser(userId);
    const s = getState(userId);

    if (user.game_played) {
        return ctx.reply(
            `⚠️ Siz allaqachon o‘ynagansiz.`
        );
    }

    updateUser(userId, {
        game_played: 1
    });

    const choice = Number(ctx.match[1]);

    if (choice === s.winningBox) {

        updateUser(userId, {
            has_discount: 1
        });

        return ctx.reply(
            `🎉 *TABRIKLAYMIZ!*\n\n` +
            `🏆 Siz *15% CHEGIRMA* yutdingiz!\n\n` +
            `🎁 Promokod:\n` +
            `\`BILOL15\`\n\n` +
            `Buyurtma berishda ushbu kodni ayting.`,
            {
                parse_mode: 'Markdown'
            }
        );
    }

    return ctx.reply(
        `😢 Afsus, bu safar yutuq chiqmadi.\n\n` +
        `Sizning tanlovingiz: ${choice}-quti.\n\n` +
        `🎁 Yutuqli quti: ${s.winningBox}-quti edi.\n\n` +
        `⚠️ O‘yin imkoniyati 1 marta edi.`
    );
});

// ============================================================
// CONTACTS
// ============================================================

bot.hears([
    '📞 Biz bilan bog‘lanish',
    '📞 Контакты',
    '📞 Contacts'
], async ctx => {

    if (!(await ensureAccess(ctx))) return;

    await ctx.reply(
        `📞 *BIZ BILAN BOG‘LANISH*\n\n` +

        `📢 *Telegram kanal:*\n` +
        `@webuzbekistan\n\n` +

        `📸 *Instagram:*\n` +
        `@webi.uz\n\n` +

        `💬 *Shaxsiy aloqa:*\n` +
        `@sharipoov1\n\n` +

        `📱 *Telefon:*\n` +
        `+998 99 321 21 22\n\n` +

        `🚀 Biznesingiz uchun raqamli yechim kerak bo‘lsa, ` +
        `biz bilan bog‘laning.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.url(
                        '📢 Telegram kanal',
                        CHANNEL_URL
                    )
                ],
                [
                    Markup.button.url(
                        '📸 Instagram',
                        INSTAGRAM_URL
                    )
                ],
                [
                    Markup.button.url(
                        '💬 Telegram orqali bog‘lanish',
                        ADMIN_USERNAME
                    )
                ]
            ])
        }
    );
});

// ============================================================
// ADMIN PANEL
// ============================================================

bot.command('admin', async ctx => {

    if (!isAdmin(ctx)) {
        return;
    }

    const s = getState(ctx.from.id);

    s.waitingForAdminPassword = true;

    await ctx.reply(
        `🔐 *ADMIN PANEL*\n\n` +
        `Maxfiy parolni kiriting:`,
        {
            parse_mode: 'Markdown'
        }
    );
});

function adminKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '📊 Statistika',
                'adm_stats'
            )
        ],
        [
            Markup.button.callback(
                '👥 Foydalanuvchilar',
                'adm_users'
            )
        ],
        [
            Markup.button.callback(
                '🚨 Buyurtmalar',
                'adm_orders'
            )
        ],
        [
            Markup.button.callback(
                '📝 Shikoyatlar',
                'adm_complaints'
            )
        ],
        [
            Markup.button.callback(
                '⭐️ Sharhlar',
                'adm_reviews'
            )
        ],
        [
            Markup.button.callback(
                '📢 Reklama tarqatish',
                'adm_broadcast'
            )
        ],
        [
            Markup.button.callback(
                '🧹 Bloklanganlarni tozalash',
                'adm_clean'
            )
        ],
        [
            Markup.button.callback(
                '➕ Menyu boshqaruvi',
                'adm_menu'
            )
        ]
    ]);
}

async function showAdminPanel(ctx) {

    await ctx.reply(
        `🛡 *BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER*\n\n` +

        `┏ Xavfsizlik: \`100% Protected\`\n` +
        `┣ Tizim: \`Barqaror / Ishlayapti ⚡️\`\n` +
        `┣ Database: \`SQLite / Persistent\`\n` +
        `┗ Boshqaruv: 👇`,
        {
            parse_mode: 'Markdown',
            ...adminKeyboard()
        }
    );
}

// ============================================================
// ADMIN STATS
// ============================================================

bot.action('adm_stats', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const total = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
    `).get().count;

    const active = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE is_blocked = 0
    `).get().count;

    const blocked = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE is_blocked = 1
    `).get().count;

    const orders = db.prepare(`
        SELECT COUNT(*) AS count
        FROM orders
    `).get().count;

    const newOrders = db.prepare(`
        SELECT COUNT(*) AS count
        FROM orders
        WHERE status = 'new'
    `).get().count;

    const complaints = db.prepare(`
        SELECT COUNT(*) AS count
        FROM complaints
    `).get().count;

    const newComplaints = db.prepare(`
        SELECT COUNT(*) AS count
        FROM complaints
        WHERE status = 'new'
    `).get().count;

    const reviews = db.prepare(`
        SELECT COUNT(*) AS count
        FROM reviews
    `).get().count;

    const games = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE game_played = 1
    `).get().count;

    const winners = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE has_discount = 1
    `).get().count;

    await ctx.editMessageText(
        `📊 *BILOL | REAL STATISTIKA*\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 *FOYDALANUVCHILAR*\n\n` +
        `👥 Jami: \`${total}\`\n` +
        `🟢 Aktiv: \`${active}\`\n` +
        `🚫 Bloklangan: \`${blocked}\`\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 *BUYURTMALAR*\n\n` +
        `📦 Jami: \`${orders}\`\n` +
        `🆕 Yangi: \`${newOrders}\`\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *SHIKOYATLAR*\n\n` +
        `📝 Jami: \`${complaints}\`\n` +
        `🚨 Yangi: \`${newComplaints}\`\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⭐️ *SHARHLAR*\n\n` +
        `⭐️ Jami: \`${reviews}\`\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎮 *AKSIYA O‘YINI*\n\n` +
        `🎮 O‘ynagan: \`${games}\`\n` +
        `🎁 Chegirma olgan: \`${winners}\`\n\n` +

        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💾 Ma’lumotlar real SQLite bazadan olinmoqda.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '🔙 Admin panel',
                        'adm_back'
                    )
                ]
            ])
        }
    );
});

// ============================================================
// ADMIN USERS
// ============================================================

bot.action('adm_users', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const users = db.prepare(`
        SELECT *
        FROM users
        ORDER BY last_seen DESC
    `).all();

    if (!users.length) {
        return ctx.reply(
            `👥 Hali foydalanuvchilar yo‘q.`
        );
    }

    await ctx.reply(
        `👥 *FOYDALANUVCHILAR — ${users.length} TA*\n\n` +
        `Quyidagi foydalanuvchini boshqarish uchun tanlang:`,
        {
            parse_mode: 'Markdown'
        }
    );

    for (const user of users.slice(0, 100)) {

        const status =
            user.is_blocked
                ? '🔴 BLOKLANGAN'
                : '🟢 FAOL';

        await ctx.reply(
            `👤 *FOYDALANUVCHI*\n\n` +

            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +

            `👤 *Ism:* ${escapeMarkdown(
                `${user.first_name || ''} ${user.last_name || ''}`.trim()
            )}\n` +

            `🔗 *Username:* @${
                user.username || 'yo‘q'
            }\n` +

            `🆔 *Telegram ID:* \`${user.id}\`\n` +

            `📞 *Telefon:* ${
                user.phone
                    ? escapeMarkdown(user.phone)
                    : 'Yo‘q'
            }\n` +

            `📱 *Qo‘shimcha:* ${
                user.second_phone
                    ? escapeMarkdown(user.second_phone)
                    : 'Yo‘q'
            }\n` +

            `🕐 *Ro‘yxatdan o‘tgan:* \`${user.registered_at}\`\n` +

            `🕐 *Oxirgi faollik:* \`${user.last_seen}\`\n` +

            `📊 *Status:* ${status}`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [
                        user.is_blocked
                            ? Markup.button.callback(
                                '🟢 Blockdan chiqarish',
                                `unblock_${user.id}`
                            )
                            : Markup.button.callback(
                                '🚫 Block qilish',
                                `block_${user.id}`
                            )
                    ]
                ])
            }
        );
    }
});

// ============================================================
// BLOCK / UNBLOCK
// ============================================================

bot.action(/^block_(\d+)$/, async ctx => {

    if (!isAdmin(ctx)) return;

    const id = Number(ctx.match[1]);

    updateUser(id, {
        is_blocked: 1
    });

    await ctx.answerCbQuery(
        'Foydalanuvchi bloklandi.'
    ).catch(() => {});

    await ctx.reply(
        `🚫 Foydalanuvchi \`${id}\` bloklandi.`,
        {
            parse_mode: 'Markdown'
        }
    );
});

bot.action(/^unblock_(\d+)$/, async ctx => {

    if (!isAdmin(ctx)) return;

    const id = Number(ctx.match[1]);

    updateUser(id, {
        is_blocked: 0
    });

    await ctx.answerCbQuery(
        'Blokdan chiqarildi.'
    ).catch(() => {});

    await ctx.reply(
        `🟢 Foydalanuvchi \`${id}\` blokdan chiqarildi.`,
        {
            parse_mode: 'Markdown'
        }
    );
});

// ============================================================
// ADMIN ORDERS
// ============================================================

bot.action('adm_orders', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const orders = db.prepare(`
        SELECT *
        FROM orders
        ORDER BY id DESC
        LIMIT 20
    `).all();

    if (!orders.length) {
        return ctx.reply(
            `📦 Hali buyurtmalar mavjud emas.`
        );
    }

    for (const order of orders) {

        await ctx.reply(
            `📦 *BUYURTMA #${order.id}*\n\n` +

            `👤 ${escapeMarkdown(order.full_name)}\n` +
            `📞 ${escapeMarkdown(order.phone)}\n` +
            `🔗 @${order.username || 'yo‘q'}\n` +
            `📌 ${escapeMarkdown(order.estimated_service || order.service)}\n` +
            `💰 ${escapeMarkdown(order.budget)}\n` +
            `📊 Status: ${order.status}\n` +
            `🕐 ${order.created_at}`,
            {
                parse_mode: 'Markdown'
            }
        );
    }
});

// ============================================================
// ADMIN COMPLAINTS
// ============================================================

bot.action('adm_complaints', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const complaints = db.prepare(`
        SELECT *
        FROM complaints
        ORDER BY id DESC
        LIMIT 20
    `).all();

    if (!complaints.length) {
        return ctx.reply(
            `📝 Hali shikoyatlar yo‘q.`
        );
    }

    for (const complaint of complaints) {

        await ctx.reply(
            `🚨 *SHIKOYAT #${complaint.id}*\n\n` +
            `👤 User ID: \`${complaint.user_id}\`\n` +
            `📊 Status: ${complaint.status}\n\n` +
            `📝 ${escapeMarkdown(complaint.complaint_text)}\n\n` +
            `🕐 ${complaint.created_at}`,
            {
                parse_mode: 'Markdown'
            }
        );
    }
});

// ============================================================
// ADMIN REVIEWS
// ============================================================

bot.action('adm_reviews', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const reviews = db.prepare(`
        SELECT *
        FROM reviews
        ORDER BY id DESC
        LIMIT 20
    `).all();

    if (!reviews.length) {
        return ctx.reply(
            `⭐️ Hali sharhlar yo‘q.`
        );
    }

    for (const review of reviews) {

        await ctx.reply(
            `⭐️ *SHARH #${review.id}*\n\n` +
            `👤 User: \`${review.user_id}\`\n` +
            `⭐️ Baho: ${review.rating}/5\n\n` +
            `📝 ${escapeMarkdown(review.review_text)}\n\n` +
            `🕐 ${review.created_at}`,
            {
                parse_mode: 'Markdown'
            }
        );
    }
});

// ============================================================
// ADMIN BROADCAST
// ============================================================

bot.action('adm_broadcast', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const s = getState(ctx.from.id);

    s.waitingForBroadcast = true;

    await ctx.reply(
        `📢 *UNIVERSAL REKLAMA TARQATISH*\n\n` +

        `Endi reklama xabarini yuboring.\n\n` +

        `📝 Oddiy matn\n` +
        `🖼 Rasm + caption\n` +
        `📹 Video\n` +
        `📄 Document\n` +
        `🎵 Audio\n` +
        `🎬 GIF\n\n` +

        `Xabar botdan foydalanayotgan foydalanuvchilarning ` +
        `barchasiga yuboriladi.\n\n` +

        `⚠️ Bloklagan yoki botni o‘chirgan foydalanuvchilarga ` +
        `yetib bormaydi.`,
        {
            parse_mode: 'Markdown'
        }
    );
});

async function processBroadcast(ctx) {

    const s = getState(ctx.from.id);

    s.waitingForBroadcast = false;

    const users = db.prepare(`
        SELECT id
        FROM users
        WHERE is_blocked = 0
    `).all();

    await ctx.reply(
        `⏳ Reklama ${users.length} ta foydalanuvchiga yuborilmoqda...`
    );

    let success = 0;
    let failed = 0;

    for (const user of users) {

        try {

            await ctx.telegram.copyMessage(
                user.id,
                ctx.chat.id,
                ctx.message.message_id
            );

            success++;

        } catch (error) {

            failed++;

            if (
                error.description &&
                (
                    error.description.includes('bot was blocked') ||
                    error.description.includes('chat not found') ||
                    error.description.includes('user is deactivated')
                )
            ) {
                updateUser(user.id, {
                    is_blocked: 1
                });
            }
        }
    }

    db.prepare(`
        INSERT INTO broadcasts
        (message_type, success_count, fail_count)
        VALUES (?, ?, ?)
    `).run(
        ctx.message.photo
            ? 'photo'
            : ctx.message.video
                ? 'video'
                : ctx.message.document
                    ? 'document'
                    : 'text',
        success,
        failed
    );

    await ctx.reply(
        `✅ *REKLAMA TARQATISH YAKUNLANDI*\n\n` +
        `📤 Yetib bordi: \`${success}\`\n` +
        `⚠️ Yetib bormadi: \`${failed}\``,
        {
            parse_mode: 'Markdown'
        }
    );
}

// ============================================================
// CLEAN BLOCKED
// ============================================================

bot.action('adm_clean', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const users = db.prepare(`
        SELECT id
        FROM users
        WHERE is_blocked = 0
    `).all();

    let active = 0;
    let removed = 0;

    await ctx.reply(
        `⏳ Foydalanuvchilar tekshirilmoqda...`
    );

    for (const user of users) {

        try {

            await ctx.telegram.sendChatAction(
                user.id,
                'typing'
            );

            active++;

        } catch (error) {

            removed++;

            updateUser(user.id, {
                is_blocked: 1
            });
        }
    }

    await ctx.reply(
        `🧹 *TOZALASH YAKUNLANDI*\n\n` +

        `🟢 Faol: \`${active}\`\n` +
        `🔴 Yetib bo‘lmaydigan: \`${removed}\``,
        {
            parse_mode: 'Markdown'
        }
    );
});

// ============================================================
// ADMIN MENU MANAGEMENT
// ============================================================

bot.action('adm_menu', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    await ctx.reply(
        `➕ *MENYU BOSHQARUVI*\n\n` +
        `Bot menyusini shu yerdan boshqarish mumkin.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '📋 Menyuni ko‘rish',
                        'menu_list'
                    )
                ],
                [
                    Markup.button.callback(
                        '➕ Yangi menyu qo‘shish',
                        'menu_add'
                    )
                ],
                [
                    Markup.button.callback(
                        '🔄 Menyuni yangilash',
                        'menu_refresh'
                    )
                ]
            ])
        }
    );
});

bot.action('menu_list', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const menus = db.prepare(`
        SELECT *
        FROM menu_items
        ORDER BY sort_order
    `).all();

    let text = `📋 *BOT MENYUSI*\n\n`;

    for (const menu of menus) {

        text +=
            `#${menu.id}\n` +
            `${menu.active ? '🟢' : '🔴'} ${escapeMarkdown(menu.title_uz)}\n` +
            `Action: \`${menu.action}\`\n\n`;
    }

    await ctx.reply(
        text,
        {
            parse_mode: 'Markdown'
        }
    );
});

bot.action('menu_refresh', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    await ctx.reply(
        `🔄 Menyu qayta yuklandi.\n\n` +
        `Bot restart qilmasdan ham yangi menyu ma’lumotlari bazadan olinadi.`
    );
});

bot.action('menu_add', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const s = getState(ctx.from.id);

    s.waitingForMenuTitle = true;

    await ctx.reply(
        `➕ *YANGI MENYU*\n\n` +
        `Hozircha UZ nomini yuboring.\n\n` +
        `Masalan:\n` +
        `💎 Maxsus takliflar`,
        {
            parse_mode: 'Markdown'
        }
    );
});

// ============================================================
// ADMIN MENU ADD HANDLER
// ============================================================

bot.on('text', async (ctx, next) => {

    if (!isAdmin(ctx)) {
        return next();
    }

    const s = getState(ctx.from.id);

    if (s.waitingForMenuTitle) {

        s.newMenuTitleUz = ctx.message.text.trim();
        s.waitingForMenuTitle = false;
        s.waitingForMenuAction = true;

        return ctx.reply(
            `✅ UZ nomi qabul qilindi.\n\n` +
            `Endi action nomini yuboring.\n\n` +
            `Masalan:\n` +
            `special_offer`
        );
    }

    if (s.waitingForMenuAction) {

        s.newMenuAction = ctx.message.text.trim();

        db.prepare(`
            INSERT INTO menu_items
            (
                title_uz,
                title_ru,
                title_en,
                action,
                sort_order
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            s.newMenuTitleUz,
            s.newMenuTitleUz,
            s.newMenuTitleUz,
            s.newMenuAction,
            99
        );

        s.waitingForMenuAction = false;

        return ctx.reply(
            `✅ Yangi menyu qo‘shildi!\n\n` +
            `🔘 ${s.newMenuTitleUz}\n` +
            `⚙️ Action: ${s.newMenuAction}\n\n` +
            `⚠️ Maxsus action uchun bot kodiga handler qo‘shish kerak.`
        );
    }

    return next();
});

// ============================================================
// ADMIN BACK
// ============================================================

bot.action('adm_back', async ctx => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    await showAdminPanel(ctx);
});

// ============================================================
// UNKNOWN COMMAND
// ============================================================

bot.command('cancel', async ctx => {

    resetTemporaryState(ctx.from.id);

    const user = getUser(ctx.from.id);

    await ctx.reply(
        `❌ Jarayon bekor qilindi.`,
        getMainMenu(user?.language || 'uz')
    );
});

// ============================================================
// LAUNCH
// ============================================================

bot.launch({
    dropPendingUpdates: true
})
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
    console.log('');

})
.catch(error => {

    console.error(
        '❌ BOT LAUNCH ERROR:',
        error
    );
});

// ============================================================
// SHUTDOWN
// ============================================================

process.once(
    'SIGINT',
    () => bot.stop('SIGINT')
);

process.once(
    'SIGTERM',
    () => bot.stop('SIGTERM')
);