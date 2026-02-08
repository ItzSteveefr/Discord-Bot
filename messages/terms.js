module.exports = {
    flags: 32768, // IS_COMPONENTS_V2 flag
    components: [
        // Header Container
        {
            type: 17, // Container
            components: [
                {
                    type: 12, // Media Gallery
                    items: [
                        {
                            media: {
                                url: "https://media.discordapp.net/attachments/1384633697319256186/1402294086660001985/Group_2.png?ex=6894b523&is=689363a3&hm=9f0aabb10425ffe3b76562f62ee54ac5e7826c5da65af24e2cbb5dd1546f7e62&=&format=webp&quality=lossless&width=1872&height=410"
                            }
                        }
                    ]
                },
                {
                    type: 10, // Text Display
                    content: "## 📜 Let’s Set the Ground Rules\n\nWelcome! To ensure a safe and enjoyable experience for everyone, please take a moment to review and accept our terms of service and community guidelines before participating."
                }
            ]
        },

        // Discord Server Rules Container
        {
            type: 17, // Container
            components: [
                {
                    type: 10, // Text Display
                    content: "## <:lock:1402727401867186327> Discord Server Rules\n\n🞍 Be respectful — hate speech or harassment is not allowed.\n🞍 No spamming — avoid excessive messages, emojis, or caps.\n🞍 No advertising or self-promotion without permission.\n🞍 NSFW or offensive content is strictly prohibited.\n🞍 Don't share personal information without consent.\n🞍 Follow all instructions from moderators and staff.\n🞍 Use channels for their intended purpose; read pinned messages."
                }
            ]
        },

        // Attention Container
        {
            type: 17, // Container
            components: [
                {
                    type: 10, // Text Display
                    content: "## ⚠️ Terms Enforcement Policy\n\nBy participating in this Discord server—especially as a Speaway customer or a user registered in our systems—you are automatically bound by all applicable terms, policies, and community standards.\n\nAny breach may lead to account suspension, license revocation, or legal proceedings, depending on the nature and severity of the violation."
                }
            ]
        },

        // Accept Terms Container
        {
            type: 17, // Container
            components: [
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10, // Text Display
                            content: "By clicking **Accept Terms**, you confirm that you have **read**, **understood**, and **agree** to comply with all the above terms, rules, and policies. \n⠀"
                        }
                    ],
                    accessory: {
                        type: 2, // Button
                        custom_id: "accept_terms",
                        label: "Accept Terms",
                        style: 3 // Success style (green)
                    }
                },
                {
                    type: 1, // Action Row
                    components: [
                        {
                            type: 2, // Button
                            label: "SSLA",
                            style: 5, // Link
                            url: "https://speaway.com/ssla"
                        },
                        {
                            type: 2, // Button
                            label: "Privacy Policy",
                            style: 5, // Link
                            url: "https://speaway.com/privacy"
                        },
                        {
                            type: 2, // Button
                            label: "Return Policy",
                            style: 5, // Link
                            url: "https://speaway.com/returns"
                        },
                        {
                            type: 2, // Button
                            label: "DMCA",
                            style: 5, // Link
                            url: "https://speaway.com/dmca"
                        }
                    ]
                }
            ]
        }
    ]
};
