'use strict';

/*
=========================================================
 BILOL | WEB DEVELOPER
 Telegram Business / Service Bot
 Telegraf + SQLite
=========================================================

INSTALL:

npm install telegraf better-sqlite3

RUN:

node bot.js

MUHIM:
1. BOT_TOKEN ni yozing.
2. ADMIN_ID ni yozing.
3. Botni @webuzbekistan kanaliga ADMIN qiling.
=========================================================
*/

const { Telegraf, Markup } = require('telegraf');
const Database = require('better-sqlite3');

// =======================================================
// CONFIG
// =======================================================

const BOT_TOKEN = '8774770545:AAGQR4qQiWWf5AC-5OYvVhzHWkju9udZUgw';
const ADMIN_ID = '867717817';
const ADMIN_PASSWORD = '7777';

const REQUIRED_CHANNEL = '@webuzbekistan';
const CHANNEL_URL = 'https://t.me/webuzbekistan';
const INSTAGRAM_URL = 'https://www.instagram.com/webi.uz';
const ADMIN_URL = 'https://t.me/sharipoov1';
const CONTACT_PHONE = '+998993212122';

const DB_FILE = './bilol_bot.db';

const bot = new Telegraf(BOT_TOKEN);
const db = new Database(DB_FILE);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const startTime = Date.now();

// =======================================================
// DATABASE
// =======================================================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    username TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    phone2 TEXT DEFAULT '',

    language TEXT DEFAULT 'uz',

    subscribed INTEGER DEFAULT 0,
    instagram_confirmed INTEGER DEFAULT 0,
    phone_verified INTEGER DEFAULT 0,

    blocked INTEGER DEFAULT 0,

    has_played INTEGER DEFAULT 0,
    has_discount INTEGER DEFAULT 0,

    discount_code TEXT DEFAULT '',

    pending_service TEXT DEFAULT '',
    client_full_name TEXT DEFAULT '',
    order_description TEXT DEFAULT '',
    client_budget TEXT DEFAULT '',
    min_budget_uzs INTEGER DEFAULT 0,

    state TEXT DEFAULT '',

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    full_name TEXT DEFAULT '',
    username TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    phone2 TEXT DEFAULT '',

    service TEXT DEFAULT '',
    description TEXT DEFAULT '',
    budget TEXT DEFAULT '',
    min_budget INTEGER DEFAULT 0,

    discount TEXT DEFAULT '',
    status TEXT DEFAULT 'new',

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    rating INTEGER DEFAULT 0,
    text TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT DEFAULT '',
    text TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
);
`);

// =======================================================
// PREPARED STATEMENTS
// =======================================================

const stmts = {

    getUser: db.prepare(`
        SELECT * FROM users WHERE id = ?
    `),

    insertUser: db.prepare(`
        INSERT OR IGNORE INTO users
        (id, first_name, last_name, username, created_at, last_seen)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `),

    updateUserBasic: db.prepare(`
        UPDATE users
        SET first_name = ?,
            last_name = ?,
            username = ?,
            last_seen = datetime('now')
        WHERE id = ?
    `),

    updateLastSeen: db.prepare(`
        UPDATE users
        SET last_seen = datetime('now')
        WHERE id = ?
    `),

    setField: db.prepare(`
        UPDATE users SET state = ? WHERE id = ?
    `),

    getAllUsers: db.prepare(`
        SELECT * FROM users ORDER BY id DESC
    `),

    getUserById: db.prepare(`
        SELECT * FROM users WHERE id = ?
    `),

    blockUser: db.prepare(`
        UPDATE users SET blocked = 1 WHERE id = ?
    `),

    unblockUser: db.prepare(`
        UPDATE users SET blocked = 0 WHERE id = ?
    `),

    setSubscription: db.prepare(`
        UPDATE users
        SET subscribed = ?, instagram_confirmed = ?
        WHERE id = ?
    `),

    setInstagram: db.prepare(`
        UPDATE users
        SET instagram_confirmed = ?
        WHERE id = ?
    `),

    setPhone: db.prepare(`
        UPDATE users
        SET phone = ?, phone_verified = 1
        WHERE id = ?
    `),

    setPhone2: db.prepare(`
        UPDATE users
        SET phone2 = ?
        WHERE id = ?
    `),

    resetOrder: db.prepare(`
        UPDATE users
        SET pending_service = '',
            client_full_name = '',
            order_description = '',
            client_budget = '',
            min_budget_uzs = 0,
            state = ''
        WHERE id = ?
    `),

    insertOrder: db.prepare(`
        INSERT INTO orders
        (
            user_id,
            full_name,
            username,
            phone,
            phone2,
            service,
            description,
            budget,
            min_budget,
            discount,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `),

    insertReview: db.prepare(`
        INSERT INTO reviews
        (user_id, rating, text)
        VALUES (?, ?, ?)
    `),

    insertComplaint: db.prepare(`
        INSERT INTO complaints
        (user_id, text)
        VALUES (?, ?)
    `),

    getCustomMenus: db.prepare(`
        SELECT * FROM custom_menu
        WHERE active = 1
        ORDER BY id ASC
    `),

    insertMenu: db.prepare(`
        INSERT INTO custom_menu
        (title, url, text)
        VALUES (?, ?, ?)
    `),

    deleteMenu: db.prepare(`
        DELETE FROM custom_menu WHERE id = ?
    `)
};

// =======================================================
// HELPERS
// =======================================================

function now() {
    return new Date().toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent'
    });
}

function ensureUser(ctx) {

    if (!ctx.from) return null;

    const id = Number(ctx.from.id);

    let user = stmts.getUser.get(id);

    if (!user) {

        stmts.insertUser.run(
            id,
            ctx.from.first_name || '',
            ctx.from.last_name || '',
            ctx.from.username || ''
        );

        user = stmts.getUser.get(id);

        notifyNewUser(ctx).catch(() => {});
    }

    stmts.updateUserBasic.run(
        ctx.from.first_name || '',
        ctx.from.last_name || '',
        ctx.from.username || '',
        id
    );

    stmts.updateLastSeen.run(id);

    return stmts.getUser.get(id);
}

async function notifyNewUser(ctx) {

    if (!ctx.from) return;

    const user = ctx.from;

    const name =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        'Noma’lum';

    const username = user.username
        ? `@${user.username}`
        : 'Username yo‘q';

    const text =
`🚨 <b>YANGI FOYDALANUVCHI KIRDI</b>

👤 <b>Ism:</b> ${escapeHtml(name)}
🔗 <b>Username:</b> ${escapeHtml(username)}
🆔 <b>Telegram ID:</b> <code>${user.id}</code>

🕐 <b>Vaqt:</b> ${escapeHtml(now())}

📌 Botga yangi foydalanuvchi kirdi.`;

    await bot.telegram.sendMessage(
        ADMIN_ID,
        text,
        { parse_mode: 'HTML' }
    );
}

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isAdmin(id) {
    return String(id) === String(ADMIN_ID);
}

function isBlocked(user) {
    return user && Number(user.blocked) === 1;
}

function getLang(userId) {

    const user = stmts.getUser.get(userId);

    return user?.language || 'uz';
}

function setState(userId, state) {
    stmts.setField.run(state, userId);
}

function getUser(userId) {
    return stmts.getUser.get(userId);
}

// =======================================================
// MAIN MENU
// =======================================================

function getMainMenu(lang = 'uz', userId = null) {

    let rows;

    if (lang === 'ru') {

        rows = [
            ['💻 Портфолио проектов', '⚙️ Услуги и Прайс'],
            ['🎮 Выиграть скидку 15%', '⭐️ Отзывы клиентов'],
            ['📞 Контакты', '💻 Заказать проект'],
            ['📝 Жалоба', '🌐 Изменить язык']
        ];

    } else if (lang === 'en') {

        rows = [
            ['💻 Portfolio', '⚙️ Services & Pricing'],
            ['🎮 Win 15% Discount', '⭐️ Client Reviews'],
            ['📞 Contacts', '💻 Order Project'],
            ['📝 Complaint', '🌐 Change Language']
        ];

    } else {

        rows = [
            ['💻 Bizning ishlar', '⚙️ Xizmatlar va Narxlar'],
            ['🎮 15% Chegirma yutish', '⭐️ Mijozlar fikri'],
            ['📞 Biz bilan bog‘lanish', '💻 Loyihaga buyurtma'],
            ['📝 Shikoyat qoldirish', '🌐 Tilni o‘zgartirish']
        ];
    }

    // Admin qo‘shgan menyular
    if (userId) {

        const customMenus = stmts.getCustomMenus.all();

        for (const menu of customMenus) {

            if (menu.url) {

                // custom URL tugmalarni alohida inline qilish uchun
                // asosiy keyboardga qo‘shmaymiz
                continue;
            }

            rows.push([menu.title]);
        }
    }

    return Markup.keyboard(rows).resize();
}

// =======================================================
// ONBOARDING
// =======================================================

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
                '📸 Instagramga obuna bo‘lish',
                INSTAGRAM_URL
            )
        ],

        [
            Markup.button.callback(
                '📸 Instagramga obuna bo‘ldim',
                'instagram_confirm'
            )
        ],

        [
            Markup.button.callback(
                '✅ Obunani tekshirish',
                'check_subscription'
            )
        ]

    ]);
}

async function showSubscription(ctx) {

    return ctx.reply(
`🔐 <b>Botdan foydalanish uchun avval 2 ta qadamni bajaring.</b>

1️⃣ <b>Telegram kanalga obuna bo‘ling</b>
📢 @webuzbekistan

2️⃣ <b>Instagram sahifamizga obuna bo‘ling</b>
📸 @webi.uz

👇 Ikkalasini bajarganingizdan keyin <b>Obunani tekshirish</b> tugmasini bosing.

⚠️ Kanal obunasi Telegram orqali tekshiriladi.`,
        {
            parse_mode: 'HTML',
            ...subscriptionKeyboard()
        }
    );
}

async function checkChannel(ctx) {

    const userId = ctx.from.id;

    try {

        const member = await ctx.telegram.getChatMember(
            REQUIRED_CHANNEL,
            userId
        );

        const allowedStatuses = [
            'creator',
            'administrator',
            'member'
        ];

        const subscribed =
            allowedStatuses.includes(member.status);

        if (!subscribed) {

            return ctx.answerCbQuery(
                '❌ Avval kanalga obuna bo‘ling!',
                { show_alert: true }
            );
        }

        const user = getUser(userId);

        if (!user.instagram_confirmed) {

            await ctx.answerCbQuery(
                '📸 Endi Instagram obunasini tasdiqlang.',
                { show_alert: true }
            );

            return ctx.reply(
`📸 <b>Instagram bosqichi qoldi.</b>

Instagramga kirib <b>@webi.uz</b> sahifasiga obuna bo‘ling.

Keyin:
<b>📸 Instagramga obuna bo‘ldim</b> tugmasini bosing.`,
                {
                    parse_mode: 'HTML',
                    ...subscriptionKeyboard()
                }
            );
        }

        stmts.setSubscription.run(
            1,
            1,
            userId
        );

        await ctx.answerCbQuery(
            '✅ Obunalar tasdiqlandi!'
        );

        return askPhone(ctx);
    }

    catch (error) {

        console.log(
            'CHANNEL CHECK ERROR:',
            error.message
        );

        return ctx.answerCbQuery(
            '⚠️ Kanal tekshirilmoqda. Bot kanal admini ekanini tekshiring.',
            { show_alert: true }
        );
    }
}

function askPhone(ctx) {

    const userId = ctx.from.id;

    setState(userId, 'waiting_phone');

    return ctx.reply(
`📱 <b>Oxirgi qadam!</b>

Botdan to‘liq foydalanish uchun telefon raqamingizni yuboring.

👇 Pastdagi <b>Telefon raqamimni yuborish</b> tugmasini bosing.

⚠️ Raqamni qo‘lda yozmang.`,
        {
            parse_mode: 'HTML',
            ...Markup.keyboard([
                [
                    Markup.button.contactRequest(
                        '📱 Telefon raqamimni yuborish'
                    )
                ]
            ]).resize()
        }
    );
}

// =======================================================
// START
// =======================================================

bot.start(async (ctx) => {

    const user = ensureUser(ctx);

    if (!user) return;

    if (isBlocked(user)) {

        return ctx.reply(
`🚫 <b>Sizning botdan foydalanish imkoniyatingiz bloklangan.</b>

Agar bu xato deb hisoblasangiz, admin bilan bog‘laning.`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.url(
                            '💬 Admin bilan bog‘lanish',
                            ADMIN_URL
                        )
                    ]
                ])
            }
        );
    }

    if (isAdmin(ctx.from.id)) {

        return ctx.reply(
`👑 <b>Xush kelibsiz, Boss!</b>

🛡 Admin panel:
<code>/admin</code>

Oddiy botni tekshirish uchun boshqa akkauntdan kirib ko‘ring.`,
            { parse_mode: 'HTML' }
        );
    }

    // Agar allaqachon onboarding tugagan bo‘lsa
    if (
        user.subscribed &&
        user.instagram_confirmed &&
        user.phone_verified
    ) {

        return ctx.reply(
`🚀 <b>Bilol | Web Developer</b> botiga xush kelibsiz!

Biznesingiz uchun zamonaviy raqamli mahsulotlar yaratamiz.

👇 Kerakli bo‘limni tanlang:`,
            {
                parse_mode: 'HTML',
                ...getMainMenu(
                    user.language,
                    ctx.from.id
                )
            }
        );
    }

    return showSubscription(ctx);
});

// =======================================================
// GLOBAL ACCESS CHECK
// =======================================================

bot.use(async (ctx, next) => {

    if (!ctx.from) return next();

    const user = ensureUser(ctx);

    if (!user) return next();

    // Admin har doim foydalanadi
    if (isAdmin(ctx.from.id)) {
        return next();
    }

    if (isBlocked(user)) {

        if (ctx.callbackQuery) {

            return ctx.answerCbQuery(
                '🚫 Siz bloklangansiz.',
                { show_alert: true }
            );
        }

        return ctx.reply(
`🚫 <b>Botdan foydalanish bloklangan.</b>

Admin bilan bog‘lanish:
@sharipoov1`,
            { parse_mode: 'HTML' }
        );
    }

    // onboarding tugamagan bo‘lsa
    if (
        !user.subscribed ||
        !user.instagram_confirmed ||
        !user.phone_verified
    ) {

        // Contact kelsa contact handlerga o'tkazamiz
        if (ctx.message?.contact) {
            return next();
        }

        if (
            ctx.callbackQuery?.data === 'check_subscription' ||
            ctx.callbackQuery?.data === 'instagram_confirm' ||
            ctx.message?.text === '/start'
        ) {
            return next();
        }

        if (ctx.message?.text) {

            await ctx.reply(
                '🔐 Avval kanal va Instagram obunasini tasdiqlang.',
                subscriptionKeyboard()
            );

            return;
        }
    }

    return next();
});

// =======================================================
// INSTAGRAM CONFIRM
// =======================================================

bot.action('instagram_confirm', async (ctx) => {

    const userId = ctx.from.id;

    stmts.setInstagram.run(
        1,
        userId
    );

    await ctx.answerCbQuery(
        '📸 Instagram tasdiqlandi.'
    );

    return ctx.reply(
`📸 <b>Instagram tasdig‘i qabul qilindi.</b>

Endi:
<b>1.</b> Kanalga obuna bo‘lganingizni tekshiring.
<b>2.</b> Keyin telefon raqamingizni yuborasiz.`,
        {
            parse_mode: 'HTML',
            ...subscriptionKeyboard()
        }
    );
});

// =======================================================
// CHECK SUBSCRIPTION
// =======================================================

bot.action('check_subscription', async (ctx) => {

    const user = getUser(ctx.from.id);

    if (isBlocked(user)) {

        return ctx.answerCbQuery(
            '🚫 Siz bloklangansiz.',
            { show_alert: true }
        );
    }

    return checkChannel(ctx);
});

// =======================================================
// PHONE CONTACT
// =======================================================

bot.on('contact', async (ctx) => {

    const userId = ctx.from.id;
    const contact = ctx.message.contact;

    let user = getUser(userId);

    if (!user) {
        ensureUser(ctx);
        user = getUser(userId);
    }

    if (isBlocked(user)) {
        return ctx.reply('🚫 Siz bloklangansiz.');
    }

    // Faqat o'z contact'i
    if (
        contact.user_id &&
        Number(contact.user_id) !== Number(userId)
    ) {

        return ctx.reply(
            '❌ Iltimos, faqat o‘zingizning telefon raqamingizni yuboring.'
        );
    }

    // onboardingdan oldin contact qabul qilinmaydi
    if (
        !user.subscribed ||
        !user.instagram_confirmed
    ) {

        return ctx.reply(
            '🔐 Avval kanal va Instagram obunasini tasdiqlang.',
            subscriptionKeyboard()
        );
    }

    const phone = String(
        contact.phone_number || ''
    ).replace(/^\+/, '');

    // Username yo'q bo'lsa
    if (!ctx.from.username && !user.phone) {

        stmts.setPhone.run(
            phone,
            userId
        );

        setState(
            userId,
            'waiting_second_phone'
        );

        return ctx.reply(
`📞 <b>Birinchi raqam qabul qilindi.</b>

Sizning Telegram akkauntingizda <b>@username</b> mavjud emas.

Shuning uchun aloqa uchun <b>yana bitta telefon raqam</b> yuboring.

👇 Raqamni pastdagi tugma orqali yuboring.`,
            {
                parse_mode: 'HTML',
                ...Markup.keyboard([
                    [
                        Markup.button.contactRequest(
                            '📱 Ikkinchi telefon raqam'
                        )
                    ]
                ]).resize()
            }
        );
    }

    // Username yo'q va ikkinchi raqam kelyapti
    if (
        !ctx.from.username &&
        user.phone &&
        user.state === 'waiting_second_phone'
    ) {

        stmts.setPhone2.run(
            phone,
            userId
        );

        setState(
            userId,
            ''
        );

        await completePhoneRegistration(
            ctx,
            phone
        );

        return;
    }

    // Oddiy holat
    stmts.setPhone.run(
        phone,
        userId
    );

    setState(
        userId,
        ''
    );

    return completePhoneRegistration(
        ctx,
        phone
    );
});

async function completePhoneRegistration(
    ctx,
    currentPhone
) {

    const userId = ctx.from.id;

    const user = getUser(userId);

    await ctx.reply(
`✅ <b>Telefon raqamingiz qabul qilindi!</b>

🎉 Endi botning barcha imkoniyatlari ochildi.

🚀 <b>Bilol | Web Developer</b>

👇 Kerakli bo‘limni tanlang:`,
        {
            parse_mode: 'HTML',
            ...Markup.removeKeyboard()
        }
    );

    return ctx.reply(
        '📋 Asosiy menyu:',
        getMainMenu(
            user.language || 'uz',
            userId
        )
    );
}

// =======================================================
// LANGUAGE
// =======================================================

bot.action('lang_uz', async (ctx) => {

    stmts.prepare(`
        UPDATE users SET language = 'uz' WHERE id = ?
    `).run(ctx.from.id);

    await ctx.answerCbQuery('🇺🇿 O‘zbekcha');

    return ctx.reply(
        '🇺🇿 O‘zbek tili tanlandi.',
        getMainMenu('uz', ctx.from.id)
    );
});

bot.action('lang_ru', async (ctx) => {

    stmts.prepare(`
        UPDATE users SET language = 'ru' WHERE id = ?
    `).run(ctx.from.id);

    await ctx.answerCbQuery('🇷🇺 Русский');

    return ctx.reply(
        '🇷🇺 Русский язык выбран.',
        getMainMenu('ru', ctx.from.id)
    );
});

bot.action('lang_en', async (ctx) => {

    stmts.prepare(`
        UPDATE users SET language = 'en' WHERE id = ?
    `).run(ctx.from.id);

    await ctx.answerCbQuery('🇬🇧 English');

    return ctx.reply(
        '🇬🇧 English selected.',
        getMainMenu('en', ctx.from.id)
    );
});

bot.hears(
    [
        '🌐 Tilni o‘zgartirish',
        '🌐 Изменить язык',
        '🌐 Change Language'
    ],
    async (ctx) => {

        return ctx.reply(
            '🌐 Tilni tanlang:',
            getLangMenu()
        );
    }
);

function getLangMenu() {

    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '🇺🇿 O‘zbekcha',
                'lang_uz'
            ),
            Markup.button.callback(
                '🇷🇺 Русский',
                'lang_ru'
            )
        ],
        [
            Markup.button.callback(
                '🇬🇧 English',
                'lang_en'
            )
        ]
    ]);
}

// =======================================================
// SERVICES
// =======================================================

const SERVICES = {

    landing: {
        title: '🚀 Landing Page',
        name: 'Landing Page / biznes veb-sayt',
        price: 500000,
        priceText: '500,000 so‘m ($40)',
        advance: 250000
    },

    shop: {
        title: '🛒 E-Commerce',
        name: 'Online do‘kon / E-Commerce',
        price: 1200000,
        priceText: '1,200,000 so‘m ($100)',
        advance: 600000
    },

    corporate: {
        title: '🏢 Korporativ veb-sayt',
        name: 'Korporativ veb-sayt',
        price: 800000,
        priceText: '800,000 so‘m ($65)',
        advance: 400000
    },

    bot: {
        title: '🤖 Telegram Bot',
        name: 'Telegram bot va avtomatlashtirish',
        price: 400000,
        priceText: '400,000 so‘m ($30)',
        advance: 200000
    },

    webapp: {
        title: '📱 Web Application',
        name: 'Murakkab veb-ilova / Web Application',
        price: 2000000,
        priceText: '2,000,000 so‘m ($160)',
        advance: 1000000
    },

    finance: {
        title: '🏦 Bank / Moliya tizimi',
        name: 'Bank / Moliya / Fintech tizimi',
        price: 2500000,
        priceText: '2,500,000 so‘m ($200)',
        advance: 1250000
    },

    taxi: {
        title: '🚕 Taksi / Logistika',
        name: 'Taksi / Logistika avtomatlashtirish',
        price: 800000,
        priceText: '800,000 so‘m ($65)',
        advance: 400000
    }
};

function servicesKeyboard() {

    return Markup.inlineKeyboard([

        [
            Markup.button.callback(
                '🚀 Landing Page',
                'srv_landing'
            )
        ],

        [
            Markup.button.callback(
                '🛒 E-Commerce',
                'srv_shop'
            )
        ],

        [
            Markup.button.callback(
                '🏢 Korporativ veb-sayt',
                'srv_corporate'
            )
        ],

        [
            Markup.button.callback(
                '🤖 Telegram Bot',
                'srv_bot'
            )
        ],

        [
            Markup.button.callback(
                '📱 Web Application',
                'srv_webapp'
            )
        ]

    ]);
}

bot.hears(
    [
        '⚙️ Xizmatlar va Narxlar',
        '⚙️ Услуги и Прайс',
        '⚙️ Services & Pricing'
    ],
    async (ctx) => {

        return ctx.reply(
`🛠 <b>Bilol | Web Developer</b>

Professional xizmatlarimiz:

💡 <b>Muhim eslatma:</b>
Narxlar loyihaning murakkabligiga qarab yana kelishiladi. Hamyonbop va sifatli natija.

📌 <b>To‘lov sharti:</b>
Barcha loyihalar uchun 50% oldindan to‘lov amalga oshiriladi.

👇 Quyidagi yo‘nalishlardan birini tanlang:`,
            {
                parse_mode: 'HTML',
                ...servicesKeyboard()
            }
        );
    }
);

// =======================================================
// SERVICE DETAIL
// =======================================================

bot.action(/^srv_(.+)$/, async (ctx) => {

    const type = ctx.match[1];

    const service = SERVICES[type];

    if (!service) {
        return ctx.answerCbQuery(
            'Xizmat topilmadi.',
            { show_alert: true }
        );
    }

    await ctx.answerCbQuery();

    return ctx.reply(
`${service.title}

📌 <b>Xizmat:</b> ${escapeHtml(service.name)}

💰 <b>Narxi:</b> ${service.priceText} dan boshlanadi

⏱ <b>Muddat:</b> loyiha murakkabligiga qarab belgilanadi.

🤝 <b>Kelishuv:</b> yakuniy narx loyiha talablari asosida kelishiladi.

💳 <b>50% oldindan:</b> ${service.advance.toLocaleString('uz-UZ')} so‘m

👇 Shu xizmatga buyurtma berish:`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '✨ Shu xizmatga buyurtma berish',
                        `order_${type}`
                    )
                ]
            ])
        }
    );
});

// =======================================================
// ORDER START
// =======================================================

bot.action(/^order_(.+)$/, async (ctx) => {

    const type = ctx.match[1];

    const service = SERVICES[type];

    if (!service) {
        return ctx.answerCbQuery(
            'Xizmat topilmadi.',
            { show_alert: true }
        );
    }

    stmts.prepare(`
        UPDATE users
        SET pending_service = ?,
            min_budget_uzs = ?,
            state = 'waiting_agreement'
        WHERE id = ?
    `).run(
        type,
        service.price,
        ctx.from.id
    );

    await ctx.answerCbQuery();

    return askAgreement(ctx);
});

bot.hears(
    [
        '💻 Loyihaga buyurtma',
        '💻 Заказать проект',
        '💻 Order Project'
    ],
    async (ctx) => {

        stmts.prepare(`
            UPDATE users
            SET pending_service = 'general',
                min_budget_uzs = 0,
                state = 'waiting_agreement'
            WHERE id = ?
        `).run(ctx.from.id);

        return askAgreement(ctx);
    }
);

function askAgreement(ctx) {

    return ctx.reply(
`🤝 <b>Buyurtma shartlari bilan tanishish</b>

Barcha loyihalar uchun <b>50% oldindan to‘lov</b> amalga oshiriladi.

Qolgan narx loyiha murakkabligiga qarab o‘zaro kelishiladi.

Ushbu shartga rozimisiz?`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
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
            ])
        }
    );
}

bot.action('agree_no', async (ctx) => {

    stmts.resetOrder.run(ctx.from.id);

    await ctx.answerCbQuery(
        'Buyurtma bekor qilindi.'
    );

    return ctx.reply(
        '❌ Buyurtma jarayoni bekor qilindi.',
        getMainMenu(
            getLang(ctx.from.id),
            ctx.from.id
        )
    );
});

bot.action('agree_yes', async (ctx) => {

    await ctx.answerCbQuery(
        'Rozilik qabul qilindi.'
    );

    setState(
        ctx.from.id,
        'waiting_name'
    );

    return ctx.reply(
`✅ <b>Rozilik qabul qilindi.</b>

Ajoyib tanlov! 🚀

📝 <b>Ism va familiyangizni to‘liq kiriting.</b>

Masalan:
<code>Alisherbek Usmonov</code>

⚠️ Ism va familiya kamida 2 ta so‘z bo‘lishi kerak.`,
        { parse_mode: 'HTML' }
    );
});

// =======================================================
// PORTFOLIO
// =======================================================

bot.hears(
    [
        '💻 Bizning ishlar',
        '💻 Портфолио проектов',
        '💻 Portfolio'
    ],
    async (ctx) => {

        const text =
`💻 <b>Bilol | Web Developer</b>

Biz amalga oshirgan eng so‘nggi muvaffaqiyatli loyihalar:

O‘zingizga yoqqan namunani ko‘rib chiqing 👇`;

        const keyboard = Markup.inlineKeyboard([

            [
                Markup.button.url(
                    '🌐 Humo Garden',
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
                    'https://app.netlify.com/projects/lighthearted-creponne-62b31a/overview'
                )
            ],

            [
                Markup.button.url(
                    '💬 Buyurtma berish',
                    ADMIN_URL
                )
            ]

        ]);

        return ctx.reply(
            text,
            {
                parse_mode: 'HTML',
                ...keyboard
            }
        );
    }
);

// =======================================================
// BRAND / INFO
// =======================================================

bot.hears(
    [
        '🚀 Biz haqimizda'
    ],
    async (ctx) => {

        return ctx.reply(
`🚀 <b>BILOL | WEB DEVELOPER</b>

Biznesingiz uchun zamonaviy raqamli mahsulotlar yaratamiz.

💻 <b>Web-saytlar</b>
Biznes, landing, korporativ, katalog

🛒 <b>Online do‘konlar</b>
E-commerce va buyurtma tizimlari

🤖 <b>Telegram botlar</b>
Avtomatlashtirish va biznes botlar

🧠 <b>AI yechimlar</b>
AI botlar va aqlli tizimlar

📱 <b>Web ilovalar</b>
Maxsus platformalar va servislar

🎨 <b>Logo & dizayn</b>
Brend va vizual yechimlar

✨ <b>Animatsiya</b>
Logo, reklama va motion dizayn`,
            { parse_mode: 'HTML' }
        );
    }
);

// =======================================================
// ORDER TEXT PROCESSING
// =======================================================

bot.on('text', async (ctx, next) => {

    const userId = ctx.from.id;
    const text = ctx.message.text.trim();

    const user = getUser(userId);

    if (!user) {
        ensureUser(ctx);
        return next();
    }

    // Admin password
    if (
        isAdmin(userId) &&
        user.state === 'admin_password'
    ) {

        if (text === ADMIN_PASSWORD) {

            setState(
                userId,
                ''
            );

            return showAdminPanel(ctx);
        }

        return ctx.reply(
            '❌ Parol noto‘g‘ri. Qaytadan kiriting:'
        );
    }

    // Broadcast
    if (
        isAdmin(userId) &&
        user.state === 'broadcast'
    ) {

        setState(userId, '');

        return broadcastText(
            ctx,
            text
        );
    }

    // Add menu
    if (
        isAdmin(userId) &&
        user.state === 'add_menu'
    ) {

        return handleAddMenuText(
            ctx,
            text
        );
    }

    // Add menu URL
    if (
        isAdmin(userId) &&
        user.state === 'add_menu_url'
    ) {

        return handleAddMenuUrl(
            ctx,
            text
        );
    }

    // Delete menu
    if (
        isAdmin(userId) &&
        user.state === 'delete_menu'
    ) {

        const id = Number(text);

        if (!Number.isInteger(id)) {
            return ctx.reply(
                '❌ Menu ID raqamini yuboring.'
            );
        }

        const result = stmts.deleteMenu.run(id);

        setState(userId, '');

        return ctx.reply(
            result.changes
                ? '✅ Menyu o‘chirildi.'
                : '❌ Bunday menu topilmadi.',
            adminKeyboard()
        );
    }

    // User name
    if (
        user.state === 'waiting_name'
    ) {

        const words = text
            .split(/\s+/)
            .filter(Boolean);

        if (words.length < 2) {

            return ctx.reply(
`❌ <b>Ism va familiya to‘liq bo‘lishi kerak.</b>

Masalan:
<code>Alisherbek Usmonov</code>`,
                { parse_mode: 'HTML' }
            );
        }

        stmts.prepare(`
            UPDATE users
            SET client_full_name = ?,
                state = 'waiting_description'
            WHERE id = ?
        `).run(
            text,
            userId
        );

        return ctx.reply(
`🎯 <b>Ajoyib!</b>

Endi qisqacha <b>nima buyurtma qilmoqchisiz</b> va loyihangiz haqida batafsil yozib yuboring.

Masalan:
• Web sayt
• Online do‘kon
• Telegram bot
• Ilova
• Taksi tizimi
• Landing Page

⚠️ Agar kerakli yo‘nalish bizdagi xizmatlarda bo‘lmasa, sizni admin bilan bog‘laymiz.`,
            { parse_mode: 'HTML' }
        );
    }

    // Project description
    if (
        user.state === 'waiting_description'
    ) {

        if (text.length < 4) {

            return ctx.reply(
                '❌ Loyihangiz haqida batafsilroq yozing.'
            );
        }

        const result = detectService(text);

        if (!result) {

            setState(
                userId,
                ''
            );

            return ctx.reply(
`❌ <b>Bu yo‘nalish bo‘yicha tayyor xizmat turi topilmadi.</b>

Batafsil ma’lumot va narxni kelishish uchun admin bilan bog‘laning:`,
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.url(
                                '💬 Admin bilan bog‘lanish',
                                ADMIN_URL
                            )
                        ],
                        [
                            Markup.button.callback(
                                '🔙 Asosiy menyu',
                                'back_menu'
                            )
                        ]
                    ])
                }
            );
        }

        stmts.prepare(`
            UPDATE users
            SET pending_service = ?,
                order_description = ?,
                min_budget_uzs = ?,
                state = 'waiting_budget'
            WHERE id = ?
        `).run(
            result.type,
            text,
            result.price,
            userId
        );

        return ctx.reply(
`💡 <b>Tushunarli.</b>

Demak, bu:
<b>${escapeHtml(result.name)}</b>

📌 Bunday loyiha narxi:
<b>${escapeHtml(result.priceText)} dan boshlanadi.</b>

💰 <b>Aniq budjetingizni kiriting.</b>

⚠️ Budjet ushbu minimal summadan kam bo‘lmasligi kerak.`,
            { parse_mode: 'HTML' }
        );
    }

    // Budget
    if (
        user.state === 'waiting_budget'
    ) {

        const result = validateBudget(
            text,
            user.min_budget_uzs
        );

        if (!result.valid) {

            return ctx.reply(
`❌ <b>Budjet minimal summadan kam.</b>

📌 Minimal budjet:
<b>${user.min_budget_uzs.toLocaleString('uz-UZ')} so‘m</b>

Masalan:
<code>${user.min_budget_uzs.toLocaleString('uz-UZ')}</code>`,
                { parse_mode: 'HTML' }
            );
        }

        stmts.prepare(`
            UPDATE users
            SET client_budget = ?,
                state = 'waiting_order_phone'
            WHERE id = ?
        `).run(
            text,
            userId
        );

        return ctx.reply(
`📞 <b>Ajoyib! Oxirgi qadam.</b>

Aloqa uchun telefon raqamingizni yuboring.

👇 Pastdagi tugmani bosing.

⚠️ Telefon raqamini qo‘lda yozish mumkin emas.`,
            {
                parse_mode: 'HTML',
                ...Markup.keyboard([
                    [
                        Markup.button.contactRequest(
                            '📱 Telefon raqamimni yuborish'
                        )
                    ]
                ]).resize()
            }
        );
    }

    // Review text
    if (
        user.state === 'review_text'
    ) {

        setState(
            userId,
            ''
        );

        stmts.insertReview.run(
            userId,
            0,
            text
        );

        await bot.telegram.sendMessage(
            ADMIN_ID,
`💬 <b>YANGI MIJOZ FIKRI</b>

👤 ${escapeHtml(
                `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`
            )}

🔗 @${escapeHtml(ctx.from.username || 'username_yoq')}

🆔 <code>${userId}</code>

📝 ${escapeHtml(text)}`,
            { parse_mode: 'HTML' }
        );

        return ctx.reply(
            '✅ Fikringiz adminga yuborildi. Rahmat! ❤️'
        );
    }

    // Complaint
    if (
        user.state === 'complaint'
    ) {

        setState(
            userId,
            ''
        );

        stmts.insertComplaint.run(
            userId,
            text
        );

        await bot.telegram.sendMessage(
            ADMIN_ID,
`🚨 <b>YANGI SHIKOYAT</b>

👤 ${escapeHtml(
                `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`
            )}

🔗 @${escapeHtml(ctx.from.username || 'username_yoq')}

🆔 <code>${userId}</code>

📝 <b>Shikoyat:</b>
${escapeHtml(text)}`,
            { parse_mode: 'HTML' }
        );

        return ctx.reply(
            '✅ Shikoyatingiz adminga yuborildi.'
        );
    }

    return next();
});

// =======================================================
// SERVICE DETECTOR
// =======================================================

function detectService(text) {

    const t = text
        .toLowerCase()
        .replace(/’/g, "'");

    // WEB APP / ILOVA FIRST
    if (
        t.includes('ilova') ||
        t.includes('app') ||
        t.includes('web application') ||
        t.includes('veb-ilova') ||
        t.includes('platforma')
    ) {

        return {
            type: 'webapp',
            name: SERVICES.webapp.name,
            price: SERVICES.webapp.price,
            priceText: SERVICES.webapp.priceText
        };
    }

    if (
        t.includes('bank') ||
        t.includes('moliya') ||
        t.includes('fintech') ||
        t.includes('kredit')
    ) {

        return {
            type: 'finance',
            name: SERVICES.finance.name,
            price: SERVICES.finance.price,
            priceText: SERVICES.finance.priceText
        };
    }

    if (
        t.includes('taksi') ||
        t.includes('taxi') ||
        t.includes('logistika') ||
        t.includes('dostavka')
    ) {

        return {
            type: 'taxi',
            name: SERVICES.taxi.name,
            price: SERVICES.taxi.price,
            priceText: SERVICES.taxi.priceText
        };
    }

    if (
        t.includes('bot') ||
        t.includes('telegram')
    ) {

        return {
            type: 'bot',
            name: SERVICES.bot.name,
            price: SERVICES.bot.price,
            priceText: SERVICES.bot.priceText
        };
    }

    if (
        t.includes('do‘kon') ||
        t.includes("do'kon") ||
        t.includes('magazin') ||
        t.includes('shop') ||
        t.includes('savdo') ||
        t.includes('uzum') ||
        t.includes('market') ||
        t.includes('online shop') ||
        t.includes('onlayn do')
    ) {

        return {
            type: 'shop',
            name: SERVICES.shop.name,
            price: SERVICES.shop.price,
            priceText: SERVICES.shop.priceText
        };
    }

    if (
        t.includes('korporativ') ||
        t.includes('kompaniya sayti')
    ) {

        return {
            type: 'corporate',
            name: SERVICES.corporate.name,
            price: SERVICES.corporate.price,
            priceText: SERVICES.corporate.priceText
        };
    }

    if (
        t.includes('landing') ||
        t.includes('sayt') ||
        t.includes('website') ||
        t.includes('web sayt') ||
        t.includes('veb sayt') ||
        t.includes('site') ||
        t.includes('vizitka')
    ) {

        return {
            type: 'landing',
            name: SERVICES.landing.name,
            price: SERVICES.landing.price,
            priceText: SERVICES.landing.priceText
        };
    }

    return null;
}

// =======================================================
// BUDGET VALIDATOR
// =======================================================

function validateBudget(text, minUzs) {

    const normalized = text
        .toLowerCase()
        .replace(/\s/g, '');

    const isDollar =
        normalized.includes('$') ||
        normalized.includes('usd') ||
        normalized.includes('dollar');

    const digits = normalized
        .replace(/[^0-9]/g, '');

    if (!digits) {
        return {
            valid: false
        };
    }

    const number = Number(digits);

    if (!Number.isFinite(number)) {
        return {
            valid: false
        };
    }

    if (isDollar) {

        const minDollar = Math.ceil(
            minUzs / 12500
        );

        return {
            valid: number >= minDollar,
            value: number
        };
    }

    return {
        valid: number >= minUzs,
        value: number
    };
}

// =======================================================
// GAME
// =======================================================

bot.hears(
    [
        '🎮 15% Chegirma yutish',
        '🎮 Выиграть скидку 15%',
        '🎮 Win 15% Discount'
    ],
    async (ctx) => {

        const user = getUser(ctx.from.id);

        if (user.has_played) {

            return ctx.reply(
`⚠️ <b>Siz bu aksiyada allaqachon qatnashgansiz.</b>

Imkoniyat faqat <b>1 marta</b> beriladi.`,
                { parse_mode: 'HTML' }
            );
        }

        const winningBox =
            Math.floor(Math.random() * 3) + 1;

        stmts.prepare(`
            UPDATE users
            SET state = ?
            WHERE id = ?
        `).run(
            `game:${winningBox}`,
            ctx.from.id
        );

        return ctx.reply(
`🎮 <b>AKSIYALI O‘YIN</b>

Kanalga obuna bo‘lganingiz uchun sizga maxsus imkoniyat berildi! 🎁

3 ta qutidan birini tanlang.

🏆 Yutsangiz:
<b>15% chegirma</b>

⚠️ Imkoniyat faqat 1 marta.`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            '🎁 1-QUTI',
                            'box_1'
                        ),
                        Markup.button.callback(
                            '🎁 2-QUTI',
                            'box_2'
                        ),
                        Markup.button.callback(
                            '🎁 3-QUTI',
                            'box_3'
                        )
                    ]
                ])
            }
        );
    }
);

bot.action(/^box_([1-3])$/, async (ctx) => {

    const user = getUser(ctx.from.id);

    if (user.has_played) {

        return ctx.answerCbQuery(
            'Siz allaqachon o‘ynagansiz.',
            { show_alert: true }
        );
    }

    const winningBox =
        Number(
            String(user.state || '')
                .replace('game:', '')
        );

    const choice =
        Number(ctx.match[1]);

    stmts.prepare(`
        UPDATE users
        SET has_played = 1,
            state = ''
        WHERE id = ?
    `).run(ctx.from.id);

    await ctx.answerCbQuery();

    if (choice === winningBox) {

        stmts.prepare(`
            UPDATE users
            SET has_discount = 1,
                discount_code = 'BILOL15-2026'
            WHERE id = ?
        `).run(ctx.from.id);

        return ctx.reply(
`🎉 <b>TABRIKLAYMIZ!</b>

🏆 Siz <b>15% CHEGIRMA</b> yutdingiz!

🎟 Promokod:
<code>BILOL15-2026</code>

Buyurtma berishda ushbu promokodni ayting.

⚠️ Chegirma faqat 1 marta ishlatiladi.`,
            { parse_mode: 'HTML' }
        );
    }

    return ctx.reply(
`😔 <b>Afsus!</b>

Bu safar yutuq chiqmadi.

🎁 Aksiya imkoniyati 1 marta beriladi.`,
        { parse_mode: 'HTML' }
    );
});

// =======================================================
// REVIEWS
// =======================================================

bot.hears(
    [
        '⭐️ Mijozlar fikri',
        '⭐️ Отзывы клиентов',
        '⭐️ Client Reviews'
    ],
    async (ctx) => {

        return ctx.reply(
`⭐️ <b>MIJOZLAR FIKRI</b>

Bizning xizmatimizdan foydalangan bo‘lsangiz, o‘z fikringizni qoldiring.

👇 Baholang:`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            '⭐️ 1',
                            'rate_1'
                        ),
                        Markup.button.callback(
                            '⭐️ 2',
                            'rate_2'
                        ),
                        Markup.button.callback(
                            '⭐️ 3',
                            'rate_3'
                        )
                    ],
                    [
                        Markup.button.callback(
                            '⭐️ 4',
                            'rate_4'
                        ),
                        Markup.button.callback(
                            '⭐️ 5',
                            'rate_5'
                        )
                    ],
                    [
                        Markup.button.callback(
                            '✍️ Fikr yozish',
                            'leave_review'
                        )
                    ]
                ])
            }
        );
    }
);

bot.action(/^rate_([1-5])$/, async (ctx) => {

    const rating =
        Number(ctx.match[1]);

    stmts.insertReview.run(
        ctx.from.id,
        rating,
        ''
    );

    await ctx.answerCbQuery(
        `${rating} yulduz qabul qilindi.`
    );

    return ctx.reply(
`❤️ <b>Rahmat!</b>

Siz Bilol | Web Developer botiga <b>${rating} ta yulduz</b> baho berdingiz.

Biz siz uchun yanada yaxshilashga harakat qilamiz!`,
        { parse_mode: 'HTML' }
    );
});

bot.action('leave_review', async (ctx) => {

    setState(
        ctx.from.id,
        'review_text'
    );

    await ctx.answerCbQuery();

    return ctx.reply(
        '✍️ Fikringizni yozib yuboring:',
        { parse_mode: 'HTML' }
    );
});

// =======================================================
// COMPLAINT
// =======================================================

bot.hears(
    [
        '📝 Shikoyat qoldirish',
        '📝 Жалоба',
        '📝 Complaint'
    ],
    async (ctx) => {

        setState(
            ctx.from.id,
            'complaint'
        );

        return ctx.reply(
`📝 <b>Shikoyat yoki taklifingizni yozing.</b>

Xabaringiz to‘g‘ridan-to‘g‘ri adminga yuboriladi.`,
            { parse_mode: 'HTML' }
        );
    }
);

// =======================================================
// CONTACTS
// =======================================================

bot.hears(
    [
        '📞 Biz bilan bog‘lanish',
        '📞 Контакты',
        '📞 Contacts'
    ],
    async (ctx) => {

        return ctx.reply(
`📬 <b>BIZ BILAN BOG‘LANISH</b>

📢 <b>Telegram kanal:</b>
https://t.me/webuzbekistan

📸 <b>Instagram:</b>
https://www.instagram.com/webi.uz

💬 <b>Aloqa:</b>
https://t.me/sharipoov1

📞 <b>Telefon:</b>
${CONTACT_PHONE}`,
            {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
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
                            '💬 Admin bilan aloqa',
                            ADMIN_URL
                        )
                    ]
                ])
            }
        );
    }
);

// =======================================================
// CUSTOM MENU CLICK
// =======================================================

bot.hears(/^.+$/, async (ctx, next) => {

    const text = ctx.message.text;

    const custom = stmts.prepare(`
        SELECT * FROM custom_menu
        WHERE title = ?
        AND active = 1
        LIMIT 1
    `).get(text);

    if (!custom) {
        return next();
    }

    if (custom.url) {

        return ctx.reply(
            `🔗 <b>${escapeHtml(custom.title)}</b>`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.url(
                            '🌐 Ochish',
                            custom.url
                        )
                    ]
                ])
            }
        );
    }

    return ctx.reply(
        escapeHtml(custom.text || custom.title),
        { parse_mode: 'HTML' }
    );
});

// =======================================================
// ADMIN COMMAND
// =======================================================

bot.command('admin', async (ctx) => {

    if (!isAdmin(ctx.from.id)) {
        return;
    }

    setState(
        ctx.from.id,
        'admin_password'
    );

    return ctx.reply(
`🔐 <b>ADMIN PANEL</b>

Maxfiy parolni kiriting:`,
        { parse_mode: 'HTML' }
    );
});

// =======================================================
// ADMIN KEYBOARD
// =======================================================

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
                '📢 Reklama tarqatish',
                'adm_broadcast'
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
                '➕ Menyu qo‘shish',
                'adm_add_menu'
            )
        ],

        [
            Markup.button.callback(
                '🗑 Menyu o‘chirish',
                'adm_delete_menu'
            )
        ],

        [
            Markup.button.callback(
                '🔄 Bot ma’lumotlarini yangilash',
                'adm_refresh'
            )
        ]

    ]);
}

function showAdminPanel(ctx) {

    return ctx.reply(
`🛡 <b>BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER</b>

┏ Xavfsizlik darajasi: <code>100%</code>
┣ Tizim holati: <code>Barqaror / Ishlayapti ⚡️</code>
┗ Boshqaruv uchun menyudan foydalaning: 👇`,
        {
            parse_mode: 'HTML',
            ...adminKeyboard()
        }
    );
}

// =======================================================
// ADMIN STATS
// =======================================================

bot.action('adm_stats', async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    await ctx.answerCbQuery();

    const total =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM users
        `).get().c;

    const active =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM users
            WHERE blocked = 0
        `).get().c;

    const blocked =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM users
            WHERE blocked = 1
        `).get().c;

    const orders =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM orders
        `).get().c;

    const newOrders =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM orders
            WHERE status = 'new'
        `).get().c;

    const complaints =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM complaints
        `).get().c;

    const newComplaints =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM complaints
            WHERE status = 'new'
        `).get().c;

    const reviews =
        db.prepare(`
            SELECT COUNT(*) AS c
            FROM reviews
        `).get().c;

    const uptimeSec =
        Math.floor(
            (Date.now() - startTime) / 1000
        );

    const hours =
        Math.floor(uptimeSec / 3600);

    const minutes =
        Math.floor(
            (uptimeSec % 3600) / 60
        );

    return ctx.editMessageText(
`📊 <b>BILOL | WEB DEVELOPER — STATISTIKA</b>

━━━━━━━━━━━━━━━━━━━━━━

👥 <b>FOYDALANUVCHILAR</b>

👥 Jami: <b>${total}</b>
🟢 Aktiv: <b>${active}</b>
🚫 Bloklangan: <b>${blocked}</b>

━━━━━━━━━━━━━━━━━━━━━━

📦 <b>ZAKAZLAR</b>

📦 Jami: <b>${orders}</b>
🆕 Yangi: <b>${newOrders}</b>
🔄 Jarayonda: <b>0</b>
✅ Tasdiqlangan: <b>0</b>
❌ Bekor qilingan: <b>0</b>

━━━━━━━━━━━━━━━━━━━━━━

📝 <b>SHIKOYATLAR</b>

📝 Jami: <b>${complaints}</b>
🚨 Yangi: <b>${newComplaints}</b>

━━━━━━━━━━━━━━━━━━━━━━

⭐️ <b>SHARHLAR</b>

⭐️ Jami: <b>${reviews}</b>

━━━━━━━━━━━━━━━━━━━━━━

⏱ <b>UPTIME:</b>
${hours} soat ${minutes} daqiqa

💾 <b>SQLite:</b> FAOL
🤖 <b>Telegraf:</b> FAOL`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '🔙 Orqaga',
                        'adm_back'
                    )
                ]
            ])
        }
    ).catch(() => {});
});

// =======================================================
// ADMIN USERS
// =======================================================

bot.action('adm_users', async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    await ctx.answerCbQuery();

    return showAdminUsers(ctx);
});

async function showAdminUsers(ctx) {

    const users =
        stmts.getAllUsers.all();

    if (!users.length) {

        return ctx.reply(
            '👥 Hozircha foydalanuvchilar yo‘q.',
            adminKeyboard()
        );
    }

    const buttons = [];

    for (const user of users.slice(0, 30)) {

        const name =
            `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
            'Noma’lum';

        const status =
            user.blocked
                ? '🚫'
                : '🟢';

        buttons.push([
            Markup.button.callback(
                `${status} ${name.substring(0, 30)}`,
                `user_${user.id}`
            )
        ]);
    }

    buttons.push([
        Markup.button.callback(
            '🔙 Orqaga',
            'adm_back'
        )
    ]);

    return ctx.reply(
`👥 <b>FOYDALANUVCHILAR</b>

Jami:
<b>${users.length}</b> ta

🟢 Faol
🚫 Bloklangan

Kerakli foydalanuvchini tanlang:`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        }
    );
}

// =======================================================
// USER CARD
// =======================================================

bot.action(/^user_(\d+)$/, async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    const id =
        Number(ctx.match[1]);

    const user =
        stmts.getUserById.get(id);

    if (!user) {

        return ctx.answerCbQuery(
            'Foydalanuvchi topilmadi.',
            { show_alert: true }
        );
    }

    await ctx.answerCbQuery();

    const name =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        'Noma’lum';

    const username =
        user.username
            ? `@${user.username}`
            : 'Yo‘q';

    const status =
        user.blocked
            ? '🚫 BLOKLANGAN'
            : '🟢 FAOL';

    const keyboard = [];

    if (user.blocked) {

        keyboard.push([
            Markup.button.callback(
                '🟢 Blokdan chiqarish',
                `unblock_${id}`
            )
        ]);

    } else {

        keyboard.push([
            Markup.button.callback(
                '🚫 Block qilish',
                `block_${id}`
            )
        ]);
    }

    keyboard.push([
        Markup.button.callback(
            '🔙 Foydalanuvchilar',
            'adm_users'
        )
    ]);

    return ctx.reply(
`👤 <b>FOYDALANUVCHI</b>

━━━━━━━━━━━━━━━━━━━━━━

👤 <b>Ism:</b>
${escapeHtml(name)}

🔗 <b>Username:</b>
${escapeHtml(username)}

🆔 <b>Telegram ID:</b>
<code>${user.id}</code>

📞 <b>Telefon:</b>
${escapeHtml(
        user.phone
            ? '+' + user.phone
            : 'Yo‘q'
    )}

📞 <b>2-telefon:</b>
${escapeHtml(
        user.phone2
            ? '+' + user.phone2
            : 'Yo‘q'
    )}

🕐 <b>Ro‘yxatdan o‘tgan:</b>
${escapeHtml(user.created_at)}

🕐 <b>Oxirgi faollik:</b>
${escapeHtml(user.last_seen)}

📊 <b>Status:</b>
${status}

📢 <b>Kanal:</b>
${user.subscribed ? '✅' : '❌'}

📸 <b>Instagram:</b>
${user.instagram_confirmed ? '✅' : '❌'}

📱 <b>Telefon tasdiqlangan:</b>
${user.phone_verified ? '✅' : '❌'}

🎁 <b>O‘yin:</b>
${user.has_played ? 'O‘ynagan' : 'O‘ynamagan'}

🏷 <b>Chegirma:</b>
${user.has_discount ? '15% BOR' : 'Yo‘q'}`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(keyboard)
        }
    );
});

// =======================================================
// BLOCK
// =======================================================

bot.action(/^block_(\d+)$/, async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    const id =
        Number(ctx.match[1]);

    if (String(id) === String(ADMIN_ID)) {

        return ctx.answerCbQuery(
            'Adminni bloklab bo‘lmaydi.',
            { show_alert: true }
        );
    }

    const user =
        stmts.getUserById.get(id);

    if (!user) {

        return ctx.answerCbQuery(
            'User topilmadi.',
            { show_alert: true }
        );
    }

    stmts.blockUser.run(id);

    await ctx.answerCbQuery(
        '🚫 Foydalanuvchi bloklandi.'
    );

    try {

        await bot.telegram.sendMessage(
            id,
`🚫 <b>Botdan foydalanish imkoniyatingiz bloklandi.</b>

Agar bu xato deb hisoblasangiz, admin bilan bog‘laning.`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.url(
                            '💬 Admin',
                            ADMIN_URL
                        )
                    ]
                ])
            }
        );

    } catch (_) {}

    return ctx.reply(
        '🚫 Foydalanuvchi bloklandi.'
    );
});

// =======================================================
// UNBLOCK
// =======================================================

bot.action(/^unblock_(\d+)$/, async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    const id =
        Number(ctx.match[1]);

    stmts.unblockUser.run(id);

    await ctx.answerCbQuery(
        '🟢 Blokdan chiqarildi.'
    );

    try {

        await bot.telegram.sendMessage(
            id,
`🟢 <b>Sizning botdan foydalanish imkoniyatingiz qayta yoqildi.</b>

Botga /start yuboring.`,
            { parse_mode: 'HTML' }
        );

    } catch (_) {}

    return ctx.reply(
        '🟢 Foydalanuvchi blokdan chiqarildi.'
    );
});

// =======================================================
// BROADCAST
// =======================================================

bot.action('adm_broadcast', async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    setState(
        ctx.from.id,
        'broadcast'
    );

    await ctx.answerCbQuery();

    return ctx.reply(
`📢 <b>UNIVERSAL REKLAMA REJIMI</b>

Endi yuborgan xabaringiz botdan foydalangan barcha foydalanuvchilarga yuboriladi.

🖼 Rasm
📹 Video
📄 Matn
📎 Fayl
🎵 Audio

⚠️ Yuborgan xabaringiz barcha aktiv foydalanuvchilarga tarqatiladi.

Bekor qilish:
<code>/cancel</code>`,
        { parse_mode: 'HTML' }
    );
});

async function broadcastText(ctx, text) {

    const users =
        db.prepare(`
            SELECT id
            FROM users
            WHERE blocked = 0
        `).all();

    let success = 0;
    let failed = 0;

    await ctx.reply(
        `⏳ ${users.length} ta foydalanuvchiga yuborilmoqda...`
    );

    for (const user of users) {

        try {

            await bot.telegram.sendMessage(
                user.id,
                text
            );

            success++;

        } catch (error) {

            failed++;
        }
    }

    return ctx.reply(
`✅ <b>REKLAMA YAKUNLANDI</b>

📤 Yuborildi: <b>${success}</b>
❌ Yetib bormadi: <b>${failed}</b>

👥 Jami aktiv: <b>${users.length}</b>`,
        { parse_mode: 'HTML' }
    );
}

// =======================================================
// ADD MENU
// =======================================================

bot.action('adm_add_menu', async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    setState(
        ctx.from.id,
        'add_menu'
    );

    await ctx.answerCbQuery();

    return ctx.reply(
`➕ <b>YANGI MENYU QO‘SHISH</b>

Avval menyu nomini yuboring.

Masalan:
<code>🔥 Maxsus Taklif</code>`,
        { parse_mode: 'HTML' }
    );
});

async function handleAddMenuText(
    ctx,
    title
) {

    stmts.prepare(`
        UPDATE users
        SET client_full_name = ?
        WHERE id = ?
    `).run(
        title,
        ctx.from.id
    );

    setState(
        ctx.from.id,
        'add_menu_url'
    );

    return ctx.reply(
`🔗 Endi URL yuboring.

Masalan:
<code>https://example.com</code>

Agar URL bo‘lmasa:
<code>none</code>`,
        { parse_mode: 'HTML' }
    );
}

async function handleAddMenuUrl(
    ctx,
    url
) {

    const admin =
        getUser(ctx.from.id);

    const title =
        admin.client_full_name || 'Yangi menyu';

    let finalUrl = url;

    if (
        url.toLowerCase() === 'none'
    ) {
        finalUrl = '';
    }

    stmts.insertMenu.run(
        title,
        finalUrl,
        ''
    );

    stmts.prepare(`
        UPDATE users
        SET client_full_name = ''
        WHERE id = ?
    `).run(ctx.from.id);

    setState(
        ctx.from.id,
        ''
    );

    return ctx.reply(
`✅ <b>Yangi menyu qo‘shildi!</b>

📌 Nomi:
${escapeHtml(title)}

🔗 URL:
${escapeHtml(finalUrl || 'URL yo‘q')}

Botni qayta ishga tushirib tekshirishingiz mumkin.`,
        {
            parse_mode: 'HTML',
            ...adminKeyboard()
        }
    );
}

// =======================================================
// DELETE MENU
// =======================================================

bot.action('adm_delete_menu', async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    await ctx.answerCbQuery();

    const menus =
        db.prepare(`
            SELECT * FROM custom_menu
            ORDER BY id ASC
        `).all();

    if (!menus.length) {

        return ctx.reply(
            '📭 Hozircha custom menyular yo‘q.'
        );
    }

    let text =
`🗑 <b>CUSTOM MENYULAR</b>

`;

    for (const menu of menus) {

        text +=
`${menu.id}. <b>${escapeHtml(menu.title)}</b>
${escapeHtml(menu.url || 'URL yo‘q')}

`;
    }

    text +=
`O‘chirish uchun menu ID raqamini yuboring.`;

    setState(
        ctx.from.id,
        'delete_menu'
    );

    return ctx.reply(
        text,
        { parse_mode: 'HTML' }
    );
});

// =======================================================
// ADMIN REFRESH
// =======================================================

bot.action('adm_refresh', async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    await ctx.answerCbQuery(
        'Ma’lumotlar yangilandi.'
    );

    return ctx.reply(
`🔄 <b>BOT MA’LUMOTLARI YANGILANDI</b>

💾 SQLite baza: faol
👥 Foydalanuvchilar: ${
        db.prepare(
            'SELECT COUNT(*) AS c FROM users'
        ).get().c
    }

📦 Buyurtmalar: ${
        db.prepare(
            'SELECT COUNT(*) AS c FROM orders'
        ).get().c
    }

📝 Shikoyatlar: ${
        db.prepare(
            'SELECT COUNT(*) AS c FROM complaints'
        ).get().c
    }

⭐️ Sharhlar: ${
        db.prepare(
            'SELECT COUNT(*) AS c FROM reviews'
        ).get().c
    }

🟢 Tizim ishlayapti.`,
        {
            parse_mode: 'HTML',
            ...adminKeyboard()
        }
    );
});

// =======================================================
// ADMIN BACK
// =======================================================

bot.action('adm_back', async (ctx) => {

    if (!isAdmin(ctx.from.id)) return;

    await ctx.answerCbQuery();

    return ctx.editMessageText(
`🛡 <b>BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER</b>

┏ Xavfsizlik darajasi: <code>100%</code>
┣ Tizim holati: <code>Barqaror / Ishlayapti ⚡️</code>
┗ Boshqaruv uchun menyudan foydalaning: 👇`,
        {
            parse_mode: 'HTML',
            ...adminKeyboard()
        }
    ).catch(() => {});
});

// =======================================================
// BACK MENU
// =======================================================

bot.action('back_menu', async (ctx) => {

    await ctx.answerCbQuery();

    const lang =
        getLang(ctx.from.id);

    return ctx.reply(
        '📋 Asosiy menyu:',
        getMainMenu(
            lang,
            ctx.from.id
        )
    );
});

// =======================================================
// /CANCEL
// =======================================================

bot.command('cancel', async (ctx) => {

    setState(
        ctx.from.id,
        ''
    );

    stmts.prepare(`
        UPDATE users
        SET client_full_name = '',
            order_description = '',
            client_budget = ''
        WHERE id = ?
    `).run(ctx.from.id);

    if (isAdmin(ctx.from.id)) {

        return ctx.reply(
            '❌ Jarayon bekor qilindi.',
            adminKeyboard()
        );
    }

    return ctx.reply(
        '❌ Jarayon bekor qilindi.',
        getMainMenu(
            getLang(ctx.from.id),
            ctx.from.id
        )
    );
});

// =======================================================
// ERROR HANDLER
// =======================================================

bot.catch((err, ctx) => {

    console.error(
        'BOT ERROR:',
        err.message
    );

    try {

        ctx.reply(
            '⚠️ Texnik xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.'
        );

    } catch (_) {}
});

// =======================================================
// LAUNCH
// =======================================================

bot.launch({
    dropPendingUpdates: true
})
.then(() => {

    console.log(
        '🔥 BILOL | WEB DEVELOPER BOT ISHLADI!'
    );

    console.log(
        '💾 SQLite:',
        DB_FILE
    );

    console.log(
        '📢 Required channel:',
        REQUIRED_CHANNEL
    );

})
.catch((error) => {

    console.error(
        '❌ BOT LAUNCH ERROR:',
        error
    );
});

// =======================================================
// SHUTDOWN
// =======================================================

process.once(
    'SIGINT',
    () => bot.stop('SIGINT')
);

process.once(
    'SIGTERM',
    () => bot.stop('SIGTERM')
);