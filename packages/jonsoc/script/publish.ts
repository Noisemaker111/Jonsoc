#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@jonsoc/script"
import { existsSync } from "fs"
import { fileURLToPath } from "url"
import path, { dirname, join } from "path"

const dir = dirname(dirname(fileURLToPath(import.meta.url)))
process.chdir(dir)

const { binaries } = await import("./build.ts")
{
  const platform = process.platform === "win32" ? "windows" : process.platform
  const name = `${pkg.name}-${platform}-${process.arch}`
  const binary = process.platform === "win32" ? `${pkg.name}.exe` : pkg.name
  console.log(`smoke test: running dist/${name}/bin/${binary} --version`)
  await $`./dist/${name}/bin/${binary} --version`
}

if (process.platform === "win32") {
  const dest = path.join("dist", pkg.name, "bin")
  await $`mkdir -p ${dest}`
  await $`xcopy /E /I /Y bin ${dest.replaceAll("/", "\\")}`
} else {
  await $`mkdir -p ./dist/${pkg.name}/bin`
  await $`cp -r ./bin ./dist/${pkg.name}/bin`
}

const postinstallPath = join(dir, "postinstall.mjs")
if (existsSync(postinstallPath)) {
  await Bun.write(join("dist", pkg.name, "postinstall.mjs"), Bun.file(postinstallPath))
}

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      bin: {
        [pkg.name]: `./bin/${pkg.name}`,
      },
      scripts: {
        postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
      },
      version: Script.version,
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

const tags = [Script.channel]
const skipDocker = process.env.JONSOC_SKIP_DOCKER === "1" || process.env.OPENCODE_SKIP_DOCKER === "1"
const skipArchive =
  process.env.JONSOC_SKIP_ARCHIVE === "1" || process.env.OPENCODE_SKIP_ARCHIVE === "1" || process.platform === "win32"
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const otp = process.argv.find((arg) => arg.startsWith("--otp="))?.split("=")[1]
const tokenFlag = process.argv.find((arg) => arg.startsWith("--token="))?.split("=")[1]
const npmToken = tokenFlag || process.env.NPM_TOKEN

for (const [name] of Object.entries(binaries)) {
  console.log(`Publishing ${name}...`)
  const targetDir = `./dist/${name}`

  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(targetDir)
  }

  if (npmToken) {
    await Bun.write(join(targetDir, ".npmrc"), `//registry.npmjs.org/:_authToken=${npmToken}\n`)
  }

  await $`bun pm pack`.cwd(targetDir)
  const otpArg = otp ? `--otp=${otp}` : ""
  for (const tag of tags) {
    for (const attempt of [1, 2, 3]) {
      try {
        await $`npm publish *.tgz --access public --tag ${tag} ${otpArg}`.cwd(targetDir)
        break
      } catch (e: any) {
        const stderr = e.stderr?.toString() ?? ""
        if (stderr.includes("previously published versions")) {
          console.log(`  Already published ${name}. Skipping...`)
          break
        }
        if (stderr.includes("E409") && attempt < 3) {
          console.log(`  npm publish conflict for ${name}. Retrying...`)
          await sleep(5000)
          continue
        }
        throw e
      }
    }
  }
}

for (const tag of tags) {
  console.log(`Publishing main package with tag ${tag}...`)
  const mainPkgDir = `./dist/${pkg.name}`

  if (npmToken) {
    await Bun.write(join(mainPkgDir, ".npmrc"), `//registry.npmjs.org/:_authToken=${npmToken}\n`)
  }

  const otpArg = otp ? `--otp=${otp}` : ""
  await $`bun pm pack`.cwd(mainPkgDir)
  for (const attempt of [1, 2, 3]) {
    try {
      await $`npm publish *.tgz --access public --tag ${tag} ${otpArg}`.cwd(mainPkgDir)
      break
    } catch (e: any) {
      const stderr = e.stderr?.toString() ?? ""
      if (stderr.includes("previously published versions")) {
        console.log(`  Already published ${pkg.name}. Skipping...`)
        break
      }
      if (stderr.includes("E409") && attempt < 3) {
        console.log(`  npm publish conflict for ${pkg.name}. Retrying...`)
        await sleep(5000)
        continue
      }
      throw e
    }
  }
}

if (!Script.preview && !skipArchive) {
  // Create archives for GitHub release
  for (const key of Object.keys(binaries)) {
    if (key.includes("linux")) {
      await $`tar -czf ../../${key}.tar.gz *`.cwd(`dist/${key}/bin`)
      continue
    }
    await $`zip -r ../../${key}.zip *`.cwd(`dist/${key}/bin`)
  }
}

if (!Script.preview && !skipDocker) {
  const repo = (process.env.JONSOC_REPO ?? process.env.OPENCODE_REPO ?? "Noisemaker111/Jonsoc").replace(
    /^https?:\/\/github\.com\//,
    "",
  )
  const image = process.env.JONSOC_IMAGE ?? `ghcr.io/${repo}`
  const platforms = "linux/amd64,linux/arm64"
  const tags = [`${image}:${Script.version}`, `${image}:latest`]
  const tagFlags = tags.flatMap((t) => ["-t", t])
  await $`docker buildx build --platform ${platforms} ${tagFlags} --push .`
}
