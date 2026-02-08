module.exports = {
    flags: 32768, // IS_COMPONENTS_V2 flag
    components: [
        // Welcome Container
        {
            type: 17, // Container
            components: [
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10, // Text Display
                            content: "## <:speaway:1402687758203490456> Welcome to Speaway!\n\nOver **10 years of expertise**, **100+ custom servers**, and **2,000+ delivered orders** we turn ambitious ideas into reliable, high-performing game servers. Partnered with **top content creators**, we know what it takes to make your server stand out.\n\nThanks to our **fully automated infrastructure**, we manage all processes, from support requests to licensing, with **minimal delay** and **maximum efficiency**."
                        }
                    ],
                    accessory: {
                        type: 2, // Button
                        label: "Visit",
                        style: 5, // Link style
                        url: "https://speaway.com"
                    }
                }
            ]
        },

        // Custom Orders Container
        {
            type: 17, // Container
            components: [
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10, // Text Display
                            content: "## <:link1:1402694708240715897> Custom Orders & Pricing\n\nRegister on our website and submit your request via the support system.\nYou'll receive a **personalized quote** shortly review and proceed when ready."
                        }
                    ],
                    accessory: {
                        type: 2, // Button
                        label: "Get a quote",
                        style: 5, // Link style
                        url: "https://speaway.com"
                    }
                }
            ]
        },

        // Trusted by Creators Container
        {
            type: 17, // Container
            components: [
                {
                    type: 10, // Text Display
                    content: "## <:magicwand:1402694783163433061> Trusted by Creators Worldwide\n\nEach product is **carefully crafted**, **regularly updated**, and **optimized** to meet the needs of your server. Whether you're starting fresh or scaling an existing project, the right solutions are just **one click away.** \n⠀"
                },
                {
                    type: 1, // Action Row
                    components: [
                        {
                            type: 2, // Button
                            label: "Polymart",
                            style: 5, // Link
                            url: "https://polymart.org/user/50210/speaway",
                            emoji: { name: "polymart", id: "1402687240743813161" }
                        },
                        {
                            type: 2, // Button
                            label: "BuiltByBit",
                            style: 5, // Link
                            url: "https://builtbybit.com/creators/speaway.549627",
                            emoji: { name: "bbb", id: "1402687185743904789" }
                        },
                        {
                            type: 2, // Button
                            label: "MCModels",
                            style: 5, // Link
                            url: "https://mcmodels.net/",
                            emoji: { name: "mcm", id: "1402687283307610144" }
                        }
                    ]
                },
                {
                    type: 14, // Separator
                    divider: true,
                    spacing: 1
                },
                {
                    type: 10, // Text Display
                    content: "## <:nomoney:1402749017896653021> Free Product Access\n\nExplore our Lite version and free products on Modrinth — perfect for getting started or expanding your server with optimized and regularly updated content."
                },
                {
                    type: 1, // Action Row
                    components: [
                        {
                            type: 2, // Button
                            label: "Modrinth",
                            style: 5, // Link
                            url: "https://modrinth.com/user/Speaway",
                            emoji: { name: "modrinth", id: "1402748058248282132" }
                        }
                    ]
                }
            ]
        },

        // Support Container
        {
            type: 17, // Container
            components: [
                {
                    type: 9, // Section
                    components: [
                        {
                            type: 10, // Text Display
                            content: "<:experiment:1402694745800708268> Having trouble? **Get quick support!**"
                        }
                    ],
                    accessory: {
                        type: 2, // Button
                        custom_id: "redirect_support",
                        label: "Create a ticket",
                        style: 2 // Secondary style
                    }
                }
            ]
        }
    ]
};
