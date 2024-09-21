import PDFDocument from 'pdfkit';
import fs from 'fs';
import axios from 'axios';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp'; // For PNG optimization

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function downloadAndCompressImage(url, filepath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer', // Download image as a buffer
    });

    const buffer = response.data;

    // Compress and resize PNG images using sharp
    const tempFilePath = `${filepath}.png`; // Keep the extension as PNG

    await sharp(buffer)
        .resize({ width: 800 }) // Resize image for smaller dimensions
        .png({ quality: 70, compressionLevel: 8 }) // Reduce PNG quality and increase compression
        .toFile(tempFilePath);

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
            const downloadedImagePath = await downloadAndCompressImage(url, tempFilePath);

            if (i > 0) doc.addPage();
            doc.image(downloadedImagePath, {
                fit: [500, 500],
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
