const { ButtonBuilder, ButtonStyle } = require('discord.js');
const { ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('./componentBuilders');

// Helper to replace variables in text
const replaceVariables = (text, user, guild, channel) => {
    if (!text) return text;
    const now = new Date();
    return text
        .replace(/\{user\}/gi, user?.toString() || '')
        .replace(/\{user\.mention\}/gi, user?.toString() || '')
        .replace(/\{user\.name\}/gi, user?.username || '')
        .replace(/\{user\.username\}/gi, user?.username || '')
        .replace(/\{user\.tag\}/gi, user?.tag || '')
        .replace(/\{user\.id\}/gi, user?.id || '')
        .replace(/\{user\.avatar\}/gi, user?.displayAvatarURL({ dynamic: true }) || '')
        .replace(/\{guild\.name\}/gi, guild?.name || '')
        .replace(/\{guild\.icon\}/gi, guild?.iconURL({ dynamic: true }) || '')
        .replace(/\{guild\.membercount\}/gi, guild?.memberCount?.toString() || '')
        .replace(/\{guild\.id\}/gi, guild?.id || '')
        .replace(/\{channel\}/gi, channel?.toString() || '')
        .replace(/\{channel\.name\}/gi, channel?.name || '')
        .replace(/\{channel\.id\}/gi, channel?.id || '')
        .replace(/\{timestamp\}/gi, `<t:${Math.floor(now.getTime() / 1000)}>`)
        .replace(/\{timestamp\.relative\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:R>`)
        .replace(/\{timestamp\.date\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:D>`)
        .replace(/\{timestamp\.time\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:T>`)
        .replace(/\{timestamp\.full\}/gi, `<t:${Math.floor(now.getTime() / 1000)}:F>`);
};

// Parse {key: value} string format into object
const parseEmbedCode = (code, context = {}) => {
    const embedData = {
        content: null,
        title: null,
        description: null,
        color: null,
        thumbnail: null,
        image: null,
        author: null,
        footer: null,
        fields: [],
        timestamp: false,
        url: null
    };

    if (!code) return embedData;

    // Split by $v separator used in old system, or just parse loose brackets
    const parts = code.includes('$v') ? code.split(/\$v/gi) : [code];

    // Better regex to match all {key: value} occurrences globally
    const matches = code.match(/\{(\w+):\s*(.*?)\}(?=\s*\{|\s*$)/gs) || [];

    // If no matches found with the global regex, try the original split method as fallback
    let itemsToProcess = matches.length > 0 ? matches : parts;

    for (const part of itemsToProcess) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        const match = trimmed.match(/^\{(\w+):\s*(.+)\}$/s);
        if (!match) {
            if (trimmed.match(/^\{timestamp\}$/i)) {
                embedData.timestamp = true;
            }
            continue;
        }

        const param = match[1].toLowerCase();
        let value = match[2].trim();

        // Recursively replace variables if context is provided
        if (context.user) {
            value = replaceVariables(value, context.user, context.guild, context.channel);
        }

        switch (param) {
            case 'content':
            case 'message':
            case 'msg':
                embedData.content = value;
                break;
            case 'title':
                embedData.title = value;
                break;
            case 'description':
            case 'desc':
                embedData.description = value;
                break;
            case 'color':
            case 'colour':
                embedData.color = value.startsWith('#') ? parseInt(value.slice(1), 16) : parseInt(value, 16);
                break;
            case 'thumbnail':
            case 'thumb':
                embedData.thumbnail = value;
                break;
            case 'image':
            case 'img':
                embedData.image = value;
                break;
            case 'url':
                embedData.url = value;
                break;
            case 'author':
                const authorParts = value.split('&&').map(p => p.trim());
                embedData.author = {
                    name: authorParts[0] || null,
                    iconURL: authorParts[1] || null,
                    url: authorParts[2] || null
                };
                break;
            case 'footer':
                const footerParts = value.split('&&').map(p => p.trim());
                embedData.footer = {
                    text: footerParts[0] || null,
                    iconURL: footerParts[1] || null
                };
                break;
            case 'field':
                const fieldParts = value.split('&&').map(p => p.trim());
                if (fieldParts[0] && fieldParts[1]) {
                    embedData.fields.push({
                        name: fieldParts[0],
                        value: fieldParts[1],
                        inline: fieldParts[2]?.toLowerCase() === 'true' || fieldParts[2]?.toLowerCase() === 'inline'
                    });
                }
                break;
            case 'timestamp':
                embedData.timestamp = true;
                break;
        }
    }

    return embedData;
};

// Generate {key: value} string from object
const generateEmbedCode = (data) => {
    const parts = [];

    if (data.content) parts.push(`{content: ${data.content}}`);
    if (data.title) parts.push(`{title: ${data.title}}`);
    if (data.description) parts.push(`{description: ${data.description}}`);
    if (data.color) parts.push(`{color: #${data.color.toString(16).padStart(6, '0')}}`);
    if (data.url) parts.push(`{url: ${data.url}}`);
    if (data.thumbnail) parts.push(`{thumbnail: ${data.thumbnail}}`);
    if (data.image) parts.push(`{image: ${data.image}}`);
    if (data.author?.name) {
        let authorStr = data.author.name;
        if (data.author.iconURL) authorStr += ` && ${data.author.iconURL}`;
        if (data.author.url) authorStr += ` && ${data.author.url}`;
        parts.push(`{author: ${authorStr}}`);
    }
    if (data.footer?.text) {
        let footerStr = data.footer.text;
        if (data.footer.iconURL) footerStr += ` && ${data.footer.iconURL}`;
        parts.push(`{footer: ${footerStr}}`);
    }
    if (data.fields?.length > 0) {
        for (const field of data.fields) {
            parts.push(`{field: ${field.name} && ${field.value}${field.inline ? ' && inline' : ''}}`);
        }
    }
    if (data.timestamp) parts.push(`{timestamp}`);

    return parts.join('$v');
};

// Build the UI for the Interactive Builder (Slash Command / Button interaction)
const buildEmbedBuilderUI = (userId, embedData = {}) => {
    const container = new ContainerBuilder();

    // Header
    container.addTextDisplayComponents(td => td.setContent(`# 📝 Embed Builder\nCustomize your message using the buttons below.`));
    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    // Live Preview Section
    let previewText = '**__Live Preview:__**\n\n';
    if (embedData.title) previewText += `## ${embedData.title}\n`;
    if (embedData.description) previewText += `${embedData.description}\n`;
    if (embedData.fields?.length > 0) {
        previewText += '\n';
        embedData.fields.forEach(f => {
            previewText += `**${f.name}**\n${f.value}\n`;
        });
    }

    // Metadata Preview
    let metaText = '';
    if (embedData.author?.name) metaText += `👤 Author: ${embedData.author.name}\n`;
    if (embedData.footer?.text) metaText += `🦶 Footer: ${embedData.footer.text}\n`;
    if (embedData.color) metaText += `🎨 Color: #${embedData.color.toString(16).padStart(6, '0')}\n`;
    if (embedData.image) metaText += `🖼️ Image Set\n`;
    if (embedData.thumbnail) metaText += `🖼️ Thumbnail Set\n`;
    if (embedData.timestamp) metaText += `⏰ Timestamp: ON\n`;

    if (metaText) previewText += `\n**Metadata:**\n${metaText}`;
    if (!embedData.title && !embedData.description && !metaText) previewText += '*No content set yet.*';

    // Use addSectionComponents with callback, which wraps text in a SectionBuilder logic (adds to description)
    container.addSectionComponents(section => {
        section.addTextDisplayComponents(td => td.setContent(previewText));
        // SectionBuilder in componentBuilders.js does NOT support setAccentColor
        // It DOES support setThumbnailAccessory
    });

    // ContainerBuilder supports setAccentColor (sets embed color)
    if (embedData.color) {
        container.setAccentColor(embedData.color);
    }

    container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));

    // Controls
    container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`embed_title_${userId}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_desc_${userId}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_color_${userId}`).setLabel('Color').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_url_${userId}`).setLabel('URL').setStyle(ButtonStyle.Secondary)
    ));

    container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`embed_author_${userId}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_footer_${userId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_thumb_${userId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_image_${userId}`).setLabel('Image').setStyle(ButtonStyle.Secondary)
    ));

    container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`embed_field_${userId}`).setLabel('Add Field').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_timestamp_${userId}`).setLabel('Timestamp').setStyle(embedData.timestamp ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`embed_clear_${userId}`).setLabel('Clear All').setStyle(ButtonStyle.Danger)
    ));

    container.addActionRowComponents(row => row.addComponents(
        new ButtonBuilder().setCustomId(`embed_preview_${userId}`).setLabel('Full Preview').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`embed_send_${userId}`).setLabel('Send Message').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`embed_code_${userId}`).setLabel('Get Code').setStyle(ButtonStyle.Secondary)
    ));

    // Footer
    container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** • Premium Plugins Under $5`));

    return container;
};

// Convert draft data to simple "Components v2" payload for sending to a channel
const buildFinalMessage = (data) => {
    if (!data.title && !data.description && !data.fields?.length && !data.image && !data.thumbnail && data.content) {
        return { content: data.content };
    }

    const container = new ContainerBuilder();

    if (data.color) container.setAccentColor(data.color);

    container.addSectionComponents(section => {
        // Author
        if (data.author?.name) {
            let authorText = `**${data.author.name}**`;
            if (data.author.url) authorText = `[${data.author.name}](${data.author.url})`;
            section.addTextDisplayComponents(td => td.setContent(authorText));
        }

        // Title
        if (data.title) {
            let titleText = `## ${data.title}`;
            if (data.url) titleText = `## [${data.title}](${data.url})`;
            section.addTextDisplayComponents(td => td.setContent(titleText));
        }

        // Description
        if (data.description) {
            section.addTextDisplayComponents(td => td.setContent(data.description));
        }

        // Fields
        if (data.fields?.length > 0) {
            let fieldsText = '';
            data.fields.forEach(f => {
                fieldsText += `**${f.name}**\n${f.value}\n\n`;
            });
            section.addTextDisplayComponents(td => td.setContent(fieldsText));
        }

        // Thumbnail
        if (data.thumbnail) {
            section.setThumbnailAccessory(t => t.setURL(data.thumbnail));
        }
    });

    let footerText = '';
    if (data.footer?.text) footerText += `${data.footer.text}`;
    if (data.timestamp) footerText += ` • ${new Date().toLocaleString()}`;

    if (footerText) {
        if (data.title || data.description) {
            container.addSeparatorComponents(sep => sep.setSpacing(SeparatorSpacingSize.Small));
        }
        container.addTextDisplayComponents(td => td.setContent(`-# ${footerText}`));
    }

    if (data.image) {
        container.addTextDisplayComponents(td => td.setContent(`[Image](${data.image})`));
    }

    container.addTextDisplayComponents(td => td.setContent(`**UnderFive Studios** • Premium Plugins Under $5`));

    // The polyfill toJSON returns { embeds: [...], components: [...] }
    const result = container.toJSON();

    // Create the final payload (flattening the toJSON result into the root of the reply options)
    const payload = {
        embeds: result.embeds,
        components: result.components
    };

    if (data.content) payload.content = data.content;

    return payload;
};

module.exports = {
    replaceVariables,
    parseEmbedCode,
    generateEmbedCode,
    buildEmbedBuilderUI,
    buildFinalMessage
};
