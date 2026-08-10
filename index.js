require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
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
  ratingLog: "1535549655621042197",
  gifUrl: "https://cdn.discordapp.com/attachments/1535074576722296893/1536297715447636048/DS_hizli_kar.gif?ex=6a7ae43e&is=6a7992be&hm=33ccb6b78435399366d2ad31bc4bc95d1a0dcc2287c1aea31b73e30c76cdf2ae&",
  thumbnailUrl: "https://cdn.discordapp.com/attachments/1535074576722296893/1536314156737765396/ChatGPT_Image_10_Agu_2026_13_05_54.gif?ex=6a7af38e&is=6a79a20e&hm=a251fef9d525f3c5185b64bc3ddbe29d80caa9b7cee2a27e9f63b921c98c5a42&",
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
  } catch (e) {}
}
function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}
loadData();

// Ses kanalına bağlanma fonksiyonu
function joinVoice() {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;

  const voiceChannel = guild.channels.cache.get(config.voiceChannelId);
  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) return;

  const existing = getVoiceConnection(guild.id);
  if (existing) return;

  try {
    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true
    });
    console.log("✅ Ses kanalına bağlandı");
  } catch (e) {
    console.log("Ses kanalına bağlanırken hata:", e.message);
  }
}

function createPanelEmbed() {
  return new EmbedBuilder()
    .setColor("#2b2d31") // Mavi çubuk kaldırıldı, koyu siyah-beyaz
    .setAuthor({ name: "DS SYSTEM • Destek Merkezi", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
    .setTitle("🎫 Destek Talebi Oluştur")
    .setDescription(
      "Aşağıdaki menüden size uygun kategoriyi seçerek destek talebi oluşturabilirsiniz.\n\n" +
      "**Kurallar**\n" +
      "• Aynı anda sadece **1 adet** ticket açabilirsiniz\n" +
      "• Sorununuzu net ve detaylı yazın\n" +
      "• Sohbete “Yetkili var mı?” yazmak süreci hızlandırmaz\n\n" +
      "Anlayışınız için teşekkürler."
    )
    .setThumbnail(config.thumbnailUrl)
    .setImage(config.gifUrl)
    .setFooter({ text: "DS SYSTEM • Profesyonel Destek Sistemi" })
    .setTimestamp();
}

function createReminderEmbed() {
  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("Hatırlatma")
    .setDescription(
      "Destek talebi açarken veya puanlama yaparken lütfen **yetkiliyi değil**, aldığınız destek hizmetinin kalitesini değerlendirin.\n\n" +
      "Çözüm süresi, ilgi ve genel memnuniyetiniz hakkında yapacağınız yorumlar, sistemimizi daha da geliştirmemize yardımcı olur."
    )
    .setThumbnail(config.thumbnailUrl)
    .setFooter({ text: "DS SYSTEM • Destek Sistemi" })
    .setTimestamp();
}

function createSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Kategori seçerek ticket oluştur...")
      .addOptions(
        {
          label: "Genel Destek",
          description: "Genel sorular ve yardım",
          value: "genel",
          emoji: "🎫"
        },
        {
          label: "Satış / Fiyat",
          description: "Ürün ve fiyat bilgisi",
          value: "satis",
          emoji: "💰"
        },
        {
          label: "Teknik Destek",
          description: "Teknik sorunlar",
          value: "teknik",
          emoji: "🛠️"
        },
        {
          label: "Şikayet / Öneri",
          description: "Şikayet veya öneri bildir",
          value: "sikayet",
          emoji: "📢"
        },
        {
          label: "Diğer",
          description: "Diğer konular",
          value: "diger",
          emoji: "📁"
        }
      )
  );
}

function createHTMLTranscript(channel, messages) {
  let html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Transcript</title>
  <style>
    body{font-family:sans-serif;background:#313338;color:#dbdee1;padding:20px}
    .header{background:#2b2d31;padding:16px;border-radius:8px;margin-bottom:20px;border-left:4px solid #5865F2}
    .message{display:flex;margin-bottom:12px}.avatar{width:40px;height:40px;border-radius:50%;margin-right:12px}
    .username{font-weight:600;color:#fff}
  </style></head><body>
  <div class="header"><h2>Ticket Transcript - #${channel.name}</h2>
  <p>${new Date().toLocaleString("tr-TR")} • ${messages.size} mesaj</p></div>`;
  [...messages.values()].sort((a,b) => a.createdTimestamp - b.createdTimestamp).forEach(m => {
    const content = m.content ? m.content.replace(/</g,"&lt;").replace(/>/g,"&gt;") : "<em>(dosya/embed)</em>";
    html += `<div class="message">
      <img class="avatar" src="${m.author.displayAvatarURL({extension:'png',size:64})}">
      <div><span class="username">${m.author.username}</span> <small>${m.createdAt.toLocaleString("tr-TR")}</small><br>${content}</div>
    </div>`;
  });
  html += `</body></html>`;
  return Buffer.from(html, 'utf-8');
}

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} aktif!`);
  client.user.setActivity("dadascxn 🤍 efecan", { type: 3 });

  // Ses kanalına bağlan
  joinVoice();

  // Her 5 dakikada bir kontrol et (koparsa tekrar bağlansın)
  setInterval(() => {
    joinVoice();
  }, 5 * 60 * 1000);

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await guild.commands.set([
      { name: "panel", description: "Ticket panelini gönderir" },
      { name: "hatirlatma", description: "Hatırlatma mesajını gönderir" },
      { name: "mesaj", description: "Ticket sahibine mesaj gönderir", options: [{ name: "mesaj", description: "Mesaj", type: 3, required: true }] },
      { name: "ekle", description: "Ticket'a üye ekler", options: [{ name: "kisi", description: "Kişi", type: 6, required: true }] },
      { name: "kapat", description: "Ticket'ı kapatır" },
      { name: "aktif", description: "Sistem durumunu gösterir" },
      { name: "uyari", description: "Kullanıcıya uyarı gönderir" }
    ]);
  }
});

// ========== HOŞ GELDİN ==========
client.on("guildMemberAdd", async (member) => {
  try {
    const created = Math.floor(member.user.createdTimestamp / 1000);
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `🔔 **Kullanıcı:** ${member} - ${member.user.tag}\n` +
        `🆔 **Kullanıcı ID:** ${member.user.id}\n` +
        `📅 **Hesap oluşturma tarihi:** <t:${created}:f>\n` +
        `📊 **Sunucuya giriş sırası:** ${member.guild.memberCount}\n` +
        `🛡️ **Hesap güvenliği:** Güvenli ✅\n\n` +
        `Merhabalar, sunucumuza hoşgeldiniz! Sunucumuza katıldığın için üzerine **Kayıtsız Üye** rolünü verdim!`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setImage(config.gifUrl)
      .setFooter({ text: "DS SYSTEM • Destek Sistemi" })
      .setTimestamp();
    const big = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("Hoşgeldin!")
      .setDescription("Sunucumuza hoşgeldin, kuralları okumayı unutma!")
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setImage(config.gifUrl);
    await member.send({ embeds: [embed, big] }).catch(() => {});
  } catch (e) {}
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }
      await interaction.channel.send({
        embeds: [createPanelEmbed()],
        components: [createSelectMenu()]
      });
      return interaction.reply({ content: "Panel gönderildi!", ephemeral: true });
    }
    if (interaction.commandName === "hatirlatma") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Yetkin yok.", ephemeral: true });
      }
      await interaction.channel.send({ embeds: [createReminderEmbed()] });
      return interaction.reply({ content: "Hatırlatma gönderildi!", ephemeral: true });
    }
    if (interaction.commandName === "aktif") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Sadece yöneticiler kullanabilir.", ephemeral: true });
      }
      const guild = interaction.guild;
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const uptimeText = `${days}g ${hours}sa ${minutes}dk ${seconds}sn`;
      const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
      const ping = client.ws.ping;
      const embed = new EmbedBuilder()
        .setColor("#57F287")
        .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setTitle("🟢 DS SYSTEM Canlı Sistem Durumu")
        .setDescription("Tüm sistemler sorunsuz çalışıyor. Panel her 10 saniyede bir otomatik yenilenir.")
        .setThumbnail(config.thumbnailUrl)
        .addFields(
          {
            name: "📡 Bağlantı Sağlığı",
            value: `\`\`\`\nDurum     : Çevrimiçi\nGecikme   : ${ping} ms\nÇalışma   : ${uptimeText}\n\`\`\``,
            inline: false
          },
          {
            name: "🔄 Yeniden Başlatma Takibi",
            value: `Son açılış: <t:${Math.floor(client.readyTimestamp / 1000)}:f>\nToplam açılış: ${data.stats.opened || 0}\nÇalışma süresi sıfırlandıysa bot yeniden başlatılmıştır.`,
            inline: false
          },
          {
            name: "🖥️ Sunucu ve Sistem",
            value: `\`\`\`\nÜye       : ${guild.memberCount}\nKanal     : ${guild.channels.cache.size}\nRol       : ${guild.roles.cache.size}\nBellek    : ${memory} MB\nNode.js   : ${process.version}\nShard     : 0\n\`\`\``,
            inline: false
          },
          {
            name: "💜 Son Canlılık Sinyali",
            value: `<t:${Math.floor(Date.now() / 1000)}:F> • az önce\nSon canlılık sinyali 20 saniyeden eskiyse bot durmuş veya bağlantı kesilmiş olabilir.`,
            inline: false
          }
        )
        .setFooter({ text: "DS SYSTEM • 7/24 Sistem Takibi" })
        .setTimestamp();
      await interaction.channel.send({ embeds: [embed] });
      return interaction.reply({ content: "Sistem durumu gönderildi!", ephemeral: true });
    }
    if (interaction.commandName === "uyari") {
      if (!interaction.member.roles.cache.has(config.staffRole) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Bu komutu sadece yetkililer kullanabilir.", ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId("uyari_modal")
        .setTitle("Uyarı Gönder");
      const idInput = new TextInputBuilder()
        .setCustomId("discord_id")
        .setLabel("Discord ID")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Örn: 1332700232498130964")
        .setRequired(true);
      const reasonInput = new TextInputBuilder()
        .setCustomId("sebep")
        .setLabel("Uyarı Sebebi")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Örn: Hızlı in bin")
        .setRequired(true)
        .setMaxLength(500);
      modal.addComponents(
        new ActionRowBuilder().addComponents(idInput),
        new ActionRowBuilder().addComponents(reasonInput)
      );
      return interaction.showModal(modal);
    }
    if (interaction.commandName === "mesaj") {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.channel.topic?.startsWith("ticket-")) return interaction.editReply({ content: "Sadece ticket kanalında." });
      if (!interaction.member.roles.cache.has(config.staffRole)) return interaction.editReply({ content: "Yetkin yok." });
      const mesaj = interaction.options.getString("mesaj");
      const ownerId = interaction.channel.topic.split("-")[1];
      try {
        const owner = await client.users.fetch(ownerId);
        const dmEmbed = new EmbedBuilder()
          .setColor("#5865F2")
          .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
          .setTitle("Destek Ekibinden Mesaj")
          .addFields(
            { name: "Gönderen Yetkili", value: `\`\`\`${interaction.user.username}\`\`\``, inline: false },
            { name: "Mesaj", value: `\`\`\`${mesaj}\`\`\``, inline: false }
          )
          .setImage(config.gifUrl)
          .setFooter({ text: `${interaction.guild.name} • DS SYSTEM` })
          .setTimestamp();
        await owner.send({ embeds: [dmEmbed] });
        await interaction.editReply({ content: `Mesaj gönderildi → **${owner.tag}**` });
      } catch {
        await interaction.editReply({ content: "DM gönderilemedi." });
      }
      return;
    }
    if (interaction.commandName === "ekle") {
      await interaction.deferReply({ ephemeral: true });
      if (!interaction.channel.topic?.startsWith("ticket-")) return interaction.editReply({ content: "Sadece ticket kanalında." });
      if (!interaction.member.roles.cache.has(config.staffRole)) return interaction.editReply({ content: "Yetkin yok." });
      const user = interaction.options.getUser("kisi");
      try {
        await interaction.channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true
        });
        await interaction.channel.send(`${user} ticket'a eklendi.`);
        await interaction.editReply({ content: `${user} eklendi.` });
      } catch {
        await interaction.editReply({ content: "Hata oluştu." });
      }
      return;
    }
    if (interaction.commandName === "kapat") {
      if (!interaction.channel.topic?.startsWith("ticket-")) {
        return interaction.reply({ content: "Sadece ticket kanalında.", ephemeral: true });
      }
      await closeTicket(interaction, interaction.channel);
      return;
    }
  }
  // ========== SELECT MENU ==========
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket_select") {
      if (data.blacklist.includes(interaction.user.id)) {
        return interaction.reply({ content: "Blacklist'tesin.", ephemeral: true });
      }
      const category = interaction.values[0];
      const modal = new ModalBuilder().setCustomId(`ticket_modal:${category}`).setTitle("Destek Talebi");
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
  }
  // ========== BUTONLAR ==========
  if (interaction.isButton()) {
    if (interaction.customId === "close_ticket") {
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
        .setLabel("Göndermek istediğin mesaj")
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
    if (interaction.customId.startsWith("rate_")) {
      const rating = parseInt(interaction.customId.replace("rate_", ""));
      data.stats.ratings.push(rating);
      saveData();
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setColor("#57F287")
            .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
            .setTitle("Teşekkürler!")
            .setDescription(`**${rating} yıldız** verdiniz.\nGörüşünüz bizim için çok değerli.`)
            .setFooter({ text: "DS SYSTEM • Destek Puanlaması" })
            .setTimestamp()
        ],
        components: []
      });
      const ratingChannel = interaction.client.channels.cache.get(config.ratingLog);
      if (ratingChannel) {
        const rateLog = new EmbedBuilder()
          .setColor("#FEE75C")
          .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
          .setTitle("⭐ Yeni Destek Puanı")
          .addFields(
            { name: "Kullanıcı", value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
            { name: "Verdiği Puan", value: `**${rating} / 5**`, inline: true },
            { name: "Tarih", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `ID: ${interaction.user.id}` })
          .setTimestamp();
        ratingChannel.send({ embeds: [rateLog] }).catch(() => {});
      }
      return;
    }
  }
  // ========== MODAL ==========
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "uyari_modal") {
      await interaction.deferReply({ ephemeral: true });
      const discordId = interaction.fields.getTextInputValue("discord_id").replace(/[<@!>]/g, "");
      const sebep = interaction.fields.getTextInputValue("sebep");
      try {
        const user = await client.users.fetch(discordId);
        const uyariEmbed = new EmbedBuilder()
          .setColor("#ED4245")
          .setAuthor({ name: "DS SYSTEM • Uyarı Sistemi", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
          .setTitle("⚠️ Uyarı")
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "Discord ID", value: `\`${user.id}\``, inline: false },
            { name: "Uyarı Sebebi", value: sebep, inline: false },
            { name: "Tarih & Saat", value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: false },
            { name: "Yetkili", value: `${interaction.user}`, inline: false }
          )
          .setFooter({ text: "DS SYSTEM • Uyarı Sistemi" })
          .setTimestamp();
        await interaction.channel.send({ embeds: [uyariEmbed] });
        try {
          await user.send({ embeds: [uyariEmbed] });
        } catch {}
        return interaction.editReply({ content: `Uyarı gönderildi → **${user.tag}**` });
      } catch {
        return interaction.editReply({ content: "Kullanıcı bulunamadı. ID'yi kontrol et." });
      }
    }
    if (interaction.customId.startsWith("ticket_modal:")) {
      await interaction.deferReply({ ephemeral: true });
      const category = interaction.customId.split(":")[1];
      const problem = interaction.fields.getTextInputValue("problem");
      const user = interaction.user;
      if (data.blacklist.includes(user.id)) {
        return interaction.editReply({ content: "Blacklist'tesin." });
      }
      const existing = interaction.guild.channels.cache.find(c => c.topic === `ticket-${user.id}` && c.parentId === config.categoryId);
      if (existing) return interaction.editReply({ content: `Zaten açık ticket'ın var: ${existing}` });
      data.ticketCounter++;
      const ticketNo = data.ticketCounter;
      saveData();
      const cleanName = user.username.toLowerCase().replace(/[^a-z0-9]/gi, "");
      const channelName = `${category}-${cleanName}`;
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
      const kat = {
        genel: "Genel Destek",
        satis: "Satış / Fiyat",
        teknik: "Teknik Destek",
        sikayet: "Şikayet / Öneri",
        diger: "Diğer"
      };
      const ticketEmbed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setTitle(`🎫 ${kat[category]} Ticket Oluşturuldu`)
        .setDescription("Destek talebin oluşturuldu. Yetkililer en kısa sürede ilgilenecek.")
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "Kullanıcı", value: `\`\`\`${user.username} • ${user.id}\`\`\`` },
          { name: "Kategori", value: `\`\`\`${kat[category]}\`\`\`` },
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
      const logCh = interaction.guild.channels.cache.get(config.ticketLog);
      if (logCh) {
        const logEmbed = new EmbedBuilder()
          .setColor("#2b2d31")
          .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
          .setTitle("📥 Yeni Ticket Açıldı")
          .addFields(
            { name: "Kullanıcı", value: `${user} (\`${user.tag}\`)`, inline: true },
            { name: "Kullanıcı ID", value: `\`${user.id}\``, inline: true },
            { name: "Kategori", value: `\`${kat[category]}\``, inline: true },
            { name: "Ticket No", value: `\`#${ticketNo}\``, inline: true },
            { name: "Kanal", value: `${channel}`, inline: true },
            { name: "Açılış Zamanı", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: "Sorun Açıklaması", value: `\`\`\`${problem.substring(0, 900)}\`\`\`` }
          )
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: `Kanal ID: ${channel.id}` })
          .setTimestamp();
        logCh.send({ embeds: [logEmbed] });
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
          .addFields(
            { name: "Gönderen Yetkili", value: `\`\`\`${interaction.user.username}\`\`\`` },
            { name: "Mesaj", value: `\`\`\`${message}\`\`\`` }
          )
          .setImage(config.gifUrl)
          .setFooter({ text: `${interaction.guild.name} • DS SYSTEM` })
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
      const id = interaction.fields.getTextInputValue("user_id").replace(/[<@!>]/g, "");
      try {
        const user = await client.users.fetch(id);
        await interaction.channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true, SendMessages: true, AttachFiles: true, ReadMessageHistory: true
        });
        await interaction.channel.send(`${user} eklendi.`);
        return interaction.editReply({ content: "Eklendi." });
      } catch {
        return interaction.editReply({ content: "Kullanıcı bulunamadı." });
      }
    }
    if (interaction.customId === "modal_remove_user") {
      await interaction.deferReply({ ephemeral: true });
      const id = interaction.fields.getTextInputValue("user_id").replace(/[<@!>]/g, "");
      try {
        const user = await client.users.fetch(id);
        if (interaction.channel.topic?.includes(user.id)) {
          return interaction.editReply({ content: "Ticket sahibini çıkaramazsın." });
        }
        await interaction.channel.permissionOverwrites.delete(user.id);
        await interaction.channel.send(`${user} çıkarıldı.`);
        return interaction.editReply({ content: "Çıkarıldı." });
      } catch {
        return interaction.editReply({ content: "Kullanıcı bulunamadı." });
      }
    }
  }
});

// ========== TICKET KAPATMA ==========
async function closeTicket(interaction, channel) {
  await interaction.reply({ content: "Ticket kapatılıyor..." });
  const messages = await channel.messages.fetch({ limit: 100 });
  const htmlBuffer = createHTMLTranscript(channel, messages);
  const attachment = new AttachmentBuilder(htmlBuffer, { name: `transcript-${channel.name}.html` });
  const ownerId = channel.topic?.split("-")[1];
  const logChannel = interaction.guild.channels.cache.get(config.transcriptLog);
  if (logChannel) {
    const closeEmbed = new EmbedBuilder()
      .setColor("#ED4245")
      .setTitle("🔒 Ticket Kapatıldı")
      .addFields(
        { name: "Kanal Adı", value: `\`${channel.name}\``, inline: true },
        { name: "Ticket Sahibi", value: `<@${ownerId}>`, inline: true },
        { name: "Kapatan Yetkili", value: `${interaction.user}`, inline: true },
        { name: "Kapanış Zamanı", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: "Toplam Mesaj", value: `${messages.size}`, inline: true },
        { name: "Kanal ID", value: `\`${channel.id}\``, inline: true }
      )
      .setTimestamp();
    await logChannel.send({ embeds: [closeEmbed], files: [attachment] });
  }
  if (ownerId) {
    try {
      const owner = await client.users.fetch(ownerId);
      const rateEmbed = new EmbedBuilder()
        .setColor("#FEE75C")
        .setAuthor({ name: "DS SYSTEM", iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setTitle("Destek Puanlaması")
        .setDescription("Destek hizmetimizi puanlar mısın?")
        .addFields(
          { name: "Puan Ölçeği", value: "```1 = Çok Kötü\n5 = Çok İyi```" },
          { name: "Not", value: "Görüşünüz bizim için çok önemli!" }
        )
        .setImage(config.gifUrl)
        .setFooter({ text: "DS SYSTEM • Destek Puanlaması" })
        .setTimestamp();
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
  data.stats.closed++;
  if (!data.stats.staffStats[interaction.user.id]) data.stats.staffStats[interaction.user.id] = 0;
  data.stats.staffStats[interaction.user.id]++;
  saveData();
  setTimeout(() => channel.delete().catch(() => {}), 4000);
}

client.login(process.env.TOKEN);
