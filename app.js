// Dependencies
const fs = require("fs");
const fetch = require("isomorphic-fetch");
const puppeteer = require("puppeteer");
const express = require("express");
const app = express();
const session = require('express-session');
require("dotenv").config();
const redis = require("redis");
const redisClient = redis.createClient(process.env.REDIS_URL || `redis://localhost:6379`);
const RedisStore = require("connect-redis")(session);

// Express setup
app.use(express.static(__dirname + "/dist/"))
app.set('views', __dirname + "/dist/");
app.engine('html', require('ejs').__express);
app.use(express.json());
app.use(express.urlencoded());
//app.use(express.static(__dirname));
app.use(session({
    secret: "Shh, its a secret!",
    store: new RedisStore({client: redisClient}),
    saveUninitialized: false,
    resave: false
}));

// Bull for jobs
const BullQueue = require("bull");
const scraperQueue = new BullQueue("scraping", process.env.REDIS_URL || 'redis://localhost:6379');

// Routes
app.get("/", async (req, res) => {
    req.session.data = [];
    res.render("public/index.html");
})

app.post("/", async (req, res) => {
    let keywords = req.body.keyword.split("; ");
    for (let keyword of keywords) {
        let website = req.body.website?.trim() || '';
        // Parse website input
        if (website) {
            website = website.includes('://') ? website.split("://")[1] : website;
            website = website.includes('www.') ? website.split("www.")[1] : website;
            let parts = website.split(".");
            if (parts.length === 1) website += '.com';
            website = website.includes("/") ? website.split("/")[0] : website;
        }
        // Assemble Search Input Data
        let input = {
            searchPhrase: keyword,
            website: website,
            count: parseInt(req.body.count) || 10,
            minLength: parseFloat(req.body.minLength) || 60
        }

        let id = await scraperQueue.add({...input, sessionId: req.sessionID})
        .then(job => {
            req.session.data.push({
                id: job.id,
                progress: 0,
                searchData: input,
                links: [],
                results: [],
                resultsLastIndex: null
            })
            req.session.save();
            return job.id;
        })
        res.send({id});
    }
})

app.get("/status", (req, res) => {
    console.log('data for id: ', req.query.id);
    let id = req.query.id;

    let matchingResultIndex = null;
    let jobData = req.session.data.find((d, i) => {
        matchingResultIndex = i;
        return d.id === id
    });

    let newResults = jobData.results.slice((jobData.resultsLastIndex ?? -1) + 1);
    req.session.data[matchingResultIndex].resultsLastIndex = jobData.results.length - 1;
    req.session.save();

    res.send({results: newResults, progress: jobData.progress});
})

app.post("/cancel", (req, res) => {
    let jobId = req.body.id;

    scraperQueue.getJob(jobId.toString())
    .then(job => {
        job.moveToCompleted();
    })

    let matchingResultIndex = null;
    let jobData = req.session.data.find((d, i) => {
        matchingResultIndex = i;
        return d.id === jobId
    });

    let newResults = jobData.results.slice((jobData.resultsLastIndex ?? -1) + 1);
    req.session.data[matchingResultIndex].progress = 100;
    req.session.save();
    res.send({results: newResults, progress: 100});
})

// Scrape job process
scraperQueue.on('completed', (job, result) => {
    getRedisSessionData(job.data.sessionId)
    .then(sess => {
        let index = getSessionJobIndex(job.id, sess.data);
        sess.data[index].progress = 100;
        return setRedisSessionData(job.data.sessionData, sess);
    })
    .then(() => job.remove());
})
scraperQueue.on('progress', (job, progress) => {
    getRedisSessionData(job.data.sessionId)
    .then(sess => {
        let index = getSessionJobIndex(job.id, sess.data);
        sess.data[index].progress = progress;
        setRedisSessionData(job.data.sessionId, sess);
    })
})
scraperQueue.on('failed', (job, err) => {
    console.error("Job Failed: ", err);
    job.remove();
})

scraperQueue.process(async (job) => {
    return getVideoResults(job);
})

async function getVideoResults(job) {
    // Open puppeteer and search google videos for keyword
    let url = `https://www.google.com/search?q=${job.data.searchPhrase}&source=lnms&tbm=vid&num=${job.data.count}&as_sitesearch=${job.data.website}`;

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = await browser.newPage();
    await page.goto(url, {waitUntil: "networkidle2"});

    // Get all result links and set in session
    await page.waitForSelector("#rso", {timeout: 15000})
    .catch(e => console.error(e));
    let links = await page.evaluate(() => {
        let a = [...document.querySelectorAll(".g a")]; // Selector
        let aFiltered = a.filter((link, i) => link.classList.length === 0 // Link tag must have no classes
            && link?.href.includes("google.com/") == false // Link tag url must not include google
            && link?.href != a[i - 1]?.href); // Link tag url must not be the same as the previous link tag's
        return aFiltered.map(a => a?.href); // After that filter, the links will be the link tags' hrefs
    });
    
    getRedisSessionData(job.data.sessionId)
    .then(sessData => {
        sessData.data[getSessionJobIndex(job.id, sessData.data)].links = links;
        setRedisSessionData(job.data.sessionId, sessData);
    })

    for (let link of links) {
        let completed = await checkJobCompletion(job, browser);
        if (completed) return;

        // Go to link in puppeteer
        await page.goto(link, {waitUntil: "networkidle2", timeout: 20000});

        let url = await page.evaluate(() => {
            return window.location.href;
        })

        if (url.includes("youtube.com/watch")) {
            let linkParams = url.split("?v=")[1];
            let videoId = linkParams.split("&")[0];

            let embed = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            let transcript = await getVideoTranscript(page)
            .catch(e => {
                console.error(e)
            });
            let title = await page.evaluate(() => {
                return document.querySelector("h1 .style-scope.ytd-video-primary-info-renderer").textContent;
            })

            // Check if video duration is greater than specified min duration
            let video = await getLargestVideo(page);
            if (video?.duration && video?.duration < job.data.minLength) continue;
            
            getRedisSessionData(job.data.sessionId)
            .then(sess => {
                sess.data[getSessionJobIndex(job.id, sess.data)].results.push({
                    videoSrc: null,
                    embed: embed,
                    url: url,
                    title: title,
                    transcript: transcript
                })
                setRedisSessionData(job.data.sessionId, sess);
            })
        }
        else { // If the link is not a youtube link

            let siteData = await searchSitesData(job, url, page);
            if (siteData) {
                // Check if video duration is greater than specified min duration
                let video = await getLargestVideo(page);
                if (video?.duration && video?.duration < job.data.minLength) continue;

                // Add data to session results
                getRedisSessionData(job.data.sessionId)
                .then(sess => {
                    sess.data[getSessionJobIndex(job.id, sess.data)].results.push(siteData);
                    setRedisSessionData(job.data.sessionId, sess);
                })
            }
            else { // Last resort strategy
                let title = await page.evaluate(() => {
                    return document.querySelector("title").textContent;
                })
                let dataObj = {
                    url: url,
                    title: title,
                    transcript: null
                }
                
                let iframe = await page.evaluate(() => {
                    let iframes = document.querySelectorAll("iframe");
                    let iframe = null;
                    let iframeWidth = 0;
                    // Find biggest youtube iframe (youtube embed)
                    for (let f of iframes) {
                        if (f.src.includes("youtube.com/") 
                            && f.getBoundingClientRect().width > iframeWidth) {
                                iframe = f.outerHTML;
                        }
                    }
                    return iframe;
                })
                .catch(e => {
                    console.error(e);
                })

                if (!iframe) {
                    // Search for largest video and get src
                    let vidData = await page.evaluate(() => {
                        let videos = document.querySelectorAll("video");
                        let videoSrc = null;
                        let mainVideo = null;
                        let videoHeight = 0;
                        for(let video of videos) {
                            let measurements = video.getBoundingClientRect();
                            if (measurements.width >= measurements.height
                                && measurements.height > videoHeight) {
                                let srcAtt = video?.querySelector("source")?.getAttribute("src") 
                                    || video?.getAttribute("src");
                                if (srcAtt) {
                                    videoSrc = srcAtt;
                                    mainVideo = video;
                                }
                            }
                        }
                        return {video: mainVideo, src: videoSrc};
                    })

                    // Check if video duration is greater than specified min duration
                    if (vidData?.video?.duration && vidData?.video?.duration < job.data.minLength) continue;

                    if (!vidData.src) continue;
                    dataObj.videoSrc = vidData.src;
                    dataObj.embed = null;
                }
                else {
                    dataObj.embed = iframe;
                    dataObj.videoSrc = null;
                }
                
                getRedisSessionData(job.data.sessionId)
                .then(sess => {
                    sess.data[getSessionJobIndex(job.id, sess.data)].results.push(dataObj);
                    setRedisSessionData(job.data.sessionId, sess);
                })
            }
        }
        completed = await checkJobCompletion(job, browser);
        if (completed) return;
        job.progress(Math.round(((links.indexOf(link) + 1) / links.length) * 10000) / 100);
    }

    browser.close();
}

async function getLargestVideo(page) {
    return await page.evaluate(() => {
        let videos = document.querySelectorAll("video");
        let mainVideo = null;
        let videoHeight = 0;
        for(let video of videos) {
            let measurements = video.getBoundingClientRect();
            if (measurements.width >= measurements.height
                && measurements.height > videoHeight) {
                mainVideo = video;
            }
        }
        return mainVideo;
    })
}

async function checkJobCompletion(job, browser) {
    // Check if job is still active
    return getRedisSessionData(job.data.sessionId)
    .then(sess => {
        if (sess.data[getSessionJobIndex(job.id, sess.data)].progress == 100) {
            browser.close();
            return true;
        }
        else return false;
    })
}

async function searchSitesData(job, url, page) {
    let sites = await fetch(process.env.SITEOPTIONSURL)
    .then(res => {
        return res.json()
    })
    .then(out => {
        return out;
    })
    // Perform search routines for additional sites based on specific selectors/data
    for (let site in sites) {
        if (url.includes(site)) {
            let dataObj = {
                url: url,
                transcript: null
            };

            // If certain buttons exist which require the video to be active, click them first
            if (sites[site].conBtn) await page.click(sites[site].conBtn);
            if (sites[site].startBtn) await page.click(sites[site].startBtn);

            // In case of advertisements, wait for skip button to be active and not blocked first
            if (sites[site].adBtn) {
                await page.waitForSelector(sites[site].adBtn, {hidden: true})
            }
            if (sites[site].adSkipBtn) {
                await page.waitForSelector(sites[site].adSkipBtn);
                await page.click(sites[site].adSkipBtn);
            }

            // If video source is directly available
            if (sites[site].videoSelector) {
                dataObj.videoSrc = await page.evaluate((sel) => {
                    let src = document.querySelector(sel)?.src;
                    let href = document.querySelector(sel)?.href;
                    return src || href;
                }, sites[site].videoSelector);
            }
            // If there is an m3u8 file reference available to retrieve and convert
            else if (sites[site].file?.m3u8Div) {
                let m3u8 = await page.evaluate((div) => {
                    return document.querySelector(div.selector)?.getAttribute(div.attribute);
                }, sites[site].file.m3u8Div);
                console.log("Conversion necessary for: " + m3u8);
                // TODO: Convert m3u8 to mp4
            }
            // If there is a network request to retrieve a video file
            else if (sites[site].file?.requestName) {
                await page.setRequestInterception(true);
                await page.reload();

                page.on("request", async (request) => {
                    if (request.url().endsWith(sites[site].file.requestName)) {
                        console.log("Conversion necessary for: " + request.url());
                        // TODO: Convert to mp4
                        await page.setRequestInterception(false);
                    }
                    request.continue;
                })
            }

            dataObj.embed = await page.evaluate((selector, property) => {
                return document.querySelector(selector)[property];
            }, sites[site].embedSelector, sites[site].embedProperty)
            .catch(e => {
                console.error(e);
                dataObj.embed = null;
            })

            dataObj.title = await page.evaluate(() => {
                return document.querySelector('title').textContent;
            })
            .catch(e => {
                console.error(e);
                dataObj.title = 'TITLE NOT FOUND';
            })

            return dataObj;
        }
    }
    return null;
}

async function getRedisSessionData(sessionId) {
    let key = 'sess:' + sessionId;
    return new Promise((resolve, reject) => {
        redisClient.get(key, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        })
    })
    .then(data => {
        let sessData = JSON.parse(data);
        return sessData;
    })
}

async function setRedisSessionData(sessionId, newSessObj) {
    let key = 'sess:' + sessionId;
    redisClient.set(key, JSON.stringify(newSessObj));
    console.log("SAVING SESSION DATA: ", Date.now());
}

async function getVideoTranscript(page) {;

    // Check if video is working
    await page.waitForSelector('.ytp-error', {hidden: true, timeout: 3000});

    // Wait for 'More actions' button to appear
    await page.waitForSelector("[aria-label='More actions']", {timeout: 5000});

    // Click 'More actions'
    await page.evaluate(async () => {
        document.querySelectorAll("[aria-label='More actions']")[1].click();
    });

    // Wait for 'Open transcript' option to appear
    await page.waitForSelector(".style-scope.ytd-menu-service-item-renderer", {timeout: 5000});

    // Click 'Open transcript'
    await page.evaluate(() => {
        let options = [...document.querySelectorAll(".style-scope.ytd-menu-service-item-renderer")];
        options.filter(o => o.textContent == "Open transcript")[0].click();
    })

    await page.waitForSelector(`.cue-group.style-scope.ytd-transcript-body-renderer`);

    // Get all pieces of transcript
    let transcriptRaw = await page.evaluate(() => {
        return new Promise(resolve => {
            let dialogLines = document.querySelectorAll(".cue-group.style-scope.ytd-transcript-body-renderer");
            let dialogText = [...dialogLines].map(line => {
                let timestamp = line.querySelector(".cue-group-start-offset.style-scope.ytd-transcript-body-renderer").textContent;
                let dialogue = line.querySelector(".cue.style-scope.ytd-transcript-body-renderer").textContent;
                return {timestamp, dialogue};
            });
            resolve(dialogText);
        })
    })

    let transcript = transcriptRaw.map(tr => {
        let d = tr.dialogue.replace(/\\n/g, '').trim();
        let t = tr.timestamp.replace(/\\n/g, '').trim();
        return {timestamp: t, dialogue: d};
    });
    return transcript;
}

function getSessionJobIndex(id, sessData) {
    for (let i = 0; i < sessData.length; i++) {
        if (id === sessData[i].id) {
            return i;
        }
    }
    return null;
}

app.listen(process.env.PORT || 3000, process.env.IP, () => {
    console.log("server started");
});