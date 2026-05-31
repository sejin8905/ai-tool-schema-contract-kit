#!/usr/bin/env node
import { readFileSync } from "node:fs";
import process from "node:process";
import {
  createJsonContractReport,
  diffToolContracts,
  formatMarkdownContractReport,
  getContractCliExitCode,
  type ContractPolicy,
  type ToolContract,
  validateToolRegistry
} from "./index.js";

interface RegistryFile {
  tools: ToolContract[];
  policy?: ContractPolicy;
}

function usage() {
  console.log(`AI Tool Schema Contract Kit

Usage:
  ai-tool-schema-contract examples/tools.current.json
  ai-tool-schema-contract examples/tools.current.json --previous examples/tools.previous.json
  ai-tool-schema-contract examples/tools.current.json --json

The input file should contain:
{
  "tools": [ ...tool contracts... ],
  "policy": { ...optional policy... }
}
`);
}

function parseArgs(argv: string[]) {
  const args: { current?: string; previous?: string; json?: boolean; help?: boolean } = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--help" || item === "-h") {
      args.help = true;
    } else if (item === "--previous") {
      args.previous = argv[index + 1];
      index += 1;
    } else if (item === "--json") {
      args.json = true;
    } else if (!args.current) {
      args.current = item;
    }
  }
  return args;
}

function readRegistryFile(filePath: string): RegistryFile {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as RegistryFile;
  if (!Array.isArray(parsed.tools)) {
    throw new Error(`Registry file "${filePath}" must contain a tools array.`);
  }
  return parsed;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.current) {
  usage();
  process.exit(args.help ? 0 : 1);
}

try {
  const current = readRegistryFile(args.current);
  const validationReport = validateToolRegistry(current.tools, current.policy);
  const reports: Array<ReturnType<typeof validateToolRegistry> | ReturnType<typeof diffToolContracts>> = [validationReport];

  if (args.previous) {
    const previous = readRegistryFile(args.previous);
    reports.push(diffToolContracts(previous.tools, current.tools));
  }

  if (args.json) {
    console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));
  } else {
    for (const report of reports) {
      console.log(formatMarkdownContractReport(report));
      console.log("");
    }
  }

  const exitCode = reports.some((report) => getContractCliExitCode(report) === 1) ? 1 : 0;
  process.exit(exitCode);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
