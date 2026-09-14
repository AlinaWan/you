const { chromium } = require("playwright");
const path = require("path");

(async () => {
    const browser = await chromium.launch();

    for (const theme of ["light", "dark"]) {
        const page = await browser.newPage({
            viewport: {
                width: 760,
                height: 500
            },
            deviceScaleFactor: 2
        });

        await page.goto(
            `file://${path.resolve("readme/index.html")}`
        );

        await page.evaluate(theme => {
            document.body.dataset.theme = theme;
        }, theme);

        await page.evaluate(() => document.fonts.ready);

        await page.screenshot({
            path: `images/readme-${theme}.webp`,
            type: "webp",
            quality: 95,
            omitBackground: true
        });

        await page.close();
    }

    await browser.close();
})();
