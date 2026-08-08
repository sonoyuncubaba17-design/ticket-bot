require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const config = {
  staffRole: process.env.STAFF_ROLE_ID,
  ticketLog: process.env.TICKET_LOG,
  transcriptLog: process.env.TRANSCRIPT_LOG,
  categoryId: process.env.CATEGORY_ID,
  gifUrl: "https://cdn.discordapp.com/attachments/1535547742397399121/1535659790846402621/DS_hizli_kar.gif?ex=6a789221&is=6a7740a1&hm=24b5cc21dde58dc6418e0d86fc4494f4dc2476e711b5d3acc60929d2fe56397a&"
};

function createPanelEmbed() {
  return new EmbedBuilder()
    .setColor("#2b2d31")
    .setAuthor({ name: "DS SYSTEM ", iconURL: client.user.displayAvatarURL() })
    .setDescription(
      "Ürünlerimiz, hizmetlerimiz ve servislerimiz hakkında bilgi edinmek, destek talep etmek vb. işlemler için aşağıdaki menüden seçtiğiniz uygun kategori ile destek talebi oluşturabilirsiniz.\n\n" +
      "**Belirlenen saatler dışında destek talebine bakılmamaktadır.**\n" +
      "Sohbetten **Destek talebine bakar mısınız?** gibi taleplerde bulunmanız süreci hızlandırmaz.\n\n"
    )
    .setImage(config.gifUrl)
    .setFooter({ text: "Saygılarımızla DS DiscordBot #YENİ " })
    .setTimestamp();
}

function createSelectMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Kategori seçerek bilet oluştur...")
      .addOptions(
        {
          label: "Genel Destek",
          description: "Genel sorular ve yardım",
          value: "genel",
          emoji: "1535669368095121408"
        },
        {
          label: "Satış / Fiyat",
          description: "Ürün ve fiyat bilgisi",
          value: "satis",
          emoji: "1535669368095121408"
        },
        {
          label: "Teknik Destek",
          description: "Teknik sorunlar",
          value: "teknik",
          emoji: "1535669368095121408"
        },
        {
          label: "Şikayet / Öneri",
          description: "Şikayet veya öneri bildir",
          value: "sikayet",
          emoji: "1535669368095121408"
        }
      )
  );
}

// Bot hazır olduğunda
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} aktif!`);
  client.user.setActivity("dadascxn 🤍 efecan", { type: 3 });

  const data = [
    {
      name: "panel",
      description: "Ticket panelini gönderir"
    },
    {
      name: "mesaj",
      description: "Ticket sahibine özel mesaj gönderir (sadece ticket kanalında)",
      options: [
        {
          name: "mesaj",
          description: "Göndermek istediğin mesaj",
          type: 3,
          required: true
        }
      ]
    },
    {
      name: "ekle",
      description: "Ticket'a bir üye ekler",
      options: [
        {
          name: "kisi",
          description: "Eklemek istediğin kişi",
          type: 6,
          required: true
        }
      ]
    }
  ];

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await guild.commands.set(data);
    console.log("Slash komutlar yüklendi.");
  }
});

// Tüm etkileşimler tek yerde
client.on("interactionCreate", async (interaction) => {

  // ========== SLASH KOMUTLARI ==========
  if (interaction.isChatInputCommand()) {

    // /panel
    if (interaction.commandName === "panel") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "Bu komutu sadece yöneticiler kullanabilir.", ephemeral: true });
      }
      await interaction.channel.send({
        embeds: [createPanelEmbed()],
        components: [createSelectMenu()]
      });
      return interaction.reply({ content: "Panel gönderildi!", ephemeral: true });
    }

    // /mesaj
    if (interaction.commandName === "mesaj") {
      await interaction.deferReply({ ephemeral: true });

      if (!interaction.channel.topic?.startsWith("ticket-")) {
        return interaction.editReply({ content: "Bu komut sadece ticket kanallarında kullanılabilir." });
      }
      if (!interaction.member.roles.cache.has(config.staffRole)) {
        return interaction.editReply({ content: "Bu komutu sadece destek yetkilileri kullanabilir." });
      }

      const mesaj = interaction.options.getString("mesaj");
      const ownerId = interaction.channel.topic.split("-")[1];

      try {
        const owner = await client.users.fetch(ownerId);
        const dmEmbed = new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("📩 Destek Ekibinden Mesaj")
          .setDescription(mesaj)
          .setFooter({ text: `${interaction.guild.name} • ${interaction.user.tag}` })
          .setTimestamp();

        await owner.send({ embeds: [dmEmbed] });
        await interaction.editReply({ content: `Mesaj başarıyla **${owner.tag}** kişisine gönderildi.` });
      } catch (err) {
        console.log("DM gönderme hatası:", err.message);
        await interaction.editReply({ content: "Mesaj gönderilemedi. Kullanıcının DM'leri kapalı olabilir." });
      }
      return;
    }

    // /ekle
    if (interaction.commandName === "ekle") {
      await interaction.deferReply({ ephemeral: true });

      if (!interaction.channel.topic?.startsWith("ticket-")) {
        return interaction.editReply({ content: "Bu komut sadece ticket kanallarında kullanılabilir." });
      }
      if (!interaction.member.roles.cache.has(config.staffRole)) {
        return interaction.editReply({ content: "Bu komutu sadece destek yetkilileri kullanabilir." });
      }

      const user = interaction.options.getUser("kisi");

      try {
        await interaction.channel.permissionOverwrites.edit(user.id, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          ReadMessageHistory: true
        });
        await interaction.editReply({ content: `${user} başarıyla ticket'a eklendi.` });
        await interaction.channel.send({ content: `${user} bu ticket'a eklendi. (${interaction.user} tarafından)` });
      } catch (err) {
        console.log("Üye ekleme hatası:", err.message);
        await interaction.editReply({ content: "Kişi eklenirken bir hata oluştu." });
      }
      return;
    }
  }

  // ========== SELECT MENU (Form aç) ==========
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "ticket_select") return;

    const category = interaction.values[0];

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

    const row = new ActionRowBuilder().addComponents(problemInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  // ========== MODAL SUBMIT (Form gönderildi) ==========
  if (interaction.isModalSubmit()) {
    if (!interaction.customId.startsWith("ticket_modal:")) return;

    await interaction.deferReply({ ephemeral: true });

    const category = interaction.customId.split(":")[1];
    const problem = interaction.fields.getTextInputValue("problem");
    const user = interaction.user;

    const existing = interaction.guild.channels.cache.find(
      (c) => c.topic === `ticket-${user.id}` && c.parentId === config.categoryId
    );

    if (existing) {
      return interaction.editReply({ content: `Zaten açık bir ticket'ın var: ${existing}` });
    }

    const channel = await interaction.guild.channels.create({
      name: `ticket-${user.username}`,
      type: ChannelType.GuildText,
      parent: config.categoryId,
      topic: `ticket-${user.id}`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
          ]
        },
        {
          id: config.staffRole,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.AttachFiles
          ]
        }
      ]
    });

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
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Ticket'ı Kapat")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"),
      new ButtonBuilder()
        .setCustomId("claim_ticket")
        .setLabel("Üstlen")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🙋")
    );

    await channel.send({
      content: `${user} | <@&${config.staffRole}>`,
      embeds: [ticketEmbed],
      components: [buttons]
    });

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

  // ========== BUTTONLAR ==========
  if (interaction.isButton()) {
    const channel = interaction.channel;

    // Ticket kapat
    if (interaction.customId === "close_ticket") {
      if (
        !interaction.member.roles.cache.has(config.staffRole) &&
        !channel.topic?.includes(interaction.user.id)
      ) {
        return interaction.reply({ content: "Bu ticket'ı kapatma yetkin yok.", ephemeral: true });
      }

      await interaction.reply({ content: "Ticket 5 saniye içinde kapatılıyor..." });

      const messages = await channel.messages.fetch({ limit: 100 });
      let transcript = `Ticket Transcript - ${channel.name}\nTarih: ${new Date().toLocaleString("tr-TR")}\n\n`;
      messages.reverse().forEach((m) => {
        transcript += `[${m.createdAt.toLocaleString("tr-TR")}] ${m.author.tag}: ${m.content}\n`;
      });

      const buffer = Buffer.from(transcript, "utf-8");
      const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

      const transcriptChannel = interaction.guild.channels.cache.get(config.transcriptLog);
      if (transcriptChannel) {
        await transcriptChannel.send({
          content: `📄 **${channel.name}** kapatıldı | Açan: <@${channel.topic?.split("-")[1]}>`,
          files: [attachment]
        });
      }

      setTimeout(() => channel.delete().catch(() => {}), 5000);
      return;
    }

    // Ticket üstlen
    if (interaction.customId === "claim_ticket") {
      if (!interaction.member.roles.cache.has(config.staffRole)) {
        return interaction.reply({ content: "Sadece yetkililer üstlenebilir.", ephemeral: true });
      }
      return interaction.reply({ content: `🙋 ${interaction.user} bu ticket'ı üstlendi.` });
    }
  }
});

// Hoş geldin mesajı
client.on("guildMemberAdd", async (member) => {
  try {
    const welcomeEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("🎉 Sunucumuza Hoş Geldin!")
      .setDescription(
        `Merhaba **${member.user.username}**!\n\n` +
        `**❆ - DS DiscordBots** sunucusuna katıldığın için teşekkürler.\n` +
        `Destek almak istersen <#ds-yardim> kanalındaki menüden ticket açabilirsin.\n\n` +
        `İyi eğlenceler!`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "❆ - DS DiscordBots" })
      .setTimestamp();

    await member.send({ embeds: [welcomeEmbed] });
  } catch (error) {
    console.log(`${member.user.tag} kişisine DM gönderilemedi (muhtemelen DM'leri kapalı).`);
  }
});

client.login(process.env.TOKEN);
