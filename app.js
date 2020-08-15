const puppeteer = require("puppeteer");

const express = require("express");
const app = express();

app.set('views', __dirname);
app.engine('html', require('ejs').__express);
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
	res.render("index.html");
})

app.post("/", async(req, res) => {
    let keywords = req.body.keyword.split("; ");

    let results = [];
    await (async () => {
        for(let keyword of keywords){
            let arr = await scrape(keyword);
            results.push(arr);
        }
    })();
	res.send(results)
})

let scrape = async (keyword) => {

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

    let videos = [];
    await (async () => {
        for(let link of links) {
            await page.goto(link, {waitUntil: "networkidle2"});
    
            let src = await page.evaluate(async () => {
                return await new Promise(resolve => {
                    let video = document.querySelector("video");
                    let srcAtt = video?.getAttribute("src") 
                        || video?.querySelector("source")?.getAttribute("src");
                    resolve(srcAtt);
                })
            });

            videos.push(src);
        };
    })();
    let filteredVids = [];
    await (async () => {
        videos.map(video => {
            if (video) {
                let isBlob = video.includes("blob:") ? true : false;
                if (!isBlob) filteredVids.push(video);
            }
        })
    })();

    let videoLinks = [];
    await (async () => {
        for(let vid of filteredVids) {
            await page.goto(vid, {waitUntil: "networkidle2"});
            videoLinks.push(page.url());
        }
    })();
    console.log(videoLinks);

    browser.close();
    return videoLinks;
}

app.listen(process.env.PORT || 3000, process.env.IP, () => {
    console.log("server started");
});