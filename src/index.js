require("dotenv").config();
const { Client, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField } = require("discord.js");
const { createTranscript } = require('discord-html-transcripts')
const fs = require('fs');
const client = new Client({ intents: 3276799 });

const notificationChannelId = ''; //Canal de Logs

const generalCategoryId = ''; //Cateroría de las tickets de general
const mediaCategoryId = ''; //Categoría de las ticket de media
const buycraftCategoryId = ''; //Categoría de las tickets de buycraft

const supportRoleId = ''; //ID del rol de soporte o staff

const openTickets = new Map();
const claimedTickets = new Map();

client.on('ready', async () => {
    console.log(`Listo como: ${client.user.tag}`);
});

const ticket = new EmbedBuilder()
    .setAuthor({ name: 'Support Panel', iconURL: `linkLogo` })
    .setDescription('**Press the button below this message depending on what you need help to contact the Name Support Team.**\n `Please express you question or report directly on your ticket instead of saying -help- or -I need help- (we assume you help by contacting us).` \n\n __**Ticket information**__\n`•`\n`•`')
    .setImage('LinkBanner')
    .setFooter({ text: 'name Network | IP', iconURL: 'linklogo' });

const ticket_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('general')
            .setLabel('General Support')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('media')
            .setLabel('Media Apply')
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId('buycraft')
            .setLabel('Buycraft Support')
            .setStyle(ButtonStyle.Success),
    );

client.on('messageCreate', async message => {
    if (message.content === "!panel") {
        message.channel.send({ embeds: [ticket], components: [ticket_buttons] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const guild = interaction.guild;
    const member = interaction.member;

    if (['general', 'media', 'buycraft'].includes(interaction.customId)) {
        let categoryId = '';
        let channelName = '';

        if (openTickets.has(member.id)) {
            await interaction.reply({ content: 'Ya tienes un ticket abierto. Cierra tu ticket anterior antes de abrir otro.', ephemeral: true });
            return;
        }

        switch (interaction.customId) {
            case 'general':
                categoryId = generalCategoryId;
                channelName = `general-${member.user.username}`;
                break;
            case 'media':
                categoryId = mediaCategoryId;
                channelName = `media-${member.user.username}`;
                break;
            case 'buycraft':
                categoryId = buycraftCategoryId;
                channelName = `buycraft-${member.user.username}`;
                break;
            default:
                await interaction.reply({ content: 'Unknown action.', ephemeral: true });
                return;
        }

        const channel = await guild.channels.create({
            name: channelName,
            type: 0,
            parent: categoryId,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: supportRoleId,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        openTickets.set(member.id, channel.id);
        
    const notificationChannel = guild.channels.cache.get(notificationChannelId);

    const openEmbed = new EmbedBuilder()
        .setTitle('Ticket Abierto')
        .addFields(
            { name: 'Nombre del Ticket', value: channel.name, inline: true },
            { name: 'Creado por', value: `${member}`, inline: true },
            { name: 'Opened Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: 'Ticket Type', value: `${interaction.customId}`, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'name Network | ip', iconURL: 'linklogo' });

    if (notificationChannel) {
        await notificationChannel.send({ embeds: [openEmbed] });
    } else {
        console.error('Canal de notificación no encontrado.');
    }

        await interaction.reply({ content: `Ticket creado: ${channel}`, ephemeral: true });

        const creationDate = `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`;

        const ticket_embed = new EmbedBuilder()
            .setAuthor({ name: 'name PvP | Tickets', iconURL: 'linklogo' })
            .setDescription(`Thank you for contacting the support team, wait patiently for a staff to assist you, remember do not ping staff members! \n\n 🕛 | Creation Date:\n ${creationDate} \n\n 📒 | Reason: \n**${interaction.customId.replace('support_', '')}** \n\nIf you do not reply to a ticket in under 24 hours, your ticket may be closed!`)
            .setImage('linkbanner')
            .setFooter({ text: 'name Network | ip', iconURL: 'linklogo' });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Cerrar Ticket')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Reclamar Ticket')
                    .setStyle(ButtonStyle.Primary)
            );


        await channel.send({
            embeds: [ticket_embed],
            components: [buttons],
            content: `${member} | <@&${supportRoleId}>`,
        });
    }

    if (interaction.customId === 'claim_ticket') {
        const channel = interaction.channel;

        if (claimedTickets.has(channel.id)) {
            const claimingMember = claimedTickets.get(channel.id);
            await interaction.reply({ content: `Este ticket ya ha sido reclamado por ${claimingMember}.`, ephemeral: true });
            return;
        }

        const claimingMember = interaction.member;

        const ownerId = [...openTickets.entries()].find(([userId, channelId]) => channelId === channel.id)?.[0];

        if (!ownerId) {
            await interaction.reply({ content: 'Error al reclamar el ticket. No se pudo encontrar el creador del ticket.', ephemeral: true });
            return;
        }

        claimedTickets.set(channel.id, claimingMember.user.username);

        await channel.permissionOverwrites.set([
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
                id: claimingMember.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
            {
                id: ownerId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            }
        ]);

        const newChannelName = `claimed-${claimingMember.user.username}`;
        await channel.setName(newChannelName);

        const notificationChannel = guild.channels.cache.get(notificationChannelId);

        if (notificationChannel) {
            await notificationChannel.send(`El ticket en ${channel} ha sido reclamado por ${claimingMember}.`);
        } else {
            console.error('Canal de notificación no encontrado.');
        }

        await interaction.reply({ content: `Has reclamado el ticket: **${newChannelName}**. Ahora solo tú y el creador pueden verlo.`, ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
        const member = interaction.member;
        const channel = interaction.channel;

        if (!member.roles.cache.has(supportRoleId)) {
            await interaction.reply({ content: 'No tienes permisos para cerrar este ticket.', ephemeral: true });
            return;
        }

        const transcriptBuffer = await createTranscript(channel, {
            limit: -1,
            returnType: 'buffer',
        });

        const transcriptFilePath = `transcript-${channel.name}.html`;
        fs.writeFileSync(transcriptFilePath, transcriptBuffer);

        const notificationChannel = guild.channels.cache.get(notificationChannelId);

        const closeEmbed = new EmbedBuilder()
            .setTitle('Ticket Cerrado')
            .addFields(
                { name: 'Nombre del Ticket', value: channel.name, inline: true },
                { name: 'Autor del Ticket', value: `${member}`, inline: true },
                { name: 'Cerrado por', value: `${interaction.user}`, inline: true },
                { name: 'Fecha de Apertura', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`, inline: true },
                { name: 'Fecha de Cierre', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'name Network | ip', iconURL: 'linklogo' });

        if (notificationChannel) {
            try {
                await notificationChannel.send({ embeds: [closeEmbed], files: [transcriptFilePath] });
            } catch (error) {
                console.error('Error al enviar el mensaje al canal de notificaciones:', error);
            }
        } else {
            console.error('Canal de notificación no encontrado.');
        }

        await channel.delete();

        const ownerId = [...openTickets.entries()].find(([userId, channelId]) => channelId === channel.id)?.[0];
        if (ownerId) {
            openTickets.delete(ownerId);
        }

        fs.unlink(transcriptFilePath, (err) => {
            if (err) {
                console.error('Error al borrar el archivo de transcripción:', err);
            }
        });
    }
});

client.login(process.env.TOKEN);