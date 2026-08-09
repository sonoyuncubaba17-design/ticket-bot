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
  history: [],
  ticketCounter: 1000
};

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      if (!data.history) data.history = [];
      if (!data.ticketCounter) data.ticketCounter = 1000;
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
    .setColor("#5865F2")
    .setAuthor({ name: "DS SYSTEM • Destek Merkezi", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
    .setTitle("🎫 Destek Talebi Oluştur")
    .setDescription(
      "Aşağıdaki butonlardan size uygun kategoriyi seçerek destek talebi oluşturabilirsiniz.\n\n" +
      "**Nasıl Çalışır?**\n" +
      "1️⃣ Butona tıklayın\n" +
      "2️⃣ Açılan forma sorununuzu yazın\n" +
      "3️⃣ Ticket otomatik oluşur ve yetkililere bildirilir\n\n" +
      "**Kurallar**\n" +
      "• Aynı anda sadece **1 adet** ticket açabilirsiniz\n" +
      "• Sorununuzu net ve detaylı yazın\n" +
      "• Sohbete “Yetkili var mı?” yazmak süreci hızlandırmaz\n" +
      "• Yetkililer en kısa sürede sizinle ilgilenecektir\n\n" +
      "Anlayışınız için teşekkürler."
    )
    .setImage(config.gifUrl)
    .setFooter({ text: "DS SYSTEM • Profesyonel Destek Sistemi" })
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
  let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Transcript - ${channel.name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:"gg sans",sans-serif;background:#313338;color:#dbdee1;padding:20px}
    .container{max-width:740px;margin:0 auto}.header{background:#2b2d31;border-radius:8px;padding:16px;margin-bottom:20px;border-left:4px solid #5865F2}
    .message{display:flex;padding:8px 0}.avatar{width:40px;height:40px;border-radius:50%;margin-right:12px}
    .username{font-weight:500;color:#fff;margin-right:6px}.timestamp{font-size:12px;color:#949ba4}
    .bot-tag{background:#5865F2;color:#fff;font-size:10px;padding:1px 4px;border-radius:3px;margin-right:6px}
  </style></head><body><div class="container">
  <div class="header"><h1>📄 Ticket Transcript</h1>
  <p>Kanal: #${channel.name}<br>Tarih: ${new Date().toLocaleString("tr-TR")}<br>Mesaj: ${messages.size}</p></div>`;

  const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  sorted.forEach(m => {
    const avatar = m.author.displayAvatarURL({ extension: 'png', size: 64 });
    const isBot = m.author.bot ? `<span class="bot-tag">BOT</span>` : "";
    const content = m.content ? m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<em>(embed/dosya)</em>";
    html += `<div class="message"><img class="avatar" src="${avatar}">
    <div><span class="username">${m.author.username}</span>${isBot}<span class="timestamp">${m.createdAt.toLocaleString("tr-TR")}</span>
    <div>${content}</div></div></div>`;
  });
  html += `</div></body></html>`;
  return Buffer.from(html, 'utf-8');
}

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} aktif!`);
  client.user.setActivity("dadascxn 🤍 efecan", { type: 3 });

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
        console.log(`🔊 Ses kanalına bağlandı`);
      } catch (e) {}
    }

    const dataCmds = [
      { name: "panel", description: "Ticket panelini gönderir" },
      { name: "mesaj", description: "Ticket sahibine özel mesaj gönderir", options: [{ name: "mesaj", description: "Mesaj", type: 3, required: true }] },
      { name: "ekle", description: "Ticket'a üye ekler", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
      { name: "aktif", description: "Sunucu aktif mesajını gönderir" },
      { name: "kapat", description: "Ticket'ı kapatır" },
      { name: "stats", description: "Ticket istatistiklerini gösterir" },
      { name: "blacklist", description: "Blacklist'e ekler", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
      { name: "unblacklist", description: "Blacklist'ten çıkarır", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
      { name: "ticket-ara", description: "Eski ticket'ları arar", options: [
        { name: "kullanici", description: "Kullanıcı", type: 3, required: false },
        { name: "kategori", description: "Kategori", type: 3, required: false }
      ]}
    ];
    await guild.commands.set(dataCmds);
    console.log("Slash komutlar yüklendi.");
  }
});

// Hoş geldin
client.on("guildMemberAdd", async (member) => {
  try {
    const createdAt = Math.floor(member.user.createdTimestamp / 1000);
    const welcomeEmbed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setAuthor({ name: "Gun PVP Autorazer", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `🔔 **Kullanıcı:** ${member} - ${member.user.tag}\n` +
        `🆔 **Kullanıcı ID:** ${member.user.id}\n` +
        `📅 **Hesap oluşturma tarihi:** <t:${createdAt}:f>\n` +
        `📊 **Sunucuya giriş sırası:** ${member.guild.memberCount}\n` +
        `🛡️ **Hesap güvenliği:** Güvenli ✅\n\n` +
        `Merhabalar, sunucumuza hoşgeldiniz! Sunucumuza katıldığın için üzerine **Kayıtsız Üye** rolünü verdim!`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setImage(config.gifUrl)
      .setFooter({ text: "GUN PVP 3.0 #soon - Kateshi Bots" })
      .setTimestamp();

    await member.send({ embeds: [welcomeEmbed] }).catch(() => {});
  } catch (e) {}
});

client.on("interactionCreate", async (interaction) => {
  // Slash Komutlar
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }
      await interaction.channel.send({ embeds: [createPanelEmbed()], components: [createPanelButtons()] });
      return interaction.reply({ content: "Panel gönderildi!", ephemeral: true });
    }

    if (interaction.commandName === "mesaj") {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.channel.topic?.startsWith("ticket-")) return interaction.editReply({ content: "Sadece ticket kanallarında." });
      if (!interaction.member.roles.cache.has(config.staffRole)) return interaction.editReply({ content: "Yetkin yok." });

      const mesaj = interaction.options.getString("mesaj");
      const ownerId = interaction.channel.topic.split("-")[1];
      try {
        const owner = await client.users.fetch(ownerId);
        const dmEmbed = new EmbedBuilder()
          .setColor("#5865F2")
          .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
          .setTitle("Destek Ekibinden Mesaj")
          .setDescription(mesaj)
          .addFields({ name: "Yetkili", value: `${interaction.user}`, inline: true })
          .setFooter({ text: interaction.guild.name })
          .setTimestamp();
        await owner.send({ embeds: [dmEmbed] });
        await interaction.editReply({ content: `Mesaj gönderildi → ${owner.tag}` });
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
        await interaction.channel.send(`${user} eklendi (${interaction.user})`);
        await interaction.editReply({ content: `${user} eklendi.` });
      } catch {
        await interaction.editReply({ content: "Hata oluştu." });
      }
      return;
    }

    if (interaction.commandName === "kapat") {
      if (!interaction.channel.topic?.startsWith("ticket-")) return interaction.reply({ content: "Sadece ticket kanallarında.", ephemeral: true });
      if (!interaction.member.roles.cache.has(config.staffRole) && !interaction.channel.topic.includes(interaction.user.id)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }
      await closeTicket(interaction, interaction.channel);
      return;
    }

    // Diğer komutlar (stats, blacklist, aktif vs.) istersen sonra ekleriz, şimdilik temel olanlar duruyor
  }

  // Butonlar
  if (interaction.isButton()) {
    if (interaction.customId.startsWith("ticket_")) {
      if (data.blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "Blacklist'tesin.", ephemeral: true });
      }
      const category = interaction.customId.replace("ticket_", "");
      const modal = new ModalBuilder().setCustomId(`ticket_modal:${category}`).setTitle("Destek Talebi Oluştur");
      const input = new TextInputBuilder()
        .setCustomId("problem")
        .setLabel("Sorununuzu detaylı yazın")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
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
        return interaction.reply({ content: "Sadece yetkililer.", ephemeral: true });
      }
      return interaction.reply({ content: `🙋 ${interaction.user} ticket'ı üstlendi.` });
    }

    if (interaction.customId === "send_message") {
      if (!interaction.member.roles.cache.has(config.staffRole)) {
        return interaction.reply({ content: "Sadece yetkililer.", ephemeral: true });
      }
      const modal = new ModalBuilder().setCustomId("modal_send_message").setTitle("Mesaj Gönder");
      const input = new TextInputBuilder()
        .setCustomId("message_content")
        .setLabel("Mesajın")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (interaction.customId === "add_user") {
      if (!interaction.member.roles.cache.has(config.staffRole)) return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      const modal = new ModalBuilder().setCustomId("modal_add_user").setTitle("Kullanıcı Ekle");
      const input = new TextInputBuilder().setCustomId("user_id").setLabel("Kullanıcı ID").setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (interaction.customId === "remove_user") {
      if (!interaction.member.roles.cache.has(config.staffRole)) return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      const modal = new ModalBuilder().setCustomId("modal_remove_user").setTitle("Kullanıcı Çıkar");
      const input = new TextInputBuilder().setCustomId("user_id").setLabel("Kullanıcı ID").setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }
  }

  // Modal
  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith("ticket_modal:")) {
      await interaction.deferReply({ ephemeral: true });
      const category = interaction.customId.split(":")[1];
      const problem = interaction.fields.getTextInputValue("problem");
      const user = interaction.user;

      if (data.blacklist.includes(user.id)) return interaction.editReply({ content: "Blacklist'tesin." });

      const existing = interaction.guild.channels.cache.find(c => c.topic === `ticket-${user.id}` && c.parentId === config.categoryId);
      if (existing) return interaction.editReply({ content: `Zaten açık ticket'ın var: ${existing}` });

      data.ticketCounter++;
      const ticketNo = data.ticketCounter;
      saveData();

      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/gi, "");
      const channelName = `${category}-${cleanUsername}`;

      const channel = await interaction.guild.channels.create({
        name: channelName,
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

      const kategoriIsimleri = { genel: "Genel Destek", satis: "Satış / Fiyat", teknik: "Teknik Destek", sikayet: "Şikayet / Öneri" };

      const ticketEmbed = new EmbedBuilder()
        .setColor("#5865F2")
        .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setTitle(`🎫 ${kategoriIsimleri[category]} Ticket Oluşturuldu`)
        .setDescription(`Destek talebin oluşturuldu.\nYetkililer en kısa sürede ilgilenecek.`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "Kullanıcı", value: `\`\`\`${user.username} • ${user.id}\`\`\`` },
          { name: "Kategori", value: `\`\`\`${kategoriIsimleri[category]}\`\`\`` },
          { name: "Ticket No", value: `\`\`\`#${ticketNo}\`\`\`` },
          { name: "Sorun", value: `\`\`\`${problem.substring(0, 900)}\`\`\`` }
        )
        .setImage(config.gifUrl)
        .setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("claim_ticket").setLabel("Üstlen").setStyle(ButtonStyle.Primary).setEmoji("🙋"),
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Kapat").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
        new ButtonBuilder().setCustomId("add_user").setLabel("Kullanıcı Ekle").setStyle(ButtonStyle.Success).setEmoji("➕"),
        new ButtonBuilder().setCustomId("remove_user").setLabel("Kullanıcı Çıkar").setStyle(ButtonStyle.Secondary).setEmoji("➖"),
        new ButtonBuilder().setCustomId("send_message").setLabel("Mesaj Gönder").setStyle(ButtonStyle.Primary).setEmoji("💬")
      );

      await channel.send({ content: `${user} | <@&${config.staffRole}>`, embeds: [ticketEmbed], components: [buttons] });

      const logChannel = interaction.guild.channels.cache.get(config.ticketLog);
      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("#5865F2")
              .setTitle("📥 Yeni Ticket")
              .addFields(
                { name: "Kullanıcı", value: `${user.tag}`, inline: true },
                { name: "Kategori", value: kategoriIsimleri[category], inline: true },
                { name: "Kanal", value: `${channel}`, inline: true }
              )
              .setTimestamp()
          ]
        });
      }

      return interaction.editReply({ content: `Ticket oluşturuldu → ${channel}` });
    }

    if (interaction.customId === "modal_send_message") {
      await interaction.deferReply({ ephemeral: true });
      const message = interaction.fields.getTextInputValue("message_content");
      const ownerId = interaction.channel.topic?.split("-")[1];
      try {
        const owner = await client.users.fetch(ownerId);
        const dmEmbed = new EmbedBuilder()
          .setColor("#5865F2")
          .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
          .setTitle("Destek Ekibinden Mesaj")
          .setDescription(message)
          .addFields({ name: "Yetkili", value: `${interaction.user}` })
          .setFooter({ text: interaction.guild.name })
          .setTimestamp();
        await owner.send({ embeds: [dmEmbed] });
        await interaction.channel.send(`📨 ${interaction.user} özel mesaj gönderdi.`);
        return interaction.editReply({ content: "Mesaj gönderildi." });
      } catch {
        return interaction.editReply({ content: "Gönderilemedi." });
      }
    }

    if (interaction.customId === "modal_add_user") {
      await interaction.deferReply({ ephemeral: true });
      const input = interaction.fields.getTextInputValue("user_id").replace(/[<@!>]/g, "");
      try {
        const user = await client.users.fetch(input);
        await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true });
        await interaction.channel.send(`${user} eklendi.`);
        return interaction.editReply({ content: "Eklendi." });
      } catch {
        return interaction.editReply({ content: "Kullanıcı bulunamadı." });
      }
    }

    if (interaction.customId === "modal_remove_user") {
      await interaction.deferReply({ ephemeral: true });
      const input = interaction.fields.getTextInputValue("user_id").replace(/[<@!>]/g, "");
      try {
        const user = await client.users.fetch(input);
        if (interaction.channel.topic?.includes(user.id)) return interaction.editReply({ content: "Sahibi çıkaramazsın." });
        await interaction.channel.permissionOverwrites.delete(user.id);
        await interaction.channel.send(`${user} çıkarıldı.`);
        return interaction.editReply({ content: "Çıkarıldı." });
      } catch {
        return interaction.editReply({ content: "Kullanıcı bulunamadı." });
      }
    }
  }
});

async function closeTicket(interaction, channel) {
  await interaction.reply({ content: "Ticket kapatılıyor..." });

  const messages = await channel.messages.fetch({ limit: 100 });
  const htmlBuffer = createHTMLTranscript(channel, messages);
  const attachment = new AttachmentBuilder(htmlBuffer, { name: `transcript-${channel.name}.html` });

  const ownerId = channel.topic?.split("-")[1];
  let username = "Bilinmiyor";
  try {
    const owner = await client.users.fetch(ownerId);
    username = owner.username;
  } catch {}

  const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptLog);
  if (transcriptChannel) {
    const closeEmbed = new EmbedBuilder()
      .setColor("#ED4245")
      .setTitle("🔒 Ticket Kapatıldı")
      .addFields(
        { name: "Kanal", value: `\`${channel.name}\``, inline: true },
        { name: "Sahip", value: `<@${ownerId}>`, inline: true },
        { name: "Kapatan", value: `${interaction.user}`, inline: true },
        { name: "Zaman", value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
        { name: "Mesaj Sayısı", value: `${messages.size}`, inline: true }
      )
      .setTimestamp();
    await transcriptChannel.send({ embeds: [closeEmbed], files: [attachment] });
  }

  data.stats.closed++;
  if (!data.stats.staffStats[interaction.user.id]) data.stats.staffStats[interaction.user.id] = 0;
  data.stats.staffStats[interaction.user.id]++;
  saveData();

  setTimeout(() => channel.delete().catch(() => {}), 4000);
}

client.login(process.env.TOKEN);
