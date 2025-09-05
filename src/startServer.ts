import { generate } from "randomstring"
import { exec } from "@actions/exec"

import { createNetwork } from "./createNetwork"
import * as core from "@actions/core"
import axios, { isAxiosError } from "axios"

async function validateSubscription(): Promise<void> {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`

  try {
    await axios.get(API_URL, { timeout: 3000 })
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(
        "Subscription is not valid. Reach out to support@stepsecurity.io"
      )
      process.exit(1)
    } else {
      core.info("Timeout or API not reachable. Continuing to next step.")
    }
  }
}

export const startServer = async (
  port: number,
  masterName?: string
): Promise<string> => {
  await validateSubscription()
  const name = generate({ length: 5, charset: "alphanumeric" })
  const network = await createNetwork()
  let options: string[] = []
  options.push(...["-d", "--network", network, "-p", `${port}:4222`])
  if (name) options.push(...["--name", name])
  options.push("nats:alpine")
  if (masterName)
    options.push(
      ...[
        "--cluster",
        `nats://0.0.0.0:6222`,
        "--routes",
        `nats://ruser:T0pS3cr3t@${masterName}:6222`
      ]
    )
  options = ["docker", "run"].concat(options)
  return exec("sudo", options).then(code => {
    if (code === 0) return name
    else throw new Error(`failed to start server ${options.join(" ")}`)
  })
}
