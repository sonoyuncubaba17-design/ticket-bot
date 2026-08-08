require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel]
});

const config = {
  staffRole: process.env.STAFF_ROLE_ID,
  ticketLog: process.env.TICKET_LOG,
  transcriptLog: process.env.TRANSCRIPT_LOG,
  categoryId: process.env.CATEGORY_ID,
  gifUrl: "https://cdn.discordapp.com/attachments/1535547742397399121/1535659790846402621/DS_hizli_kar.gif?ex=6a789221&is=6a7740a1&hm=24b5cc21dde58dc6418e0d86fc4494f4dc2476e711b5d3acc60929d2fe56397a&",
  ticketStartHour: 10,
  ticketEndHour: 0
};

const dataPath = path.join(__dirname, 'data.json');
let data = { blacklist: [], stats: { opened: 0, closed: 0, ratings: [], staffStats: {} } };

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch (e) {
    console.log('data.json okunamadı, yeni oluşturuluyor.');
  }
}
function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}
loadData();

function createPanelEmbed() {
  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL() })
    .setDescription(
      "Ürünlerimiz, hizmetlerimiz ve servislerimiz hakkında detaylı bilgi almak, destek talebinde bulunmak, satış ve fiyat sorularınızı iletmek veya teknik sorunlarınızı bildirmek için aşağıdaki butonlardan size en uygun kategoriyi seçerek destek talebi oluşturabilirsiniz.\n\n" +
      "**Önemli Bilgilendirme:**\n" +
      "• Destek taleplerine sadece belirlenen saatler arasında bakılmaktadır. **(10:00 - 00:00)**\n" +
      "• Bu saatler dışında açılan talepler, mesai saatleri başladığında sırayla incelenecektir.\n" +
      "• Sohbet kanallarında *“Destek talebine bakar mısınız?”*, *“Yetkili var mı?”* gibi mesajlar atmanız süreci hızlandırmaz, aksine yavaşlatır.\n" +
      "• Lütfen sorununuzu mümkün olduğunca detaylı ve açık bir şekilde yazın. Bu sayede size daha hızlı ve doğru yardım edebiliriz.\n" +
      "• Aynı anda birden fazla ticket açmanız engellenmiştir. Mevcut talebiniz sonuçlanmadan yeni talep oluşturamazsınız.\n\n" +
      "Anlayışınız için teşekkür eder, iyi günler dileriz."
    )
    .setImage(config.gifUrl)
    .setFooter({ text: "Saygılarımızla DS DiscordBot #YENİ" })
    .setTimestamp();
}

function createPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_genel").setLabel("Genel Destek").setStyle(ButtonStyle.Primary).setEmoji("🎫"),
    new ButtonBuilder().setCustomId("ticket_satis").setLabel("Satış / Fiyat").setStyle(ButtonStyle.Success).setEmoji("💰"),
    new ButtonBuilder().setCustomId("ticket_teknik").setLabel("Teknik Destek").setStyle(ButtonStyle.Secondary).setEmoji("🛠️"),
    new ButtonBuilder().setCustomId("ticket_sikayet").setLabel("Şikayet / Öneri").setStyle(ButtonStyle.Danger).setEmoji("📢")
  );
}

function createHTMLTranscript(channel, messages) {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Transcript - ${channel.name}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #1e1f22; color: #dbdee1; padding: 20px; }
    .header { background: #2b2d31; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .msg { margin-bottom: 12px; padding: 10px; background: #2b2d31; border-radius: 6px; }
    .author { font-weight: bold; color: #5865F2; }
    .time { color: #949ba4; font-size: 12px; margin-left: 8px; }
    .content { margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>📄 Ticket Transcript</h2>
    <p><b>Kanal:</b> ${channel.name}<br>
    <b>Tarih:</b> ${new Date().toLocaleString("tr-TR")}</p>
  </div>
`;
  messages.reverse().forEach(m => {
    html += `
  <div class="msg">
    <span class="author">${m.author.tag}</span>
    <span class="time">${m.createdAt.toLocaleString("tr-TR")}</span>
    <div class="content">${m.content || "*ek dosya / embed*"}</div>
  </div>`;
  });
  html += `</body></html>`;
  return Buffer.from(html, 'utf-8');
}

function isTicketTimeAllowed() {
  const now = new Date();
  const trHour = (now.getUTCHours() + 3) % 24;
  if (config.ticketStartHour < config.ticketEndHour) {
    return trHour >= config.ticketStartHour && trHour < config.ticketEndHour;
  } else {
    return trHour >= config.ticketStartHour || trHour < config.ticketEndHour;
  }
}

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} aktif!`);
  client.user.setActivity("dadascxn 🤍 efecan", { type: 3 });

  const dataCmds = [
    { name: "panel", description: "Ticket panelini gönderir" },
    { name: "mesaj", description: "Ticket sahibine özel mesaj gönderir", options: [{ name: "mesaj", description: "Mesaj", type: 3, required: true }] },
    { name: "ekle", description: "Ticket'a üye ekler", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
    { name: "aktif", description: "Sunucu aktif mesajını gönderir" },
    { name: "kapat", description: "Ticket'ı kapatır" },
    { name: "stats", description: "Ticket istatistiklerini gösterir" },
    { name: "blacklist", description: "Kullanıcıyı blacklist'e ekler", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
    { name: "unblacklist", description: "Blacklist'ten çıkarır", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] }
  ];

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await guild.commands.set(dataCmds);
    console.log("Slash komutlar yüklendi.");
  }

  setInterval(async () => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return;

    const ticketChannels = guild.channels.cache.filter(c => c.parentId === config.categoryId && c.topic?.startsWith("ticket-"));
    for (const [, channel] of ticketChannels) {
      try {
        const messages = await channel.messages.fetch({ limit: 1 });
        const lastMsg = messages.first();
        if (!lastMsg) continue;

        const diff = Date.now() - lastMsg.createdTimestamp;
        if (diff > 24 * 60 * 60 * 1000) {
          await channel.send("⏰ 24 saattir cevap gelmediği için ticket otomatik kapatılıyor...");
          const allMsgs = await channel.messages.fetch({ limit: 100 });
          const htmlBuffer = createHTMLTranscript(channel, allMsgs);
          const attachment = new AttachmentBuilder(htmlBuffer, { name: `transcript-${channel.name}.html` });
          const transcriptChannel = guild.channels.cache.get(config.transcriptLog);
          if (transcriptChannel) {
            await transcriptChannel.send({ content: `📄 **${channel.name}** otomatik kapatıldı (24s inaktif)`, files: [attachment] });
          }
          data.stats.closed++;
          saveData();
          setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
      } catch (e) {}
    }
  }, 15 * 60 * 1000);
});

client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "panel") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Bu komutu sadece yöneticiler kullanabilir.", ephemeral: true });
      }
      await interaction.channel.send({ embeds: [createPanelEmbed()], components: [createPanelButtons()] });
      return interaction.reply({ content: "Panel gönderildi!", ephemeral: true });
    }

    if (interaction.commandName === "mesaj") {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.channel.topic?.startsWith("ticket-")) return interaction.editReply({ content: "Sadece ticket kanallarında kullanılabilir." });
      if (!interaction.member.roles.cache.has(config.staffRole)) return interaction.editReply({ content: "Yetkin yok." });
      const mesaj = interaction.options.getString("mesaj");
      const ownerId = interaction.channel.topic.split("-")[1];
      try {
        const owner = await client.users.fetch(ownerId);
        const dmEmbed = new EmbedBuilder().setColor("#5865F2").setTitle("📩 Destek Ekibinden Mesaj").setDescription(mesaj).setFooter({ text: `${interaction.guild.name} • ${interaction.user.tag}` }).setTimestamp();
        await owner.send({ embeds: [dmEmbed] });
        await interaction.editReply({ content: `Mesaj **${owner.tag}** kişisine gönderildi.` });
      } catch {
        await interaction.editReply({ content: "DM gönderilemedi." });
      }
      return;
    }

    if (interaction.commandName === "ekle") {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.channel.topic?.startsWith("ticket-")) return interaction.editReply({ content: "Sadece ticket kanallarında." });
      if (!interaction.member.roles.cache.has(config.staffRole)) return interaction.editReply({ content: "Yetkin yok." });
      const user = interaction.options.getUser("kisi");
      try {
        await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
        await interaction.editReply({ content: `${user} eklendi.` });
        await interaction.channel.send(`${user} ticket'a eklendi (${interaction.user} tarafından)`);
      } catch {
        await interaction.editReply({ content: "Hata oluştu." });
      }
      return;
    }

    if (interaction.commandName === "aktif") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Sadece yöneticiler.", ephemeral: true });
      }
      const staffRole = interaction.guild.roles.cache.get(config.staffRole);
      const aktifYetkili = staffRole ? staffRole.members.filter(m => ["online", "idle", "dnd"].includes(m.presence?.status)).size : 0;
      const acikTicket = interaction.guild.channels.cache.filter(c => c.parentId === config.categoryId && c.topic?.startsWith("ticket-")).size;

      const embed = new EmbedBuilder()
        .setColor("#e74c3c")
        .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL() })
        .setTitle("🔴 DS SYSTEM Aktif!")
        .setDescription("Sistem sorunsuz şekilde çalışıyor.")
        .addFields(
          { name: "👥 Aktif Yetkili", value: `\`${aktifYetkili}\``, inline: true },
          { name: "🎫 Açık Ticket", value: `\`${acikTicket}\``, inline: true },
          { name: "👤 Toplam Üye", value: `\`${interaction.guild.memberCount}\``, inline: true },
          { name: "🤖 Bot Durumu", value: "`🟢 Çevrimiçi`", inline: true },
          { name: "⏰ Çalışma Süresi", value: `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`, inline: true }
        )
        .setImage(config.gifUrl)
        .setFooter({ text: "DS SYSTEM • Discord Bot" })
        .setTimestamp();

      await interaction.channel.send({ embeds: [embed] });
      const everywhere = interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes("everywhere"));
      if (everywhere) await everywhere.send({ embeds: [embed] });
      return interaction.reply({ content: "Aktif mesajı gönderildi!", ephemeral: true });
    }

    if (interaction.commandName === "kapat") {
      if (!interaction.channel.topic?.startsWith("ticket-")) {
        return interaction.reply({ content: "Bu komut sadece ticket kanallarında kullanılır.", ephemeral: true });
      }
      if (!interaction.member.roles.cache.has(config.staffRole) && !interaction.channel.topic.includes(interaction.user.id)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }
      await closeTicket(interaction, interaction.channel);
      return;
    }

    if (interaction.commandName === "stats") {
      if (!interaction.member.roles.cache.has(config.staffRole) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }
      const avgRating = data.stats.ratings.length ? (data.stats.ratings.reduce((a, b) => a + b, 0) / data.stats.ratings.length).toFixed(2) : "0";
      let staffText = "Yok";
      if (Object.keys(data.stats.staffStats).length) {
        staffText = Object.entries(data.stats.staffStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([id, count]) => `<@${id}> → **${count}** kapatma`)
          .join("\n");
      }
      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("📊 Ticket İstatistikleri")
        .addFields(
          { name: "Açılan Ticket", value: `\`${data.stats.opened}\``, inline: true },
          { name: "Kapatılan Ticket", value: `\`${data.stats.closed}\``, inline: true },
          { name: "Ortalama Puan", value: `\`${avgRating} / 5\``, inline: true },
          { name: "En Çok Kapatan Yetkililer", value: staffText }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "blacklist") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Sadece yöneticiler.", ephemeral: true });
      }
      const user = interaction.options.getUser("kisi");
      if (data.blacklist.includes(user.id)) {
        return interaction.reply({ content: "Zaten blacklist'te.", ephemeral: true });
      }
      data.blacklist.push(user.id);
      saveData();
      return interaction.reply({ content: `${user} blacklist'e eklendi.`, ephemeral: true });
    }

    if (interaction.commandName === "unblacklist") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Sadece yöneticiler.", ephemeral: true });
      }
      const user = interaction.options.getUser("kisi");
      data.blacklist = data.blacklist.filter(id => id !== user.id);
      saveData();
      return interaction.reply({ content: `${user} blacklist'ten çıkarıldı.`, ephemeral: true });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith("ticket_")) {
      if (data.blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "Blacklist'te olduğun için ticket açamazsın.", ephemeral: true });
      }
      if (!isTicketTimeAllowed()) {
        return interaction.reply({ content: "Şu anda ticket açma saatleri dışındasınız. (10:00 - 00:00 arası açıktır)", ephemeral: true });
      }

      const category = interaction.customId.replace("ticket_", "");
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal:${category}`)
        .setTitle("Destek Talebi Oluştur");
      const problemInput = new TextInputBuilder()
        .setCustomId("problem")
        .setLabel("Sorununuzu detaylı yazın")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Örn: Ürünü satın aldım ama indirme linki gelmedi...")
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);
      modal.addComponents(new ActionRowBuilder().addComponents(problemInput));
      return interaction.showModal(modal);
    }

    if (interaction.customId === "close_ticket") {
      if (!interaction.member.roles.cache.has(config.staffRole) && !interaction.channel.topic?.includes(interaction.user.id)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }
      await closeTicket(interaction, interaction.channel);
      return;
    }

    if (interaction.customId === "claim_ticket") {
      if (!interaction.member.roles.cache.has(config.staffRole)) {
        return interaction.reply({ content: "Sadece yetkililer üstlenebilir.", ephemeral: true });
      }
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const ticketMsg = messages.find(m => m.embeds.length && m.embeds[0].title?.includes("Destek Talebi"));
      if (ticketMsg) {
        const oldEmbed = ticketMsg.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
          .addFields({ name: "🙋 Üstlenen Yetkili", value: `${interaction.user}`, inline: false });
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("close_ticket").setLabel("Ticket'ı Kapat").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
          new ButtonBuilder().setCustomId("claim_ticket").setLabel("Üstlenildi").setStyle(ButtonStyle.Secondary).setEmoji("✅").setDisabled(true)
        );
        await ticketMsg.edit({ embeds: [newEmbed], components: [buttons] });
      }
      return interaction.reply({ content: `🙋 ${interaction.user} bu ticket'ı üstlendi.` });
    }

    if (interaction.customId.startsWith("rate_")) {
      const rating = parseInt(interaction.customId.replace("rate_", ""));
      data.stats.ratings.push(rating);
      saveData();
      await interaction.update({ content: `Teşekkürler! **${rating} yıldız** verdiniz.`, embeds: [], components: [] });
      return;
    }
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal:")) {
    await interaction.deferReply({ ephemeral: true });
    const category = interaction.customId.split(":")[1];
    const problem = interaction.fields.getTextInputValue("problem");
    const user = interaction.user;

    if (data.blacklist.includes(user.id)) {
      return interaction.editReply({ content: "Blacklist'te olduğun için ticket açamazsın." });
    }

    const existing = interaction.guild.channels.cache.find(c => c.topic === `ticket-${user.id}` && c.parentId === config.categoryId);
    if (existing) {
      return interaction.editReply({ content: `Zaten açık ticket'ın var: ${existing}` });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      topic: `ticket-${user.id}`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory] },
        { id: config.staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] }
      ]
    });

    data.stats.opened++;
    saveData();

    const ticketEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle(`🎫 ${category.toUpperCase()} Destek Talebi`)
      .setDescription(`Merhaba ${user},\n\nDestek talebin oluşturuldu. Yetkililer en kısa sürede seninle ilgilenecek.`)
      .addFields(
        { name: "Kategori", value: category, inline: true },
        { name: "Kullanıcı", value: `${user.tag}`, inline: true },
        { name: "📝 Sorun Açıklaması", value: problem }
      )
      .setFooter({ text: "DS Ticket" })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("close_ticket").setLabel("Ticket'ı Kapat").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
      new ButtonBuilder().setCustomId("claim_ticket").setLabel("Üstlen").setStyle(ButtonStyle.Primary).setEmoji("🙋")
    );

    await channel.send({ content: `${user} | <@&${config.staffRole}>`, embeds: [ticketEmbed], components: [buttons] });

    const logChannel = interaction.guild.channels.cache.get(config.ticketLog);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle("Yeni Ticket Açıldı")
        .addFields(
          { name: "Kullanıcı", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Kategori", value: category, inline: true },
          { name: "Kanal", value: `${channel}`, inline: true },
          { name: "Sorun", value: problem }
        )
        .setTimestamp();
      logChannel.send({ embeds: [logEmbed] });
    }

    return interaction.editReply({ content: `Ticket'ın oluşturuldu → ${channel}` });
  }
});

async function closeTicket(interaction, channel) {
  await interaction.reply({ content: "Ticket 5 saniye içinde kapatılıyor..." });

  const messages = await channel.messages.fetch({ limit: 100 });
  const htmlBuffer = createHTMLTranscript(channel, messages);
  const attachment = new AttachmentBuilder(htmlBuffer, { name: `transcript-${channel.name}.html` });

  const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptLog);
  if (transcriptChannel) {
    await transcriptChannel.send({
      content: `📄 **${channel.name}** kapatıldı | Açan: <@${channel.topic?.split("-")[1]}> | Kapatan: ${interaction.user}`,
      files: [attachment]
    });
  }

  data.stats.closed++;
  if (!data.stats.staffStats[interaction.user.id]) data.stats.staffStats[interaction.user.id] = 0;
  data.stats.staffStats[interaction.user.id]++;
  saveData();

  const ownerId = channel.topic?.split("-")[1];
  if (ownerId) {
    try {
      const owner = await client.users.fetch(ownerId);
      const rateEmbed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setTitle("⭐ Destek Puanlaması")
        .setDescription("Destek hizmetimizi puanlar mısın?\n1 = Çok Kötü  |  5 = Çok İyi");
      const rateButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("rate_1").setLabel("1").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("rate_2").setLabel("2").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("rate_3").setLabel("3").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("rate_4").setLabel("4").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("rate_5").setLabel("5").setStyle(ButtonStyle.Success)
      );
      await owner.send({ embeds: [rateEmbed], components: [rateButtons] });
    } catch {}
  }

  setTimeout(() => channel.delete().catch(() => {}), 5000);
}

client.on("guildMemberAdd", async (member) => {
  try {
    const welcomeEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("🎉 Sunucumuza Hoş Geldin!")
      .setDescription(`Merhaba **${member.user.username}**!\n\n**❆ - DS DiscordBots** sunucusuna katıldığın için teşekkürler.\nDestek almak istersen ticket panelinden talep oluşturabilirsin.\n\nİyi eğlenceler!`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "❆ - DS DiscordBots" })
      .setTimestamp();
    await member.send({ embeds: [welcomeEmbed] });
  } catch {}
});

client.login(process.env.TOKEN);
