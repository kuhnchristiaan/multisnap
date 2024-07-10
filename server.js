const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/screenshot', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.json({ success: false, message: 'URL is required' });
    }

    const DOMAIN = new URL(url).origin;

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        const visited = new Set();
        const toVisit = [DOMAIN];
        const screenshotPaths = [];

        while (toVisit.length > 0) {
            const currentUrl = toVisit.pop();
            if (visited.has(currentUrl)) continue;
            visited.add(currentUrl);

            try {
                await page.goto(currentUrl, { waitUntil: 'networkidle2' });

                const links = await page.evaluate(() => 
                    Array.from(document.querySelectorAll('a'))
                        .map(a => a.href)
                        .filter(link => !link.startsWith('mailto:') && !link.startsWith('#'))
                );

                links.forEach(link => {
                    const parsedUrl = new URL(link);
                    if (parsedUrl.hostname === new URL(DOMAIN).hostname) {
                        toVisit.push(link);
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 5000));

                const screenshotPath = path.join(__dirname, 'public', 'screenshots', `${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                screenshotPaths.push(screenshotPath);
                console.log(`Screenshot saved: ${screenshotPath}`);
            } catch (e) {
                console.error(`Failed to process ${currentUrl}: ${e}`);
            }
        }

        await browser.close();
        res.json({ success: true, paths: screenshotPaths });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
