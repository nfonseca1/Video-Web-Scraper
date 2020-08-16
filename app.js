const puppeteer = require("puppeteer");

const express = require("express");
const app = express();
var session = require('express-session');

app.set('views', __dirname);
app.engine('html', require('ejs').__express);
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname));

app.use(session({secret: "Shh, its a secret!"}));

app.get("/", (req, res) => {
    res.render("index.html");
})

app.post("/", (req, res) => {
    let keywords = req.body.keyword.split("; ");
    let options = {
        resultsCount: req.body.count || 10,
        website: req.body.website
    }

    req.session.results = {
        finished: false,
        links: []
    };
    (async () => {
        await (async () => {
            for(let keyword of keywords){
                req.session.results.links.push([])
                await scrape(keyword, req, options);
            }
        })();
        req.session.results.finished = true;
        req.session.save();
    })();
	res.sendStatus(200);
})

app.get("/status", (req, res) => {
    setTimeout(() => {
        req.session.reload(() => {
            res.send(req.session.results);
            if (req.session.results) {
                req.session.results.links = [[]]
                req.session.save();
            }
        }, 50)
    })
})

let scrape = async (keyword, req, options) => {

    let url = `https://www.google.com/search?q=${keyword}&source=lnms&tbm=vid&num=${options.resultsCount}&as_sitesearch=${options.website}`;

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    await page.goto(url, {waitUntil: "networkidle2"})

    await page.waitForSelector("#rso");
    let links = await page.evaluate(() => {
        let a = document.querySelectorAll("#rso .g .rc .r > a");
        return Array.from(a).map(tag => tag.href);
    });

    await (async () => {
        for(let link of links) {
            console.log("searching: " + link);
            try {
                await page.goto(link, {waitUntil: "networkidle2", timeout: 20000});

                let srcArr = await page.evaluate(async () => {
                    return await new Promise(resolve => {
                        let url = window.location.href;
                        if (url.includes("youtube.com/watch")) {
                            // In the case of youtube, just get an embedded link to use in an iframe
                            let embeddedLink = "http://youtube.com/embed/" + url.split("?v=")[1];
                            resolve([embeddedLink]);
                        }
                        else if (url.includes("youtube") === false){
                            // Select video tag and get src (from either video tag, or child source tag)
                            let videos = document.querySelectorAll("video");
                            let videoArr = [];
                            for(let video of videos) {
                                let srcAtt = video?.querySelector("source")?.getAttribute("src") 
                                    || video?.getAttribute("src");
                                if (srcAtt) videoArr.push(srcAtt);
                            }
                            // Check if this a tag exists as well, the video link could be stored in it
                            let href = document.querySelector(".global-link")?.href;
                            if (href) videoArr.push(href);

                            resolve(videoArr);
                        }
                        else resolve([]);
                    })
                });
                // Filter src tag to make sure it's not undefined or a blob
                for(let src of srcArr){
                    if (src[0] === "/") {
                        if (src[1] !== "/" && src[1] !== "h") {
                            let end = ['.com', '.org', '.net'];
                            for (let i = 0; i < end.length; i++){
                                if (link.includes(end[i])) {
                                    let website = link.split(end[i])[0] + end[i];
                                    src = website + src;
                                    break;
                                }
                            }
                        }
                        else if (src[1] === "/") src = "http:" + src;
                    }
                    let isBlob = src.includes("blob:") ? true : false;
                    let isData = src.includes("data:") ? true : false;
                    if (!isBlob && !isData) {
                        req.session.reload(() => {
                            let results = req.session.results.links;
                            results[results.length-1].push(src); // Add link to last session array
                            req.session.save(() => {
                                //console.log(req.session.results.links);
                            });
                        })
                    }
                }
            } catch(e) {
                console.log(e.name + " for: " + link);
            }
        };
    })();

    browser.close();
    return true;
}

app.listen(process.env.PORT || 3000, process.env.IP, () => {
    console.log("server started");
});