const { Telegraf, Markup } = require('telegraf');

const BOT_TOKEN = "7993407351:AAGT-Z9v30zfhM1BpGU2M1Q4hzdSUNZNW0M";
const ADMIN_ID = 867717817;

const bot = new Telegraf("7993407351:AAGT-Z9v30zfhM1BpGU2M1Q4hzdSUNZNW0M");
const userState = {};
const allUsers = new Set();

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
        ctx.reply("👑 *Xush kelibsiz, Boss!*\nBotni boshqarish uchun /admin buyrug'idan foydalaning.", { parse_mode: 'Markdown' });
    }

    ctx.reply(
        "⚡️ *Official Development Studio-ga xush kelibsiz!*\n\n" +
        "Biznesingizni raqamlashtirish uchun professional jamoa xizmatda. 🚀\n\n" +
        "🎁 *Maxsus aksiya:* Mini-o'yinda qatnashing va **20% chegirma** yutib oling!\n\n" +
        "🌐 *Muloqot tilini tanlang:*",
        { parse_mode: 'Markdown', ...getLangMenu() }
    );
});

bot.command('admin', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;

    const adminKb = Markup.inlineKeyboard([
        [Markup.button.callback('📊 Bot statistikasi', 'adm_stats')],
        [Markup.button.callback('📢 Hammaga xabar yuborish', 'adm_broadcast')]
    ]);

    ctx.reply("👑 *Admin boshqaruv paneli:*", { parse_mode: 'Markdown', ...adminKb });
});

bot.action('adm_stats', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery();
    ctx.editMessageText(`📊 *Bot statistikasi:*\n\n👥 Jami foydalanuvchilar: ${allUsers.size} ta`, { parse_mode: 'Markdown' });
});

bot.action('adm_broadcast', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_ID) return;
    ctx.answerCbQuery();
    userState[ctx.from.id].waitingForBroadcast = true;
    ctx.reply("📢 Barcha foydalanuvchilarga yubormoqchi bo'lgan xabaringizni yuboring:");
});

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
            ['🎮 Выиграть скидку 20%', '⭐ Отзывы клиентов'],
            ['📞 Контакты', '💻 Заказать проект'],
            ['🌐 Изменить язык']
        ]).resize();
    } else if (lang === 'en') {
        return Markup.keyboard([
            ['💻 Portfolio', '⚙️ Services & Pricing'],
            ['🎮 Win 20% Discount', '⭐ Client Reviews'],
            ['📞 Contacts', '💻 Order Project'],
            ['🌐 Change Language']
        ]).resize();
    } else {
        return Markup.keyboard([
            ['💻 Bizning ishlar (Portfolio)', '⚙️ Xizmatlar va Narxlar'],
            ['🎮 Chegirma yutish (Mini-O\'yin)', '⭐ Mijozlar fikri'],
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
        "🛠 *Biz taqdim etadigan professional xizmatlar:*\n\n" +
        "💡 *Muhim eslatma:* Narxlar loyihaning murakkabligiga qarab **yana kelishiladi!** Hamyonbob va sifatli natija kafolatlanadi. 🤝\n\n" +
        "📌 *To'lov sharti:* Barcha loyihalar uchun **50% oldindan to'lov** amalga oshiriladi.\n\n" +
        "Quyidagi yo'nalishlardan birini tanlang: 👇",
        { parse_mode: 'Markdown', ...servicesKeyboard }
    );
});

bot.action(/^srv_(.+)$/, (ctx) => {
    ctx.answerCbQuery();
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
    ctx.answerCbQuery();
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
    ctx.answerCbQuery();
    ctx.editMessageText("Buyurtma jarayoni bekor qilindi. ❌");
});

bot.action('agree_yes', (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].waitingForName = true;

    ctx.editMessageText("✅ Rozilik qabul qilindi. Ajoyib tanlov! 🚀\n\n📝 Iltimos, ism va familiyangizni to'liq kiriting (Masalan: Alisherbek Usmonov):", { parse_mode: 'Markdown' });
});

bot.hears(['💻 Bizning ishlar (Portfolio)', '💻 Портфолио проектов', '💻 Portfolio'], (ctx) => {
    const text = "💻 *Biz amalga oshirgan eng so'nggi muvaffaqiyatli loyihalar:*\n\nO'zingizga yoqqan namunani ko'rib chiqing 👇";
    const kb = Markup.inlineKeyboard([
        [Markup.button.url('🌐 Korporativ Platforma', 'https://fastidious-starburst-7aa5e3.netlify.app/')],
        [Markup.button.url('👔 Brending & Magazin', 'https://monumental-dieffenbachia-aac848.netlify.app/')],
        [Markup.button.url('🚖 Logistika va Taksi Sys', 'https://spontaneous-pothos-202271.netlify.app/')],
        [Markup.button.url('🔥 Startup Landing Page', 'https://fascinating-sundae-f41c81.netlify.app/')]
    ]);
    ctx.reply(text, { parse_mode: 'Markdown', ...kb });
});

bot.hears(['⭐ Mijozlar fikri', '⭐ Отзывы клиентов', '⭐ Client Reviews'], (ctx) => {
    const msg = 
        "⭐ *Mijozlarimiz biz haqimizda nima deyishadi?*\n\n" +
        "👤 *Javohir (Startup asoschisi):*\n_“Veb-sayt o'ylaganimdan ham tez va professional chiqdi!”_\n\n" +
        "👤 *Dilshod (Do'kon egasi):*\n_“Onlayn do'konimiz ishga tushgach, savdolar keskin oshdi. Rahmat!”_\n\n" +
        "👇 *O'z fikringizni qoldiring:*";

    const ratingKb = Markup.inlineKeyboard([
        [
            Markup.button.callback('⭐ 1', 'rate_1'),
            Markup.button.callback('⭐ 2', 'rate_2'),
            Markup.button.callback('⭐ 3', 'rate_3'),
            Markup.button.callback('⭐ 4', 'rate_4'),
            Markup.button.callback('⭐ 5', 'rate_5')
        ],
        [Markup.button.callback('✍️ Fikr yozib qoldirish', 'leave_review')]
    ]);

    ctx.reply(msg, { parse_mode: 'Markdown', ...ratingKb });
});

bot.action(/^rate_([1-5])$/, (ctx) => {
    ctx.answerCbQuery();
    const num = ctx.match[1];
    ctx.reply(`Rahmat! Siz botimizga **${num} ta yulduz** baho berdingiz. ❤️ Biz siz uchun yanada yaxshilashga harakat qilamiz!`, { parse_mode: 'Markdown' });
});

bot.action('leave_review', (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    if (!userState[userId]) userState[userId] = {};
    userState[userId].waitingForReview = true;
    ctx.reply("✍️ Marhamat, o'z fikringiz yoki taklifingizni shu yerga yuboring:", { parse_mode: 'Markdown' });
});

// Matnli xabarlarni qayta ishlash
bot.on('text', (ctx, next) => {
    const userId = ctx.from.id;

    if (!userState[userId]) userState[userId] = {};

    // 1. Ism va familiyani tekshirish (Kamida 2 ta so'z bo'lishi shart)
    if (userState[userId].waitingForName) {
        const text = ctx.message.text.trim();
        const words = text.split(/\s+/);

        if (words.length < 2) {
            // parse_mode: 'Markdown' qo'shildi
            return ctx.reply("❌ Xatolik! Iltimos, ism va familiyangizni **to'liq** kiriting (Masalan: Alisherbek Usmonov):", { parse_mode: 'Markdown' });
        }

        userState[userId].waitingForName = false;
        userState[userId].clientFullName = text;
        userState[userId].waitingForPhone = true;

        return ctx.reply(
            "📞 Ajoyib! Endi aloqa uchun telefon raqamingizni yuboring (Pastdagi tugmani bosing):",
            Markup.keyboard([
                [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
                ['🔙 Ortga']
            ]).resize()
        );
    }

    // 2. Admin broadcast (xabar tarqatish) rejimi
    if (userId.toString() === ADMIN_ID && userState[userId].waitingForBroadcast) {
        userState[userId].waitingForBroadcast = false;
        const broadcastText = ctx.message.text;
        
        let successCount = 0;
        for (const id of allUsers) {
            bot.telegram.sendMessage(id, `📢 *E'lon / Yangilik:*\n\n${broadcastText}`, { parse_mode: 'Markdown' }).catch(() => {});
            successCount++;
        }
        return ctx.reply(`✅ Xabar muvaffaqiyatli ${successCount} ta foydalanuvchiga yuborildi!`);
    }

    // 3. Sharh yozish rejimi
    if (userState[userId].waitingForReview) {
        userState[userId].waitingForReview = false;
        const reviewText = ctx.message.text;
        const user = ctx.message.from;

        const adminText = `💬 *Yangi mijoz sharhi keldi!*\n\n👤 Kimdan: ${user.first_name} (@${user.username || 'yoq'})\n📝 Matn: _"${reviewText}"_`;
        bot.telegram.sendMessage(ADMIN_ID, adminText, { parse_mode: 'Markdown' });

        return ctx.reply("✅ Fikringiz uchun rahmat! Adminga yetkazildi. 🙏");
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
        "🎮 *Omadli Chegirma O'yini!*\n\n3 ta sirli qutidan birida **20% chegirma promokodi** yashiringan. O'zingizga yoqqan birini tanlang:",
        { parse_mode: 'Markdown', ...gameKb }
    );
});

bot.action(/^box_(\d+)$/, (ctx) => {
    ctx.answerCbQuery();
    const userId = ctx.from.id;
    const choice = parseInt(ctx.match[1]);

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
        "📬 *Biz bilan bog'lanish uchun manzillar:*\n\n" +
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
        userState[userId].waitingForPhone = false;
    }
    ctx.reply("Asosiy menyu:", getMainMenu(lang));
});

bot.on('contact', async (ctx) => {
    const contact = ctx.message.contact;
    const user = ctx.message.from;
    const userId = ctx.from.id;
    const state = userState[userId] || {};
    
    const fullName = state.clientFullName || user.first_name;
    const service = state.pendingService ? `Tanlangan xizmat: ${state.pendingService}` : "Umumiy murojaat";
    const discount = state.hasDiscount ? "🎁 Chegirma: BOR (PROMO-2026-VIP)" : "Chegirma yo'q";

    const adminMessage = `🚨 *Yangi buyurtma keldi!*\n\n👤 F.I.O: ${fullName}\n📞 Tel: +${contact.phone_number}\n🔗 Username: @${user.username || 'yoq'}\n📌 ${service}\n🏷 ${discount}\n✅ (50% oldindan to'lov shartiga rozilik olindi)`;

    await bot.telegram.sendMessage(ADMIN_ID, adminMessage, { parse_mode: 'Markdown' });
    
    await ctx.reply("Rahmat! Ma'lumotlaringiz muvaffaqiyatli qabul qilindi. Tez orada mutaxassisimiz siz bilan bog'lanib, narxlarni kelishadi! ✅", getMainMenu(state.lang || 'uz'));

    if (userState[userId]) {
        userState[userId].pendingService = null;
        userState[userId].clientFullName = null;
        userState[userId].waitingForPhone = false;
    }
});

bot.launch();
// ... oldingi barcha xizmatlar, menyular va tugmalar tugagan joyga (bot.launch() dan oldin) quyidagilarni yozasiz:

// ================= PROFESSIONAL ADMIN PANEL =================


bot.command("admin", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const adminKb = Markup.inlineKeyboard([
        [Markup.button.callback("📊 Bot statistikasi", "adm_stats")],
        [Markup.button.callback("📢 Hammaga xabar yuborish (Broadcast)", "adm_broadcast")],
        [Markup.button.callback("🔄 Bazani tozalash (Bloklanganlar)", "adm_clean")]
    ]);

    ctx.reply("👑 Professional Boshqaruv Paneliga xush kelibsiz!\n\nKerakli amalni tanlang:", { parse_mode: "Markdown", ...adminKb });
});

bot.action("adm_stats", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.answerCbQuery();
    
    ctx.editMessageText(
        `📊 Bot statistikasi va holati:\n\n` +
        `👥 Jami foydalanuvchilar: \`${allUsers.size}\` ta\n` +
        `🤖 Bot holati: \`Ishlayapti (Online) ⚡️\`\n` +
        `⚙️ Versiya: \`v2.5 Professional\``,
        { 
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("🔙 Orqaga", "adm_back")]
            ])
        }
    );
});

bot.action("adm_back", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.answerCbQuery();

    const adminKb = Markup.inlineKeyboard([
        [Markup.button.callback("📊 Bot statistikasi", "adm_stats")],
        [Markup.button.callback("📢 Hammaga xabar yuborish (Broadcast)", "adm_broadcast")],
        [Markup.button.callback("🔄 Bazani tozalash (Bloklanganlar)", "adm_clean")]
    ]);

    ctx.editMessageText("👑 Professional Boshqaruv Paneliga xush kelibsiz!\n\nKerakli amalni tanlang:", { parse_mode: "Markdown", ...adminKb });
});

bot.action("adm_broadcast", (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.answerCbQuery();
    
    if (!userState[ctx.from.id]) userState[ctx.from.id] = {};
    userState[ctx.from.id].waitingForBroadcast = true;
    
    ctx.reply("📢 E'lon yuborish rejimi yoqildi.\n\nBarcha foydalanuvchilarga tarqatmoqchi bo'lgan matn yoki rasmingizni yuboring:", { parse_mode: "Markdown" });
});

bot.action("adm_clean", async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.answerCbQuery();
    
    let activeCount = 0;
    let removedCount = 0;

    await ctx.reply("⏳ Bazadagi foydalanuvchilar tekshirilmoqda, iltimos kuting...");

    for (const id of allUsers) {
        try {
            await bot.telegram.sendChatAction(id, "typing");
            activeCount++;
        } catch (e) {
            allUsers.delete(id);
            removedCount++;
        }
    }

    ctx.reply(`✅ Tozalash yakunlandi!\n\n🟢 Faol foydalanuvchilar: ${activeCount} ta\n🔴 O'chirilganlar (Bloklaganlar): ${removedCount} ta`, { parse_mode: "Markdown" });
});

// ============================================================

// Botni ishga tushirish qismi bundan keyin keladi:
bot.launch();
console.log("🔥 Professional bot muvaffaqiyatli ishga tushdi!");


process.once('SIGINT', () => bot.stop('SIGINT'));
