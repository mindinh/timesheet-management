const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('./app/timesheet-app/src');
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Remove font-mono, tabular-nums, italic
    content = content.replace(/\bfont-mono\b/g, '');
    content = content.replace(/\btabular-nums\b/g, '');
    content = content.replace(/\bitalic\b/g, '');
    
    // Clean up multiple spaces that might have been left behind inside classNames
    content = content.replace(/  +/g, ' '); 
    content = content.replace(/className=" /g, 'className="');
    content = content.replace(/ "/g, '"');
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log('Updated', file);
    }
});
console.log('Total files changed:', changedCount);
