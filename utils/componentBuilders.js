/**
 * Component Builders V2 Polyfill -> Standard Embeds Adapter
 * Adapts the usage of "ContainerBuilder" to standard Discord Embeds and ActionRows
 * to ensure compatibility with the current Discord API.
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const MessageFlags = {
    Ephemeral: 1 << 6
};
const ButtonStyle = {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5
};
const SeparatorSpacingSize = {
    Small: 0,
    Medium: 1,
    Large: 2
};
class TextDisplayBuilder {
    constructor() {
        this.content = '';
    }
    setContent(content) {
        this.content = content;
        return this;
    }
    toJSON() {
        return { content: this.content };
    }
}
class SectionBuilder {
    constructor() {
        this.text = '';
        this.accessory = null;
    }
    addTextDisplayComponents(input) {
        if (typeof input === 'function') {
            const builder = new TextDisplayBuilder();
            input(builder);
            this.text += builder.content + '\n';
        } else {
            this.text += input.content + '\n';
        }
        return this;
    }
    setThumbnailAccessory(input) {
        if (typeof input === 'function') {
            const builder = { url: '', setURL(u) { this.url = u; return this; } };
            input(builder);
            this.accessory = builder.url;
        }
        return this;
    }
    setAccessory(accessory) {
        if (accessory && accessory.url) this.accessory = accessory.url;
        return this;
    }
    toJSON() {
        return { text: this.text, accessory: this.accessory };
    }
}
class SeparatorBuilder {
    constructor() {
        this.spacing = 0;
    }
    setSpacing(size) {
        this.spacing = size;
        return this;
    }
    toJSON() {
        return { spacing: this.spacing };
    }
}
class MediaGalleryBuilder {
    constructor() {
        this.images = [];
    }
    addItems(input) {
        if (typeof input === 'function') {
            const builder = { url: '', setURL(u) { this.url = u; return this; } };
            input(builder);
            this.images.push(builder.url);
        }
        return this;
    }
    toJSON() {
        return { images: this.images };
    }
}
class ContainerBuilder {
    constructor() {
        this.embed = new EmbedBuilder();
        this.components = []; // ActionRows
        this.description = '';
    }
    setAccentColor(color) {
        this.embed.setColor(color);
        return this;
    }
    addTextDisplayComponents(input) {
        let content = '';
        if (typeof input === 'function') {
            const builder = new TextDisplayBuilder();
            input(builder);
            content = builder.content;
        } else {
            content = input.content;
        }
        if (this.description.length > 0) this.description += '\n';
        this.description += content;
        return this;
    }
    addSectionComponents(input) {
        if (typeof input === 'function') {
            const builder = new SectionBuilder();
            input(builder);
            if (builder.text) {
                if (this.description.length > 0) this.description += '\n';
                this.description += builder.text;
            }
            if (builder.accessory) {
                this.embed.setThumbnail(builder.accessory);
            }
        }
        return this;
    }
    addSeparatorComponents(input) {
        this.description += '\n';
        return this;
    }
    addMediaGalleryComponents(input) {
        let imageUrls = [];
        if (input instanceof MediaGalleryBuilder) {
            imageUrls = input.images;
        } else if (input && input.images) {
            imageUrls = input.images;
        }
        if (imageUrls.length > 0) {
            this.embed.setImage(imageUrls[0]);
        }
        return this;
    }
    addActionRowComponents(input) {
        let row;
        if (typeof input === 'function') {
            const builder = new ActionRowBuilder();
            input(builder);
            row = builder;
        } else {
            row = input;
        }
        this.components.push(row);
        return this;
    }
    toJSON() {
        if (this.description) {
            this.embed.setDescription(this.description);
        }
        return {
            embeds: [this.embed],
            components: this.components
        };
    }
}
module.exports = {
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    ButtonStyle,
    SeparatorSpacingSize
};
