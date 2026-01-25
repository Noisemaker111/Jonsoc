#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { Script } from "@opencode-ai/script"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const { binaries } = await import("./build.ts")
{
  const platform = process.platform === "win32" ? "windows" : process.platform
  const name = `${pkg.name}-${platform}-${process.arch}`
  const binary = process.platform === "win32" ? `${pkg.name}.exe` : pkg.name
  console.log(`smoke test: running dist/${name}/bin/${binary} --version`)
  await $`./dist/${name}/bin/${binary} --version`
}

await $`mkdir -p ./dist/${pkg.name}`
if (process.platform === "win32") {
  await $`xcopy /E /I /Y bin .\\dist\\${pkg.name}\\bin`
  await Bun.write(`./dist/${pkg.name}/postinstall.mjs`, await Bun.file(`./script/postinstall.mjs`).arrayBuffer())
} else {
  await $`cp -r ./bin ./dist/${pkg.name}/bin`
  await $`cp ./script/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`
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

const npmToken = process.env.NPM_TOKEN
if (npmToken) {
  const registry = "registry.npmjs.org"
  const home = process.env.HOME || process.env.USERPROFILE
  if (!home) throw new Error("Could not find home directory")
  const configPath = join(home, ".npmrc")
  const config = `//${registry}/:_authToken=${npmToken}\n`
  await Bun.write(configPath, config)
  console.log(`Configured .npmrc with token for ${registry}`)
}

const tasks = Object.entries(binaries).map(async ([name]) => {
  if (process.platform !== "win32") {
    await $`chmod -R 755 .`.cwd(`./dist/${name}`)
  }
  await $`bun pm pack`.cwd(`./dist/${name}`)
  for (const tag of tags) {
    await $`npm publish *.tgz --access public --tag ${tag}`.cwd(`./dist/${name}`)
  }
})
await Promise.all(tasks)
for (const tag of tags) {
  await $`cd ./dist/${pkg.name} && bun pm pack && npm publish *.tgz --access public --tag ${tag}`
}

if (!Script.preview) {
  // Create archives for GitHub release
  for (const key of Object.keys(binaries)) {
    if (key.includes("linux")) {
      await $`tar -czf ../../${key}.tar.gz *`.cwd(`dist/${key}/bin`)
    } else {
      await $`zip -r ../../${key}.zip *`.cwd(`dist/${key}/bin`)
    }
  }

  const repo = (process.env.JOC_REPO ?? process.env.OPENCODE_REPO ?? "Noisemaker111/JonsOpencode").replace(
    /^https?:\/\/github\.com\//,
    "",
  )
  const image = process.env.JOC_IMAGE ?? `ghcr.io/${repo}`
  const platforms = "linux/amd64,linux/arm64"
  const tags = [`${image}:${Script.version}`, `${image}:latest`]
  const tagFlags = tags.flatMap((t) => ["-t", t])
  await $`docker buildx build --platform ${platforms} ${tagFlags} --push .`
}
