import { compileString } from "squint-cljs/compiler/node";
import path, { dirname } from "path";
import fs from "fs";

function hasExtension(filePath) {
  return path.extname(filePath).length > 0;
}

function isFile(filePath) {
  const stats = fs.statSync(filePath, { throwIfNoEntry: false });
  return stats?.isFile();
}

function isLibraryImport(importPath) {
  return !(importPath.startsWith(".") || importPath.startsWith("/"));
}

function createLogger() {
  return process.env.DEBUG ? console.log : () => {};
}

/**
 * Vite plugin for compiling ClojureScript files to JavaScript using Squint.
 *
 * @param {Object} [opts={}] - Options for the plugin.
 * @param {string} [opts.outputDir="squint_out"] - Relative output directory for compiled files.
 * @returns {Array} Array containing the Squint plugin configuration.
 */
export default function viteSquint(opts = {}) {
  let outputDir = opts.outputDir || "squint_out";
  let projectRoot;
  let srcFileMap = {}; // {sourceFile: [compiledFile, srcFileModTime]}
  let compiledFileMap = {}; // {compiledFile: sourceFile}
  const log = createLogger();

  const squint = {
    name: "squint_compile",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(id, importer, options) {
      // we don't do anything during vites initial scan.
      if (options.scan) {
        return null;
      }
      const srcFile = compiledFileMap[importer];
      // if there is an srcFile, we resolve relative to that file.
      const absPath = path.resolve(dirname(srcFile || importer), id);
      // if there is no extension, we check to see if we can resolve a `.cljs` file
      if (!hasExtension(id)) {
        const resolveCljsFile = `${absPath}.cljs`;
        if (isFile(resolveCljsFile)) {
          log("resolving import as cljs file", id);
          id = resolveCljsFile;
        }
      }
      // we resolve the `.cljs` file that we want to compile, to the `outputDir`+`filename.jsx`
      if (/\.cljs$/.test(id)) {
        const srcFileAbsPath = path.resolve(dirname(srcFile || importer), id);
        const relPath = path
          .relative(projectRoot, srcFileAbsPath)
          .replace(/\.cljs$/, ".jsx");
        const outPath = `${projectRoot}/${outputDir}/${relPath}`;
        log("resolving cljs->jsx", srcFileAbsPath, outPath);
        // we keep track of the source file and the compiled file
        srcFileMap[srcFileAbsPath] = [outPath, 0];
        compiledFileMap[outPath] = srcFileAbsPath;
        return outPath;
      }
      // We need to convert files that are imported from cljs to absolute paths
      // as we compile the `.jsx` files in a different directory which breaks
      // the relative imports.
      if (!/\.cljs$/.test(id) && srcFile) {
        if (!isLibraryImport(id)) {
          log("resolving import from", srcFile, "to absolute path", absPath);
          return absPath;
        }
      }
    },
    async load(id) {
      const srcFile = compiledFileMap[id];
      if (!srcFile) {
        return null;
      }
      const stats = fs.statSync(srcFile);
      const modTime = srcFileMap[srcFile]?.[1] || 0;
      // we compile the file if the file has changed, we need to check if the
      // file has changed otherwise we end up in an infinite loop.
      if (modTime < stats.mtimeMs) {
        // instead of loading the source and compiling here, we would call
        // the squint compiler to compile the file and load the compiled file
        // and (future) source mapping.
        log("compiling cljs file", srcFile);
        const code = fs.readFileSync(srcFile, "utf-8");
        const compiled = await compileString(code, { "in-file": srcFile });
        fs.mkdirSync(dirname(id), { recursive: true });
        fs.writeFileSync(id, compiled.javascript);
        srcFileMap[srcFile] = [id, stats.mtimeMs];
      }
      // load the file
      log("loading compiled cljs file", id);
      const code = fs.readFileSync(id, "utf-8");
      return { code, map: null };
    },
    handleHotUpdate({ file, server, modules }) {
      // `resolveId` returns the `compiledFile` so we need to use that reference
      // to trigger the hot reloads. The input `file` will be the file that
      // you are changing, the `cljs` file.
      let [compiledFile] = srcFileMap[file] || [];
      if (compiledFile) {
        const module = server.moduleGraph.getModuleById(compiledFile);
        if (module) {
          log("HMR triggered by", file, "updating", compiledFile);
          // invalidate dependants
          server.moduleGraph.onFileChange(compiledFile);
          // hot reload
          return [...modules, module];
        }
        return modules;
      }
    },
  };
  return [squint];
}
