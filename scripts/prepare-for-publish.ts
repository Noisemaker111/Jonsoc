#!/usr/bin/env bun
import path from "node:path"

const rootDir = process.cwd()
const rootPkgPath = path.join(rootDir, "package.json")
const publishVersionRaw = Bun.env.PUBLISH_VERSION
const publishVersion = typeof publishVersionRaw === "string" && publishVersionRaw.length > 0 ? publishVersionRaw : null

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null
}

const readJson = async (filePath: string) => {
  return Bun.file(filePath).json()
}

const rootPkg = await readJson(rootPkgPath)
const rootWorkspaces = isRecord(rootPkg) && isRecord(rootPkg.workspaces) ? rootPkg.workspaces : null
const catalog = rootWorkspaces && isRecord(rootWorkspaces.catalog) ? rootWorkspaces.catalog : null
const workspacePatterns =
  rootWorkspaces && Array.isArray(rootWorkspaces.packages)
    ? rootWorkspaces.packages.filter((item): item is string => typeof item === "string")
    : []

const workspaceFiles = new Set<string>()
for (const pattern of workspacePatterns) {
  const normalized = pattern.replaceAll("\\", "/")
  const globPattern = normalized.endsWith("package.json") ? normalized : `${normalized}/package.json`
  const globber = new Bun.Glob(globPattern)
  for await (const match of globber.scan({ cwd: rootDir })) {
    workspaceFiles.add(path.join(rootDir, match))
  }
}

const workspaceVersions = new Map<string, string>()
for (const filePath of workspaceFiles) {
  const pkg = await readJson(filePath)
  if (!isRecord(pkg)) continue
  const name = typeof pkg.name === "string" ? pkg.name : null
  const version = typeof pkg.version === "string" ? pkg.version : null
  const resolvedVersion = publishVersion ?? version
  if (name && resolvedVersion) {
    workspaceVersions.set(name, resolvedVersion)
  }
}

const resolveWorkspace = (name: string) => {
  return workspaceVersions.get(name)
}

const resolveCatalog = (name: string) => {
  if (!catalog) return undefined
  return typeof catalog[name] === "string" ? catalog[name] : undefined
}

const updateDeps = (
  deps: Record<string, unknown> | null,
  filePath: string,
  label: string,
  updated: { value: boolean },
) => {
  if (!deps) return
  for (const [key, value] of Object.entries(deps)) {
    if (typeof value !== "string") continue
    if (value.startsWith("workspace:")) {
      const replacement = resolveWorkspace(key)
      if (replacement) {
        console.log(`${path.relative(rootDir, filePath)} ${label} ${key}: ${value} -> ${replacement}`)
        deps[key] = replacement
        updated.value = true
      } else {
        console.warn(`⚠️ Missing workspace version for ${key} in ${path.relative(rootDir, filePath)}`)
      }
      continue
    }
    if (value === "catalog:") {
      const replacement = resolveCatalog(key)
      if (replacement) {
        console.log(`${path.relative(rootDir, filePath)} ${label} ${key}: ${value} -> ${replacement}`)
        deps[key] = replacement
        updated.value = true
      } else {
        console.warn(`⚠️ Missing catalog version for ${key} in ${path.relative(rootDir, filePath)}`)
      }
    }
  }
}

// Update root package.json version (used by build script fallback)
if (publishVersion) {
  if (rootPkg.version !== publishVersion) {
    rootPkg.version = publishVersion
    await Bun.file(rootPkgPath).write(`${JSON.stringify(rootPkg, null, 2)}\n`)
    console.log(`Updated root package.json version to ${publishVersion}`)
  }
}

for (const filePath of workspaceFiles) {
  const pkg = await readJson(filePath)
  if (!isRecord(pkg)) continue
  const updated = { value: false }
  if (publishVersion && typeof pkg.name === "string") {
    if (pkg.version !== publishVersion) {
      pkg.version = publishVersion
      updated.value = true
    }
  }
  const dependencies = isRecord(pkg.dependencies) ? pkg.dependencies : null
  const devDependencies = isRecord(pkg.devDependencies) ? pkg.devDependencies : null
  const peerDependencies = isRecord(pkg.peerDependencies) ? pkg.peerDependencies : null
  const optionalDependencies = isRecord(pkg.optionalDependencies) ? pkg.optionalDependencies : null

  if (publishVersion && pkg.name === "jonsoc" && optionalDependencies) {
    for (const [key, value] of Object.entries(optionalDependencies)) {
      if (!key.startsWith("jonsoc-")) continue
      if (typeof value !== "string") continue
      if (value === publishVersion) continue
      optionalDependencies[key] = publishVersion
      updated.value = true
    }
  }

  updateDeps(dependencies, filePath, "dependencies", updated)
  updateDeps(devDependencies, filePath, "devDependencies", updated)
  updateDeps(peerDependencies, filePath, "peerDependencies", updated)
  updateDeps(optionalDependencies, filePath, "optionalDependencies", updated)

  if (updated.value) {
    await Bun.file(filePath).write(`${JSON.stringify(pkg, null, 2)}\n`)
  }

  // Verify version was updated for jonsoc package
  if (publishVersion && pkg.name === "jonsoc") {
    const finalPkg = await readJson(filePath)
    if (finalPkg.version !== publishVersion) {
      console.error(`❌ ERROR: Version mismatch in ${filePath}`)
      console.error(`   Expected: ${publishVersion}`)
      console.error(`   Actual: ${finalPkg.version}`)
      process.exit(1)
    }
    console.log(`✅ Verified version ${publishVersion} in ${path.relative(rootDir, filePath)}`)
  }
}

console.log("\n✅ Updated package.json files for publishing")
