import { arch, platform } from "os"

const osMap = {
  win32: "windows",
  darwin: "darwin",
  linux: "linux",
}

const os = osMap[platform()] ?? platform()
const cpu = arch()
const pkgName = `jonsoc-${os}-${cpu}`

if (process.env.JONSOC_DEBUG_POSTINSTALL === "1") {
  console.log(`[jonsoc] optional dependency: ${pkgName}`)
}
