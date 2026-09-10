const ICO_PNG =
  "AAABAAEAICAAAAEAIACpAAAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAgAAAAIAgGAAAAc3p69AAAAHBJREFUeNpjkNFS+j+QmGHUAaMOGHUAOZqOVFlhxTR3AC6LKXEIA7UtJ9URDLSwnBRHMNDKcmIdMbgdgM/gL++foGByHUGWA9AtJ+SIUQcMPwfQLRGOlgODoigeFJXRoKiOB0WDZLRNOOqAUQfQAgMAhGXWO12RBLQAAAAASUVORK5CYII=";

export function GET() {
  return new Response(Buffer.from(ICO_PNG, "base64"), {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
