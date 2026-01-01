import { siteConfig } from '../config';

export const useDiscordNotify = () => {
    const notify = async (title: string, message: string, type: 'view' | 'inquiry' = 'view') => {
        const webhookUrl = siteConfig.branding.discordWebhookUrl;
        if (!webhookUrl) return;

        const color = type === 'view' ? 0x3b82f6 : 0xdc2626; // Blue for view, Red for inquiry
        const embed = {
            title: title,
            description: message,
            color: color,
            timestamp: new Date().toISOString(),
            footer: {
                text: "FEZ Portfolio Bot",
                icon_url: siteConfig.branding.logoUrl
            },
            thumbnail: {
                url: siteConfig.branding.profilePicUrl
            }
        };

        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [embed],
                    username: "Fuad Editing Zone",
                    avatar_url: siteConfig.branding.logoUrl
                })
            });
        } catch (error) {
            console.warn("Discord Webhook failed (CORS or Invalid URL)");
        }
    };

    return { notify };
};