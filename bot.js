'use strict';

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

// ============ CONFIG ============
const BOT_TOKEN = "--";
const ADMIN_ID = "867717817";
const ADMIN_PASSWORD = "7777";
const TARGET_CHANNEL = "@webuzbekistan";
const CHANNEL_URL = "https://t.me/webuzbekistan";
const INSTAGRAM_URL = "https://www.instagram.com/webi.uz";
const CONTACT_URL = "https://t.me/sharipoov1";
const PHONE_NUMBER = "+998993212122";
const DATA_FILE = './botdata.json';
const startTime = Date.now();

// ============ DATABASE ============
let db = {
    users: {},
    orders: [],
    reviews: [],
    complaints: []
};

function loadDB() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if (!db.users) db.users = {};
            if (!db.orders) db.orders = [];
            if (!db.reviews) db.reviews = [];
            if (!db.complaints) db.complaints = [];
        }
    } catch(e) { console.log("Load DB error:", e.message); }
}

function saveDB() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
    } catch(e) { console.log("Save DB error:", e.message); }
}

loadDB();

const bot = new Telegraf(BOT_TOKEN);
const userState = {};

// ============ SERVICES ============
const SERVICES = {
    landing: {
        name: 'Landing Page (Sotuvchi sayt)',
        price: "500,000 so'm ($40)",
        minPrice: 500000,
        minPriceUsd: 40,
        duration: '2–4 kun',
        advance: "250,000 so'm"
    },
    shop: {
        name: "Onlayn do'kon (E-Commerce)",
        price: "1,200,000 so'm ($100)",
        minPrice: 1200000,
        minPriceUsd: 100,
        duration: '7–10 kun',
        advance: "600,000 so'm"
    },
    corporate: {
        name: 'Korporativ veb-sayt',
        price: "800,000 so'm ($65)",
        minPrice: 800000,
        minPriceUsd: 65,
        duration: '3–5 kun',
        advance: "400,000 so'm"
    },
    bot: {
        name: 'Telegram Bot & Avtomatlashtirish',
        price: "400,000 so'm ($30)",
        minPrice: 400000,
        minPriceUsd: 30,
        duration: '2–5 kun',
        advance: "200,000 so'm"
    },
    webapp: {
        name: 'Veb-Ilova (Web Application)',
        price: "2,000,000 so'm ($160)",
        minPrice: 2000000,
        minPriceUsd: 160,
        duration: '10–15 kun',
        advance: "1,000,000 so'm"
    },
    logo: {
        name: 'Logo & Dizayn',
        price: "200,000 so'm ($15)",
        minPrice: 200000,
        minPriceUsd: 15,
        duration: '1–3 kun',
        advance: "100,000 so'm"
    },
    animation: {
        name: 'Animatsiya (Motion Design)',
        price: "300,000 so'm ($25)",
        minPrice: 300000,
        minPriceUsd: 25,
        duration: '2–4 kun',
        advance: "150,000 so'm"
    },
    ai: {
        name: 'AI yechimlar (AI bot)',
        price: "1,500,000 so'm ($120)",
        minPrice: 1500000,
        minPriceUsd: 120,
        duration: '7–14 kun',
        advance: "750,000 so'm"
    }
};

// ============ HELPERS ============
function escapeMd(str) {
    if (!str) return '';
    return String(str).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function nowStr() {
    const d = new Date();
    return d.toISOString().replace('T', ' ').substring(0, 19);
}

function getUser(id) {
    return db.users[id.toString()];
}

function isSubscribed(id) {
    if (id.toString() === ADMIN_ID) return true;
    const u = getUser(id);
    return u && u.subscriptionVerified;
}

// ============ MIDDLEWARE ============
bot.use((ctx, next) => {
    if (ctx.from) {
        const id = ctx.from.id.toString();
        if (!db.users[id]) {
            db.users[id] = {
                id: ctx.from.id,
                name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Noma\'lum',
                username: ctx.from.username || null,
                phone: null,
                registeredAt: nowStr(),
                lang: 'uz',
                blocked: false,
                hasPlayed: false,
                hasDiscount: false,
                subscriptionVerified: false
            };
            saveDB();
        }
        if (db.users[id].blocked && id !== ADMIN_ID) {
            return;
        }
    }
    return next();
});

// Subscription check middleware - only for messages and actions except admin commands
const subWhitelist = ['/start', 'check_sub', '/admin'];

bot.use(async (ctx, next) => {
    // Only check for non-admin
    if (!ctx.from) return next();
    const id = ctx.from.id.toString();
    if (id === ADMIN_ID) return next();
    if (isSubscribed(id)) return next();
    
    // Check if this is a callback that's in whitelist
    if (ctx.callbackQuery) {
        const data = ctx.callbackQuery.data || '';
        if (data === 'check_sub') return next();
        if (data.startsWith('lang_')) return next();
        // Block everything else
        await ctx.answerCbQuery("⚠️ Avval obuna bo'ling!").catch(() => {});
        await askSubscription(ctx);
        return;
    }
    
    if (ctx.message) {
        // Allow /start
        if (ctx.message.text && ctx.message.text.startsWith('/start')) return next();
        // Allow subscription related
        await askSubscription(ctx);
        return;
    }
    
    return next();
});

async function askSubscription(ctx) {
    const text = 
        "🔒 *Botdan foydalanish uchun obuna bo'ling!*\n\n" +
        "Hurmatli foydalanuvchi, botimizdan to'liq foydalanish uchun quyidagi sahifalarga obuna bo'ling:\n\n" +
        "📢 *Kanal:* " + CHANNEL_URL + "\n" +
        "📸 *Instagram:* " + INSTAGRAM_URL + "\n\n" +
        "✅ Obuna bo'lgach, quyidagi tugmani bosing:";
    const kb = Markup.inlineKeyboard([
        [Markup.button.url('📢 Kanalga obuna', CHANNEL_URL), Markup.button.url('📸 Instagram', INSTAGRAM_URL)],
        [Markup.button.callback('✅ Obuna bo\'ldim', 'check_sub')]
    ]);
    
    try {
        if (ctx.callbackQuery) {
            await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
        } else {
            await ctx.reply(text, { parse_mode: 'Markdown', ...kb });
        }
    } catch(e) {}
}

// ============ SUBSCRIPTION CHECK ============
bot.action('check_sub', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const id = ctx.from.id.toString();
    if (!db.users[id]) return;
    
    db.users[id].subscriptionVerified = true;
    saveDB();
    
    await ctx.editMessageText("✅ *Obuna tasdiqlandi!* Rahmat! 🎉", { parse_mode: 'Markdown' }).catch(() => {});
    
    if (!db.users[id].phone) {
        await ctx.reply(
            "📞 *Endi telefon raqamingizni yuboring!*\n\n" +
            "Pastdagi tugma orqali o'z raqamingizni yuboring. Bu majburiy qadam!",
            { parse_mode: 'Markdown', ...Markup.keyboard([
                [Markup.button.contactRequest("📱 Telefon raqamni yuborish")]
            ]).resize().oneTime() }
        );
    } else {
        await ctx.reply(
            "🎉 *Xush kelibsiz!* Botdan to'liq foydalanishingiz mumkin.",
            { parse_mode: 'Markdown', ...getMainMenu(db.users[id].lang || 'uz') }
        );
    }
});

// Contact handler for initial subscription phone
bot.on('contact', async (ctx) => {
    const id = ctx.from.id.toString();
    const contact = ctx.message.contact;
    
    if (contact.user_id && contact.user_id !== ctx.from.id) {
        return ctx.reply("❌ Faqat o'zingizning raqamingizni yuboring!");
    }
    
    if (!db.users[id]) return;
    db.users[id].phone = '+' + contact.phone_number.replace(/^\+/, '');
    saveDB();
    
    // Check if there's a pending order flow
    const state = userState[id] || {};
    if (state.waitingForPhone) {
        // This is order phone - handled in order handler below
        // But we already have contact handler... let's do order processing
        // Actually we need to distinguish initial phone vs order phone
        // Let's use state
    }
    
    // If we're in the middle of ordering, handle it
    if (userState[id]?.waitingForPhone) {
        // Process order
        await processOrderFinal(ctx);
        return;
    }
    
    // Initial registration phone
    await ctx.reply(
        "✅ Telefon raqamingiz saqlandi!\n\n" +
        "🎉 Endi botdan to'liq foydalanishingiz mumkin. Kerakli bo'limni tanlang 👇",
        getMainMenu(db.users[id].lang || 'uz')
    );
    
    await ctx.reply(
        "🌐 *Bilol | Web Developer 💻*ga xush kelibsiz!\n\n" +
        "Biznesingizni raqamlashtirish uchun professional jamoa xizmatda. 🚀\n\n" +
        "🎁 *Maxsus:* Kanalga obuna bo'lganingiz uchun mini-o'yinda **15% chegirma** yutib olishingiz mumkin!",
        { parse_mode: 'Markdown' }
    );
});

// ... continue with rest of code