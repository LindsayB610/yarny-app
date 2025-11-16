import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Test that verifies static files referenced in the codebase actually exist.
 * This catches cases where files are deleted but references remain, or where
 * files are referenced but don't exist.
 */
describe("Static File References", () => {
  const publicDir = resolve(process.cwd(), "public");
  const srcDir = resolve(process.cwd(), "src");

  it("verifies all static HTML files referenced in netlify.toml redirects exist", () => {
    const netlifyConfig = readFileSync("netlify.toml", "utf-8");
    
    // Extract file paths from redirect rules that point to static files
    const allRedirectMatches = netlifyConfig.matchAll(/to\s*=\s*"([^"]+\.html)"/g);
    const referencedFiles = new Set<string>();
    
    for (const match of allRedirectMatches) {
      const filePath = match[1];
      const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
      
      // Skip SPA fallback (index.html) and special routes
      if (
        cleanPath === "index.html" ||
        cleanPath.includes("/.well-known/") ||
        cleanPath.includes(":") ||
        cleanPath.includes("*")
      ) {
        continue;
      }
      // Only check files that are actual static files
      referencedFiles.add(cleanPath);
    }
    
    expect(referencedFiles.size).toBeGreaterThan(0);
    
    const missingFiles: string[] = [];
    referencedFiles.forEach((filePath) => {
      const fullPath = resolve(publicDir, filePath);
      if (!existsSync(fullPath)) {
        missingFiles.push(filePath);
      }
    });
    
    if (missingFiles.length > 0) {
      throw new Error(
        `Missing static files referenced in netlify.toml:\n${missingFiles.map(f => `  - ${f}`).join("\n")}`
      );
    }
  });

  function findFiles(dir: string, extension: string[]): string[] {
    const files: string[] = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...findFiles(fullPath, extension));
        } else if (extension.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    return files;
  }

  it("verifies all static files referenced in React components exist", () => {
    // Find all .tsx and .ts files in src/components
    const componentFiles = findFiles(srcDir, [".ts", ".tsx"]).filter(f => 
      f.includes("/components/")
    );
    
    const referencedFiles = new Set<string>();
    
    componentFiles.forEach((file) => {
      const content = readFileSync(file, "utf-8");
      
      // Match href="/path/to/file.html" or href='/path/to/file.html'
      const hrefPattern = new RegExp('href=["\']([^"\']+\\.(html|css|js|svg|png|jpg|jpeg|gif|ico))', 'g');
      const hrefMatches = content.matchAll(hrefPattern);
      for (const match of hrefMatches) {
        const filePath = match[1];
        // Only check absolute paths (starting with /)
        if (filePath.startsWith("/")) {
          const cleanPath = filePath.slice(1); // Remove leading slash
          referencedFiles.add(cleanPath);
        }
      }
      
      // Match src="/path/to/file" for images and scripts
      const srcPattern = new RegExp('src=["\']([^"\']+\\.(html|css|js|svg|png|jpg|jpeg|gif|ico))', 'g');
      const srcMatches = content.matchAll(srcPattern);
      for (const match of srcMatches) {
        const filePath = match[1];
        if (filePath.startsWith("/")) {
          const cleanPath = filePath.slice(1);
          referencedFiles.add(cleanPath);
        }
      }
    });
    
    expect(referencedFiles.size).toBeGreaterThan(0);
    
    const missingFiles: string[] = [];
    referencedFiles.forEach((filePath) => {
      const fullPath = resolve(publicDir, filePath);
      if (!existsSync(fullPath)) {
        missingFiles.push(filePath);
      }
    });
    
    if (missingFiles.length > 0) {
      throw new Error(
        `Missing static files referenced in components:\n${missingFiles.map(f => `  - ${f}`).join("\n")}`
      );
    }
  });

  it("verifies testing workbook files exist when referenced", () => {
    // Check if testing workbook is referenced anywhere
    const allSourceFiles = findFiles(srcDir, [".ts", ".tsx"]);
    
    let workbookReferenced = false;
    for (const file of allSourceFiles) {
      const content = readFileSync(file, "utf-8");
      if (content.includes("testing-workbook") || content.includes("Testing Workbook")) {
        workbookReferenced = true;
        break;
      }
    }
    
    // Also check netlify.toml
    const netlifyConfig = readFileSync("netlify.toml", "utf-8");
    if (netlifyConfig.includes("testing-workbook")) {
      workbookReferenced = true;
    }
    
    if (workbookReferenced) {
      // If referenced, verify the main file exists
      const mainWorkbook = resolve(publicDir, "migration-plan/testing-workbook.html");
      expect(existsSync(mainWorkbook)).toBe(true);
      
      // Also check for phase files if they're referenced
      const phaseFiles = [
        "migration-plan/testing-workbook-phase-1.html",
        "migration-plan/testing-workbook-phase-2.html",
        "migration-plan/testing-workbook-phase-3.html",
        "migration-plan/testing-workbook-phase-4.html",
        "migration-plan/testing-workbook-phase-5.html"
      ];
      
      // Check if any phase files are referenced in the main workbook
      if (existsSync(mainWorkbook)) {
        const workbookContent = readFileSync(mainWorkbook, "utf-8");
        phaseFiles.forEach((phaseFile) => {
          if (workbookContent.includes(phaseFile)) {
            const fullPath = resolve(publicDir, phaseFile);
            expect(existsSync(fullPath)).toBe(true);
          }
        });
      }
    }
  });
});

