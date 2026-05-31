import fs from 'node:fs';
import path from 'node:path';

const ASSET_IMPORT = /\.(svg|css|png|jpe?g|gif|webp|csv|txt)(\?|$)/i;
const VIRTUAL_IMPORT = /[?&]/;
/** Top-level folder allowed as a deep-import target across module boundaries. */
const DEEP_IMPORT_EXCEPTION = ['lib', 'components'];

/** @param {string} dir */
function collectPublicModuleDirs(dir) {
	/** @type {Set<string>} */
	const modules = new Set();

	/** @param {string} current @param {string} rel */
	function walk(current, rel) {
		const indexTs = path.join(current, 'index.ts');
		const indexTsx = path.join(current, 'index.tsx');
		if (fs.existsSync(indexTs) || fs.existsSync(indexTsx)) {
			modules.add(rel.replace(/\\/g, '/'));
		}
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name === 'node_modules') continue;
			walk(path.join(current, entry.name), rel ? `${rel}/${entry.name}` : entry.name);
		}
	}

	walk(dir, '');
	return modules;
}

/** @param {string} filePath @param {string} srcDir */
function topLevelModule(filePath, srcDir) {
	const rel = path.relative(srcDir, filePath);
	if (!rel || rel.startsWith('..')) return null;
	const segment = rel.split(path.sep)[0];
	return segment || null;
}

/** @param {string} fromFile @param {string} spec */
function resolveRelativeImport(fromFile, spec) {
	const base = path.resolve(path.dirname(fromFile), spec);
	if (fs.existsSync(base)) {
		const stat = fs.statSync(base);
		if (stat.isFile()) return base;
		if (stat.isDirectory()) {
			for (const indexName of ['index.ts', 'index.tsx']) {
				const indexPath = path.join(base, indexName);
				if (fs.existsSync(indexPath)) return indexPath;
			}
		}
	}
	for (const ext of ['.ts', '.tsx']) {
		const candidate = `${base}${ext}`;
		if (fs.existsSync(candidate)) return candidate;
	}
	for (const indexName of ['index.ts', 'index.tsx']) {
		const candidate = path.join(base, indexName);
		if (fs.existsSync(candidate)) return candidate;
	}
	return null;
}

/** @param {string} targetRel @param {string} targetModule @param {Set<string>} publicModules */
function suggestPublicEntry(targetRel, targetModule, publicModules) {
	const dir = path.posix.dirname(targetRel);
	if (publicModules.has(dir)) return dir;
	if (publicModules.has(targetModule)) return targetModule;
	const nested = [...publicModules]
		.filter((m) => m.startsWith(`${targetModule}/`) && (dir === m || dir.startsWith(`${m}/`)))
		.sort((a, b) => a.length - b.length);
	return nested[0] ?? targetModule;
}

/** @param {string} resolvedPath @param {string} srcDir @param {Set<string>} publicModules */
function isPublicModuleEntry(resolvedPath, srcDir, publicModules) {
	const rel = path.relative(srcDir, resolvedPath).replace(/\\/g, '/');
	if (!rel || rel.startsWith('..')) return true;
	if (!/\/index\.tsx?$/.test(rel)) return false;
	const dir = path.posix.dirname(rel);
	return publicModules.has(dir);
}

/** @param {import('eslint').Rule.RuleModule} */
export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow cross-module imports that bypass a package public entry (index.ts), except deep imports into src/lib',
		},
		schema: [],
		messages: {
			deepCrossModuleImport:
				'Import "{{source}}" reaches into "{{target}}" across module boundaries. Import from the public entry "{{entry}}" instead.',
		},
	},
	create(context) {
		const srcDir = path.join(context.cwd ?? process.cwd(), 'src');
		const publicModules = collectPublicModuleDirs(srcDir);

		/** @param {import('estree').ImportDeclaration | import('estree').ExportNamedDeclaration | import('estree').ExportAllDeclaration} node */
		function checkSource(node) {
			const source = node.source;
			if (!source || source.type !== 'Literal' || typeof source.value !== 'string') {
				return;
			}

			const spec = source.value;
			if (!spec.startsWith('.')) return;
			if (ASSET_IMPORT.test(spec) || VIRTUAL_IMPORT.test(spec)) return;

			const importerPath = path.resolve(context.filename);
			if (!importerPath.startsWith(srcDir + path.sep)) return;

			const resolved = resolveRelativeImport(importerPath, spec);
			if (!resolved) return;

			const importerModule = topLevelModule(importerPath, srcDir);
			const targetModule = topLevelModule(resolved, srcDir);
			if (!importerModule || !targetModule || importerModule === targetModule) {
				return;
			}

			if (isPublicModuleEntry(resolved, srcDir, publicModules)) return;
			if (DEEP_IMPORT_EXCEPTION.includes(targetModule)) return;

			const targetRel = path.relative(srcDir, resolved).replace(/\\/g, '/');
			const entry = suggestPublicEntry(targetRel, targetModule, publicModules);

			context.report({
				node: source,
				messageId: 'deepCrossModuleImport',
				data: { source: spec, target: targetRel, entry },
			});
		}

		return {
			ImportDeclaration: checkSource,
			ExportNamedDeclaration: checkSource,
			ExportAllDeclaration: checkSource,
		};
	},
};
