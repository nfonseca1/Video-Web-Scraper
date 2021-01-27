async function searchSiteOptions(page, siteName, sites, url) {
    let site = sites[siteName];

    let dataObj = {
        url: url,
        transcript: null
    };

    // Get title
    dataObj.title = await page.evaluate(() => {
        return document.querySelector("title").textContent.trim();
    })
    // Get embed
    if (site.embedSelector) {
        dataObj.embed = await getVideoEmbed(page, site.embedSelector, site.embedProperty);
    }
    // Get thumbnail
    if (site.thumbnailSelector) {
        dataObj.thumbnail = await getVideoThumbnail(page, site.thumbnailSelector, site.thumbnailProperty, site.thumbnailStyle);
    } 
    // Get related videos
    if (site.otherVideos) {
        dataObj.related = await getRelatedVideos(page, site.otherVideos, site.otherVideosTitle);
    }

    // Get video source
    if (site.videoSelector) {
        // If there are steps involved, go through each first
        if (site.steps) {
            for (let step of site.steps) {
                if (step.action === "click") {
                    await page.click(step.selector)
                    .catch(e => {
                        console.error(e);
                    })
                }
                else if (step.action === "navigate") {
                    let link = await page.evaluate((selector) => {
                        let link = document.querySelector(selector)?.src;
                        if (!link) link = document.querySelector(selector)?.href;
                        return link;
                    }, step.selector)
                    .catch(e => {
                        console.error(e);
                    })

                    await page.goto(link, {waitUntil: "networkidle2", timeout: 5000})
                    .catch(e => {
                        console.error(e);
                    })
                }
                else if (step.action === "getThumbnail") {
                    dataObj.thumbnail = await getVideoThumbnail(page, site.thumbnailSelector, site.thumbnailProperty, site.thumbnailStyle);
                }
            }

            await new Promise(resolve => setTimeout(() => resolve(), site.postStepsDelay || 100));
        }
        // After all steps, just grab the video source directly
        dataObj.videoSrc = await page.evaluate((selector) => {
            return document.querySelector(selector)?.src;
        }, site.videoSelector)
        .catch(e => {
            console.error(e);
            return null;
        })
    }

    return dataObj;
}

async function getVideoEmbed(page, embedSelector, embedProperty) {
    return page.evaluate((selector, property) => {
        return document.querySelector(selector)[property];
    }, embedSelector, embedProperty)
    .catch(e => {
        console.error(e);
        return null;
    })
}

async function getVideoThumbnail(page, thumbnailSelector, thumbnailProperty, thumbnailStyle) {
    return page.evaluate((selector, property, style) => {
        let el = document.querySelector(selector);
        if (property === "style") {
            let url = el.style[style].split("url(")[1].split(")")[0];
            return url.slice(1, url.length - 1);
        }
        else {
            return el[property];
        }
    }, thumbnailSelector, thumbnailProperty, thumbnailStyle)
    .catch(e => {
        console.error(e);
        return null;
    })
}

async function getRelatedVideos(page, relatedVideoSelector, relatedVideoTitle) {
    return page.evaluate((selector, titleSelector) => {
        let relatedVids = [...document.querySelectorAll(selector)].map(r => {
            let link = r.querySelector("a")?.href;
            let image = r.querySelector("img")?.src;
            let title = titleSelector ? r.querySelector(titleSelector).textContent.trim() : null;
            return {link, image, title}
        })
        return relatedVids.slice(0, 12);
    }, relatedVideoSelector, relatedVideoTitle)
    .catch(e => {
        console.error(e);
        return [];
    })
}

module.exports = {searchSiteOptions}