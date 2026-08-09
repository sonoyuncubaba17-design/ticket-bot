// ========== PUANLAMA ==========
if (interaction.customId.startsWith("rate_")) {
  const rating = parseInt(interaction.customId.replace("rate_", ""));
  data.stats.ratings.push(rating);
  saveData();

  // Kullanıcıya teşekkür mesajı
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

  // Ticket log kanalına puan bilgisi düşsün
  const logChannel = interaction.client.channels.cache.get(process.env.TRANSCRIPT_LOG);
  if (logChannel) {
    const rateLog = new EmbedBuilder()
      .setColor("#FEE75C")
      .setTitle("⭐ Yeni Destek Puanı Alındı")
      .addFields(
        { name: "Kullanıcı", value: `${interaction.user} (\`${interaction.user.tag}\`)`, inline: true },
        { name: "Verdiği Puan", value: `**${rating} / 5** ⭐`, inline: true },
        { name: "Tarih", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Kullanıcı ID: ${interaction.user.id}` })
      .setTimestamp();

    logChannel.send({ embeds: [rateLog] }).catch(() => {});
  }
  return;
}
