import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import x from 'user-agents';
const { UserAgent } = x;
import * as cheerio from 'cheerio';









async function getMainPage(url =`https://lekmanga.net/`, page = 1) {
    try {
        const response = await axios.get(url + `/page/${page}`);
        const $ = cheerio.load(response.data);
        const list = [];
        $('.page-item-detail.manga').each((index, element) => {
            // const length = $(element).children().length;
            // console.log(`Item ${index + 1} has ${length} children`);
          
            const cover = $(element).find('img').attr("src");
            const link = $(element).find('div:nth-child(1) > a').attr('href');
            const title = $(element).find('div:nth-child(1) > a').attr('title');
            const rating = $(element).find('div:nth-child(2)  .total_votes').text();
            list.push({
                item: index +1,
                cover,
                link,
                title,
                rating
            })
            
        });


        return list;
    } catch (error) {
        console.error('Error fetching page:', error);
    }
}





async function getSpecificMangaInfo(mangaName) {
    
    const res = await axios.get(`https://lekmanga.net/manga/${mangaName.split(" ").join("-")}/`);
   
    const $ = cheerio.load(res.data);
    const cover = $('.summary_image > a > img').attr("src");
    const chaptersElements = $('.wp-manga-chapter');
    const mangaDetails = [{
        mangaCover: cover,
        chapters: [

        ]
    }];
    chaptersElements.each((i, chp) => {

        const link = $(chp).find("a").attr("href");
        const chapterNumber = $(chp).find("a").text().trim();


        mangaDetails[0].chapters.push({
            link,
            chapterNumber
        })

    });

    return mangaDetails
}


async function getSpecificMangaInfoLink(mangaLink) {
    
    const res = await axios.get(mangaLink);
   
    const $ = cheerio.load(res.data);
    const cover = $('.summary_image > a > img').attr("src");
    const chaptersElements = $('.wp-manga-chapter');
    const mangaDetails = [{
        mangaCover: cover,
        chapters: [

        ]
    }];
    chaptersElements.each((i, chp) => {

        const link = $(chp).find("a").attr("href");
        const chapterNumber = $(chp).find("a").text().trim();


        mangaDetails[0].chapters.push({
            link,
            chapterNumber
        })

    });

    return mangaDetails
}







async function getChapterPages(chapterUrl) {
    
    const response = await axios.get(chapterUrl);

    const $ = cheerio.load(response.data);

    const chapterPages = [];
    const chpPages = $('.page-break.no-gaps');
    chpPages.each((i, chpPage) => {
        const img = $(chpPage).find("img").attr("src");
        chapterPages.push(img);

    })


    return chapterPages;
}


// getSpecificMangaInfo("vinland").then(res => {
//     res[0].chapters.forEach(chp => {
//         console.log(chp.link);
        
//     })
    
// })




export   {
    getChapterPages,
    getMainPage,
    getSpecificMangaInfo,
    getSpecificMangaInfoLink
};
