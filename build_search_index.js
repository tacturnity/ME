// build_search_index.js
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

// --- CONFIGURATION ---
const CHAPTERS_DIR_NAME = 'chapters';
const TUTORIALS_DIR_NAME = 'tutorials';
const OUTPUT_INDEX_FILE = 'search_index.json';

// --- Helper Function ---
function generateDisplayTitleFromName(fileName) {
    let rawTitle = fileName.replace(/\.html$/i, '');
    let displayTitle = rawTitle.replace(/^\[[a-z]\][-_\s]*/i, '');
    displayTitle = displayTitle.replace(/[-_]/g, ' ').trim();
    return displayTitle.split(' ')
                       .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                       .join(' ');
}

async function processDirectory(directoryName, relativeLinkPathPrefix) {
    const indexedItems = [];
    const dirPath = path.resolve(__dirname, directoryName);

    try {
        const files = await fs.readdir(dirPath);
        for (const fileName of files) {
            if (fileName.toLowerCase().endsWith('.html')) {
                const filePath = path.join(dirPath, fileName);
                const fileStat = await fs.stat(filePath);

                if (fileStat.isFile()) {
                    console.log(`Indexing: ${filePath}`);
                    const htmlContent = await fs.readFile(filePath, 'utf-8');
                    const $ = cheerio.load(htmlContent);
                    const mainElement = $('main');
                    let mainTextContent = '';
                    const headingsData = [];

                    if (mainElement.length > 0) {
                        // To get positions, we need to iterate and build text content progressively
                        let currentPosition = 0;
                        mainElement.contents().each(function() {
                            const node = $(this);
                            let nodeText = '';

                            if (this.type === 'tag' && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(this.tagName.toLowerCase())) {
                                nodeText = node.text().replace(/\s\s+/g, ' ').trim();
                                if (nodeText) {
                                    headingsData.push({
                                        level: this.tagName.toLowerCase(),
                                        text: nodeText,
                                        position: currentPosition // Position at the start of this heading's text
                                    });
                                }
                            } else {
                                // For other elements, just get their text
                                nodeText = node.text().replace(/\s\s+/g, ' ').trim();
                            }
                            
                            if (nodeText) {
                                // Append text and a space if it's not just whitespace itself
                                // and if mainTextContent isn't empty and doesn't already end with a space
                                if (mainTextContent.length > 0 && !mainTextContent.endsWith(' ')) {
                                    mainTextContent += ' ';
                                    currentPosition += 1;
                                }
                                mainTextContent += nodeText;
                                currentPosition += nodeText.length;
                            }
                        });
                        mainTextContent = mainTextContent.replace(/\s\s+/g, ' ').trim(); // Final cleanup

                    } else {
                        console.warn(`Warning: <main> tag not found in ${fileName}. Indexing full body text as fallback.`);
                        mainTextContent = $('body').text().replace(/\s\s+/g, ' ').trim();
                    }

                    const displayTitle = generateDisplayTitleFromName(fileName);
                    const linkPath = `${relativeLinkPathPrefix}/${encodeURIComponent(fileName)}`;

                    indexedItems.push({
                        id: linkPath,
                        name: fileName,
                        title: displayTitle,
                        path: linkPath,
                        textContent: mainTextContent.toLowerCase(), // Store lowercase for search
                        headings: headingsData // Add headings data
                    });
                }
            }
        }
    } catch (err) { /* ... error handling ... */ }
    return indexedItems;
}

// ... (rest of buildIndex and the self-invoking function remain the same as before)
async function buildIndex() {
    console.log('Starting search index build...');
    let allIndexedFiles = [];

    const chapterFiles = await processDirectory(CHAPTERS_DIR_NAME, CHAPTERS_DIR_NAME);
    allIndexedFiles = allIndexedFiles.concat(chapterFiles);

    const tutorialFiles = await processDirectory(TUTORIALS_DIR_NAME, TUTORIALS_DIR_NAME);
    allIndexedFiles = allIndexedFiles.concat(tutorialFiles);

    allIndexedFiles.sort((a, b) => {
        const extractNumber = (str) => {
            const match = str.match(/\d+/);
            return match ? parseInt(match[0], 10) : NaN;
        };
        const numA = extractNumber(a.name);
        const numB = extractNumber(b.name);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    try {
        await fs.writeFile(OUTPUT_INDEX_FILE, JSON.stringify(allIndexedFiles, null, 2));
        console.log(`\nSearch index successfully built!`);
        console.log(` - ${allIndexedFiles.length} files indexed.`);
        console.log(` - Saved to: ${path.resolve(__dirname, OUTPUT_INDEX_FILE)}`);
        console.log(`\nNext steps:`);
        console.log(`1. Commit "${OUTPUT_INDEX_FILE}" to your GitHub repository.`);
        console.log(`2. Ensure your index.html is updated to use this file and has a loading indicator.`);

    } catch (err)
        {
        console.error('Error writing search index file:', err);
    }
}

(async () => {
    try {
        require.resolve('cheerio');
    } catch (e) {
        console.error("--------------------------------------------------------------------");
        console.error("ERROR: Module 'cheerio' is not installed.");
        console.error("Please run: npm install cheerio");
        console.error("--------------------------------------------------------------------");
        process.exit(1);
    }
    await buildIndex();
})();