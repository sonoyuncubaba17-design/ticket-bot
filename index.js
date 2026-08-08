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
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

const config = {
  staffRole: process.env.STAFF_ROLE_ID,
  ticketLog: process.env.TICKET_LOG,
  transcriptLog: process.env.TRANSCRIPT_LOG,
  categoryId: process.env.CATEGORY_ID,
  gifUrl: "https://cdn.discordapp.com/attachments/1535547742397399121/1535659790846402621/DS_hizli_kar.gif?ex=6a789221&is=6a7740a1&hm=24b5cc21dde58dc6418e0d86fc4494f4dc2476e711b5d3acc60929d2fe56397a&",
  voiceChannelId: "1535776380631916555"
};

const dataPath = path.join(__dirname, 'data.json');
let data = { 
  blacklist: [], 
  stats: { opened: 0, closed: 0, ratings: [], staffStats: {} },
  history: []
};

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      if (!data.history) data.history = [];
    }
  } catch (e) {
    console.log('data.json okunamadı, yeni oluşturuluyor.');
  }
}
function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}
loadData();

// Aktif yetkilileri getiren fonksiyon
function getAktifYetkililer(guild) {
  const staffRole = guild.roles.cache.get(config.staffRole);
  if (!staffRole) return "Şu an aktif yetkili yok.";

  const onlineStaff = staffRole.members.filter(m => 
    ["online", "idle", "dnd"].includes(m.presence?.status) && !m.user.bot
  );

  if (onlineStaff.size === 0) return "Şu an aktif yetkili yok.";

  return onlineStaff.map(m => {
    const status = m.presence?.status === "online" ? "🟢" : m.presence?.status === "idle" ? "🟡" : "🔴";
    return `${status} ${m.user.username}`;
  }).join("\n");
}

// ========== PANEL ==========
function createPanelEmbed() {
  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL() })
    .setDescription(
      "Aşağıdaki butonlardan size uygun kategoriyi seçerek destek talebi oluşturabilirsiniz.\n\n" +
      "**Nasıl Çalışır?**\n" +
      "1. Butona tıklayın\n" +
      "2. Açılan forma sorununuzu yazın\n" +
      "3. Ticket otomatik oluşur ve yetkililere bildirilir\n\n" +
      "**Kurallar**\n" +
      "• Aynı anda sadece **1 adet** ticket açabilirsiniz\n" +
      "• Sorununuzu net ve detaylı yazın\n" +
      "• Sohbete “Yetkili var mı?” yazmak süreci hızlandırmaz\n" +
      "• Yetkililer en kısa sürede sizinle ilgilenecektir\n\n" +
      "Anlayışınız için teşekkürler."
    )
    .setImage(config.gifUrl)
    .setFooter({ text: "DS SYSTEM • Destek Sistemi" })
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

// ========== GÜZEL HTML TRANSCRIPT ==========
function createHTMLTranscript(channel, messages) {
  let html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript - ${channel.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
      background: #313338;
      color: #dbdee1;
      padding: 20px;
      line-height: 1.375;
    }
    .container { max-width: 740px; margin: 0 auto; }
    .header {
      background: #2b2d31;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      border-left: 4px solid #5865F2;
    }
    .header h1 { font-size: 20px; color: #fff; margin-bottom: 8px; }
    .header p { color: #b5bac1; font-size: 14px; }
    .message {
      display: flex;
      padding: 8px 16px;
      margin-bottom: 2px;
      border-radius: 4px;
      transition: background 0.1s;
    }
    .message:hover { background: #2e3035; }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      margin-right: 16px;
      flex-shrink: 0;
    }
    .content-wrapper { flex: 1; min-width: 0; }
    .header-line {
      display: flex;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .username {
      font-weight: 500;
      font-size: 16px;
      margin-right: 8px;
      color: #fff;
    }
    .bot-tag {
      background: #5865F2;
      color: white;
      font-size: 10px;
      font-weight: 500;
      padding: 1px 4px;
      border-radius: 3px;
      margin-right: 6px;
      text-transform: uppercase;
    }
    .timestamp {
      font-size: 12px;
      color: #949ba4;
    }
    .message-content {
      font-size: 16px;
      color: #dbdee1;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Ticket Transcript</h1>
      <p><strong>Kanal:</strong> #${channel.name}<br>
      <strong>Oluşturulma:</strong> ${new Date().toLocaleString("tr-TR")}<br>
      <strong>Mesaj Sayısı:</strong> ${messages.size}</p>
    </div>
`;

  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  sorted.forEach(m => {
    const avatar = m.author.displayAvatarURL({ extension: 'png', size: 64 });
    const isBot = m.author.bot ? `<span class="bot-tag">BOT</span>` : "";
    const content = m.content ? m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<em style='color:#949ba4'>(embed veya dosya)</em>";
    
    html += `
    <div class="message">
      <img class="avatar" src="${avatar}" alt="avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
      <div class="content-wrapper">
        <div class="header-line">
          <span class="username">${m.author.username}</span>
          ${isBot}
          <span class="timestamp">${m.createdAt.toLocaleString("tr-TR")}</span>
        </div>
        <div class="message-content">${content}</div>
      </div>
    </div>`;
  });

  html += `
  </div>
</body>
</html>`;
  return Buffer.from(html, 'utf-8');
}

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} aktif!`);
  client.user.setActivity("dadascxn 🤍 efecan", { type: 3 });

  // Ses kanalına kalıcı bağlan
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    const voiceChannel = guild.channels.cache.get(config.voiceChannelId);
    if (voiceChannel && voiceChannel.type === ChannelType.GuildVoice) {
      try {
        joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guild.id,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: true
        });
        console.log(`🔊 Ses kanalına bağlandı: ${voiceChannel.name}`);
      } catch (e) {
        console.log("Ses kanalına bağlanırken hata:", e.message);
      }
    }
  }

  const dataCmds = [
    { name: "panel", description: "Ticket panelini gönderir" },
    { name: "mesaj", description: "Ticket sahibine özel mesaj gönderir", options: [{ name: "mesaj", description: "Mesaj", type: 3, required: true }] },
    { name: "ekle", description: "Ticket'a üye ekler", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
    { name: "aktif", description: "Sunucu aktif mesajını gönderir" },
    { name: "kapat", description: "Ticket'ı kapatır" },
    { name: "stats", description: "Ticket istatistiklerini gösterir" },
    { name: "blacklist", description: "Kullanıcıyı blacklist'e ekler", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
    { name: "unblacklist", description: "Blacklist'ten çıkarır", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
    { 
      name: "ticket-ara", 
      description: "Eski ticket'ları arar",
      options: [
        { name: "kullanici", description: "Kullanıcı adı veya ID", type: 3, required: false },
        { name: "kategori", description: "Kategori (genel, satis, teknik, sikayet)", type: 3, required: false }
      ]
    }
  ];

  if (guild) {
    await guild.commands.set(dataCmds);
    console.log("Slash komutlar yüklendi.");
  }

  // 24 saat inaktif kontrol
  setInterval(async () => {
    const g = client.guilds.cache.get(process.env.GUILD_ID);
    if (!g) return;
    const ticketChannels = g.channels.cache.filter(c => c.parentId === config.categoryId && c.topic?.startsWith("ticket-"));
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
          const transcriptChannel = g.channels.cache.get(config.transcriptLog);
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
      await interaction.channel.send({ 
        embeds: [createPanelEmbed()], 
        components: [createPanelButtons()] 
      });
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

    if (interaction.commandName === "ticket-ara") {
      if (!interaction.member.roles.cache.has(config.staffRole) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }

      const kullanici = interaction.options.getString("kullanici")?.toLowerCase();
      const kategori = interaction.options.getString("kategori")?.toLowerCase();

      let results = data.history || [];

      if (kullanici) {
        results = results.filter(t => 
          t.username.toLowerCase().includes(kullanici) || 
          t.userId.includes(kullanici)
        );
      }
      if (kategori) {
        results = results.filter(t => t.category === kategori);
      }

      results = results.slice(-15).reverse();

      if (results.length === 0) {
        return interaction.reply({ content: "Hiç sonuç bulunamadı.", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor("#5865F2")
        .setTitle(`🔍 Ticket Arama Sonuçları (${results.length})`)
        .setDescription(results.map((t, i) => 
          `**${i + 1}.** \`${t.username}\` • ${t.category.toUpperCase()} • <t:${Math.floor(t.closedAt / 1000)}:R>\nKapatan: <@${t.closedBy}>`
        ).join("\n\n"))
        .setFooter({ text: "Sadece son ticket'lar gösterilir" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith("ticket_")) {
      if (data.blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "Blacklist'te olduğun için ticket açamazsın.", ephemeral: true });
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

    // Aktif yetkilileri al
    const aktifYetkililer = getAktifYetkililer(interaction.guild);

    const ticketEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle(`🎫 ${category.toUpperCase()} Destek Talebi`)
      .setDescription(`Merhaba ${user},\n\nDestek talebin oluşturuldu. Yetkililer en kısa sürede seninle ilgilenecek.`)
      .addFields(
        { name: "Kategori", value: category, inline: true },
        { name: "Kullanıcı", value: `${user.tag}`, inline: true },
        { name: "📝 Sorun Açıklaması", value: problem },
        { name: "👥 Aktif Yetkililer", value: aktifYetkililer }
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

  const ownerId = channel.topic?.split("-")[1];
  let username = "Bilinmiyor";
  try {
    const owner = await client.users.fetch(ownerId);
    username = owner.username;
  } catch {}

  let category = "bilinmiyor";
  const firstMsgs = await channel.messages.fetch({ limit: 5 });
  const ticketEmbedMsg = firstMsgs.find(m => m.embeds[0]?.title?.includes("Destek Talebi"));
  if (ticketEmbedMsg) {
    const title = ticketEmbedMsg.embeds[0].title || "";
    if (title.includes("GENEL")) category = "genel";
    else if (title.includes("SATIS") || title.includes("SATIŞ")) category = "satis";
    else if (title.includes("TEKNIK") || title.includes("TEKNİK")) category = "teknik";
    else if (title.includes("SIKAYET") || title.includes("ŞİKAYET")) category = "sikayet";
  }

  data.history.push({
    userId: ownerId,
    username,
    category,
    closedBy: interaction.user.id,
    closedAt: Date.now()
  });

  if (data.history.length > 100) data.history = data.history.slice(-100);

  data.stats.closed++;
  if (!data.stats.staffStats[interaction.user.id]) data.stats.staffStats[interaction.user.id] = 0;
  data.stats.staffStats[interaction.user.id]++;
  saveData();

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
