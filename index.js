const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

const GUILD_ID = "1501445052168278016";

const config = {
  devId: "1460149186577174680",
  staffRole: "",
  logsChannel: "",
  panelImage: "",
  channels: { suporte: "", bots: "", dev: "" }
};

const tickets = new Map();

client.once("ready", async () => {
  console.log(`✅ ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName("painelticket").setDescription("Enviar painel"),
    new SlashCommandBuilder()
      .setName("setstaff")
      .setDescription("Definir staff")
      .addRoleOption(o => o.setName("cargo").setDescription("Cargo").setRequired(true)),

    new SlashCommandBuilder()
      .setName("configurarticket")
      .setDescription("Configurar sistema")
      .addStringOption(o =>
        o.setName("tipo")
          .setDescription("Tipo")
          .setRequired(true)
          .addChoices(
            { name: "Suporte", value: "suporte" },
            { name: "Bots", value: "bots" },
            { name: "Dev", value: "dev" },
            { name: "Logs", value: "logs" },
            { name: "Imagem", value: "image" }
          )
      )
      .addStringOption(o =>
        o.setName("id")
          .setDescription("ID ou URL")
          .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Commands");
});

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    // painel
    if (interaction.commandName === "painelticket") {

      const embed = new EmbedBuilder()
        .setTitle("<:sino:1507817911392407552> Central")
        .setDescription(
          "<:Suporte:1501991877438738477> Suporte\n" +
          "<:bot:1503164137906372608> Bots\n" +
          "<:codigo:1507816966704857098> Desenvolvimento"
        )
        .setColor("Blue");

      if (config.panelImage) embed.setImage(config.panelImage);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_suporte")
          .setLabel("Suporte")
          .setEmoji("<:Suporte:1501991877438738477>")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("ticket_bots")
          .setLabel("Bots")
          .setEmoji("<:bot:1503164137906372608>")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("ticket_dev")
          .setLabel("Dev")
          .setEmoji("<:codigo:1507816966704857098>")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // setstaff
    if (interaction.commandName === "setstaff") {

      if (interaction.user.id !== config.devId)
        return interaction.reply({ content: "❌", ephemeral: true });

      const role = interaction.options.getRole("cargo");

      config.staffRole = role.id;

      return interaction.reply({
        content: `✅ Staff: <@&${role.id}>`,
        ephemeral: true
      });
    }

    // configurar
    if (interaction.commandName === "configurarticket") {

      if (interaction.user.id !== config.devId)
        return interaction.reply({ content: "❌", ephemeral: true });

      const tipo = interaction.options.getString("tipo");
      const id = interaction.options.getString("id");

      if (tipo === "logs") config.logsChannel = id;
      else if (tipo === "image") config.panelImage = id;
      else config.channels[tipo] = id;

      return interaction.reply({
        content: "✅ Configurado",
        ephemeral: true
      });
    }
  }

  // botões
  if (!interaction.isButton()) return;

  const { customId, guild, user, member } = interaction;

  // abrir
  if (customId.startsWith("ticket_")) {

    const tipo = customId.replace("ticket_", "");

    if (tickets.has(user.id))
      return interaction.reply({
        content: "❌ Você já possui ticket aberto",
        ephemeral: true
      });

    const base = guild.channels.cache.get(config.channels[tipo]);

    if (!base)
      return interaction.reply({
        content: "❌ Canal não configurado",
        ephemeral: true
      });

    const thread = await base.threads.create({
      name: `ticket-${user.username}`,
      type: ChannelType.PrivateThread,
      autoArchiveDuration: 1440
    });

    await thread.members.add(user.id);

    tickets.set(user.id, thread.id);

    const embed = new EmbedBuilder()
      .setTitle("<:criar:1507816968286375976> Ticket")
      .setDescription(`👤 ${user}`)
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("atender")
        .setLabel("Atender")
        .setEmoji("<:certo:1508472499514376243>")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("fechar")
        .setLabel("Fechar")
        .setEmoji("<:erro:1508472500495974600>")
        .setStyle(ButtonStyle.Danger)
    );

    await thread.send({
      content: config.staffRole ? `<@&${config.staffRole}>` : null,
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `✅ ${thread}`,
      ephemeral: true
    });
  }

  // atender
  if (customId === "atender") {

    if (!member.roles.cache.has(config.staffRole))
      return interaction.reply({
        content: "❌ Apenas staff",
        ephemeral: true
      });

    return interaction.reply({
      content: `🛠 ${user} assumiu o ticket`
    });
  }

  // fechar
  if (customId === "fechar") {

    if (!member.roles.cache.has(config.staffRole))
      return interaction.reply({
        content: "❌ Apenas staff",
        ephemeral: true
      });

    tickets.delete(user.id);

    await interaction.reply("🔒 Fechando...");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
});

client.login(process.env.DISCORD_TOKEN);
