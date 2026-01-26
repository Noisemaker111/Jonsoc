export async function GET() {
  const response = await fetch(
    "https://raw.githubusercontent.com/Noisemaker111/Jonsoc/refs/heads/master/packages/sdk/openapi.json",
  )
  const json = await response.json()
  return json
}
