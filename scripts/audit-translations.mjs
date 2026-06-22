import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve('src')
const languages = ['en', 'hi', 'hinglish', 'mr', 'te', 'ta', 'kn']
const keyPattern = /^\s{2}([A-Za-z0-9_]+):/gm
const dictionaries = Object.fromEntries(languages.map((language) => {
  const source = fs.readFileSync(path.join(root, 'translations', `${language}.ts`), 'utf8')
  return [language, [...source.matchAll(keyPattern)].map((match) => match[1])]
}))

const englishKeys = new Set(dictionaries.en)
const missingKeys = Object.fromEntries(languages.slice(1).map((language) => [
  language,
  [...englishKeys].filter((key) => !dictionaries[language].includes(key))
]))

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === 'translations' ? [] : sourceFiles(target)
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : []
  })
}

const applicationSource = sourceFiles(root).map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const usedKeys = new Set([...applicationSource.matchAll(/getTranslation\(['"]([A-Za-z0-9_]+)['"]\)/g)].map((match) => match[1]))
const unusedKeys = [...englishKeys].filter((key) => !usedKeys.has(key))

const seedSource = fs.readFileSync(path.join(root, 'db', 'seedData.ts'), 'utf8')
const sourceFile = ts.createSourceFile('seedData.ts', seedSource, ts.ScriptTarget.Latest, true)
const missingQuestionTranslations = []
const missingOptionTranslations = []

function property(object, name) {
  return object.properties.find((item) => ts.isPropertyAssignment(item) && item.name.getText(sourceFile).replaceAll(/['"]/g, '') === name)
}

function visit(node) {
  if (ts.isObjectLiteralExpression(node)) {
    const id = property(node, 'id')
    const translations = property(node, 'translations')
    if (id && translations && ts.isObjectLiteralExpression(translations.initializer)) {
      const present = new Set(translations.initializer.properties.map((item) => item.name?.getText(sourceFile).replaceAll(/['"]/g, '')))
      const missing = languages.filter((language) => !present.has(language))
      if (missing.length) {
        const record = { id: id.initializer.getText(sourceFile).replaceAll(/['"]/g, ''), missing }
        if (property(node, 'type')) missingQuestionTranslations.push(record)
        else missingOptionTranslations.push(record)
      }
    }
  }
  ts.forEachChild(node, visit)
}
visit(sourceFile)

console.log(JSON.stringify({
  dictionaryKeyCounts: Object.fromEntries(languages.map((language) => [language, dictionaries[language].length])),
  missingKeys,
  fallbackKeys: Object.fromEntries(languages.map((language) => [language, []])),
  unusedKeys,
  missingQuestionTranslations,
  missingOptionTranslations
}, null, 2))
