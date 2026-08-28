import readline from "node:readline";

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

for await (const line of input) {
  if (!line.trim()) continue;
  try {
    const event = JSON.parse(line);
    if (event.type === "assistant" && Array.isArray(event.message?.content)) {
      for (const block of event.message.content) {
        if (block?.type === "text" && block.text) process.stdout.write(`${block.text}\n`);
      }
    } else if (event.type === "result") {
      if (event.result) process.stdout.write(`${event.result}\n`);
      if (event.is_error) process.stdout.write(`Claude reported an error.\n`);
    } else if (event.type === "system" && event.subtype === "task_notification") {
      const summary = event.summary ?? event.description ?? "Specialist task updated";
      process.stdout.write(`[agent] ${summary}\n`);
    }
  } catch {
    // Keep the raw JSON in the log; avoid filling the user's terminal with it.
  }
}
