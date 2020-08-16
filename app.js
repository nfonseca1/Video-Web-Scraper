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

    req.session.results = {
        finished: false,
        links: []
    };
    (async () => {
        await (async () => {
            for(let keyword of keywords){
                req.session.results.links.push([])
                await scrape(keyword, req);
                console.log(req.session.results.length);
            }
        })();
        req.session.results.finished = true;
        req.session.save();
    })();
	res.sendStatus(200);
})

app.get("/status", (req, res) => {
    res.send(req.session.results);
    if (req.session.results) {
        req.session.results.links = [[]]
        req.session.save();
    }
})

let scrape = async (keyword, req) => {

    let url = `https://www.google.com/search?q=${keyword}&source=lnms&tbm=vid`;

    const browser = await puppeteer.launch({
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
            await page.goto(link, {waitUntil: "networkidle2"});
    
            let src = await page.evaluate(async () => {
                return await new Promise(resolve => {
                    // Select video tag and get src (from either video tag, or child source tag)
                    let video = document.querySelector("video");
                    let srcAtt = video?.getAttribute("src") 
                        || video?.querySelector("source")?.getAttribute("src");

                    resolve(srcAtt);
                })
            });
            // Filter src tag to make sure it's not undefined or a blob
            if (src) {
                let isBlob = src.includes("blob:") ? true : false;
                if (!isBlob) {
                    req.session.reload(() => {
                        let results = req.session.results.links;
                        results[results.length-1].push(src); // Add link to last session array
                        req.session.save(() => {
                            console.log(req.session.results.links);
                        });
                    })
                }
            }
        };
    })();

    //let videoLinks = [];
    //await (async () => {
    //    for(let vid of filteredVids) {
    //        await page.goto(vid, {waitUntil: "networkidle2"});
    //        videoLinks.push(page.url());
    //    }
    //})();

    browser.close();
    return true;
}

app.listen(process.env.PORT || 3000, process.env.IP, () => {
    console.log("server started");
});