async function searchSiteOptions(page, siteName, sites, url) {
    let site = sites[siteName];

    let dataObj = {
        url: url,
        transcript: null
    };

    // Get title
    dataObj.title = await page.evaluate(() => {
        return document.querySelector("title")?.textContent.trim();
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
        dataObj.related = await getRelatedVideos(page, site.otherVideos);
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

                    await page.goto(link, { waitUntil: "networkidle2", timeout: 5000 })
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

async function getRelatedVideos(page, otherVideos) {
    let relatedVideoSelector = otherVideos?.selector;
    let relatedVideoTitle = otherVideos?.title;
    let relatedVideoPreview = otherVideos?.preview;
    return page.evaluate((selector) => {
        return [...document.querySelectorAll(selector)].map(v => {
            return v.id || '';
        });
    }, relatedVideoSelector)
        .then(async ids => {
            let relatedVidsResults = [];

            let len = ids.length <= 14 ? ids.length : 14;

            for (let i = 0; i < len; i++) {
                if (ids[i]) {
                    await page.hover(`#${ids[i]}`)
                        .catch(e => console.error("Couldn't find the related video selector of index:" + i));
                }
                else {
                    await page.hover(`${relatedVideoSelector}:nth-of-type(${i + 1})`)
                        .catch(e => console.error("Couldn't find the related video selector of index:" + i));
                }

                let res = await page.evaluate((selector, titleSel, previewSel, idx) => {
                    let r = [...document.querySelectorAll(selector)][idx];

                    let link = r.querySelector("a")?.href;
                    let image = r.querySelector("img")?.src;
                    // If there is a preview selector, set the video to that, otherwise look for a video tag
                    let video = null;
                    if (previewSel) {
                        video = r.querySelector(previewSel)?.src ? r.querySelector(previewSel)?.src : r.querySelector(`${previewSel} source`)?.src;
                    }
                    else {
                        video = r.querySelector("video")?.src ? r.querySelector("video")?.src : r.querySelector("video source")?.src;
                    }
                    // Set the title, if there is no title selector, set the title to the longest text content of all the a tags
                    let title = '';
                    if (titleSel) {
                        title = r.querySelector(titleSel)?.textContent?.trim();
                    }
                    else {
                        let longest = '';
                        [...r.querySelectorAll("a")].map(a => {
                            let text = a?.textContent?.trim();
                            if (text.length > longest.length) longest = text;
                        })
                        title = longest;
                    }

                    return {
                        link: link,
                        image: image,
                        video: video,
                        title: title
                    };
                }, relatedVideoSelector, relatedVideoTitle, relatedVideoPreview, i)

                relatedVidsResults.push(res);
            }
            return relatedVidsResults;
        })
        .catch(e => {
            console.error(e);
            return [];
        })
}

module.exports = { searchSiteOptions }