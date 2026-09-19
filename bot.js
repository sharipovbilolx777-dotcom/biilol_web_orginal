'use strict';
const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = "8774770545:AAGQR4qQiWWf5AC-5OYvVhzHWkju9udZUgw";
const ADMIN_ID = "867717817";
const ADMIN_PASSWORD = "7777";
const TARGET_CHANNEL = "@webuzbekistan";

const bot = new Telegraf(BOT_TOKEN);
const userState = {};
const allUsers = new Map(); // id -> { joinedAt, phone, status, username, firstName }
const startTime = Date.now();

// Majburiy obuna tekshiruvi uchun yordamchi funksiya
async function checkSubscription(ctx, userId) {
    try {
        const member = await ctx.telegram.getChatMember(TARGET_CHANNEL, userId);
        const validStatuses = ['creator', 'administrator', 'member'];
        return validStatuses.includes(member.status);
    } catch (e) {
        // Agar bot kanalda admin bo'lmasa yoki xatolik yuz bersa, o'tkazib yubormaslik uchun false qaytarish mumkin yoki true
        return false; 
    }
}

const getSubKeyboard = () => Markup.inlineKeyboard([
    [Markup.button.url('📢 Kanalga a’zo bo‘lish', 'https://t.me/webuzbekistan')],
    [Markup.button.url('📸 Instagramga o‘tish', 'https://www.instagram.com/webi.uz')],
    [Markup.button.callback('✅ Obunani tekshirish', 'check_sub')]
]);

bot.use((ctx, next) => {
    if (ctx.from) {
        const userId = ctx.from.id;
        if (!allUsers.has(userId)) {
            allUsers.set(userId, {
                joinedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
                phone: 'Yo‘q',
                status: '🟢 FAOL',
                username: ctx.from.username || 'mavjud_emas',
                firstName: ctx.from.first_name || 'Ism yoq'
            });
        }
    }
    return next();
});

const getLangMenu = () => Markup.inlineKeyboard([
    [
        Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz'),
        Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
        Markup.button.callback('🇬🇧 English', 'lang_en')
    ]
]);

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].lang = 'uz';

    if (userId.toString() === ADMIN_ID) { 
        ctx.reply("👑 *Xush kelibsiz, Boss!*\nAdmin panelga kirish uchun /admin buyrug'ini yuboring.", { parse_mode: 'Markdown' }); 
    } 

    // Majburiy obunani tekshirish
    const isSubscribed = await checkSubscription(ctx, userId);
    if (!isSubscribed && userId.toString() !== ADMIN_ID) {
        return ctx.reply(
            "⚠️ *Botimizdan foydalanish uchun avval rasmiy kanallarimizga obuna bo'lishingiz kerak!*\n\n" +
            "📢 Kanal: https://t.me/webuzbekistan\n" +
            "📸 Instagram: https://www.instagram.com/webi.uz\n\n" +
            "Obuna bo'lib, pastdagi **«✅ Obunani tekshirish»** tugmasini bosing:",
            { parse_mode: 'Markdown', disable_web_page_preview: true, ...getSubKeyboard() }
        );
    }

    sendWelcomeMenu(ctx);
});

bot.action('check_sub', async (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    const isSubscribed = await checkSubscription(ctx, userId);

    if (!isSubscribed && userId.toString() !== ADMIN_ID) {
        return ctx.reply("❌ Siz hali kanallarga to'liq obuna bo'lmadingiz! Iltimos, ulaning va qaytadan bosing:", { ...getSubKeyboard() });
    }

    ctx.deleteMessage().catch(() => {});
    sendWelcomeMenu(ctx);
});

function sendWelcomeMenu(ctx) {
    ctx.reply( 
        "🚀 *BILOL | WEB DEVELOPER*\n\n" + 
        "Biznesingiz uchun zamonaviy raqamli mahsulotlar yaratamiz.\n" + 
        "💻 Web-saytlar — biznes, landing, korporativ, katalog\n" + 
        "🛒 Online do‘konlar — E-commerce va buyurtma tizimlari\n" + 
        "🤖 Telegram botlar — avtomatlashtirish va biznes botlar\n" + 
        "🧠 AI yechimlar — AI botlar va aqlli tizimlar\n" + 
        "📱 Web ilovalar — maxsus platformalar va servislar\n" + 
        "🎨 Logo & dizayn — brend va vizual yechimlar\n" + 
        "✨ Animatsiya — logo, reklama va motion dizayn\n\n" +
        "🌐 *Muloqot tilini tanlang:*", 
        { parse_mode: 'Markdown', ...getLangMenu() } 
    );
}

// ================= ADMIN PANEL & PASSWORD =================
bot.command('admin', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    const userId = ctx.from.id; 
    if (!userState[userId]) userState[userId] = {}; 
    userState[userId].waitingForAdminPassword = true; 

    ctx.reply("🔐 *Admin panelga kirish uchun maxfiy parolni kiriting:*", { parse_mode: 'Markdown' }); 
});

function showAdminPanel(ctx) {
    const adminKb = Markup.inlineKeyboard([
        [Markup.button.callback('📊 To\'liq Statistika & Metrikalar', 'adm_stats')],
        [Markup.button.callback('👥 Foydalanuvchilar Boshqaruvi', 'adm_users_list')],
        [Markup.button.callback('📢 Universal Reklama Tarqatish', 'adm_broadcast')],
        [Markup.button.callback('🧹 Bloklanganlarni Tozalash (Clean)', 'adm_clean')]
    ]);
    ctx.reply( 
        "🛡 *BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER*\n\n" + 
        "┏ Xavfsizlik darajasi: `100% (Protected)`\n" + 
        "┣ Tizim holati: `Barqaror / Ishlayapti ⚡️`\n" + 
        "┗ Boshqaruv uchun menyudan foydalaning: 👇",  
        { parse_mode: 'Markdown', ...adminKb } 
    ); 
}

bot.action('adm_stats', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000); 
    const hours = Math.floor(uptimeSec / 3600); 
    const minutes = Math.floor((uptimeSec % 3600) / 60); 

    let activeCount = 0;
    let blockedCount = 0;
    allUsers.forEach(u => {
        if (u.status.includes('FAOL')) activeCount++;
        else blockedCount++;
    });

    const statsText = 
        `📊 *A-FARID & BILOL DEVELOPER STATISTIKA*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 *FOYDALANUVCHILAR*\n` +
        `👥 Jami: \`${allUsers.size}\`\n` +
        `🟢 Aktiv: \`${activeCount}\`\n` +
        `🚫 Bloklangan/O'chiq: \`${blockedCount}\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ Uptime: \`${hours} soat, ${minutes} daqiqa\`\n` +
        `🤖 Bot holati: \`Optimal (Stable) ⚡️\`\n` +
        `💎 Versiya: \`v4.0 Enterprise\``;

    ctx.editMessageText(statsText, {  
        parse_mode: 'Markdown', 
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Orqaga', 'adm_back')]]) 
    }).catch(() => {}); 
});

bot.action('adm_users_list', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});

    let buttons = [];
    allUsers.forEach((data, id) => {
        buttons.push([Markup.button.callback(`👤 ${data.firstName} (${id})`, `adm_user_${id}`)]);
    });
    buttons.push([Markup.button.callback('🔙 Orqaga', 'adm_back')]);

    ctx.editMessageText("👥 *Barcha foydalanuvchilar ro'yxati (Boshqarish uchun tanlang):*", {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    }).catch(() => {});
});

bot.action(/^adm_user_(\d+)$/, (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    const targetId = ctx.match[1];
    const uData = allUsers.get(parseInt(targetId));

    if (!uData) return ctx.reply("Foydalanuvchi topilmadi.");

    const text = 
        `👤 *FOYDALANUVCHI*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 Ism: ${uData.firstName}\n` +
        `🔗 Username: @${uData.username}\n` +
        `🆔 Telegram ID: \`${targetId}\`\n` +
        `📞 Telefon: ${uData.phone}\n` +
        `🕐 Ro‘yxatdan o‘tgan: ${uData.joinedAt}\n` +
        `📊 Status: ${uData.status}`;

    const kb = Markup.inlineKeyboard([
        [Markup.button.callback(uData.status.includes('FAOL') ? '🔴 Bloklash' : '🟢 Blockdan chiqarish', `toggle_block_${targetId}`)],
        [Markup.button.callback('🔙 Orqaga', 'adm_users_list')]
    ]);

    ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb }).catch(() => {});
});

bot.action(/^toggle_block_(\d+)$/, (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    const targetId = parseInt(ctx.match[1]);
    const uData = allUsers.get(targetId);

    if (uData) {
        if (uData.status.includes('FAOL')) {
            uData.status = '🔴 BLoklangan';
        } else {
            uData.status = '🟢 FAOL';
        }
    }
    ctx.reply(`✅ Foydalanuvchi holati o'zgartirildi!`);
    showAdminPanel(ctx);
});

bot.action('adm_back', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    const adminKb = Markup.inlineKeyboard([ 
        [Markup.button.callback('📊 To\'liq Statistika & Metrikalar', 'adm_stats')], 
        [Markup.button.callback('👥 Foydalanuvchilar Boshqaruvi', 'adm_users_list')],
        [Markup.button.callback('📢 Universal Reklama Tarqatish', 'adm_broadcast')], 
        [Markup.button.callback('🧹 Bloklanganlarni Tozalash (Clean)', 'adm_clean')] 
    ]); 

    ctx.editMessageText( 
        "🛡 *BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER*\n\n" + 
        "┏ Xavfsizlik darajasi: `100% (Protected)`\n" + 
        "┣ Tizim holati: `Barqaror / Ishlayapti ⚡️`\n" + 
        "┗ Boshqaruv uchun menyudan foydalaning: 👇",  
        { parse_mode: 'Markdown', ...adminKb } 
    ).catch(() => {}); 
});

bot.action('adm_broadcast', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    userState[ctx.from.id].waitingForBroadcast = true;
    ctx.reply( 
        "📢 *Universal Reklama Rejimi Faollashdi!*\n\n" + 
        "Endi xohlagan turdagi reklamangizni yuborishingiz mumkin:\n" + 
        "• 🖼 Rasm va tagida matn bilan\n" + 
        "• 📹 Video yoki fayl shaklida\n" + 
        "• 📄 Oddiy matn yoki tugmali xabar ko'rinishida\n\n" + 
        "_Nima yuborsangiz, kanalingizga va barcha foydalanuvchilarga birdek boradi!_", 
        { parse_mode: 'Markdown' } 
    ); 
});

bot.action('adm_clean', async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    let active = 0; 
    let removed = 0; 
    await ctx.reply("⏳ Bazadagi faollik tekshirilmoqda, iltimos kuting..."); 

    for (const [id, data] of allUsers) { 
        try { 
            await ctx.telegram.sendChatAction(id, "typing"); 
            active++; 
        } catch (e) { 
            data.status = '🔴 BLoklangan';
            removed++; 
        } 
    } 

    ctx.reply( 
        `✅ *Tozalash jarayoni yakunlandi!*\n\n` + 
        `🟢 Faol va ochiq foydalanuvchilar: \`${active}\` ta\n` + 
        `🔴 Botni bloklaganlar: \`${removed}\` ta`, 
        { parse_mode: 'Markdown' } 
    ); 
});

// ================= LANGUAGES =================
bot.action('lang_uz', (ctx) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].lang = 'uz';
    ctx.reply("🇺🇿 O'zbek tili faollashdi. Kerakli bo'limni tanlang 👇", { parse_mode: 'Markdown', ...getMainMenu('uz') });
});
bot.action('lang_ru', (ctx) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].lang = 'ru';
    ctx.reply("🇷🇺 Русский язык активирован. Выберите нужный раздел 👇", { parse_mode: 'Markdown', ...getMainMenu('ru') });
});
bot.action('lang_en', (ctx) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].lang = 'en';
    ctx.reply("🇬🇧 English selected. Choose a section below 👇", { parse_mode: 'Markdown', ...getMainMenu('en') });
});

function getMainMenu(lang) {
    if (lang === 'ru') {
        return Markup.keyboard([
            ['💻 Портфолио проектов', '⚙️ Услуги и Прайс'],
            ['🎮 Выиграть скидку 15%', '⭐️ Отзывы клиентов'],
            ['📞 Контакты', '💻 Заказать проект'],
            ['🌐 Изменить язык']
        ]).resize();
    } else if (lang === 'en') {
        return Markup.keyboard([
            ['💻 Portfolio', '⚙️ Services & Pricing'],
            ['🎮 Win 15% Discount', '⭐️ Client Reviews'],
            ['📞 Contacts', '💻 Order Project'],
            ['🌐 Change Language']
        ]).resize();
    } else {
        return Markup.keyboard([
            ['💻 Bizning ishlar (Portfolio)', '⚙️ Xizmatlar va Narxlar'],
            ['🎮 Chegirma yutish (Mini-O\'yin)', '⭐️ Mijozlar fikri & Shikoyat'],
            ['📞 Aloqa va Murojaat', '💻 Loyihaga buyurtma'],
            ['🌐 Tilni o\'zgartirish']
        ]).resize();
    }
}

bot.hears(['🌐 Tilni o\'zgartirish', '🌐 Изменить язык', '🌐 Change Language'], (ctx) => {
    ctx.reply("🌐 Tilni o'zgartirish:", getLangMenu());
});

// ================= SERVICES =================
bot.hears(['⚙️ Xizmatlar va Narxlar', '⚙️ Услуги и Прайс', '⚙️ Services & Pricing'], (ctx) => {
    const servicesKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 1. Landing Page (Sotuvchi sayt)', 'srv_landing')],
        [Markup.button.callback('🛍 2. E-Commerce (Onlayn do\'kon)', 'srv_shop')],
        [Markup.button.callback('🏢 3. Korporativ veb-sayt', 'srv_corporate')],
        [Markup.button.callback('🤖 4. Telegram Bot & Avtomatlashtirish', 'srv_bot')],
        [Markup.button.callback('📱 5. Veb-Ilova (Web Application)', 'srv_webapp')]
    ]);
    ctx.reply( 
        "🛠 *Bilol | Web Developer 💻 — Professional xizmatlarimiz:*\n\n" + 
        "💡 *Muhim eslatma:* Narxlar loyihaning murakkabligiga qarab **yana kelishiladi!** Hamyonbob va sifatli natija kafolatlanadi. 🤝\n\n" + 
        "📌 *To'lov sharti:* Barcha loyihalar uchun **50% oldindan to'lov** amalga oshiriladi.\n\n" + 
        "Quyidagi yo'nalishlardan birini tanlang: 👇", 
        { parse_mode: 'Markdown', ...servicesKeyboard } 
    ); 
});

bot.action(/^srv_(.+)$/, (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const type = ctx.match[1];
    let info = ""; 
    let code = ""; 

    if (type === 'landing') { 
        info = "🚀 *1. Landing Page (Sotuvchi sayt)*\n\n• Narxi: 500,000 so'm ($40) dan boshlab\n• Oldindan to'lov (50%): 250,000 so'm"; 
        code = "order_landing"; 
    } else if (type === 'shop') { 
        info = "🛍 *2. E-Commerce (Onlayn do'kon)*\n\n• Narxi: 1,200,000 so'm ($100) dan boshlab\n• Oldindan to'lov (50%): 600,000 so'm"; 
        code = "order_shop"; 
    } else if (type === 'corporate') { 
        info = "🏢 *3. Korporativ veb-sayt*\n\n• Narxi: 800,000 so'm ($65) dan boshlab\n• Oldindan to'lov (50%): 400,000 so'm"; 
        code = "order_corporate"; 
    } else if (type === 'bot') { 
        info = "🤖 *4. Telegram Bot va Avtomatlashtirish*\n\n• Narxi: 400,000 so'm ($30) dan boshlab\n• Oldindan to'lov (50%): 200,000 so'm"; 
        code = "order_bot"; 
    } else if (type === 'webapp') { 
        info = "📱 *5. Veb-Ilova (Web Application)*\n\n• Narxi: 2,000,000 so'm ($160) dan boshlab\n• Oldindan to'lov (50%): 1,000,000 so'm"; 
        code = "order_webapp"; 
    } 

    const kb = Markup.inlineKeyboard([[Markup.button.callback('✨ Shu xizmatga buyurtma berish', code)]]); 
    ctx.reply(info, { parse_mode: 'Markdown', ...kb }); 
});

bot.action(/^order_(.+)$/, (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].pendingService = ctx.match[1];
    askAgreement(ctx); 
});

bot.hears(['💻 Loyihaga buyurtma', '💻 Заказать проект', '💻 Order Project'], (ctx) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].pendingService = "Umumiy murojaat";
    askAgreement(ctx); 
});

function askAgreement(ctx) {
    const kb = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Roziman', 'agree_yes'), Markup.button.callback('❌ Bekor qilish', 'agree_no')]
    ]);
    ctx.reply(
        "🤝 *Buyurtma shartlari bilan tanishish:*\n\n" +
        "Barcha loyihalar uchun 50% oldindan to'lov amalga oshiriladi va qolgan narxlar o'zaro kelishiladi. Ushbu shartga rozimisiz?",
        { parse_mode: 'Markdown', ...kb }
    );
}

bot.action('agree_no', (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    ctx.editMessageText("Buyurtma jarayoni bekor qilindi. ❌").catch(() => {});
});

bot.action('agree_yes', (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].waitingForName = true;
    ctx.editMessageText("✅ Rozilik qabul qilindi. Ajoyib tanlov! 🚀\n\n📝 Iltimos, ism va familiyangizni to'liq kiriting:", { parse_mode: 'Markdown' }).catch(() => {}); 
});

// ================= PORTFOLIO =================
bot.hears(['💻 Bizning ishlar (Portfolio)', '💻 Портфолио проектов', '💻 Portfolio'], (ctx) => {
    const text = "💻 *Bilol | Web Developer* — Biz amalga oshirgan eng so'nggi muvaffaqiyatli loyihalar:\n\nO'zingizga yoqqan namunani bosing va tanishib chiqing 👇";
    const kb = Markup.inlineKeyboard([
        [Markup.button.url('🌿 Humogarden.uz', 'https://fastidious-starburst-7aa5e3.netlify.app/')],
        [Markup.button.url('✨ Glittery Rugelach', 'https://glittery-rugelach-e63860.netlify.app/')],
        [Markup.button.url('🚀 Fastidious Dieffenbachia 1', 'https://fastidious-dieffenbachia-94b656.netlify.app/')],
        [Markup.button.url('🎨 Magenta Blini Store', 'https://magenta-blini-956248.netlify.app/')],
        [Markup.button.url('💖 Heartfelt Manatee', 'https://heartfelt-manatee-645764.netlify.app/')],
        [Markup.button.url('⚡️ Harmonious Halva', 'https://harmonious-halva-0fe592.netlify.app/')]
    ]);
    ctx.reply(text, { parse_mode: 'Markdown', ...kb });
});

// ================= REVIEWS & COMPLAINTS =================
bot.hears(['⭐️ Mijozlar fikri & Shikoyat', '⭐️ Отзывы клиентов', '⭐️ Client Reviews'], (ctx) => {
    const msg = "⭐️ Fikr, baho yoki shikoyat yoldirlashingiz mumkin:";
    const kb = Markup.inlineKeyboard([
        [Markup.button.callback('⭐️ 5 Yulduz berish', 'rate_5'), Markup.button.callback('✍️ Fikr yozish', 'leave_review')],
        [Markup.button.callback('🚨 Shikoyat bildirish', 'leave_complaint')]
    ]);
    ctx.reply(msg, { parse_mode: 'Markdown', ...kb });
});

bot.action(/^rate_([1-5])$/, (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const num = ctx.match[1];
    ctx.reply(`Rahmat! Siz Bilol | Web Developer 💻 botiga **${num} ta yulduz** baho berdingiz. ❤️ Biz siz uchun yanada yaxshilashga harakat qilamiz!`, { parse_mode: 'Markdown' });
});

bot.action('leave_review', (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    userState[ctx.from.id].waitingForReview = true;
    ctx.reply("✍️ Marhamat, o'z fikringizni shu yerga yuboring:");
});

bot.action('leave_complaint', (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    userState[ctx.from.id].waitingForComplaint = true;
    ctx.reply("🚨 Shikoyat yoki taklifingizni yozib yuboring, adminimiz ko'rib chiqadi:");
});

// ================= MINI GAME (15% DISCOUNT) =================
bot.hears(['🎮 Chegirma yutish (Mini-O\'yin)', '🎮 Выиграть скидку 15%', '🎮 Win 15% Discount'], (ctx) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    if (userState[userId].hasPlayed) {
        return ctx.reply("⚠️ Siz bu o'yinda allaqachon qatnashgansiz! Imkoniyat faqat 1 marta beriladi. 😉");
    }

    const winningBox = Math.floor(Math.random() * 3) + 1;
    userState[userId].winningBox = winningBox;

    const gameKb = Markup.inlineKeyboard([
        [
            Markup.button.callback('🎁 1-Quti', 'box_1'),
            Markup.button.callback('🎁 2-Quti', 'box_2'),
            Markup.button.callback('🎁 3-Quti', 'box_3')
        ]
    ]);

    ctx.reply(
        "🎮 *Omadli Chegirma O'yini!*\n\nKanalga obuna bo'lganingiz uchun aksiya! 3 ta sirli qutidan birida 15% chegirma yashiringan:",
        { parse_mode: 'Markdown', ...gameKb }
    );
});

bot.action(/^box_(\d+)$/, (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    const choice = parseInt(ctx.match[1], 10);
    if (!userState[userId]) userState[userId] = {};
    if (userState[userId].hasPlayed) {
        return ctx.reply("⚠️ Siz allaqachon o'ynagansiz!");
    }

    userState[userId].hasPlayed = true;
    if (choice === userState[userId].winningBox) {
        userState[userId].hasDiscount = true;
        ctx.reply("🎉 *TABRIKLAYMIZ! Siz 15% chegirma yutib oldingiz!* 🏆\n\nPromokod: `PROMO-15-VIP`", { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`😢 Afsus, bu quti bo'sh chiqdi. Keyingi safar omad yor bo'lsin! ✨`);
    }
});

// ================= CONTACTS =================
bot.hears(['📞 Aloqa va Murojaat', '📞 Контакты', '📞 Contacts'], (ctx) => {
    ctx.reply(
        "📬 *BILOL | WEB DEVELOPER* — Biz bilan bog'lanish:\n\n" +
        "📞 Telefon: +998993212122\n" +
        "💬 Telegram: https://t.me/sharipoov1\n" +
        "📸 Instagram: https://www.instagram.com/webi.uz\n" +
        "📢 Kanal: https://t.me/webuzbekistan",
        { parse_mode: 'Markdown', disable_web_page_preview: true }
    );
});

bot.hears('🔙 Ortga', (ctx) => {
    const userId = ctx.from.id;
    const lang = userState[userId]?.lang || 'uz';
    if (userState[userId]) {
        userState[userId].waitingForName = false;
        userState[userId].waitingForOrderDesc = false;
        userState[userId].waitingForBudget = false;
        userState[userId].waitingForPhone = false;
        userState[userId].waitingForAdminPassword = false;
    }
    ctx.reply("Asosiy menyu:", getMainMenu(lang));
});

// ================= TEXT & FLOW INPUT HANDLERS =================
bot.on(['text', 'photo', 'video', 'document', 'audio', 'animation'], async (ctx, next) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};

    // 1. Ism kiritish
    if (userState[userId].waitingForName && ctx.message && ctx.message.text) {
        const text = ctx.message.text.trim();
        if (text.split(/\s+/).length < 2) {
            return ctx.reply("❌ Iltimos, ism va familiyangizni to'liq yozing:");
        }
        userState[userId].waitingForName = false;
        userState[userId].clientFullName = text;
        userState[userId].waitingForOrderDesc = true;
        return ctx.reply("🎯 Ajoyib! Endi qisqacha nima buyurtma qilmoqchisiz va loyihangiz haqida yozing:", { parse_mode: 'Markdown' });
    }

    // 2. Loyiha izohi va narxini aniqlash
    if (userState[userId].waitingForOrderDesc && ctx.message && ctx.message.text) {
        const descText = ctx.message.text.trim();
        const lower = descText.toLowerCase();
        let minPrice = "";
        let isKnown = true;

        if (lower.includes('ilov') || lower.includes('app')) {
            minPrice = "2,000,000 so'm ($160)";
        } else if (lower.includes('do') || lower.includes('magazin') || lower.includes('shop')) {
            minPrice = "1,200,000 so'm ($100)";
        } else if (lower.includes('bot') || lower.includes('telegram')) {
            minPrice = "400,000 so'm ($30)";
        } else if (lower.includes('landing') || lower.includes('sayt') || lower.includes('site')) {
            minPrice = "500,000 so'm ($40)";
        } else {
            isKnown = false;
        }

        if (!isKnown) {
            userState[userId].waitingForOrderDesc = false;
            const contactAdminKb = Markup.inlineKeyboard([
                [Markup.button.url('💬 Admin bilan bog\'lanish', 'https://t.me/sharipoov1')]
            ]);
            return ctx.reply("❌ Kechirasiz, bizda bu yo'nalish bo'yicha tayyor xizmat topilmadi. Admin bilan bog'laning:", { ...contactAdminKb });
        }

        userState[userId].waitingForOrderDesc = false;
        userState[userId].orderDescription = descText;
        userState[userId].waitingForBudget = true;

        return ctx.reply(`📌 Tanlangan xizmat turi bo'yicha narxlar **${minPrice}** dan boshlanadi!\n\n💰 Ushbu loyiha uchun ajratgan taxminiy budjetingizni (raqamda) yozing:`, { parse_mode: 'Markdown' });
    }

    // 3. Budjet tekshiruvi
    if (userState[userId].waitingForBudget && ctx.message && ctx.message.text) {
        const budgetText = ctx.message.text.trim();
        const numericValue = parseInt(budgetText.replace(/[^0-9]/g, ''), 10);

        if (isNaN(numericValue) || numericValue <= 0) {
            return ctx.reply("❌ Xatolik! Iltimos, real budjet miqdorini raqamda kiriting:");
        }

        userState[userId].waitingForBudget = false;
        userState[userId].clientBudget = budgetText;
        userState[userId].waitingForPhone = true;

        return ctx.reply(
            "📞 Ajoyib! Oxirgi qadam — telefon raqamingizni yuboring (Pastdagi tugmani bosing):",
            Markup.keyboard([
                [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
                ['🔙 Ortga']
            ]).resize()
        );
    }

    // 4. Sharh yozish
    if (userState[userId].waitingForReview && ctx.message && ctx.message.text) {
        userState[userId].waitingForReview = false;
        ctx.telegram.sendMessage(ADMIN_ID, `💬 Yangi sharh:\n${ctx.message.text}`).catch(() => {});
        return ctx.reply("✅ Fikringiz uchun rahmat!");
    }

    // 5. Shikoyat yozish
    if (userState[userId].waitingForComplaint && ctx.message && ctx.message.text) {
        userState[userId].waitingForComplaint = false;
        ctx.telegram.sendMessage(ADMIN_ID, `🚨 Yangi shikoyat:\n${ctx.message.text}`).catch(() => {});
        return ctx.reply("✅ Shikoyatingiz adminga yuborildi.");
    }

    // 6. Admin parol
    if (userId.toString() === ADMIN_ID && userState[userId].waitingForAdminPassword) {
        if (ctx.message && ctx.message.text) {
            if (ctx.message.text.trim() === ADMIN_PASSWORD) {
                userState[userId].waitingForAdminPassword = false;
                return showAdminPanel(ctx);
            } else {
                return ctx.reply("❌ Noto'g'ri parol!");
            }
        }
    }

    // 7. Broadcast
    if (userId.toString() === ADMIN_ID && userState[userId].waitingForBroadcast) {
        userState[userId].waitingForBroadcast = false;
        let success = 0;
        await ctx.reply("⏳ Reklama tarqatilmoqda...");
        try {
            await ctx.telegram.copyMessage(TARGET_CHANNEL, ctx.chat.id, ctx.message.message_id);
            success++;
        } catch(e) {}

        for (const [id] of allUsers) {
            try {
                await ctx.telegram.copyMessage(id, ctx.chat.id, ctx.message.message_id);
                success++;
            } catch(e) {}
        }
        return ctx.reply(`✅ Reklama ${success} ta manzilga yuborildi!`);
    }

    return next();
});

// Kontakt qabul qilganda
bot.on('contact', async (ctx) => {
    const contact = ctx.message.contact;
    const user = ctx.message.from;
    const userId = ctx.from.id;
    const state = userState[userId] || {};

    // Bazadagi foydalanuvchi telefonini yangilash
    if (allUsers.has(userId)) {
        allUsers.get(userId).phone = `+${contact.phone_number}`;
    }

    const adminMessage = 
        `🚨 *Bilol | Web Developer — Yangi buyurtma keldi!*\n\n` + 
        `👤 *F.I.O:* ${state.clientFullName || user.first_name}\n` + 
        `📞 *Tel:* +${contact.phone_number}\n` + 
        `🔗 *Username:* @${user.username || 'mavjud_emas'}\n` + 
        `🆔 *Telegram ID:* \`${user.id}\`\n` + 
        `📌 *Tanlangan xizmat:* \`${state.pendingService || 'Umumiy'}\`\n` + 
        `📝 *Tafsilot:* _"${state.orderDescription || 'Yoq'}"_\n` + 
        `💰 *Budjet:* \`${state.clientBudget || 'Kelishiladi'}\`\n` + 
        `🏷 *Aksiya:* ${state.hasDiscount ? 'PROMO-15-VIP' : 'Yoq'}`; 

    try { 
        await ctx.telegram.sendMessage(ADMIN_ID, adminMessage, { parse_mode: 'Markdown' }); 
    } catch (e) {} 

    await ctx.reply(
        "Rahmat! Ma'lumotlaringiz muvaffaqiyatli qabul qilindi. Tez orada mutaxassisimiz siz bilan bog'lanadi! ✅\n\n" +
        "📢 Kanal: https://t.me/webuzbekistan\n" +
        "📸 Instagram: https://www.instagram.com/webi.uz\n" +
        "💬 Aloqa: https://t.me/sharipoov1\n" +
        "📞 Tel: +998993212122",
        { parse_mode: 'Markdown', disable_web_page_preview: true, ...getMainMenu(state.lang || 'uz') }
    ); 

    userState[userId] = {};
});

bot.launch({ dropPendingUpdates: true }).then(() => {
    console.log("🔥 Bilol | Web Developer Enterprise Bot muvaffaqiyatli ishga tushdi!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));