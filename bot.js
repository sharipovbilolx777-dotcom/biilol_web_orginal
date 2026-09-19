'use strict';

const { Telegraf, Markup } = require('telegraf');
const Database = require('better-sqlite3');

// ============================================================
// BILOL | WEB DEVELOPER — PROFESSIONAL TELEGRAM BOT
// ============================================================

const BOT_TOKEN = '8774770545:AAGQR4qQiWWf5AC-5OYvVhzHWkju9udZUgw';
const ADMIN_ID = '867717817';
const ADMIN_PASSWORD = '7777';

const CHANNEL_USERNAME = '@webuzbekistan';
const CHANNEL_URL = 'https://t.me/webuzbekistan';
const INSTAGRAM_URL = 'https://www.instagram.com/webi.uz';
const ADMIN_USERNAME = 'https://t.me/sharipoov1';
const ADMIN_PHONE = '+998993212122';

const bot = new Telegraf(BOT_TOKEN);
const db = new Database('bilol_bot.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const START_TIME = Date.now();

// ============================================================
// DATABASE
// ============================================================

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
    onboarding_completed INTEGER DEFAULT 0,

    blocked INTEGER DEFAULT 0,
    block_reason TEXT DEFAULT '',

    has_played INTEGER DEFAULT 0,
    has_discount INTEGER DEFAULT 0,
    promo_code TEXT DEFAULT '',

    state TEXT DEFAULT '',

    pending_service TEXT DEFAULT '',
    client_full_name TEXT DEFAULT '',
    order_description TEXT DEFAULT '',
    detected_service TEXT DEFAULT '',
    min_price INTEGER DEFAULT 0,
    client_budget TEXT DEFAULT '',

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_seen TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    rating INTEGER DEFAULT 0,
    text TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    text TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service TEXT DEFAULT '',
    full_name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    budget TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    phone2 TEXT DEFAULT '',
    discount TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bot_data (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
);
`);

// ============================================================
// DEFAULT BOT DATA
// ============================================================

const defaultData = {
    phone: ADMIN_PHONE,
    telegram: '@sharipoov1',
    instagram: '@webi.uz',
    channel: '@webuzbekistan'
};

for (const [key, value] of Object.entries(defaultData)) {
    db.prepare(`
        INSERT OR IGNORE INTO bot_data (key, value)
        VALUES (?, ?)
    `).run(key, value);
}

function getBotData(key) {
    const row = db.prepare('SELECT value FROM bot_data WHERE key = ?').get(key);
    return row ? row.value : '';
}

function setBotData(key, value) {
    db.prepare(`
        INSERT INTO bot_data (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
}

// ============================================================
// HELPERS
// ============================================================

function now() {
    return new Date().toLocaleString('uz-UZ', {
        timeZone: 'Asia/Tashkent'
    });
}

function isAdmin(ctx) {
    return String(ctx.from?.id) === String(ADMIN_ID);
}

function getUser(userId) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

function ensureUser(ctx) {
    if (!ctx.from) return null;

    const user = ctx.from;

    db.prepare(`
        INSERT INTO users (
            id,
            first_name,
            last_name,
            username,
            updated_at,
            last_seen
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            username = excluded.username,
            updated_at = CURRENT_TIMESTAMP,
            last_seen = CURRENT_TIMESTAMP
    `).run(
        user.id,
        user.first_name || '',
        user.last_name || '',
        user.username || ''
    );

    return getUser(user.id);
}

function setState(userId, state) {
    db.prepare(`
        UPDATE users
        SET state = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(state, userId);
}

function updateUser(userId, data) {
    const allowed = [
        'first_name',
        'last_name',
        'username',
        'phone',
        'phone2',
        'language',
        'subscribed',
        'instagram_confirmed',
        'onboarding_completed',
        'blocked',
        'block_reason',
        'has_played',
        'has_discount',
        'promo_code',
        'state',
        'pending_service',
        'client_full_name',
        'order_description',
        'detected_service',
        'min_price',
        'client_budget'
    ];

    const keys = Object.keys(data).filter(k => allowed.includes(k));

    if (!keys.length) return;

    const sets = keys.map(k => `${k} = @${k}`).join(', ');

    db.prepare(`
        UPDATE users
        SET ${sets},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `).run({
        ...data,
        id: userId
    });
}

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function formatPhone(phone) {
    const n = normalizePhone(phone);
    return n ? `+${n}` : 'Yo‘q';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function mainMenu(lang = 'uz') {
    if (lang === 'ru') {
        return Markup.keyboard([
            ['💻 Портфолио проектов', '⚙️ Услуги и цены'],
            ['🎮 Выиграть 15% скидку', '⭐️ Отзывы'],
            ['📞 Контакты', '💻 Заказать проект'],
            ['🌐 Изменить язык']
        ]).resize();
    }

    if (lang === 'en') {
        return Markup.keyboard([
            ['💻 Portfolio', '⚙️ Services & Pricing'],
            ['🎮 Win 15% Discount', '⭐️ Reviews'],
            ['📞 Contact', '💻 Order Project'],
            ['🌐 Change Language']
        ]).resize();
    }

    return Markup.keyboard([
        ['💻 Bizning ishlar', '⚙️ Xizmatlar va Narxlar'],
        ['🎮 15% Chegirma o‘yini', '⭐️ Mijozlar fikri'],
        ['📞 Biz bilan bog‘lanish', '💻 Buyurtma berish'],
        ['🌐 Tilni o‘zgartirish']
    ]).resize();
}

// ============================================================
// ONBOARDING
// ============================================================

function onboardingKeyboard() {
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
                '✅ Obunani tekshirish',
                'check_subscription'
            )
        ]
    ]);
}

async function sendOnboarding(ctx) {
    const text =
        '🚀 <b>Bilol | Web Developer</b>\n\n' +
        'Botdan foydalanishdan oldin quyidagi 2 ta qadamni bajaring:\n\n' +
        '1️⃣ <b>Telegram kanalga obuna bo‘ling</b>\n' +
        '2️⃣ <b>Instagram sahifamizga obuna bo‘ling</b>\n\n' +
        '📢 Kanal: @webuzbekistan\n' +
        '📸 Instagram: @webi.uz\n\n' +
        'Obuna bo‘lganingizdan keyin quyidagi tugmani bosing 👇';

    try {
        await ctx.reply(text, {
            parse_mode: 'HTML',
            ...onboardingKeyboard()
        });
    } catch (e) {
        console.log('Onboarding xatosi:', e.message);
    }
}

async function checkChannelSubscription(ctx) {
    const userId = ctx.from.id;

    try {
        const member = await ctx.telegram.getChatMember(
            CHANNEL_USERNAME,
            userId
        );

        const allowedStatuses = [
            'creator',
            'administrator',
            'member'
        ];

        if (!allowedStatuses.includes(member.status)) {
            updateUser(userId, {
                subscribed: 0,
                onboarding_completed: 0
            });

            await ctx.answerCbQuery(
                '❌ Avval kanalga obuna bo‘ling!',
                { show_alert: true }
            );

            return false;
        }

        updateUser(userId, {
            subscribed: 1
        });

        return true;

    } catch (error) {
        console.log('Kanal tekshirish xatosi:', error.message);

        await ctx.answerCbQuery(
            '⚠️ Kanalni tekshirib bo‘lmadi. Bot kanalga admin qilinganini tekshiring.',
            { show_alert: true }
        ).catch(() => {});

        return false;
    }
}

bot.action('check_subscription', async (ctx) => {
    ensureUser(ctx);

    const channelOk = await checkChannelSubscription(ctx);

    if (!channelOk) return;

    const user = getUser(ctx.from.id);

    if (!user.instagram_confirmed) {
        await ctx.answerCbQuery('✅ Kanal obunasi tasdiqlandi!', {
            show_alert: false
        }).catch(() => {});

        await ctx.editMessageText(
            '✅ <b>Telegram kanal obunasi tasdiqlandi!</b>\n\n' +
            '📸 Endi Instagram sahifamizga obuna bo‘ling:\n' +
            `<a href="${INSTAGRAM_URL}">@webi.uz</a>\n\n` +
            'Obuna bo‘lganingizdan keyin quyidagi tugmani bosing 👇',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.url(
                            '📸 Instagramga kirish',
                            INSTAGRAM_URL
                        )
                    ],
                    [
                        Markup.button.callback(
                            '✅ Instagramga obuna bo‘ldim',
                            'instagram_confirm'
                        )
                    ]
                ]
            }
        ).catch(() => {});

        return;
    }

    await requestPhone(ctx);
});

bot.action('instagram_confirm', async (ctx) => {
    ensureUser(ctx);

    const user = getUser(ctx.from.id);

    if (!user.subscribed) {
        await ctx.answerCbQuery(
            '❌ Avval Telegram kanalga obuna bo‘ling.',
            { show_alert: true }
        );
        return;
    }

    updateUser(ctx.from.id, {
        instagram_confirmed: 1
    });

    await ctx.answerCbQuery(
        '✅ Instagram tasdiqlandi!',
        { show_alert: false }
    );

    await requestPhone(ctx);
});

async function requestPhone(ctx) {
    const userId = ctx.from.id;

    updateUser(userId, {
        state: 'waiting_phone'
    });

    await ctx.reply(
        '🎉 <b>Ajoyib! Barcha obunalar tasdiqlandi.</b>\n\n' +
        '📞 Endi botdan foydalanish uchun telefon raqamingizni yuboring.\n\n' +
        '⚠️ Raqamni yozib kiritmang — faqat pastdagi ' +
        '<b>Telefon raqamimni yuborish</b> tugmasidan foydalaning.',
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

// ============================================================
// START
// ============================================================

bot.start(async (ctx) => {
    const user = ensureUser(ctx);

    // Admin har doim admin panelga kira oladi
    if (isAdmin(ctx)) {
        await ctx.reply(
            '👑 <b>Assalomu alaykum, Boss!</b>\n\n' +
            'Admin panel: /admin',
            { parse_mode: 'HTML' }
        );
        return;
    }

    if (
        user &&
        user.onboarding_completed === 1 &&
        user.blocked === 0
    ) {
        await ctx.reply(
            '👋 <b>Xush kelibsiz!</b>\n\n' +
            'Bilol | Web Developer botidan foydalanishingiz mumkin. 👇',
            {
                parse_mode: 'HTML',
                ...mainMenu(user.language || 'uz')
            }
        );
        return;
    }

    await sendOnboarding(ctx);
});

// ============================================================
// GLOBAL USER CHECK
// ============================================================

bot.use(async (ctx, next) => {
    if (!ctx.from) return next();

    ensureUser(ctx);

    // Admin uchun blok yo‘q
    if (isAdmin(ctx)) {
        return next();
    }

    const user = getUser(ctx.from.id);

    if (user?.blocked === 1) {
        await ctx.reply(
            '🚫 <b>Siz botdan bloklangansiz.</b>\n\n' +
            'Admin bilan bog‘laning:\n' +
            '👉 @sharipoov1',
            { parse_mode: 'HTML' }
        ).catch(() => {});

        return;
    }

    // Onboarding callback'lari ishlashi kerak
    if (
        ctx.callbackQuery &&
        [
            'check_subscription',
            'instagram_confirm'
        ].includes(ctx.callbackQuery.data)
    ) {
        return next();
    }

    // /start ishlashi kerak
    if (ctx.message?.text?.startsWith('/start')) {
        return next();
    }

    // Hali onboarding tugamagan bo‘lsa
    if (user?.onboarding_completed !== 1) {
        await sendOnboarding(ctx);
        return;
    }

    return next();
});

// ============================================================
// CONTACT — ONBOARDING + ORDER PHONE
// ============================================================

bot.on('contact', async (ctx) => {
    const contact = ctx.message.contact;
    const user = ensureUser(ctx);
    const userId = ctx.from.id;

    if (!contact) return;

    // Faqat o‘z raqamini yuborishi mumkin
    if (
        contact.user_id &&
        Number(contact.user_id) !== Number(userId)
    ) {
        await ctx.reply(
            '❌ Faqat o‘zingizning Telegram raqamingizni yuboring.'
        );
        return;
    }

    const phone = normalizePhone(contact.phone_number);

    // ========================================================
    // ONBOARDING PHONE
    // ========================================================

    if (user.state === 'waiting_phone') {

        updateUser(userId, {
            phone,
            onboarding_completed: 1,
            state: ''
        });

        const fresh = getUser(userId);

        const adminMessage =
            '🚨 <b>YANGI FOYDALANUVCHI KIRDI!</b>\n\n' +
            '👤 <b>Ism:</b> ' +
            escapeHtml(
                `${fresh.first_name || ''} ${fresh.last_name || ''}`.trim()
            ) +
            '\n' +
            '🔗 <b>Username:</b> ' +
            (fresh.username
                ? `@${escapeHtml(fresh.username)}`
                : 'Mavjud emas') +
            '\n' +
            '🆔 <b>Telegram ID:</b> ' +
            userId +
            '\n' +
            '📞 <b>Telefon:</b> ' +
            escapeHtml(formatPhone(phone)) +
            '\n' +
            '📢 <b>Kanal:</b> ✅' +
            '\n' +
            '📸 <b>Instagram:</b> ✅' +
            '\n' +
            '🕐 <b>Vaqt:</b> ' +
            escapeHtml(now());

        await ctx.telegram.sendMessage(
            ADMIN_ID,
            adminMessage,
            { parse_mode: 'HTML' }
        ).catch(err => {
            console.log('Admin notification error:', err.message);
        });

        // Agar username yo‘q bo‘lsa, ikkinchi telefon
        if (!ctx.from.username) {

            updateUser(userId, {
                state: 'waiting_second_phone'
            });

            await ctx.reply(
                '✅ Birinchi raqam qabul qilindi.\n\n' +
                '⚠️ Telegram usernameingiz mavjud emas.\n\n' +
                '📞 Iltimos, qo‘shimcha aloqa uchun yana bitta telefon raqamingizni yuboring.',
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

            return;
        }

        await ctx.reply(
            '🎉 <b>Ro‘yxatdan o‘tish yakunlandi!</b>\n\n' +
            'Endi botning barcha imkoniyatlaridan foydalanishingiz mumkin. 👇',
            {
                parse_mode: 'HTML',
                ...mainMenu(fresh.language || 'uz')
            }
        );

        return;
    }

    // ========================================================
    // SECOND PHONE
    // ========================================================

    if (user.state === 'waiting_second_phone') {

        updateUser(userId, {
            phone2: phone,
            state: ''
        });

        const fresh = getUser(userId);

        await ctx.telegram.sendMessage(
            ADMIN_ID,
            '📞 <b>Qo‘shimcha telefon raqami olindi!</b>\n\n' +
            '👤 Ism: ' +
            escapeHtml(
                `${fresh.first_name || ''} ${fresh.last_name || ''}`.trim()
            ) +
            '\n' +
            '🆔 Telegram ID: ' +
            userId +
            '\n' +
            '📞 1-raqam: ' +
            escapeHtml(formatPhone(fresh.phone)) +
            '\n' +
            '📞 2-raqam: ' +
            escapeHtml(formatPhone(phone)),
            { parse_mode: 'HTML' }
        ).catch(() => {});

        await ctx.reply(
            '✅ Ikkinchi raqam ham qabul qilindi.\n\n' +
            'Endi botdan foydalanishingiz mumkin. 👇',
            mainMenu(fresh.language || 'uz')
        );

        return;
    }

    // ========================================================
    // ORDER PHONE
    // ========================================================

    if (user.state === 'waiting_order_phone') {

        const fresh = getUser(userId);

        const discount = fresh.has_discount
            ? '15% chegirma — BOR'
            : 'Chegirma yo‘q';

        const orderId = db.prepare(`
            INSERT INTO orders (
                user_id,
                service,
                full_name,
                description,
                budget,
                phone,
                phone2,
                discount,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')
        `).run(
            userId,
            fresh.pending_service || 'Umumiy murojaat',
            fresh.client_full_name || fresh.first_name || '',
            fresh.order_description || '',
            fresh.client_budget || '',
            phone,
            fresh.phone2 || '',
            discount
        ).lastInsertRowid;

        updateUser(userId, {
            phone,
            state: ''
        });

        const adminMessage =
            '🚨 <b>BILOL | WEB DEVELOPER — YANGI BUYURTMA!</b>\n\n' +
            '🆔 <b>Buyurtma ID:</b> #' + orderId + '\n\n' +

            '👤 <b>F.I.O:</b> ' +
            escapeHtml(
                fresh.client_full_name ||
                `${fresh.first_name || ''} ${fresh.last_name || ''}`.trim()
            ) +
            '\n' +

            '📞 <b>Tel:</b> ' +
            escapeHtml(formatPhone(phone)) +
            '\n' +

            '📞 <b>Qo‘shimcha tel:</b> ' +
            escapeHtml(formatPhone(fresh.phone2)) +
            '\n' +

            '🔗 <b>Username:</b> ' +
            (fresh.username
                ? `@${escapeHtml(fresh.username)}`
                : 'Mavjud emas') +
            '\n' +

            '🆔 <b>Telegram ID:</b> ' +
            userId +
            '\n\n' +

            '📌 <b>Xizmat:</b> ' +
            escapeHtml(fresh.detected_service || fresh.pending_service || 'Umumiy murojaat') +
            '\n' +

            '📝 <b>Loyiha:</b> ' +
            escapeHtml(fresh.order_description || 'Ko‘rsatilmagan') +
            '\n' +

            '💰 <b>Budjet:</b> ' +
            escapeHtml(fresh.client_budget || 'Kelishiladi') +
            '\n' +

            '🏷 <b>Aksiya:</b> ' +
            escapeHtml(discount) +
            '\n' +

            '💳 <b>To‘lov:</b> 50% oldindan to‘lovga rozilik berilgan\n' +

            '🕐 <b>Vaqt:</b> ' +
            escapeHtml(now());

        await ctx.telegram.sendMessage(
            ADMIN_ID,
            adminMessage,
            { parse_mode: 'HTML' }
        ).catch(err => {
            console.log('Order admin error:', err.message);
        });

        // Chegirma ishlatilgan bo‘lsa, buyurtmadan keyin yopamiz
        if (fresh.has_discount) {
            updateUser(userId, {
                has_discount: 0,
                promo_code: ''
            });
        }

        await ctx.reply(
            '✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n' +
            'Ma’lumotlaringiz adminga yuborildi.\n' +
            'Tez orada siz bilan bog‘lanamiz. 🚀',
            {
                parse_mode: 'HTML',
                ...mainMenu(fresh.language || 'uz')
            }
        );

        // Order holatini tozalash
        updateUser(userId, {
            pending_service: '',
            client_full_name: '',
            order_description: '',
            detected_service: '',
            min_price: 0,
            client_budget: ''
        });

        return;
    }

    await ctx.reply(
        '📱 Raqamingiz qabul qilindi.'
    );
});

// ============================================================
// ADMIN COMMAND
// ============================================================

bot.command('admin', async (ctx) => {

    if (!isAdmin(ctx)) {
        return;
    }

    ensureUser(ctx);

    updateUser(ctx.from.id, {
        state: 'waiting_admin_password'
    });

    await ctx.reply(
        '🔐 <b>ADMIN PANEL</b>\n\n' +
        'Maxfiy parolni kiriting:',
        { parse_mode: 'HTML' }
    );
});

// ============================================================
// ADMIN PANEL KEYBOARD
// ============================================================

function adminMenuKeyboard() {
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
                '📢 Reklama tarqatish',
                'adm_broadcast'
            )
        ],
        [
            Markup.button.callback(
                '🚫 Block / Unblock',
                'adm_block_menu'
            )
        ],
        [
            Markup.button.callback(
                '📝 Bot ma’lumotlari',
                'adm_data'
            )
        ]
    ]);
}

async function showAdminPanel(ctx) {

    await ctx.reply(
        '🛡 <b>BILOL | WEB DEVELOPER</b>\n' +
        'ADMIN CONTROL CENTER\n\n' +

        '┏ Xavfsizlik: <code>Protected</code>\n' +
        '┣ Tizim: <code>Online ⚡</code>\n' +
        '┣ Database: <code>SQLite</code>\n' +
        '┗ Boshqaruv menyusi 👇',
        {
            parse_mode: 'HTML',
            ...adminMenuKeyboard()
        }
    );
}

// ============================================================
// ADMIN TEXT HANDLER
// ============================================================

bot.on('text', async (ctx, next) => {

    const userId = ctx.from.id;
    const text = ctx.message.text.trim();

    ensureUser(ctx);

    if (!isAdmin(ctx)) {
        return next();
    }

    const user = getUser(userId);

    // ADMIN PASSWORD
    if (user.state === 'waiting_admin_password') {

        if (text !== ADMIN_PASSWORD) {
            await ctx.reply(
                '❌ <b>Noto‘g‘ri parol.</b>\n\nQaytadan kiriting.',
                { parse_mode: 'HTML' }
            );
            return;
        }

        updateUser(userId, {
            state: ''
        });

        await showAdminPanel(ctx);
        return;
    }

    // BROADCAST
    if (user.state === 'waiting_broadcast') {

        updateUser(userId, {
            state: ''
        });

        const users = db.prepare(`
            SELECT id
            FROM users
            WHERE blocked = 0
        `).all();

        let success = 0;
        let failed = 0;

        await ctx.reply(
            '⏳ <b>Reklama tarqatilmoqda...</b>\n\n' +
            `👥 Jami: ${users.length} ta`,
            { parse_mode: 'HTML' }
        );

        for (const item of users) {
            try {
                await ctx.telegram.copyMessage(
                    item.id,
                    ctx.chat.id,
                    ctx.message.message_id
                );

                success++;

            } catch (e) {

                failed++;

                // Botni bloklagan bo‘lsa avtomatik blocked
                if (
                    String(e.message).includes('bot was blocked') ||
                    String(e.message).includes('chat not found') ||
                    String(e.message).includes('user is deactivated')
                ) {
                    db.prepare(`
                        UPDATE users
                        SET blocked = 1,
                            block_reason = 'Telegram blocked/deactivated'
                        WHERE id = ?
                    `).run(item.id);
                }
            }
        }

        await ctx.reply(
            '✅ <b>REKLAMA YAKUNLANDI</b>\n\n' +
            `📤 Yuborildi: <b>${success}</b>\n` +
            `🚫 Yetib bormadi: <b>${failed}</b>\n\n` +
            'Reklama botdan foydalanayotgan bloklanmagan foydalanuvchilarga yuborildi.',
            { parse_mode: 'HTML' }
        );

        return;
    }

    // BOT DATA EDITOR
    if (user.state.startsWith('data_')) {

        const key = user.state.replace('data_', '');

        setBotData(key, text);

        updateUser(userId, {
            state: ''
        });

        await ctx.reply(
            `✅ <b>${escapeHtml(key)}</b> ma’lumoti yangilandi.\n\n` +
            `Yangi qiymat:\n<code>${escapeHtml(text)}</code>`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            '🔙 Bot ma’lumotlariga qaytish',
                            'adm_data'
                        )
                    ]
                ])
            }
        );

        return;
    }

    return next();
});

// ============================================================
// ADMIN STATS
// ============================================================

bot.action('adm_stats', async (ctx) => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const total = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
    `).get().count;

    const active = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE blocked = 0
    `).get().count;

    const blocked = db.prepare(`
        SELECT COUNT(*) AS count
        FROM users
        WHERE blocked = 1
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

    const processing = db.prepare(`
        SELECT COUNT(*) AS count
        FROM orders
        WHERE status = 'processing'
    `).get().count;

    const approved = db.prepare(`
        SELECT COUNT(*) AS count
        FROM orders
        WHERE status = 'approved'
    `).get().count;

    const cancelled = db.prepare(`
        SELECT COUNT(*) AS count
        FROM orders
        WHERE status = 'cancelled'
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

    const uptimeSec = Math.floor(
        (Date.now() - START_TIME) / 1000
    );

    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);

    const text =
        '📊 <b>BILOL | WEB DEVELOPER — STATISTIKA</b>\n\n' +

        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '👥 <b>FOYDALANUVCHILAR</b>\n\n' +
        `👥 Jami: <b>${total}</b>\n` +
        `🟢 Aktiv: <b>${active}</b>\n` +
        `🚫 Bloklangan: <b>${blocked}</b>\n\n` +

        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '📦 <b>ZAKAZLAR</b>\n\n' +
        `📦 Jami: <b>${orders}</b>\n` +
        `🆕 Yangi: <b>${newOrders}</b>\n` +
        `🔄 Jarayonda: <b>${processing}</b>\n` +
        `✅ Tasdiqlangan: <b>${approved}</b>\n` +
        `❌ Bekor qilingan: <b>${cancelled}</b>\n\n` +

        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '📝 <b>SHIKOYATLAR</b>\n\n' +
        `📝 Jami: <b>${complaints}</b>\n` +
        `🚨 Yangi: <b>${newComplaints}</b>\n\n` +

        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '⭐ <b>FIKRLAR</b>\n\n' +
        `⭐ Jami baholar: <b>${reviews}</b>\n\n` +

        '━━━━━━━━━━━━━━━━━━━━━━\n' +
        '⚙️ <b>TIZIM</b>\n\n' +
        `⏱ Uptime: <b>${hours} soat ${minutes} daqiqa</b>\n` +
        '🤖 Bot: <b>Online ⚡</b>\n' +
        '💾 Database: <b>SQLite</b>\n' +
        '🟢 Status: <b>Stable</b>';

    await ctx.editMessageText(
        text,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '🔄 Yangilash',
                        'adm_stats'
                    )
                ],
                [
                    Markup.button.callback(
                        '🔙 Orqaga',
                        'adm_back'
                    )
                ]
            ])
        }
    ).catch(async () => {
        await ctx.reply(
            text,
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
        );
    });
});

// ============================================================
// ADMIN BACK
// ============================================================

bot.action('adm_back', async (ctx) => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    await ctx.editMessageText(
        '🛡 <b>BILOL | WEB DEVELOPER</b>\n' +
        'ADMIN CONTROL CENTER\n\n' +
        '┏ Xavfsizlik: <code>Protected</code>\n' +
        '┣ Tizim: <code>Online ⚡</code>\n' +
        '┣ Database: <code>SQLite</code>\n' +
        '┗ Boshqaruv menyusi 👇',
        {
            parse_mode: 'HTML',
            ...adminMenuKeyboard()
        }
    ).catch(() => {
        ctx.reply(
            '🛡 <b>ADMIN CONTROL CENTER</b>',
            {
                parse_mode: 'HTML',
                ...adminMenuKeyboard()
            }
        );
    });
});

// ============================================================
// ADMIN BROADCAST
// ============================================================

bot.action('adm_broadcast', async (ctx) => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    updateUser(ctx.from.id, {
        state: 'waiting_broadcast'
    });

    await ctx.reply(
        '📢 <b>UNIVERSAL REKLAMA</b>\n\n' +
        'Endi yuborgan xabaringiz botdan foydalanayotgan barcha ' +
        '<b>bloklanmagan</b> foydalanuvchilarga yuboriladi.\n\n' +

        '📝 Oddiy matn\n' +
        '🖼 Rasm\n' +
        '📹 Video\n' +
        '📄 Fayl\n' +
        '🎵 Audio\n\n' +

        'Xabarni yuboring 👇',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '❌ Bekor qilish',
                        'adm_cancel'
                    )
                ]
            ])
        }
    );
});

bot.action('adm_cancel', async (ctx) => {

    if (!isAdmin(ctx)) return;

    updateUser(ctx.from.id, {
        state: ''
    });

    await ctx.answerCbQuery('Bekor qilindi');

    await ctx.reply(
        '❌ Amal bekor qilindi.',
        adminMenuKeyboard()
    );
});

// ============================================================
// ADMIN USERS
// ============================================================

bot.action('adm_users', async (ctx) => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const users = db.prepare(`
        SELECT *
        FROM users
        ORDER BY last_seen DESC
        LIMIT 50
    `).all();

    if (!users.length) {
        await ctx.reply('👥 Hozircha foydalanuvchilar yo‘q.');
        return;
    }

    const buttons = [];

    for (const user of users) {

        const name =
            `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
            'Noma’lum';

        const status =
            user.blocked
                ? '🚫'
                : '🟢';

        buttons.push([
            Markup.button.callback(
                `${status} ${name.slice(0, 25)}`,
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

    await ctx.reply(
        `👥 <b>FOYDALANUVCHILAR</b>\n\n` +
        `Jami: <b>${db.prepare('SELECT COUNT(*) AS count FROM users').get().count}</b>\n\n` +
        `Har bir foydalanuvchini alohida ko‘rish uchun tanlang 👇`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        }
    );
});

// ============================================================
// USER CARD
// ============================================================

bot.action(/^user_(\d+)$/, async (ctx) => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const id = Number(ctx.match[1]);
    const user = getUser(id);

    if (!user) {
        await ctx.reply('❌ Foydalanuvchi topilmadi.');
        return;
    }

    const name =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        'Noma’lum';

    const status = user.blocked
        ? '🚫 BLOKLANGAN'
        : '🟢 FAOL';

    const text =
        '👤 <b>FOYDALANUVCHI</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n\n' +

        `👤 <b>Ism:</b> ${escapeHtml(name)}\n` +

        `🔗 <b>Username:</b> ${
            user.username
                ? '@' + escapeHtml(user.username)
                : 'Yo‘q'
        }\n` +

        `🆔 <b>Telegram ID:</b> <code>${user.id}</code>\n` +

        `📞 <b>Telefon:</b> ${escapeHtml(formatPhone(user.phone))}\n` +

        `📞 <b>2-telefon:</b> ${escapeHtml(formatPhone(user.phone2))}\n` +

        `📢 <b>Kanal:</b> ${
            user.subscribed ? '✅' : '❌'
        }\n` +

        `📸 <b>Instagram:</b> ${
            user.instagram_confirmed ? '✅' : '❌'
        }\n` +

        `🕐 <b>Ro‘yxatdan o‘tgan:</b> ${escapeHtml(user.created_at)}\n` +

        `🕐 <b>Oxirgi faollik:</b> ${escapeHtml(user.last_seen)}\n` +

        `📊 <b>Status:</b> ${status}`;

    const buttons = [];

    if (user.blocked) {
        buttons.push([
            Markup.button.callback(
                '🟢 BLOCKDAN CHIQARISH',
                `unblock_${user.id}`
            )
        ]);
    } else {
        buttons.push([
            Markup.button.callback(
                '🚫 BLOCK QILISH',
                `block_${user.id}`
            )
        ]);
    }

    buttons.push([
        Markup.button.callback(
            '🔙 Foydalanuvchilar',
            'adm_users'
        )
    ]);

    await ctx.reply(
        text,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        }
    );
});

// ============================================================
// BLOCK
// ============================================================

bot.action(/^block_(\d+)$/, async (ctx) => {

    if (!isAdmin(ctx)) return;

    const id = Number(ctx.match[1]);

    if (id === Number(ADMIN_ID)) {
        await ctx.answerCbQuery(
            '❌ Adminni block qilib bo‘lmaydi.',
            { show_alert: true }
        );
        return;
    }

    const user = getUser(id);

    if (!user) {
        await ctx.answerCbQuery(
            'Foydalanuvchi topilmadi.',
            { show_alert: true }
        );
        return;
    }

    updateUser(id, {
        blocked: 1,
        block_reason: 'Admin tomonidan bloklandi'
    });

    await ctx.answerCbQuery(
        '🚫 Foydalanuvchi bloklandi.'
    );

    await ctx.reply(
        `🚫 <b>Foydalanuvchi bloklandi.</b>\n\n` +
        `ID: <code>${id}</code>`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '🟢 BLOCKDAN CHIQARISH',
                        `unblock_${id}`
                    )
                ],
                [
                    Markup.button.callback(
                        '🔙 Foydalanuvchilar',
                        'adm_users'
                    )
                ]
            ])
        }
    );
});

// ============================================================
// UNBLOCK
// ============================================================

bot.action(/^unblock_(\d+)$/, async (ctx) => {

    if (!isAdmin(ctx)) return;

    const id = Number(ctx.match[1]);

    updateUser(id, {
        blocked: 0,
        block_reason: ''
    });

    await ctx.answerCbQuery(
        '🟢 Blockdan chiqarildi.'
    );

    await ctx.reply(
        `🟢 <b>Foydalanuvchi blockdan chiqarildi.</b>\n\n` +
        `ID: <code>${id}</code>`,
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '👤 Profil',
                        `user_${id}`
                    )
                ],
                [
                    Markup.button.callback(
                        '🔙 Foydalanuvchilar',
                        'adm_users'
                    )
                ]
            ])
        }
    );
});

// ============================================================
// ADMIN BLOCK MENU
// ============================================================

bot.action('adm_block_menu', async (ctx) => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    const users = db.prepare(`
        SELECT *
        FROM users
        ORDER BY last_seen DESC
        LIMIT 50
    `).all();

    const buttons = users.map(user => {

        const name =
            `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
            String(user.id);

        return [
            Markup.button.callback(
                `${user.blocked ? '🚫' : '🟢'} ${name.slice(0, 22)}`,
                `user_${user.id}`
            )
        ];
    });

    buttons.push([
        Markup.button.callback(
            '🔙 Orqaga',
            'adm_back'
        )
    ]);

    await ctx.reply(
        '🚫 <b>BLOCK / UNBLOCK</b>\n\n' +
        'Foydalanuvchini tanlang:',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        }
    );
});

// ============================================================
// ADMIN BOT DATA
// ============================================================

bot.action('adm_data', async (ctx) => {

    if (!isAdmin(ctx)) return;

    await ctx.answerCbQuery().catch(() => {});

    await ctx.reply(
        '📝 <b>BOT MA’LUMOTLARI</b>\n\n' +
        `📞 Telefon: <code>${escapeHtml(getBotData('phone'))}</code>\n` +
        `💬 Telegram: <code>${escapeHtml(getBotData('telegram'))}</code>\n` +
        `📸 Instagram: <code>${escapeHtml(getBotData('instagram'))}</code>\n` +
        `📢 Kanal: <code>${escapeHtml(getBotData('channel'))}</code>\n\n` +
        'Qaysi ma’lumotni yangilamoqchisiz?',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        '📞 Telefon',
                        'edit_phone'
                    )
                ],
                [
                    Markup.button.callback(
                        '💬 Telegram',
                        'edit_telegram'
                    )
                ],
                [
                    Markup.button.callback(
                        '📸 Instagram',
                        'edit_instagram'
                    )
                ],
                [
                    Markup.button.callback(
                        '📢 Kanal',
                        'edit_channel'
                    )
                ],
                [
                    Markup.button.callback(
                        '🔙 Orqaga',
                        'adm_back'
                    )
                ]
            ])
        }
    );
});

const dataEditMap = {
    edit_phone: 'phone',
    edit_telegram: 'telegram',
    edit_instagram: 'instagram',
    edit_channel: 'channel'
};

for (const [action, key] of Object.entries(dataEditMap)) {

    bot.action(action, async (ctx) => {

        if (!isAdmin(ctx)) return;

        await ctx.answerCbQuery().catch(() => {});

        updateUser(ctx.from.id, {
            state: `data_${key}`
        });

        await ctx.reply(
            `✏️ <b>${escapeHtml(key)}</b> yangi qiymatini yuboring:`,
            { parse_mode: 'HTML' }
        );
    });
}

// ============================================================
// LANGUAGE
// ============================================================

bot.action('lang_uz', async (ctx) => {

    ensureUser(ctx);

    updateUser(ctx.from.id, {
        language: 'uz'
    });

    await ctx.answerCbQuery('🇺🇿 O‘zbek tili');

    await ctx.reply(
        '🇺🇿 <b>O‘zbek tili faollashdi.</b>\n\n' +
        'Kerakli bo‘limni tanlang 👇',
        {
            parse_mode: 'HTML',
            ...mainMenu('uz')
        }
    );
});

bot.action('lang_ru', async (ctx) => {

    ensureUser(ctx);

    updateUser(ctx.from.id, {
        language: 'ru'
    });

    await ctx.answerCbQuery('🇷🇺 Русский');

    await ctx.reply(
        '🇷🇺 <b>Русский язык активирован.</b>\n\n' +
        'Выберите нужный раздел 👇',
        {
            parse_mode: 'HTML',
            ...mainMenu('ru')
        }
    );
});

bot.action('lang_en', async (ctx) => {

    ensureUser(ctx);

    updateUser(ctx.from.id, {
        language: 'en'
    });

    await ctx.answerCbQuery('🇬🇧 English');

    await ctx.reply(
        '🇬🇧 <b>English activated.</b>\n\n' +
        'Choose a section 👇',
        {
            parse_mode: 'HTML',
            ...mainMenu('en')
        }
    );
});

bot.hears(
    ['🌐 Tilni o‘zgartirish', '🌐 Изменить язык', '🌐 Change Language'],
    async (ctx) => {

        await ctx.reply(
            '🌐 <b>Tilni tanlang:</b>',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            '🇺🇿 O‘zbekcha',
                            'lang_uz'
                        ),
                        Markup.button.callback(
                            '🇷🇺 Русский',
                            'lang_ru'
                        ),
                        Markup.button.callback(
                            '🇬🇧 English',
                            'lang_en'
                        )
                    ]
                ])
            }
        );
    }
);

// ============================================================
// PORTFOLIO
// ============================================================

bot.hears(
    [
        '💻 Bizning ishlar',
        '💻 Портфолио проектов',
        '💻 Portfolio'
    ],
    async (ctx) => {

        const text =
            '💻 <b>Bilol | Web Developer</b>\n\n' +
            'Biz amalga oshirgan eng so‘nggi muvaffaqiyatli loyihalar:\n\n' +
            'O‘zingizga yoqqan namunani tanlang 👇';

        const keyboard = Markup.inlineKeyboard([

            [
                Markup.button.url(
                    '🌐 Humo Garden',
                    'https://humogarden.uz'
                )
            ],

            [
                Markup.button.url(
                    '🌐 Portfolio #2',
                    'https://glittery-rugelach-e63860.netlify.app/'
                )
            ],

            [
                Markup.button.url(
                    '🌐 Portfolio #3',
                    'https://fastidious-dieffenbachia-94b656.netlify.app/'
                )
            ],

            [
                Markup.button.url(
                    '🌐 Portfolio #4',
                    'https://magenta-blini-956248.netlify.app/'
                )
            ],

            [
                Markup.button.url(
                    '🌐 Portfolio #5',
                    'https://heartfelt-manatee-645764.netlify.app/'
                )
            ],

            [
                Markup.button.url(
                    '🌐 Portfolio #6',
                    'https://harmonious-halva-0fe592.netlify.app/'
                )
            ],

            [
                Markup.button.url(
                    '🌐 Project #7',
                    'https://app.netlify.com/projects/lighthearted-creponne-62b31a/overview'
                )
            ]
        ]);

        await ctx.reply(
            text,
            {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard
            }
        );
    }
);

// ============================================================
// SERVICES
// ============================================================

function servicesKeyboard() {

    return Markup.inlineKeyboard([

        [
            Markup.button.callback(
                '🚀 Landing Page — 500 000 so‘m',
                'srv_landing'
            )
        ],

        [
            Markup.button.callback(
                '🛒 E-Commerce — 1 200 000 so‘m',
                'srv_shop'
            )
        ],

        [
            Markup.button.callback(
                '🏢 Korporativ sayt — 800 000 so‘m',
                'srv_corporate'
            )
        ],

        [
            Markup.button.callback(
                '🤖 Telegram Bot — 400 000 so‘m',
                'srv_bot'
            )
        ],

        [
            Markup.button.callback(
                '📱 Web Application — 2 000 000 so‘m',
                'srv_webapp'
            )
        ]
    ]);
}

bot.hears(
    [
        '⚙️ Xizmatlar va Narxlar',
        '⚙️ Услуги и цены',
        '⚙️ Services & Pricing'
    ],
    async (ctx) => {

        await ctx.reply(
            '🛠 <b>Bilol | Web Developer — Professional xizmatlarimiz</b>\n\n' +

            '💡 <b>Muhim eslatma:</b>\n' +
            'Narxlar loyihaning murakkabligiga qarab yana kelishiladi. ' +
            'Hamyonbob va sifatli natija. 🤝\n\n' +

            '📌 <b>To‘lov sharti:</b>\n' +
            'Barcha loyihalar uchun 50% oldindan to‘lov amalga oshiriladi.\n\n' +

            'Quyidagi yo‘nalishlardan birini tanlang 👇',
            {
                parse_mode: 'HTML',
                ...servicesKeyboard()
            }
        );
    }
);

// ============================================================
// SERVICE DETAILS
// ============================================================

const services = {

    landing: {
        name: 'Landing Page / Sotuvchi sayt',
        price: 500000,
        display: '500,000 so‘m ($40)',
        duration: '2–4 kun',
        advance: '250,000 so‘m'
    },

    shop: {
        name: 'E-Commerce / Onlayn do‘kon',
        price: 1200000,
        display: '1,200,000 so‘m ($100)',
        duration: '7–10 kun',
        advance: '600,000 so‘m'
    },

    corporate: {
        name: 'Korporativ veb-sayt',
        price: 800000,
        display: '800,000 so‘m ($65)',
        duration: '3–5 kun',
        advance: '400,000 so‘m'
    },

    bot: {
        name: 'Telegram Bot va avtomatlashtirish',
        price: 400000,
        display: '400,000 so‘m ($30)',
        duration: '2–5 kun',
        advance: '200,000 so‘m'
    },

    webapp: {
        name: 'Web Application / Veb-ilova',
        price: 2000000,
        display: '2,000,000 so‘m ($160)',
        duration: '10–15 kun',
        advance: '1,000,000 so‘m'
    }
};

bot.action(/^srv_(landing|shop|corporate|bot|webapp)$/, async (ctx) => {

    await ctx.answerCbQuery().catch(() => {});

    const type = ctx.match[1];
    const service = services[type];

    updateUser(ctx.from.id, {
        pending_service: type,
        detected_service: service.name,
        min_price: service.price
    });

    await ctx.reply(
        `🛠 <b>${escapeHtml(service.name)}</b>\n\n` +

        `⏱ <b>Muddat:</b> ${service.duration}\n` +

        `💰 <b>Narxi:</b> ${service.display} dan boshlanadi\n` +

        '🤝 <b>Kelishuv:</b> Yakuniy narx loyiha murakkabligiga qarab kelishiladi.\n' +

        `💳 <b>50% oldindan:</b> ${service.advance}\n\n` +

        'Buyurtma berishni xohlaysizmi?',
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

// ============================================================
// ORDER START
// ============================================================

function askAgreement(ctx) {

    return ctx.reply(
        '🤝 <b>Buyurtma shartlari bilan tanishish</b>\n\n' +
        'Barcha loyihalar uchun <b>50% oldindan to‘lov</b> amalga oshiriladi ' +
        'va qolgan narxlar o‘zaro kelishiladi.\n\n' +
        'Ushbu shartga rozimisiz?',
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

bot.action(/^order_(landing|shop|corporate|bot|webapp)$/, async (ctx) => {

    await ctx.answerCbQuery().catch(() => {});

    const type = ctx.match[1];

    const service = services[type];

    updateUser(ctx.from.id, {
        pending_service: type,
        detected_service: service.name,
        min_price: service.price
    });

    await askAgreement(ctx);
});

bot.hears(
    [
        '💻 Buyurtma berish',
        '💻 Заказать проект',
        '💻 Order Project'
    ],
    async (ctx) => {

        updateUser(ctx.from.id, {
            pending_service: 'Umumiy murojaat',
            detected_service: '',
            min_price: 0
        });

        await askAgreement(ctx);
    }
);

bot.action('agree_no', async (ctx) => {

    await ctx.answerCbQuery('Bekor qilindi');

    updateUser(ctx.from.id, {
        state: '',
        pending_service: '',
        client_full_name: '',
        order_description: '',
        detected_service: '',
        min_price: 0,
        client_budget: ''
    });

    await ctx.reply(
        '❌ <b>Buyurtma jarayoni bekor qilindi.</b>',
        {
            parse_mode: 'HTML',
            ...mainMenu(
                getUser(ctx.from.id)?.language || 'uz'
            )
        }
    );
});

bot.action('agree_yes', async (ctx) => {

    await ctx.answerCbQuery('Rozilik qabul qilindi');

    updateUser(ctx.from.id, {
        state: 'waiting_name'
    });

    await ctx.reply(
        '✅ <b>Rozilik qabul qilindi. Ajoyib tanlov!</b> 🚀\n\n' +
        '📝 Iltimos, <b>ism va familiyangizni to‘liq</b> kiriting.\n\n' +
        'Masalan: <i>Alisherbek Usmonov</i>',
        { parse_mode: 'HTML' }
    );
});

// ============================================================
// ORDER TEXT FLOW
// ============================================================

bot.on('text', async (ctx, next) => {

    if (isAdmin(ctx)) return next();

    const user = getUser(ctx.from.id);

    if (!user) return next();

    const text = ctx.message.text.trim();

    // NAME
    if (user.state === 'waiting_name') {

        const words = text.split(/\s+/);

        if (
            words.length < 2 ||
            text.length < 5 ||
            /\d/.test(text)
        ) {
            await ctx.reply(
                '❌ <b>Ism va familiya noto‘g‘ri kiritildi.</b>\n\n' +
                'Iltimos, to‘liq ism va familiyangizni yozing.\n\n' +
                'Masalan: <i>Alisherbek Usmonov</i>',
                { parse_mode: 'HTML' }
            );
            return;
        }

        updateUser(ctx.from.id, {
            client_full_name: text,
            state: 'waiting_description'
        });

        await ctx.reply(
            '🎯 <b>Ajoyib!</b>\n\n' +
            'Endi qisqacha <b>nima buyurtma qilmoqchisiz</b> va ' +
            'loyihangiz haqida batafsil yozib yuboring.\n\n' +

            'Masalan:\n' +
            '• biznes uchun web sayt\n' +
            '• online do‘kon\n' +
            '• Telegram bot\n' +
            '• ilova\n' +
            '• landing page\n' +
            '• korporativ sayt',
            { parse_mode: 'HTML' }
        );

        return;
    }

    // DESCRIPTION
    if (user.state === 'waiting_description') {

        if (text.length < 4) {

            await ctx.reply(
                '❌ Iltimos, loyiha haqida batafsilroq yozing.',
                { parse_mode: 'HTML' }
            );

            return;
        }

        const lower = text.toLowerCase();

        let service = null;

        // ENG MUHIM: ilova birinchi
        if (
            lower.includes('ilova') ||
            lower.includes('app') ||
            lower.includes('application') ||
            lower.includes('veb-ilova') ||
            lower.includes('web app')
        ) {
            service = {
                name: 'Murakkab veb-ilova (Web Application)',
                price: 2000000,
                display: '2,000,000 so‘m ($160)'
            };
        }

        else if (
            lower.includes('do‘kon') ||
            lower.includes("do'kon") ||
            lower.includes('magazin') ||
            lower.includes('shop') ||
            lower.includes('e-commerce') ||
            lower.includes('ecommerce') ||
            lower.includes('savdo') ||
            lower.includes('market') ||
            lower.includes('uzum')
        ) {
            service = {
                name: 'Onlayn do‘kon (E-Commerce)',
                price: 1200000,
                display: '1,200,000 so‘m ($100)'
            };
        }

        else if (
            lower.includes('taksi') ||
            lower.includes('taxi') ||
            lower.includes('logistika') ||
            lower.includes('dostavka') ||
            lower.includes('yetkazib')
        ) {
            service = {
                name: 'Logistika va taksi avtomatlashtirish tizimi',
                price: 800000,
                display: '800,000 so‘m ($65)'
            };
        }

        else if (
            lower.includes('bot') ||
            lower.includes('telegram bot') ||
            lower.includes('telegram')
        ) {
            service = {
                name: 'Telegram Bot va avtomatlashtirish',
                price: 400000,
                display: '400,000 so‘m ($30)'
            };
        }

        else if (
            lower.includes('landing') ||
            lower.includes('sayt') ||
            lower.includes('website') ||
            lower.includes('web site') ||
            lower.includes('website') ||
            lower.includes('vizitka') ||
            lower.includes('korporativ')
        ) {
            if (lower.includes('korporativ')) {
                service = {
                    name: 'Korporativ veb-sayt',
                    price: 800000,
                    display: '800,000 so‘m ($65)'
                };
            } else {
                service = {
                    name: 'Landing Page / Veb-sayt',
                    price: 500000,
                    display: '500,000 so‘m ($40)'
                };
            }
        }

        // BANK
        else if (
            lower.includes('bank') ||
            lower.includes('moliya') ||
            lower.includes('fintech') ||
            lower.includes('kredit')
        ) {
            service = {
                name: 'Bank / Moliya tizimi',
                price: 2500000,
                display: '2,500,000 so‘m ($200)'
            };
        }

        if (!service) {

            updateUser(ctx.from.id, {
                state: ''
            });

            await ctx.reply(
                '❌ <b>Kechirasiz, bu loyiha yo‘nalishi avtomatik aniqlanmadi.</b>\n\n' +
                'Bunday loyiha uchun narxni individual hisoblash kerak.\n\n' +
                '💬 Admin bilan bog‘laning:',
                {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.url(
                                '💬 @sharipoov1 bilan bog‘lanish',
                                ADMIN_USERNAME
                            )
                        ],
                        [
                            Markup.button.callback(
                                '🔙 Asosiy menyu',
                                'go_home'
                            )
                        ]
                    ])
                }
            );

            return;
        }

        updateUser(ctx.from.id, {
            order_description: text,
            detected_service: service.name,
            min_price: service.price,
            state: 'waiting_budget'
        });

        await ctx.reply(
            '💡 <b>Tushunarli.</b>\n\n' +
            `📌 Sizning loyihangiz: <b>${escapeHtml(service.name)}</b>\n\n` +
            `💰 Bunday loyiha narxi <b>${service.display}</b> dan boshlanadi.\n\n` +
            '💵 <b>Endi aniq budjetingizni kiriting.</b>\n' +
            `⚠️ Budjet <b>${service.display}</b> dan kam bo‘lmasligi kerak.\n\n` +
            'Masalan: <code>2000000</code> yoki <code>2 000 000</code>',
            { parse_mode: 'HTML' }
        );

        return;
    }

    // BUDGET
    if (user.state === 'waiting_budget') {

        const raw = text.replace(/[^\d]/g, '');

        if (!raw || !/^\d+$/.test(raw)) {

            await ctx.reply(
                '❌ <b>Faqat aniq raqam kiriting.</b>\n\n' +
                'Masalan: <code>2000000</code>',
                { parse_mode: 'HTML' }
            );

            return;
        }

        const budget = Number(raw);

        if (!Number.isSafeInteger(budget)) {

            await ctx.reply(
                '❌ Budjet raqami juda katta.',
                { parse_mode: 'HTML' }
            );

            return;
        }

        if (budget < user.min_price) {

            await ctx.reply(
                '❌ <b>Budjet yetarli emas.</b>\n\n' +
                `📌 Ushbu loyiha uchun minimal narx: <b>${user.min_price.toLocaleString('uz-UZ')} so‘m</b>\n\n` +
                'Iltimos, shu summadan kam bo‘lmagan aniq budjet kiriting.',
                { parse_mode: 'HTML' }
            );

            return;
        }

        updateUser(ctx.from.id, {
            client_budget: budget.toLocaleString('uz-UZ') + ' so‘m',
            state: 'waiting_order_phone'
        });

        await ctx.reply(
            '📞 <b>Ajoyib! Oxirgi qadam.</b>\n\n' +
            'Aloqa uchun telefon raqamingizni yuboring.\n\n' +
            '⚠️ Raqamni yozmang.\n' +
            '<b>Pastdagi tugmani bosib Telegram kontaktini yuboring.</b>',
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

        return;
    }

    return next();
});

// ============================================================
// HOME
// ============================================================

bot.action('go_home', async (ctx) => {

    await ctx.answerCbQuery().catch(() => {});

    const user = getUser(ctx.from.id);

    await ctx.reply(
        '🏠 <b>Asosiy menyu</b>',
        {
            parse_mode: 'HTML',
            ...mainMenu(user?.language || 'uz')
        }
    );
});

// ============================================================
// CONTACTS
// ============================================================

bot.hears(
    [
        '📞 Biz bilan bog‘lanish',
        '📞 Контакты',
        '📞 Contact'
    ],
    async (ctx) => {

        await ctx.reply(
            '📬 <b>BIZ BILAN BOG‘LANISH</b>\n\n' +

            `📞 <b>Telefon:</b> ${escapeHtml(getBotData('phone'))}\n\n` +

            `💬 <b>Telegram:</b> ${escapeHtml(getBotData('telegram'))}\n\n` +

            '📸 <b>Instagram:</b> @webi.uz\n\n' +

            '📢 <b>Telegram kanal:</b> @webuzbekistan\n\n' +

            '💬 <b>Buyurtma / aloqa:</b> @sharipoov1',
            {
                parse_mode: 'HTML',
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
                            '💬 Admin bilan bog‘lanish',
                            ADMIN_USERNAME
                        )
                    ]
                ])
            }
        );
    }
);

// ============================================================
// REVIEWS
// ============================================================

bot.hears(
    [
        '⭐️ Mijozlar fikri',
        '⭐️ Отзывы',
        '⭐️ Reviews'
    ],
    async (ctx) => {

        await ctx.reply(
            '⭐️ <b>MIJOZLAR FIKRI</b>\n\n' +
            'Bizning xizmatimizni baholang 👇\n\n' +
            '1 dan 5 gacha yulduz tanlang:',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('⭐ 1', 'rate_1'),
                        Markup.button.callback('⭐ 2', 'rate_2'),
                        Markup.button.callback('⭐ 3', 'rate_3'),
                        Markup.button.callback('⭐ 4', 'rate_4'),
                        Markup.button.callback('⭐ 5', 'rate_5')
                    ],
                    [
                        Markup.button.callback(
                            '✍️ Fikr yozish',
                            'leave_review'
                        )
                    ],
                    [
                        Markup.button.callback(
                            '🚨 Shikoyat yozish',
                            'leave_complaint'
                        )
                    ]
                ])
            }
        );
    }
);

bot.action(/^rate_([1-5])$/, async (ctx) => {

    const rating = Number(ctx.match[1]);

    db.prepare(`
        INSERT INTO reviews (
            user_id,
            rating,
            text
        )
        VALUES (?, ?, '')
    `).run(ctx.from.id, rating);

    await ctx.answerCbQuery(
        `${rating} yulduz qabul qilindi!`
    );

    updateUser(ctx.from.id, {
        state: 'waiting_review'
    });

    await ctx.reply(
        `❤️ <b>Rahmat!</b> Siz botimizga <b>${rating} ta yulduz</b> baho berdingiz.\n\n` +
        'Agar xohlasangiz, fikringizni ham yozib qoldiring 👇',
        { parse_mode: 'HTML' }
    );
});

bot.action('leave_review', async (ctx) => {

    await ctx.answerCbQuery().catch(() => {});

    updateUser(ctx.from.id, {
        state: 'waiting_review'
    });

    await ctx.reply(
        '✍️ <b>Fikringizni yozib yuboring:</b>\n\n' +
        'Fikringiz adminga yuboriladi.',
        { parse_mode: 'HTML' }
    );
});

bot.action('leave_complaint', async (ctx) => {

    await ctx.answerCbQuery().catch(() => {});

    updateUser(ctx.from.id, {
        state: 'waiting_complaint'
    });

    await ctx.reply(
        '🚨 <b>Shikoyat / murojaat</b>\n\n' +
        'Muammoingizni batafsil yozib yuboring.\n' +
        'Murojaatingiz adminga yuboriladi.',
        { parse_mode: 'HTML' }
    );
});

// ============================================================
// REVIEW / COMPLAINT TEXT
// ============================================================

bot.on('text', async (ctx, next) => {

    if (isAdmin(ctx)) return next();

    const user = getUser(ctx.from.id);

    if (!user) return next();

    const text = ctx.message.text.trim();

    // REVIEW
    if (user.state === 'waiting_review') {

        db.prepare(`
            UPDATE reviews
            SET text = ?
            WHERE id = (
                SELECT id
                FROM reviews
                WHERE user_id = ?
                ORDER BY id DESC
                LIMIT 1
            )
        `).run(text, ctx.from.id);

        updateUser(ctx.from.id, {
            state: ''
        });

        await ctx.telegram.sendMessage(
            ADMIN_ID,
            '⭐ <b>YANGI MIJOZ FIKRI</b>\n\n' +
            `👤 ${escapeHtml(
                `${user.first_name || ''} ${user.last_name || ''}`.trim()
            )}\n` +
            `🔗 ${user.username ? '@' + escapeHtml(user.username) : 'Username yo‘q'}\n` +
            `🆔 ${user.id}\n` +
            `⭐ Bahosi: ${escapeHtml(
                String(
                    db.prepare(`
                        SELECT rating
                        FROM reviews
                        WHERE user_id = ?
                        ORDER BY id DESC
                        LIMIT 1
                    `).get(ctx.from.id)?.rating || 0
                )
            )}\n` +
            `📝 Fikr: ${escapeHtml(text)}`,
            { parse_mode: 'HTML' }
        ).catch(() => {});

        await ctx.reply(
            '❤️ <b>Rahmat!</b>\n\n' +
            'Fikringiz adminga yuborildi.',
            {
                parse_mode: 'HTML',
                ...mainMenu(user.language || 'uz')
            }
        );

        return;
    }

    // COMPLAINT
    if (user.state === 'waiting_complaint') {

        const complaintId = db.prepare(`
            INSERT INTO complaints (
                user_id,
                text,
                status
            )
            VALUES (?, ?, 'new')
        `).run(
            ctx.from.id,
            text
        ).lastInsertRowid;

        updateUser(ctx.from.id, {
            state: ''
        });

        await ctx.telegram.sendMessage(
            ADMIN_ID,
            '🚨 <b>YANGI SHIKOYAT</b>\n\n' +
            `🆔 Shikoyat #${complaintId}\n` +
            `👤 ${escapeHtml(
                `${user.first_name || ''} ${user.last_name || ''}`.trim()
            )}\n` +
            `🔗 ${user.username ? '@' + escapeHtml(user.username) : 'Username yo‘q'}\n` +
            `🆔 Telegram ID: ${user.id}\n\n` +
            `📝 <b>Shikoyat:</b>\n${escapeHtml(text)}`,
            { parse_mode: 'HTML' }
        ).catch(() => {});

        await ctx.reply(
            '✅ <b>Shikoyatingiz qabul qilindi.</b>\n\n' +
            'Admin ko‘rib chiqadi.',
            {
                parse_mode: 'HTML',
                ...mainMenu(user.language || 'uz')
            }
        );

        return;
    }

    return next();
});

// ============================================================
// DISCOUNT GAME
// ============================================================

bot.hears(
    [
        '🎮 15% Chegirma o‘yini',
        '🎮 Выиграть 15% скидку',
        '🎮 Win 15% Discount'
    ],
    async (ctx) => {

        const user = getUser(ctx.from.id);

        if (user.has_played) {

            await ctx.reply(
                '⚠️ <b>Siz bu o‘yinda allaqachon qatnashgansiz.</b>\n\n' +
                'Imkoniyat faqat 1 marta beriladi.',
                { parse_mode: 'HTML' }
            );

            return;
        }

        const winningBox =
            Math.floor(Math.random() * 3) + 1;

        updateUser(ctx.from.id, {
            has_played: 0,
            state: `game_${winningBox}`
        });

        await ctx.reply(
            '🎮 <b>15% CHEGIRMA O‘YINI</b>\n\n' +

            '📢 Kanalimizga obuna bo‘lganingiz uchun sizga ' +
            '<b>1 martalik aksiya</b> berildi.\n\n' +

            '🎁 3 ta sirli qutidan bittasida <b>15% chegirma</b> bor.\n\n' +

            'Omadingizni sinab ko‘ring 👇',
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

    if (!user) return;

    if (user.has_played) {

        await ctx.answerCbQuery(
            'Siz allaqachon o‘ynagansiz.',
            { show_alert: true }
        );

        return;
    }

    const choice = Number(ctx.match[1]);

    if (!user.state.startsWith('game_')) {

        await ctx.answerCbQuery(
            'Avval o‘yinni boshlang.',
            { show_alert: true }
        );

        return;
    }

    const winningBox =
        Number(user.state.replace('game_', ''));

    updateUser(ctx.from.id, {
        has_played: 1,
        state: ''
    });

    await ctx.answerCbQuery('Tanlov qabul qilindi!');

    if (choice === winningBox) {

        updateUser(ctx.from.id, {
            has_discount: 1,
            promo_code: 'BILOL15-2026'
        });

        await ctx.reply(
            '🎉 <b>TABRIKLAYMIZ!</b> 🏆\n\n' +
            'Siz <b>15% CHEGIRMA</b> yutdingiz!\n\n' +
            '🎁 Promokod:\n' +
            '<code>BILOL15-2026</code>\n\n' +
            'Buyurtma berishda ushbu promokodni ayting.\n\n' +
            '⚠️ Chegirma faqat <b>1 marta</b> ishlatiladi.',
            { parse_mode: 'HTML' }
        );

    } else {

        await ctx.reply(
            '😔 <b>Afsus!</b>\n\n' +
            'Bu safar quti bo‘sh chiqdi.\n\n' +
            '⚠️ O‘yin imkoniyati faqat 1 marta beriladi.',
            { parse_mode: 'HTML' }
        );
    }
});

// ============================================================
// BACK BUTTON
// ============================================================

bot.hears(
    ['🔙 Ortga', '🔙 Orqaga'],
    async (ctx) => {

        const user = getUser(ctx.from.id);

        updateUser(ctx.from.id, {
            state: '',
            pending_service: '',
            client_full_name: '',
            order_description: '',
            detected_service: '',
            min_price: 0,
            client_budget: ''
        });

        await ctx.reply(
            '🏠 <b>Asosiy menyu</b>',
            {
                parse_mode: 'HTML',
                ...mainMenu(user?.language || 'uz')
            }
        );
    }
);

// ============================================================
// ERROR HANDLER
// ============================================================

bot.catch((error, ctx) => {

    console.log(
        'BOT ERROR:',
        error?.message || error
    );

    if (ctx?.from?.id) {

        ctx.reply(
            '⚠️ Texnik xatolik yuz berdi.\n\n' +
            'Iltimos, birozdan keyin qayta urinib ko‘ring.'
        ).catch(() => {});
    }
});

// ============================================================
// LAUNCH
// ============================================================

bot.launch({
    dropPendingUpdates: true
}).then(() => {

    console.log('');
    console.log('==========================================');
    console.log('🔥 BILOL | WEB DEVELOPER BOT');
    console.log('✅ BOT ISHLAYAPTI');
    console.log('💾 SQLite DATABASE ISHLAYAPTI');
    console.log('📢 SUBSCRIPTION CHECK YOQILGAN');
    console.log('📸 INSTAGRAM CONFIRMATION YOQILGAN');
    console.log('📱 PHONE VERIFICATION YOQILGAN');
    console.log('👥 USER MANAGEMENT YOQILGAN');
    console.log('🚫 BLOCK / UNBLOCK YOQILGAN');
    console.log('📢 BROADCAST YOQILGAN');
    console.log('🎮 15% GAME YOQILGAN');
    console.log('⭐ REVIEWS YOQILGAN');
    console.log('🚨 COMPLAINTS YOQILGAN');
    console.log('==========================================');
    console.log('');

}).catch(err => {

    console.error(
        '❌ BOTNI ISHGA TUSHIRISHDA XATO:',
        err.message
    );
});

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    db.close();
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    db.close();
});