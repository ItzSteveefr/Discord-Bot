const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config.json');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Komut yüklendi: ${command.data.name}`);
    }
}

const rest = new REST().setToken(config.token);

(async () => {
    try {
        console.log(`\n🔄 ${commands.length} slash komut kaydediliyor...`);

        // Guild-specific commands (daha hızlı güncelleme)
        if (config.guildId && config.guildId !== "GUILD_ID_BURAYA") {
            const data = await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands }
            );
            console.log(`✅ ${data.length} komut başarıyla kaydedildi (Guild: ${config.guildId})`);
        } else {
            // Global commands
            const data = await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );
            console.log(`✅ ${data.length} komut başarıyla kaydedildi (Global)`);
        }

    } catch (error) {
        console.error('❌ Komut kayıt hatası:', error);
    }
})();
