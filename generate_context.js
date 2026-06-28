const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const OUTPUT_FILE = path.join(ROOT_DIR, 'code_context.txt');

const SCAN_DIRS = [
  'app',
  'components/shared',
  'hooks',
  'lib',
  'types',
  'prisma'
];

const ROOT_FILES = [
  'middleware.ts',
  'next.config.mjs',
  'tailwind.config.ts',
  'postcss.config.mjs'
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.prisma', '.mjs']);

const EXCLUDE_PATTERNS = [
  /[\\/]node_modules[\\/]/,
  /[\\/]\.next[\\/]/,
  /[\\/]\.git[\\/]/,
  /[\\/]\.context_cache[\\/]/,
  /[\\/]components[\\/]ui[\\/]/
];

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
        continue;
      }
      getFiles(fullPath, files);
    } else {
      const ext = path.extname(file);
      if (EXTENSIONS.has(ext)) {
        if (!EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
          files.push(fullPath);
        }
      }
    }
  }
  return files;
}

function getLanguageIdentifier(ext) {
  switch (ext) {
    case '.ts': return 'typescript';
    case '.tsx': return 'tsx';
    case '.js': return 'javascript';
    case '.jsx': return 'jsx';
    case '.mjs': return 'javascript';
    case '.css': return 'css';
    case '.prisma': return 'prisma';
    case '.json': return 'json';
    default: return '';
  }
}

function scanSecurityIssues(content) {
  const lines = content.split(/\r?\n/);
  const issues = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Check for console.log
    if (line.includes('console.log')) {
      issues.push({
        severity: 'LOW',
        line: lineNumber,
        type: 'Debug Code',
        description: 'Debug code or security TODO in production',
        code: line.trim()
      });
    }
    
    // Check for TODO or FIXME
    if (/\b(TODO|FIXME)\b/i.test(line)) {
      issues.push({
        severity: 'LOW',
        line: lineNumber,
        type: 'TODO Comment',
        description: 'Temporary comment or security TODO in production',
        code: line.trim()
      });
    }
  }
  
  return issues;
}

function main() {
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    const fullDir = path.join(ROOT_DIR, dir);
    if (fs.existsSync(fullDir)) {
      getFiles(fullDir, allFiles);
    }
  }
  for (const file of ROOT_FILES) {
    const fullPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(fullPath)) {
      allFiles.push(fullPath);
    }
  }

  // De-duplicate
  const uniqueFiles = Array.from(new Set(allFiles));
  
  const fileDataList = [];
  let totalIssues = 0;

  for (const filePath of uniqueFiles) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    
    // Skip output file and the generator script itself
    if (filePath === OUTPUT_FILE || relativePath === 'generate_context.js') {
      continue;
    }
    
    const formattedPath = relativePath.replace(/\//g, '\\');
    const content = fs.readFileSync(filePath, 'utf8');
    const size = Buffer.byteLength(content, 'utf8');
    const tokens = Math.ceil(size / 4);
    const ext = path.extname(filePath);
    const language = getLanguageIdentifier(ext);
    
    // Extract imports
    const imports = [];
    const importRegex = /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    const simpleImportRegex = /import\s+['"]([^'"]+)['"]/g;
    while ((match = simpleImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    const uniqueImports = Array.from(new Set(imports));
    const issues = scanSecurityIssues(content);
    totalIssues += issues.length;
    
    fileDataList.push({
      path: formattedPath,
      language,
      tokens,
      size,
      imports: uniqueImports,
      issues,
      content
    });
  }

  // Format local timezone offset
  const offset = new Date().getTimezoneOffset(); // in minutes
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const offsetSign = offset <= 0 ? '+' : '-';
  const formattedOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
  const localTime = new Date(Date.now() - offset * 60000).toISOString().slice(0, 19) + formattedOffset;

  let output = `# Code Context Analysis

Generated: ${localTime}
Files Scanned: ${fileDataList.length}
Analysis Tools: regex

## Security Summary

**Total Issues: ${totalIssues}**

- 🔴 CRITICAL: 0
- 🟠 HIGH: 0
- 🟡 MEDIUM: 0
- 🟢 LOW: ${totalIssues}

**Issues by Tool:**
- regex: ${totalIssues}

---
`;

  for (const fileData of fileDataList) {
    output += `\n## File: ${fileData.path}\n`;
    output += `Language: ${fileData.language} | Tokens: ${fileData.tokens} | Size: ${fileData.size} bytes\n\n`;
    
    if (fileData.imports.length > 0) {
      output += `**Imports:** ${fileData.imports.join(', ')}\n\n`;
    }
    
    if (fileData.issues.length > 0) {
      output += `**⚠️ Security Issues:**\n\n`;
      for (const issue of fileData.issues) {
        output += `🟢 **[${issue.severity}]** Line ${issue.line} - ${issue.type}\n`;
        output += `   *${issue.description}*\n`;
        output += `   Tool: regex\n`;
        output += `   \`\`\`\n`;
        output += `   ${issue.code}\n`;
        output += `   \`\`\`\n\n`;
      }
    }
    
    output += `\`\`\`${fileData.language}\n`;
    output += fileData.content;
    if (!fileData.content.endsWith('\n')) {
      output += '\n';
    }
    output += `\`\`\`\n`;
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
  console.log(`Successfully generated context for ${fileDataList.length} files with ${totalIssues} low-severity issues found.`);
}

main();
