const cp = require('child_process');
const path = require('path');

try {
    cp.execSync('npx eslint src/features/ --ext .ts,.tsx --max-warnings=0 -f json', { encoding: 'utf8' });
    console.log("No errors found!");
} catch (error) {
    if (error.stdout) {
        try {
            const data = JSON.parse(error.stdout);
            const filesWithErrors = data.filter(x => x.errorCount > 0 || x.warningCount > 0);
            filesWithErrors.forEach(file => {
                const relativePath = path.relative(process.cwd(), file.filePath);
                console.log(`-- ${relativePath}`);
                file.messages.forEach(msg => {
                    console.log(`   ${msg.line}:${msg.column} ${msg.severity === 2 ? 'error' : 'warning'} ${msg.ruleId}`);
                });
            });
        } catch (parseError) {
            console.error("Failed to parse JSON output", parseError);
        }
    } else {
        console.error("Failed to run ESLint:", error.message);
    }
}
