import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp'; // Add sharp for image conversion

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function downloadImage(url, filepath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer', // Download image as a buffer
    });

    // Save the image buffer to file
    const buffer = response.data;
    const tempFilePath = `${filepath}.png`; // Force PNG extension

    // Convert the image to PNG using sharp
    await sharp(buffer).toFormat('png').toFile(tempFilePath);

    return tempFilePath;
}

async function createPDFWithImages(imageUrls, outputPath) {
    const doc = new PDFDocument();
    const output = fs.createWriteStream(outputPath);
    doc.pipe(output);

    for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        const tempFilePath = path.join(__dirname, `temp_image_${i}`);

        try {
            const downloadedImagePath = await downloadImage(url, tempFilePath);

            if (i > 0) doc.addPage();
            doc.image(downloadedImagePath, {
                fit: [doc.page.width - 30, doc.page.height - 30],
                align: 'center',
                valign: 'center',
            });

            // Clean up the temporary file
            fs.unlinkSync(downloadedImagePath);
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

export { createPDFWithImages };
