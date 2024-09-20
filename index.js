import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';
import path, { dirname } from 'path';
import { getChapterPages } from './mangaScraper.js';
import { fileURLToPath } from 'url';




const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename)

async function downloadImage(url, filepath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}




async function createPDFWithImages(imageUrls, outputPath) {
    const doc = new PDFDocument();
    
    const output = fs.createWriteStream(outputPath);
    doc.pipe(output);

    for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const tempFilePath = path.join(__dirname, `temp_image_${i}.jpg`);

        try {
            await downloadImage(url, tempFilePath);

            if (i > 0) doc.addPage();
            doc.image(tempFilePath, {
                fit: [500, 500],
                align: 'center',
                valign: 'center'
            });

            // Clean up the temporary file
            fs.unlinkSync(tempFilePath);
        } catch (error) {
            console.error(`Failed to download or process image from ${url}:`, error);
        }
    }

    doc.end();

    return new Promise((resolve) => {
        output.on('finish', () => {
            console.log('PDF created successfully!');
            resolve();
        });
    });
}







export {createPDFWithImages};
