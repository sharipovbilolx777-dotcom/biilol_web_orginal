'use strict';

const { Telegraf, Markup } = require('telegraf');
const BOT_TOKEN ="7993407351:AAGA0NBzHJ6gZPG35-gnCp49jihBaG91Zho";
const ADMIN_ID = "867717817";
const ADMIN_PASSWORD = "7777";
const TARGET_CHANNEL = "@Bilolwebdeveloper";

const bot = new Telegraf(BOT_TOKEN);
const userState = {};
const allUsers = new Set();
const startTime = Date.now();

bot.use((ctx, next) => {
    if (ctx.from) {
        allUsers.add(ctx.from.id);
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

bot.start((ctx) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].lang = 'uz';
    
    if (userId.toString() === ADMIN_ID) {
        ctx.reply("👑 *Xush kelibsiz, Boss!*\nAdmin panelga kirish uchun /admin buyrug'ini yuboring.", { parse_mode: 'Markdown' });
    }

    ctx.reply(
        "⚡️ *Bilol | Web Developer 💻 studiyasiga xush kelibsiz!*\n\n" +
        "Biznesingizni raqamlashtirish uchun professional jamoa xizmatda. 🚀\n\n" +
        "🎁 *Maxsus aksiya:* Mini-o'yinda qatnashing va 20% chegirma yutib oling!\n\n" +
        "🌐 *Muloqot tilini tanlang:*",
        { parse_mode: 'Markdown', ...getLangMenu() }
    );
});

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
        [Markup.button.callback('📢 Universal Reklama Tarqatish', 'adm_broadcast')],
        [Markup.button.callback('👥 Foydalanuvchilar Ro\'yxati', 'adm_users')],
        [Markup.button.callback('🧹 Bloklanganlarni Tozalash (Clean)', 'adm_clean')]
    ]);

    ctx.reply(
        "🛡 *BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER*\n\n" +
        "┏ Xavfsizlik darajasi: \`100% (Protected)\`\n" +
        "┣ Tizim holati: \`Barqaror / Ishlayapti ⚡️\`\n" +
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

    ctx.editMessageText(
        `📊 *Tizim Statistikasi & Metrikalar:*\n\n` +
        `👥 Jami foydalanuvchilar: \`${allUsers.size}\` ta\n` +
        `⏱️ Ishlab turish vaqti (Uptime): \`${hours} soat, ${minutes} daqiqa\`\n` +
        `🤖 Bot holati: \`Optimal (Stable) ⚡️\`\n` +
        `⚙️ Arxitektura: \`Telegraf v4 / Node.js\`\n` +
        `💎 Versiya: \`v3.5 Professional Enterprise\``,
        { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Orqaga', 'adm_back')]
            ])
        }
    ).catch(() => {});
});

bot.action('adm_back', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});

    const adminKb = Markup.inlineKeyboard([
        [Markup.button.callback('📊 To\'liq Statistika & Metrikalar', 'adm_stats')],
        [Markup.button.callback('📢 Universal Reklama Tarqatish', 'adm_broadcast')],
        [Markup.button.callback('👥 Foydalanuvchilar Ro\'yxati', 'adm_users')],
        [Markup.button.callback('🧹 Bloklanganlarni Tozalash (Clean)', 'adm_clean')]
    ]);

    ctx.editMessageText(
        "🛡 *BILOL | WEB DEVELOPER — ADMIN CONTROL CENTER*\n\n" +
        "┏ Xavfsizlik darajasi: \`100% (Protected)\`\n" +
        "┣ Tizim holati: \`Barqaror / Ishlayapti ⚡️\`\n" +
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

bot.action('adm_users', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    
    const usersArr = Array.from(allUsers);
    const sampleList = usersArr.slice(-10).join(', ');

    ctx.reply(
        `👥 *Foydalanuvchilar Ma'lumotnomasi:*\n\n` +
        `• Bazadagilar soni: \`${usersArr.length}\` ta\n` +
        `• Oxirgi faol IDlar: \`${sampleList || 'Hozircha yo\'q'}\``,
        { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Orqaga', 'adm_back')]
            ])
        }
    );
});

bot.action('adm_clean', async (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery().catch(() => {});
    
    let active = 0;
    let removed = 0;
    await ctx.reply("⏳ Bazadagi faollik tekshirilmoqda, iltimos kuting...");

    for (const id of allUsers) {
        try {
            await ctx.telegram.sendChatAction(id, "typing");
            active++;
        } catch (e) {
            allUsers.delete(id);
            removed++;
        }
    }

    ctx.reply(
        `✅ *Tozalash jarayoni yakunlandi!*\n\n` +
        `🟢 Faol va ochiq foydalanuvchilar: \`${active}\` ta\n` +
        `🔴 Botni bloklaganlar (o'chirilganlar): \`${removed}\` ta`,
        { parse_mode: 'Markdown' }
    );
});
// ============================================================

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
            ['🎮 Выиграть скидку 20%', '⭐️ Отзывы клиентов'],
            ['📞 Контакты', '💻 Заказать проект'],
            ['🌐 Изменить язык']
        ]).resize();
    } else if (lang === 'en') {
        return Markup.keyboard([
            ['💻 Portfolio', '⚙️ Services & Pricing'],
            ['🎮 Win 20% Discount', '⭐️ Client Reviews'],
            ['📞 Contacts', '💻 Order Project'],
            ['🌐 Change Language']
        ]).resize();
    } else {
        return Markup.keyboard([
            ['💻 Bizning ishlar (Portfolio)', '⚙️ Xizmatlar va Narxlar'],
            ['🎮 Chegirma yutish (Mini-O\'yin)', '⭐️ Mijozlar fikri'],
            ['📞 Aloqa va Murojaat', '💻 Loyihaga buyurtma'],
            ['🌐 Tilni o\'zgartirish']
        ]).resize();
    }
}

bot.hears(['🌐 Tilni o\'zgartirish', '🌐 Изменить язык', '🌐 Change Language'], (ctx) => {
    ctx.reply("🌐 Tilni o'zgartirish:", getLangMenu());
});

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
        info = "🚀 *1. Landing Page (Sotuvchi sayt)*\n\n" +
               "• *Muddat:* 2–4 kun\n" +
               "• *Narxi:* 500,000 so'm ($40) dan boshlab\n" +
               "• *Kelishuv:* 🤝 Narxi yana o'zaro kelishiladi!\n" +
               "• *Oldindan to'lov (50%):* 250,000 so'm";
        code = "order_landing";
    } else if (type === 'shop') {
        info = "🛍 *2. E-Commerce (Onlayn do'kon)*\n\n" +
               "• *Muddat:* 7–10 kun\n" +
               "• *Narxi:* 1,200,000 so'm ($100) dan boshlab\n" +
               "• *Kelishuv:* 🤝 Narxi yana o'zaro kelishiladi!\n" +
               "• *Oldindan to'lov (50%):* 600,000 so'm";
        code = "order_shop";
    } else if (type === 'corporate') {
        info = "🏢 *3. Korporativ veb-sayt*\n\n" +
               "• *Muddat:* 3–5 kun\n" +
               "• *Narxi:* 800,000 so'm ($65) dan boshlab\n" +
               "• *Kelishuv:* 🤝 Narxi yana o'zaro kelishiladi!\n" +
               "• *Oldindan to'lov (50%):* 400,000 so'm";
        code = "order_corporate";
    } else if (type === 'bot') {
        info = "🤖 *4. Telegram Bot va Avtomatlashtirish*\n\n" +
               "• *Muddat:* 2–5 kun\n" +
               "• *Narxi:* 400,000 so'm ($30) dan boshlab\n" +
               "• *Kelishuv:* 🤝 Narxi yana o'zaro kelishiladi!\n" +
               "• *Oldindan to'lov (50%):* 200,000 so'm";
        code = "order_bot";
    } else if (type === 'webapp') {
        info = "📱 *5. Veb-Ilova (Web Application)*\n\n" +
               "• *Muddat:* 10–15 kun\n" +
               "• *Narxi:* 2,000,000 so'm ($160) dan boshlab\n" +
               "• *Kelishuv:* 🤝 Narxi yana o'zaro kelishiladi!\n" +
               "• *Oldindan to'lov (50%):* 1,000,000 so'm";
        code = "order_webapp";
    }

    const kb = Markup.inlineKeyboard([
        [Markup.button.callback('✨ Shu xizmatga buyurtma berish', code)]
    ]);

    ctx.reply(info, { parse_mode: 'Markdown', ...kb });
});

bot.action(/^order_(.+)$/, (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const sType = ctx.match[1];
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].pendingService = sType;
    
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
        "Barcha loyihalar uchun **50% oldindan to'lov** amalga oshiriladi va qolgan narxlar o'zaro kelishiladi. " +
        "Ushbu shartga rozimisiz?",
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

    ctx.editMessageText("✅ Rozilik qabul qilindi. Ajoyib tanlov! 🚀\n\n📝 Iltimos, ism va familiyangizni to'liq kiriting (Masalan: Alisherbek Usmonov):", { parse_mode: 'Markdown' }).catch(() => {});
});

bot.hears(['💻 Bizning ishlar (Portfolio)', '💻 Портфолио проектов', '💻 Portfolio'], (ctx) => {
    const text = "💻 *Bilol | Web Developer 💻 — Biz amalga oshirgan eng so'nggi muvaffaqiyatli loyihalar:*\n\nO'zingizga yoqqan namunani ko'rib chiqing 👇";
    const kb = Markup.inlineKeyboard([
        [Markup.button.url('🌐 Korporativ Platforma', 'https://fastidious-starburst-7aa5e3.netlify.app/')],
        [Markup.button.url('👔 Brending & Magazin', 'https://monumental-dieffenbachia-aac848.netlify.app/')],
        [Markup.button.url('🚖 Logistika va Taksi Sys', 'https://spontaneous-pothos-202271.netlify.app/')],
        [Markup.button.url('🔥 Startup Landing Page', 'https://fascinating-sundae-f41c81.netlify.app/')]
    ]);
    ctx.reply(text, { parse_mode: 'Markdown', ...kb });
});

bot.hears(['⭐️ Mijozlar fikri', '⭐️ Отзывы клиентов', '⭐️ Client Reviews'], (ctx) => {
    const msg = 
        "⭐️ *Mijozlarimiz Bilol | Web Developer haqida nima deyishadi?*\n\n" +
        "👤 *Javohir (Startup asoschisi):*\n_“Veb-sayt o'ylaganimdan ham tez va professional chiqdi!”_\n\n" +
        "👤 *Dilshod (Do'kon egasi):*\n_“Onlayn do'konimiz ishga tushgach, savdolar keskin oshdi. Rahmat!”_\n\n" +
        "👇 *O'z fikringizni qoldiring:*";

    const ratingKb = Markup.inlineKeyboard([
        [
            Markup.button.callback('⭐️ 1', 'rate_1'),
            Markup.button.callback('⭐️ 2', 'rate_2'),
            Markup.button.callback('⭐️ 3', 'rate_3'),
            Markup.button.callback('⭐️ 4', 'rate_4'),
            Markup.button.callback('⭐️ 5', 'rate_5')
        ],
        [Markup.button.callback('✍️ Fikr yozib qoldirish', 'leave_review')]
    ]);

    ctx.reply(msg, { parse_mode: 'Markdown', ...ratingKb });
});

bot.action(/^rate_([1-5])$/, (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const num = ctx.match[1];
    ctx.reply(`Rahmat! Siz Bilol | Web Developer 💻 botiga **${num} ta yulduz** baho berdingiz. ❤️ Biz siz uchun yanada yaxshilashga harakat qilamiz!`, { parse_mode: 'Markdown' });
});

bot.action('leave_review', (ctx) => {
    ctx.answerCbQuery().catch(() => {});
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].waitingForReview = true;
    ctx.reply("✍️ Marhamat, o'z fikringiz yoki taklifingizni shu yerga yuboring:", { parse_mode: 'Markdown' });
});

// ================= STRICT VALIDATION HANDLER =================
bot.on(['text', 'photo', 'video', 'document', 'audio', 'animation'], async (ctx, next) => {
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};

    // 1. Ism va Familiyani qat'iy tekshirish
    if (userState[userId].waitingForName && ctx.message && ctx.message.text) {
        const text = ctx.message.text.trim();
        const words = text.split(/\s+/);

        if (words.length < 2) {
            return ctx.reply("❌ Xatolik! Iltimos, ism va familiyangizni **to'liq** yozing (Masalan: Alisherbek Usmonov):", { parse_mode: 'Markdown' });
        }

        userState[userId].waitingForName = false;
        userState[userId].clientFullName = text;
        userState[userId].waitingForOrderDesc = true;

        return ctx.reply("🎯 Ajoyib! Endi qisqacha **nima buyurtma qilmoqchisiz** va loyihangiz haqida batafsil yozib yuboring:", { parse_mode: 'Markdown' });
    }

    // 2. Loyiha izohi to'g'ri kiritilgach, qanday sayt ekanligini va narxini aniqlash
    if (userState[userId].waitingForOrderDesc && ctx.message && ctx.message.text) {
        const descText = ctx.message.text.trim();
        
        if (descText.length < 4) {
            return ctx.reply("❌ Xatolik! Iltimos, loyihangiz haqida **batafsroq** ma'lumot yozib yuboring (Masalan: Taksi xizmati uchun buyurtma sayti):", { parse_mode: 'Markdown' });
        }

        const lowerDesc = descText.toLowerCase();
        let siteTypeMsg = "";
        let minPrice = "";
        let isKnownService = true;

        if (lowerDesc.includes('ilov') || lowerDesc.includes('app') || lowerDesc.includes('web application') || lowerDesc.includes('veb-ilova')) {
            siteTypeMsg = "Murakkab veb-ilova (Web Application)";
            minPrice = "2,000,000 so'm ($160)";
        } else if (lowerDesc.includes('do') || lowerDesc.includes('magazin') || lowerDesc.includes('shop') || lowerDesc.includes('savdo') || lowerDesc.includes('uzum') || lowerDesc.includes('market')) {
            siteTypeMsg = "Onlayn do'kon (E-Commerce) platformasi";
            minPrice = "1,200,000 so'm ($100)";
        } else if (lowerDesc.includes('bank') || lowerDesc.includes('moliya') || lowerDesc.includes('fintech') || lowerDesc.includes('kredit')) {
            siteTypeMsg = "Bank va Moliya tizimi / Veb-ilovasi";
            minPrice = "2,500,000 so'm ($200)";
        } else if (lowerDesc.includes('taksi') || lowerDesc.includes('taxi') || lowerDesc.includes('logistika') || lowerDesc.includes('dostavka')) {
            siteTypeMsg = "Logistika va taksi xizmatini avtomatlashtirish tizimi";
            minPrice = "800,000 so'm ($65)";
        } else if (lowerDesc.includes('bot') || lowerDesc.includes('telegram')) {
            siteTypeMsg = "Telegram bot va avtomatlashtirish tizimi";
            minPrice = "400,000 so'm ($30)";
        } else if (lowerDesc.includes('landing') || lowerDesc.includes('sayt') || lowerDesc.includes('site') || lowerDesc.includes('vizitka') || lowerDesc.includes('notebook')) {
            siteTypeMsg = "Maxsus biznes uchun Landing Page / Veb-sayt";
            minPrice = "500,000 so'm ($40)";
        } else {
            isKnownService = false;
        }

        if (!isKnownService) {
            userState[userId].waitingForOrderDesc = false;
            const contactAdminKb = Markup.inlineKeyboard([
                [Markup.button.url('💬 Admin bilan bog\'lanish', 'https://t.me/sharipoov1')],
                [Markup.button.callback('🔙 Asosiy menyu', 'agree_no')]
            ]);
            return ctx.reply(
                "❌ Kechirasiz, bizda bu yo'nalish bo'yicha tayyor xizmat turi topilmadi.\n\n" +
                "Batafsil ma'lumot olish va narxini kelishish uchun **admin bilan bog'laning:** 👇",
                { parse_mode: 'Markdown', ...contactAdminKb }
            );
        }

        userState[userId].waitingForOrderDesc = false;
        userState[userId].orderDescription = descText;
        userState[userId].waitingForBudget = true;

        return ctx.reply(
            `💡 Tushunarli. Demak, bu **${siteTypeMsg}** ekan.\n` +
            `📌 Bunday turdagi saytlar va loyihalar narxi **${minPrice}** dan boshlanadi!\n\n` +
            `💰 Ushbu loyiha uchun ajratgan taxminiy budjetingiz qancha? (Aniq raqamni kiriting):`,
            { parse_mode: 'Markdown' }
        );
    }

    // 3. Budjet tekshiruvi
    if (userState[userId].waitingForBudget && ctx.message && ctx.message.text) {
        const budgetText = ctx.message.text.trim();
        
        const rawNumbers = budgetText.replace(/[^0-9]/g, '');
        const numericValue = parseInt(rawNumbers, 10);
        
        const isOnlyZeros = /^0+$/.test(rawNumbers);
        const hasNumber = /\d/.test(budgetText);

        const isDollar = budgetText.includes('$');
        const minLimit = isDollar ? 10 : 1000;

        if (!hasNumber || isOnlyZeros || numericValue < minLimit || budgetText.length > 20) {
            return ctx.reply(
                "❌ Xatolik! Iltimos, real budjet miqdorini to'g'ri yozing (Masalan: 500,000 so'm yoki $50):",
                { parse_mode: 'Markdown' }
            );
        }

        userState[userId].waitingForBudget = false;
        userState[userId].clientBudget = budgetText;
        userState[userId].waitingForPhone = true;

        return ctx.reply(
            "📞 Ajoyib! Oxirgi qadam — aloqa uchun telefon raqamingizni yuboring (Pastdagi tugmani bosing):",
            Markup.keyboard([
                [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
                ['🔙 Ortga']
            ]).resize()
        );
    }

    if (userState[userId].waitingForReview && ctx.message && ctx.message.text) {
        userState[userId].waitingForReview = false;
        const reviewText = ctx.message.text;
        const user = ctx.message.from;

        const adminText = `💬 *Bilol | Web Developer — Yangi mijoz sharhi keldi!*\n\n` +
                          `👤 Kimdan: ${user.first_name} (@${user.username || 'yoq'})\n` +
                          `🆔 Telegram ID: \`${user.id}\`\n` +
                          `📝 Fikr matni: _"${reviewText}"_`;
        ctx.telegram.sendMessage(ADMIN_ID, adminText, { parse_mode: 'Markdown' }).catch(() => {});
        return ctx.reply("✅ Fikringiz uchun rahmat! Adminga yetkazildi. 🙏");
    }

    // 4. Admin parol tekshiruvi
    if (userId.toString() === ADMIN_ID && userState[userId].waitingForAdminPassword) {
        if (ctx.message && ctx.message.text) {
            const passwordInput = ctx.message.text.trim();
            if (passwordInput === ADMIN_PASSWORD) {
                userState[userId].waitingForAdminPassword = false;
                return showAdminPanel(ctx);
            } else {
                return ctx.reply("❌ Noto'g'ri parol! Qaytadan urinib ko'ring:");
            }
        }
    }

    // 5. Universal Reklama tarqatish
    if (userId.toString() === ADMIN_ID && userState[userId].waitingForBroadcast) {
        userState[userId].waitingForBroadcast = false;
        
        let successCount = 0;
        let failCount = 0;

        await ctx.reply("⏳ Reklama kanal va foydalanuvchilarga tarqatilmoqda, iltimos kuting...");

        try {
            await ctx.telegram.copyMessage(TARGET_CHANNEL, ctx.chat.id, ctx.message.message_id);
            successCount++;
        } catch (e) {
            console.log("Kanalga yuborishda xatolik:", e.message);
        }

        for (const id of allUsers) {
            try {
                await ctx.telegram.copyMessage(id, ctx.chat.id, ctx.message.message_id);
                successCount++;
            } catch (e) {
                failCount++;
            }
        }

        return ctx.reply(
            `✅ *Reklama tarqatish yakunlandi!*\n\n` +
            `📤 Muvaffaqiyatli yetib bordi: \`${successCount}\` ta (Kanal + Foydalanuvchilar)\n` +
            `⚠️ Yetib bormadi (bloklaganlar): \`${failCount}\` ta`,
            { parse_mode: 'Markdown' }
        );
    }

    return next();
});

bot.hears(['🎮 Chegirma yutish (Mini-O\'yin)', '🎮 Выиграть скидку 20%', '🎮 Win 20% Discount'], (ctx) => {
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
        "🎮 *Bilol | Web Developer — Omadli Chegirma O'yini!*\n\n3 ta sirli qutidan birida 20% chegirma promokodi yashiringan. O'zingizga yoqqan birini tanlang:",
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
    const winningBox = userState[userId].winningBox;

    if (choice === winningBox) {
        userState[userId].hasDiscount = true;
        ctx.reply("🎉 *TABRIKLAYMIZ! Siz 20% chegirma yutib oldingiz!* 🏆\n\nPromokod: `PROMO-2026-VIP`\nBuyurtma berishda shu kodni aytsangiz kifoya!", { parse_mode: 'Markdown' });
    } else {
        ctx.reply(`😢 Afsus, bu quti bo'sh chiqdi (Yutug'li quti ${winningBox}-quti edi). Keyingi safar albatta omadingiz keladi! ✨`);
    }
});

bot.hears(['📞 Aloqa va Murojaat', '📞 Контакты', '📞 Contacts'], (ctx) => {
    ctx.reply(
        "📬 *Bilol | Web Developer 💻 — Biz bilan bog'lanish uchun manzillar:*\n\n" +
        "📞 *Telefon:* `+998 (99) 321-21-22`\n" +
        "💬 *Telegram:* @sharipoov1\n" +
        "📸 *Instagram:* [boburivlc__7](https://instagram.com/boburivlc__7)\n" +
        "📢 *Kanal:* [Bilol Web Developer](https://t.me/Bilolwebdeveloper)", 
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
 
bot.on('contact', async (ctx) => { 
    const contact = ctx.message.contact; 
    const user = ctx.message.from; 
    const userId = ctx.from.id; 
    const state = userState[userId] || {}; 
     
    console.log("📥 Kontakt keldi, adminga yuborish boshlandi. User ID:", userId); 
 
    const fullName = state.clientFullName || user.first_name; 
    const service = state.pendingService ? state.pendingService : "Umumiy murojaat"; 
    const orderDesc = state.orderDescription || "Ko'rsatilmagan"; 
    const budget = state.clientBudget || "Kelishiladi"; 
    const discount = state.hasDiscount ? "🎁 Chegirma: BOR (PROMO-2026-VIP)" : "Chegirma yo'q"; 
 
    const escapeMd = (str) => { 
        if (!str) return ''; 
        return str.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&'); 
    }; 
 
    const adminMessage = `🚨 *Bilol | Web Developer — Yangi buyurtma keldi!*\n\n` + 
                         `👤 *F.I.O:* ${escapeMd(fullName)}\n` + 
                         `📞 *Tel:* +${contact.phone_number}\n` + 
                         `🔗 *Username:* @${user.username || 'mavjud_emas'}\n` + 
                         `🆔 *Telegram ID:* \`${user.id}\`\n` + 
                         `📌 *Tanlangan xizmat:* \`${escapeMd(service)}\`\n` + 
                         `📝 *Buyurtma tafsiloti:* _"${escapeMd(orderDesc)}_\x22\n` + 
                         `💰 *Mijoz budjeti:* \`${escapeMd(budget)}\`\n` + 
                         `🏷 *Aksiya holati:* ${escapeMd(discount)}\n` + 
                         `✅ *Shartlar:* 50% oldindan to'lovga rozilik olindi`; 
 
    try { 
        await ctx.telegram.sendMessage(ADMIN_ID, adminMessage, { parse_mode: 'Markdown' }); 
        console.log("✅ Xabar adminga muvaffaqiyatli yuborildi!"); 
    } catch (e) { 
        try { 
            await ctx.telegram.sendMessage(ADMIN_ID, adminMessage.replace(/[*_`]/g, '')); 
            console.log("✅ Xabar Markdown'siz adminga yuborildi!"); 
        } catch (err) { 
            console.log("❌ ADMINGA YUBORISHDA XATOLIK:", err.message); 
        } 
    } 
     
    await ctx.reply("Rahmat! Ma'lumotlaringiz muvaffaqiyatli qabul qilindi. Tez orada mutaxassisimiz siz bilan bog'lanib, narxlarni kelishadi! ✅", getMainMenu(state.lang || 'uz')); 
 
    if (userState[userId]) { 
        userState[userId].pendingService = null; 
        userState[userId].clientFullName = null; 
        userState[userId].orderDescription = null; 
        userState[userId].clientBudget = null; 
        userState[userId].waitingForPhone = false; 
    } 
}); 
 
bot.launch({ 
    dropPendingUpdates: true 
}).then(() => { 
    console.log("🔥 Bilol | Web Developer 💻 Enterprise Bot muvaffaqiyatli ishga tushdi!"); 
}); 
 
process.once('SIGINT', () => bot.stop('SIGINT')); 
process.once('SIGTERM', () => bot.stop('SIGTERM'));                         