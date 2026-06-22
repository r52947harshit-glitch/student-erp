const path = require('path');

module.exports = function(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const filePath = file.path;
  const projectRoot = process.cwd();

  function resolveToAlias(importPath) {
    if (importPath.startsWith('.')) {
      const absolutePath = path.resolve(path.dirname(filePath), importPath);
      const relativeToRoot = path.relative(projectRoot, absolutePath);
      if (!relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot)) {
        return `@/${relativeToRoot.replace(/\\/g, '/')}`;
      }
    }
    return importPath;
  }

  const imports = [];
  root.find(j.ImportDeclaration).forEach(p => {
    p.node.source.value = resolveToAlias(p.node.source.value);
    imports.push(p.node);
    j(p).remove();
  });

  if (imports.length === 0) return file.source;

  const dedupedImports = [];
  const seen = new Set();
  imports.forEach(imp => {
    const key = `${imp.importKind === 'type' ? 'type:' : ''}${imp.source.value}`;
    if (!seen.has(key)) {
      dedupedImports.push(imp);
      seen.add(key);
    } else {
      const existing = dedupedImports.find(i => `${i.importKind === 'type' ? 'type:' : ''}${i.source.value}` === key);
      if (existing) {
        imp.specifiers.forEach(spec => {
          if (!existing.specifiers.find(s => s.local.name === spec.local.name)) {
            existing.specifiers.push(spec);
          }
        });
      }
    }
  });

  const finalImports = dedupedImports.map(imp => {
    imp.specifiers = imp.specifiers.filter(spec => {
      const name = spec.local.name;
      const occurrences = root.find(j.Identifier, { name }).filter(p => {
        const parent = p.parentPath.node;
        return parent.type !== 'ImportSpecifier' && 
               parent.type !== 'ImportDefaultSpecifier' && 
               parent.type !== 'ImportNamespaceSpecifier';
      });
      const jsxOccurrences = root.find(j.JSXIdentifier, { name });
      const tsReferences = root.find(j.TSTypeReference, { typeName: { name } });
      const tsQualified = root.find(j.TSQualifiedName, { left: { name } });
      return occurrences.length > 0 || jsxOccurrences.length > 0 || tsReferences.length > 0 || tsQualified.length > 0;
    });
    return imp;
  }).filter(imp => imp.specifiers.length > 0 || (imp.specifiers.length === 0 && imp.type === 'ImportDeclaration' && (imp.source.value.endsWith('.css') || imp.source.value.startsWith('next-env'))));

  function getGroup(node) {
    if (node.importKind === 'type') return 5;
    const source = node.source.value;
    if (source === 'react' || source === 'next' || source.startsWith('react/') || source.startsWith('next/')) return 1;
    if (source.startsWith('@/lib/')) return 3;
    if (source.startsWith('@/components/')) return 4;
    return 2;
  }

  finalImports.sort((a, b) => {
    const groupA = getGroup(a);
    const groupB = getGroup(b);
    if (groupA !== groupB) return groupA - groupB;
    return a.source.value.localeCompare(b.source.value);
  });

  const groups = [[], [], [], [], []];
  finalImports.forEach(imp => groups[getGroup(imp) - 1].push(j(imp).toSource()));

  const importBlock = groups
    .filter(g => g.length > 0)
    .map(g => g.join('\n'))
    .join('\n\n');

  const restOfCode = root.toSource().trim();
  return `${importBlock}\n\n${restOfCode}`;
};
